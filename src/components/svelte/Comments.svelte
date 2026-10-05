<script lang="ts">
  /**
   * Comments.svelte · 评论 island
   * ----------------------------------------------------------------------------
   * · 登录走 SSO（整页跳转 + PKCE），token 由 lib/comments/api 管理。
   * · 公开接口只返回 approved；被隐藏/删除的评论以「墓碑」形式保留子回复。
   * · 管理员可在每条评论上隐藏 / 恢复 / 删帖，并用管理面板处理已下架的评论。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import CommentNode from './CommentNode.svelte';
  import { commentClient } from '@/lib/comments/config';
  import { ymdhm } from '@/lib/format';
  import {
    adminDelete as apiAdminDelete,
    adminList,
    adminSetStatus,
    cachedIsAdmin,
    cachedUser,
    createComment,
    deleteComment,
    friendlyError,
    getComments,
    hasSession,
    login as startLogin,
    logout as doLogoutApi,
    me as fetchMe,
    updateComment,
  } from '@/lib/comments/api';
  import type { AdminAction, AuthUser, CommentDto } from '@/lib/comments/types';

  interface Props {
    postId: string;
  }

  let { postId }: Props = $props();

  const MAX_DEPTH = 3;

  let me = $state<AuthUser | null>(null);
  let isAdmin = $state(false);
  let tree = $state<CommentDto[]>([]);
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state<string | null>(null);
  let page = $state(1);
  let hasMore = $state(false);
  let draft = $state('');
  let busy = $state(false);
  let notice = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  let adminOpen = $state(false);
  let adminItems = $state<CommentDto[]>([]);
  let adminLoading = $state(false);

  onMount(() => {
    me = cachedUser();
    isAdmin = cachedIsAdmin();
    if (hasSession()) void refreshMe();
    void load(1);
  });

  async function refreshMe(): Promise<void> {
    try {
      const res = await fetchMe();
      me = res.user;
      isAdmin = res.isAdmin;
    } catch {
      me = null;
      isAdmin = false;
    }
  }

  async function load(next: number): Promise<void> {
    loading = true;
    error = null;
    try {
      const res = await getComments(postId, { page: next, sort: 'desc' });
      tree = next === 1 ? res.data : [...tree, ...res.data];
      page = res.pagination.page;
      hasMore = res.pagination.hasMore;
      loaded = true;
    } catch (e) {
      error = friendlyError(e);
    } finally {
      loading = false;
    }
  }

  /* ------------------------------------------------------------- 鉴权 --- */

  async function doLogin(provider: string): Promise<void> {
    try {
      await startLogin(provider);
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
    }
  }

  async function doLogout(): Promise<void> {
    await doLogoutApi();
    me = null;
    isAdmin = false;
    adminOpen = false;
  }

  function providerLabel(provider: string): string {
    if (provider === 'github') return '使用 GitHub 登录';
    if (provider === 'cloudflare') return '使用 Cloudflare 登录';
    return `使用 ${provider} 登录`;
  }

  /* ------------------------------------------------------------ 增删改 --- */

  async function postRoot(): Promise<void> {
    const content = draft.trim();
    if (!content || busy) return;
    busy = true;
    notice = null;
    try {
      const created = await createComment(postId, content);
      tree = [created, ...tree];
      draft = '';
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
    } finally {
      busy = false;
    }
  }

  function findNode(nodes: CommentDto[], id: string): CommentDto | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = n.replies ? findNode(n.replies, id) : null;
      if (hit) return hit;
    }
    return null;
  }

  async function submitReply(parent: CommentDto, content: string): Promise<void> {
    const created = await createComment(postId, content, parent.id);
    const target = findNode(tree, parent.id);
    if (target) (target.replies ??= []).push(created);
    else tree = [created, ...tree];
  }

  async function submitEdit(node: CommentDto, content: string): Promise<void> {
    const updated = await updateComment(node.id, content);
    node.content = updated.content;
    node.updatedAt = updated.updatedAt;
    node.editedAt = updated.editedAt;
  }

  async function removeNode(node: CommentDto): Promise<void> {
    if (!confirm('确定删除这条评论吗？')) return;
    await deleteComment(node.id);
    // 后端软删除：本地同步为墓碑，保留其下的回复
    node.deleted = true;
    node.status = 'deleted';
    node.content = '';
  }

  /* -------------------------------------------------------------- 审核 --- */

  async function adminAction(node: CommentDto, action: AdminAction): Promise<void> {
    try {
      if (action === 'hard-delete') {
        if (!confirm('彻底删除该评论及其全部回复？此操作不可恢复。')) return;
        await apiAdminDelete(node.id, true);
      } else {
        const status = action === 'hide' ? 'hidden' : action === 'restore' ? 'approved' : 'deleted';
        await adminSetStatus(node.id, status);
      }
      await load(1);
      if (adminOpen) await loadAdmin();
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
      throw e;
    }
  }

  async function loadAdmin(): Promise<void> {
    adminLoading = true;
    try {
      const [hidden, deleted] = await Promise.all([
        adminList({ postId, status: 'hidden', pageSize: 50 }),
        adminList({ postId, status: 'deleted', pageSize: 50 }),
      ]);
      adminItems = [...hidden.data, ...deleted.data];
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
    } finally {
      adminLoading = false;
    }
  }

  function toggleAdmin(): void {
    adminOpen = !adminOpen;
    if (adminOpen) void loadAdmin();
  }

  async function panelRestore(item: CommentDto): Promise<void> {
    try {
      await adminSetStatus(item.id, 'approved');
      await loadAdmin();
      await load(1);
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
    }
  }

  async function panelHardDelete(item: CommentDto): Promise<void> {
    if (!confirm('彻底删除该评论及其全部回复？此操作不可恢复。')) return;
    try {
      await apiAdminDelete(item.id, true);
      await loadAdmin();
      await load(1);
    } catch (e) {
      notice = { kind: 'err', text: friendlyError(e) };
    }
  }
