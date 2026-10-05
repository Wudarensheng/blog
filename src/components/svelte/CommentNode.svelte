<script lang="ts">
  /**
   * CommentNode.svelte · 单条评论（递归）
   * ----------------------------------------------------------------------------
   * · 自己渲染回复表单 / 编辑表单；真正的接口调用与树更新交给父组件。
   * · 通过自引用渲染子回复。
   */
  import Icon from './Icon.svelte';
  import Self from './CommentNode.svelte';
  import { relative, ymdhm } from '@/lib/format';
  import { renderMarkdown } from '@/lib/comments/markdown';
  import type { AdminAction, AuthUser, CommentDto } from '@/lib/comments/types';

  interface Props {
    node: CommentDto;
    me: AuthUser | null;
    isAdmin: boolean;
    maxDepth: number;
    onSubmitReply: (parent: CommentDto, content: string) => Promise<void>;
    onSubmitEdit: (node: CommentDto, content: string) => Promise<void>;
    onDelete: (node: CommentDto) => Promise<void>;
    onAdmin: (node: CommentDto, action: AdminAction) => Promise<void>;
  }

  let { node, me, isAdmin, maxDepth, onSubmitReply, onSubmitEdit, onDelete, onAdmin }: Props = $props();

  let replyOpen = $state(false);
  let editOpen = $state(false);
  let replyDraft = $state('');
  let editDraft = $state('');
  let busy = $state(false);

  const isMine = $derived(!!me && me.sub === node.author.userId);
  const canReply = $derived(!!me && !node.deleted && node.depth < maxDepth);
  const name = $derived(node.author.name || node.author.username || '匿名');
  const created = $derived(new Date(node.createdAt * 1000));
  const edited = $derived(node.editedAt ? new Date(node.editedAt * 1000) : null);

  const STATUS_LABEL: Record<string, string> = {
    approved: '已发布',
    pending: '待审',
    hidden: '已隐藏',
    deleted: '已删除',
  };

  async function guard(fn: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } finally {
      busy = false;
    }
  }

  async function submitReply(): Promise<void> {
    const content = replyDraft.trim();
    if (!content) return;
    await guard(async () => {
      await onSubmitReply(node, content);
      replyDraft = '';
      replyOpen = false;
    });
  }

  async function submitEdit(): Promise<void> {
    const content = editDraft.trim();
    if (!content) return;
    await guard(async () => {
      await onSubmitEdit(node, content);
      editOpen = false;
    });
  }

  function startEdit(): void {
    editDraft = node.content;
    editOpen = true;
    replyOpen = false;
  }
</script>

