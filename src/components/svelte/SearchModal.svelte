<script lang="ts">
  /**
   * SearchModal.svelte · 全站搜索
   * --------------------------------------------------------------------------
   * · 索引是构建期生成的静态 /search.json，首次打开时才懒加载
   * · 所有 token 必须命中（AND），再按命中位置加权排序
   * · 支持 ↑↓ 选择、↵ 打开、Esc 关闭；打开时锁定 body 滚动
   * · 通过 window 事件 `app:search` 触发，导航栏与快捷键共用同一个入口
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  interface Doc {
    id: string;
    url: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    date: string;
    excerpt: string;
  }

  interface Hit extends Doc {
    score: number;
    label: string;
  }

  let open = $state(false);
  let query = $state('');
  let docs = $state<Doc[]>([]);
  let loading = $state(false);
  let loaded = $state(false);
  let cursor = $state(0);

  let inputEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLUListElement | null>(null);

  /* ----------------------------------------------------------- 索引加载 --- */
  async function load() {
    if (loaded || loading) return;
    loading = true;
    try {
      const res = await fetch('/search.json');
      if (res.ok) docs = (await res.json()) as Doc[];
      loaded = true;
    } catch {
      loaded = true;
    } finally {
      loading = false;
    }
  }

  /* ------------------------------------------------------------- 检索 --- */
  function score(doc: Doc, tokens: string[]): number {
    const title = doc.title.toLowerCase();
    const desc = doc.description.toLowerCase();
    const tags = doc.tags.join(' ').toLowerCase();
    const category = doc.category.toLowerCase();
    const body = doc.excerpt.toLowerCase();

    let total = 0;

    for (const token of tokens) {
      let hit = 0;
      if (title.includes(token)) hit += title.startsWith(token) ? 120 : 80;
      if (tags.includes(token)) hit += 45;
      if (category.includes(token)) hit += 25;
      if (desc.includes(token)) hit += 25;
      if (body.includes(token)) hit += 8;
      // 任一 token 未命中即整条淘汰
      if (hit === 0) return 0;
      total += hit;
    }

    return total;
  }

  const hits = $derived.by<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return docs.slice(0, 6).map((doc) => ({ ...doc, score: 0, label: '' }));
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    return docs
      .map((doc) => ({ doc, s: score(doc, tokens) }))
      .filter((item) => item.s > 0)
      .sort((a, b) => b.s - a.s || a.doc.date.localeCompare(b.doc.date) * -1)
      .slice(0, 20)
      .map(({ doc, s }) => ({ ...doc, score: s, label: buildLabel(doc, tokens) }));
  });

  /** 从正文里截一段包含关键词的上下文 */
  function buildLabel(doc: Doc, tokens: string[]): string {
    const body = doc.excerpt;
    const lower = body.toLowerCase();
    let at = -1;
    for (const token of tokens) {
      const i = lower.indexOf(token);
      if (i >= 0 && (at === -1 || i < at)) at = i;
    }
    if (at === -1) return doc.description;
    const start = Math.max(0, at - 34);
    return `${start > 0 ? '…' : ''}${body.slice(start, start + 96)}…`;
  }

  /* ---------------------------------------------------------- 高亮 --- */
  function escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlight(text: string): string {
    const safe = escapeHtml(text);
    const q = query.trim();
    if (!q) return safe;

    const tokens = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);

    if (!tokens.length) return safe;
    return safe.replace(new RegExp(`(${tokens.join('|')})`, 'gi'), '<mark>$1</mark>');
  }

  /* ------------------------------------------------------------ 开合 --- */
  let restoreOverflow = '';

  function show() {
    if (open) return;
    open = true;
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void load();
    queueMicrotask(() => inputEl?.focus());
  }

  function hide() {
    if (!open) return;
    open = false;
    document.body.style.overflow = restoreOverflow;
    query = '';
    cursor = 0;
  }

  function go(url: string) {
    hide();
    window.location.href = url;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      cursor = hits.length ? (cursor + 1) % hits.length : 0;
      scrollIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      cursor = hits.length ? (cursor - 1 + hits.length) % hits.length : 0;
      scrollIntoView();
    } else if (event.key === 'Enter') {
      const hit = hits[cursor];
      if (hit) {
        event.preventDefault();
        go(hit.url);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  }

  function scrollIntoView() {
    queueMicrotask(() => {
      listEl
        ?.querySelector<HTMLElement>('li[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  onMount(() => {
    const onOpenEvent = () => show();

    const onGlobalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open ? hide() : show();
        return;
      }
      if (event.key === '/' && !typing && !open) {
        event.preventDefault();
        show();
      }
    };

    window.addEventListener('app:search', onOpenEvent);
    window.addEventListener('keydown', onGlobalKey);
    return () => {
      window.removeEventListener('app:search', onOpenEvent);
      window.removeEventListener('keydown', onGlobalKey);
      document.body.style.overflow = restoreOverflow;
    };
  });

  // 结果变化时把光标收回第一条
  $effect(() => {
    void query;
    cursor = 0;
  });
</script>

{#if open}
  <div
    class="overlay"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && hide()}
  >
    <div class="panel" role="dialog" aria-modal="true" aria-label="站内搜索">
      <div class="field">
        <Icon name="search" size={17} />
        <input
          bind:this={inputEl}
          bind:value={query}
          type="search"
          placeholder="搜索文章、标签、分类…"
          autocomplete="off"
          spellcheck="false"
          onkeydown={onKeydown}
        />
        {#if loading}
          <span class="spin"><Icon name="loader" size={16} /></span>
        {/if}
        <button type="button" class="close" onclick={hide} aria-label="关闭搜索">
          <Icon name="x" size={16} />
        </button>
      </div>

      <ul class="results" bind:this={listEl}>
        {#if hits.length === 0}
          <li class="empty">
            <Icon name="search" size={26} />
            <p>
              {query.trim()
                ? `没有找到与「${query.trim()}」相关的内容`
                : '输入关键词开始搜索'}
            </p>
            <span class="hint">试试文章标题、标签或分类</span>
          </li>
        {:else}
          {#each hits as hit, i (hit.id)}
            <li data-active={i === cursor}>
              <a
                href={hit.url}
                onclick={(e) => {
                  e.preventDefault();
                  go(hit.url);
                }}
                onmouseenter={() => (cursor = i)}
              >
                <div class="row">
                  <span class="title">{@html highlight(hit.title)}</span>
                  <span class="pill">{hit.category}</span>
                </div>
                <p class="excerpt">{@html highlight(hit.label || hit.description)}</p>
                <div class="row sub">
                  <span class="date">{hit.date}</span>
                  {#each hit.tags.slice(0, 3) as tag}
                    <span class="tag">#{tag}</span>
                  {/each}
                </div>
              </a>
            </li>
          {/each}
        {/if}
      </ul>

      <div class="foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>↵</kbd> 打开</span>
        <span><kbd>esc</kbd> 关闭</span>
        <span class="brand">
          <i></i><i></i><i></i>
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 150;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 11vh 16px 16px;
    background: var(--surface-sunk);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: veil 0.2s ease both;
  }

  @keyframes veil {
    from {
      opacity: 0;
    }
  }

  .panel {
    width: min(640px, 100%);
    max-height: 74vh;
    display: flex;
    flex-direction: column;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-pop);
    overflow: hidden;
    animation: rise 0.25s var(--ease) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.985);
    }
  }

  /* ------------------------------------------------------------- 输入框 --- */
  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
    color: var(--text-3);
  }

  .field input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    color: var(--text-1);
    font-size: 0.95rem;
  }

  .field input::placeholder {
    color: var(--text-3);
  }

  .field input::-webkit-search-cancel-button {
    display: none;
  }

  .spin {
    display: inline-flex;
    color: var(--clay-d);
    animation: rotate 0.9s linear infinite;
  }

  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }

  .close {
    display: inline-flex;
    color: var(--text-3);
    transition: color var(--t-color);
  }

  .close:hover {
    color: var(--text-1);
  }

  /* --------------------------------------------------------------- 结果 --- */
  .results {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px;
  }

  li a {
    display: block;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 1px solid transparent;
    transition: background-color var(--t-color), border-color var(--t-color);
  }

  li[data-active='true'] a {
    background: var(--bg-soft);
    border-color: var(--line);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    flex: 1;
    min-width: 0;
    color: var(--text-1);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: -0.015em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pill {
    flex: none;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--clay-l);
    color: var(--clay-d);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
  }

  .excerpt {
    margin-top: 3px;
    color: var(--text-2);
    font-size: 0.79rem;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sub {
    margin-top: 5px;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: var(--ls-mono);
    color: var(--text-3);
  }

  .tag {
    color: var(--amber-d);
  }

  .panel :global(mark) {
    padding: 0 2px;
    border-radius: 3px;
    background: var(--orange-l);
    color: var(--orange-d);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 44px 20px;
    color: var(--text-3);
    text-align: center;
  }

  .empty p {
    color: var(--text-2);
    font-size: var(--fs-sm);
  }

  .empty .hint {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
  }

  /* --------------------------------------------------------------- 页脚 --- */
  .foot {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 9px 16px;
    border-top: 1px solid var(--line);
    background: var(--bg-soft);
    color: var(--text-3);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
  }

  .foot span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .foot :global(kbd) {
    padding: 1px 5px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--card);
    font-size: 0.92em;
  }

  .brand {
    margin-left: auto;
    gap: 4px;
  }

  .brand i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .brand i:nth-child(1) {
    background: var(--orange);
  }
  .brand i:nth-child(2) {
    background: var(--amber);
  }
  .brand i:nth-child(3) {
    background: var(--clay);
  }

  @media (max-width: 768px) {
    .overlay {
      padding: 6vh 10px 10px;
    }

    .panel {
      max-height: 82vh;
    }

    .foot span:nth-child(2),
    .foot span:nth-child(3) {
      display: none;
    }
  }
</style>