</script>

<div class="comments-widget">
  <!-- 登录条 -->
  <div class="authbar">
    {#if me}
      <div class="whoami">
        {#if me.picture}
          <img class="ava" src={me.picture} alt="" loading="lazy" referrerpolicy="no-referrer" />
        {/if}
        <span class="name">{me.name || me.username}</span>
        {#if isAdmin}<span class="tag"><Icon name="shield" size={12} /> 管理员</span>{/if}
      </div>
      <div class="authbar-actions">
        {#if isAdmin}
          <button class="btn ghost sm" onclick={toggleAdmin}>
            <Icon name="shield" size={13} /> 管理面板
          </button>
        {/if}
        <button class="btn ghost sm" onclick={doLogout}><Icon name="log-out" size={13} /> 退出</button>
      </div>
    {:else}
      <span class="hint">登录后即可评论</span>
      <div class="login-buttons">
        {#each commentClient.providers as provider (provider)}
          <button class="btn primary sm" onclick={() => doLogin(provider)}>{providerLabel(provider)}</button>
        {/each}
      </div>
    {/if}
  </div>

  {#if notice}
    <p class="notice" class:err={notice.kind === 'err'}>{notice.text}</p>
  {/if}

  <!-- 发表评论 -->
  {#if me}
    <div class="composer">
      <textarea
        bind:value={draft}
        rows="3"
        maxlength={commentClient.maxLength}
        placeholder="友善地留下你的看法…支持 Markdown，图片请使用外链"></textarea>
      <div class="composer-row">
        <span class="count">{draft.length}/{commentClient.maxLength}</span>
        <button class="btn primary" onclick={postRoot} disabled={busy || !draft.trim()}>发表评论</button>
      </div>
    </div>
  {/if}

  <!-- 管理面板：公开树里看不到的隐藏 / 删除评论 -->
  {#if adminOpen && isAdmin}
    <div class="admin-panel">
      <div class="admin-head">
        <Icon name="shield" size={14} />
        已隐藏 / 已删除
        {#if adminLoading}<span class="muted">载入中…</span>{:else}<span class="muted">{adminItems.length} 条</span>{/if}
      </div>
      {#if !adminLoading && adminItems.length === 0}
        <p class="muted">没有需要处理的评论。</p>
      {:else}
        <ul class="admin-list">
          {#each adminItems as item (item.id)}
            <li>
              <div class="admin-meta">
                <b>{item.author.username}</b>
                <span class="muted">{item.status}</span>
                <span class="muted">{ymdhm(new Date(item.createdAt * 1000))}</span>
              </div>
              <div class="admin-content">{item.content}</div>
              <div class="admin-actions">
                <button class="link" onclick={() => panelRestore(item)}><Icon name="eye" size={13} /> 恢复</button>
                <button class="link danger" onclick={() => panelHardDelete(item)}>
                  <Icon name="trash-2" size={13} /> 彻底删除
                </button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <!-- 列表 -->
  <div class="list">
    {#if loading && !loaded}
      <p class="muted">加载中…</p>
    {:else if error}
      <p class="notice err">
        {error}
        <button class="link" onclick={() => load(1)}><Icon name="refresh" size={13} /> 重试</button>
      </p>
    {:else if tree.length === 0}
      <p class="muted">还没有评论，来抢沙发吧。</p>
    {:else}
      {#each tree as node (node.id)}
        <CommentNode
          {node}
          {me}
          {isAdmin}
          maxDepth={MAX_DEPTH}
          onSubmitReply={submitReply}
          onSubmitEdit={submitEdit}
          onDelete={removeNode}
          onAdmin={adminAction} />
      {/each}
      {#if hasMore}
        <button class="btn ghost more" onclick={() => load(page + 1)} disabled={loading}>
          {loading ? '加载中…' : '加载更多'}
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .comments-widget {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
  }

  /* ---------------------------------------------------------- 登录条 --- */
  .authbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    flex-wrap: wrap;
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--line);
  }

  .whoami {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }

  .ava {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--card), 0 0 0 3px var(--ring);
  }

  .name {
    font-weight: 700;
    font-size: 0.84rem;
    color: var(--text-1);
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--orange-l);
    color: var(--orange-d);
  }

  .hint {
    font-size: 0.82rem;
    color: var(--text-2);
  }

  .login-buttons {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
  }

  .authbar-actions {
    display: flex;
    gap: var(--s-2);
  }

  /* -------------------------------------------------------- 评论框 --- */
  .composer {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    padding: var(--s-3);
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: 0.86rem;
    line-height: 1.75;
  }

  textarea:focus {
    outline: none;
    border-color: var(--a);
  }

  .composer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
  }

  .count {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
    color: var(--text-3);
  }

  /* ------------------------------------------------------ 管理面板 --- */
  .admin-panel {
    border: 1px dashed var(--line);
    border-radius: var(--r-md);
    padding: var(--s-3);
    background: var(--bg-soft);
  }

  .admin-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--text-1);
    margin-bottom: var(--s-2);
  }

  .admin-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }

  .admin-list li {
    padding: var(--s-2) 0;
    border-top: 1px solid var(--line);
  }

  .admin-meta {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    font-size: 0.72rem;
    color: var(--text-2);
    margin-bottom: 4px;
  }

  .admin-content {
    font-size: 0.8rem;
    color: var(--text-2);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .admin-actions {
    display: flex;
    gap: var(--s-3);
    margin-top: 4px;
  }

  /* ---------------------------------------------------------- 列表 --- */
  .list {
    display: flex;
    flex-direction: column;
  }

  .list > :global(.node) {
    border-top: 1px solid var(--line);
  }

  .more {
    align-self: center;
    margin-top: var(--s-4);
  }

  .muted {
    font-size: 0.8rem;
    color: var(--text-3);
  }

  .notice {
    font-size: 0.8rem;
    color: var(--orange-d);
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }

  .notice.err {
    color: var(--clay-d);
  }

  /* ------------------------------------------------------ 通用按钮 --- */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid transparent;
    border-radius: var(--r-pill);
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 600;
    transition: background var(--t-color), color var(--t-color), border-color var(--t-color);
  }

  .btn.sm {
    font-size: 0.72rem;
    padding: 4px 12px;
  }

  .btn.primary {
    background: var(--a-d);
    color: #fff;
    font-size: 0.8rem;
    padding: 7px 18px;
  }

  .btn.primary.sm {
    font-size: 0.72rem;
    padding: 4px 12px;
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--a);
  }

  .btn.ghost {
    background: transparent;
    border-color: var(--line);
    color: var(--text-2);
    font-size: 0.8rem;
    padding: 7px 16px;
  }

  .btn.ghost.sm {
    font-size: 0.72rem;
    padding: 4px 12px;
  }

  .btn.ghost:hover:not(:disabled) {
    border-color: var(--a);
    color: var(--a-d);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.72rem;
    color: var(--text-3);
    transition: color var(--t-color);
  }

  .link:hover {
    color: var(--a-d);
  }

  .link.danger:hover {
    color: var(--clay-d);
  }
</style>