<article class="node" class:tomb={node.deleted}>
  <div class="avatar">
    {#if node.author.avatar}
      <img src={node.author.avatar} alt="" loading="lazy" referrerpolicy="no-referrer" />
    {:else}
      <span class="fallback">{(name[0] ?? '?').toUpperCase()}</span>
    {/if}
  </div>

  <div class="main">
    <header class="meta">
      <span class="who">{name}</span>
      <span class="handle">@{node.author.username}</span>
      <time class="when" datetime={created.toISOString()} title={relative(created)}>{ymdhm(created)}</time>
      {#if edited}<span class="edited">已编辑</span>{/if}
      {#if isAdmin && node.status !== 'approved'}
        <span class="badge">{STATUS_LABEL[node.status] ?? node.status}</span>
      {/if}
    </header>

    {#if node.deleted}
      <p class="tomb-text">该评论已删除</p>
    {:else if editOpen}
      <div class="editor">
        <textarea bind:value={editDraft} rows="3" maxlength={5000} aria-label="编辑评论"></textarea>
        <div class="editor-actions">
          <button class="btn ghost sm" onclick={() => (editOpen = false)} disabled={busy}>取消</button>
          <button class="btn primary sm" onclick={submitEdit} disabled={busy || !editDraft.trim()}>保存</button>
        </div>
      </div>
    {:else}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- 内容已由 renderMarkdown 先转义 -->
      <div class="body">{@html renderMarkdown(node.content)}</div>
    {/if}

    <div class="actions">
      {#if canReply}
        <button class="link" onclick={() => { replyOpen = !replyOpen; editOpen = false; }}>
          <Icon name="reply" size={13} /> 回复
        </button>
      {/if}
      {#if isMine && !node.deleted}
        <button class="link" onclick={startEdit}><Icon name="pencil" size={13} /> 编辑</button>
        <button class="link danger" onclick={() => guard(() => onDelete(node))} disabled={busy}>
          <Icon name="trash-2" size={13} /> 删除
        </button>
      {/if}
      {#if isAdmin}
        {#if node.status === 'approved'}
          <button class="link" onclick={() => guard(() => onAdmin(node, 'hide'))} disabled={busy}>
            <Icon name="eye-off" size={13} /> 隐藏
          </button>
        {:else}
          <button class="link" onclick={() => guard(() => onAdmin(node, 'restore'))} disabled={busy}>
            <Icon name="eye" size={13} /> 恢复
          </button>
        {/if}
        <button class="link danger" onclick={() => guard(() => onAdmin(node, 'soft-delete'))} disabled={busy}>
          <Icon name="trash-2" size={13} /> 删帖
        </button>
      {/if}
    </div>

    {#if replyOpen}
      <div class="editor">
        <textarea bind:value={replyDraft} rows="3" maxlength={5000} placeholder={`回复 ${name}…`} aria-label="回复"></textarea>
        <div class="editor-actions">
          <button class="btn ghost sm" onclick={() => (replyOpen = false)} disabled={busy}>取消</button>
          <button class="btn primary sm" onclick={submitReply} disabled={busy || !replyDraft.trim()}>回复</button>
        </div>
      </div>
    {/if}
  </div>
</article>

{#if node.replies?.length}
  <div class="children">
    {#each node.replies as child (child.id)}
      <Self node={child} {me} {isAdmin} {maxDepth} {onSubmitReply} {onSubmitEdit} {onDelete} {onAdmin} />
    {/each}
  </div>
{/if}

<style>
  .node {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3) 0;
  }

  .avatar {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: var(--orange-l);
    color: var(--orange-d);
    font-weight: 700;
    font-size: 0.8rem;
    box-shadow: 0 0 0 2px var(--card), 0 0 0 3px var(--ring);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .main {
    flex: 1;
    min-width: 0;
  }

  .meta {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 2px;
  }

  .who {
    font-weight: 700;
    font-size: 0.82rem;
    color: var(--text-1);
  }

  .handle,
  .when,
  .edited {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
    color: var(--text-3);
  }

  .badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: var(--r-pill);
    background: var(--amber-l);
    color: var(--amber-d);
  }

  .body {
    font-size: 0.86rem;
    line-height: 1.75;
    color: var(--text-2);
    overflow-wrap: anywhere;
  }

  .body :global(p) {
    margin: 0 0 0.5em;
  }

  .body :global(p:last-child) {
    margin-bottom: 0;
  }

  .body :global(a) {
    color: var(--a-d);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .body :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0.5em 0;
    border-radius: var(--r-sm);
    border: 1px solid var(--line);
  }

  .body :global(code) {
    font-family: var(--font-mono);
    font-size: 0.82em;
    padding: 1px 5px;
    border-radius: var(--r-xs);
    background: var(--code-bg, var(--bg-soft));
  }

  .body :global(pre) {
    margin: 0.5em 0;
    padding: var(--s-3);
    overflow-x: auto;
    border-radius: var(--r-sm);
    background: var(--code-bg, var(--bg-soft));
    border: 1px solid var(--line);
  }

  .body :global(pre code) {
    padding: 0;
    background: none;
  }

  .tomb-text {
    font-size: 0.82rem;
    font-style: italic;
    color: var(--text-3);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-3);
    margin-top: 6px;
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

  .editor {
    margin-top: var(--s-2);
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: 0.84rem;
    line-height: 1.7;
  }

  textarea:focus {
    outline: none;
    border-color: var(--a);
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
  }

  .children {
    margin-left: 20px;
    padding-left: var(--s-3);
    border-left: 2px solid var(--line);
  }

  .children:hover {
    border-left-color: var(--a-l);
  }

  .btn {
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
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--a);
  }

  .btn.ghost {
    background: transparent;
    border-color: var(--line);
    color: var(--text-2);
  }

  .btn.ghost:hover:not(:disabled) {
    border-color: var(--a);
    color: var(--a-d);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
