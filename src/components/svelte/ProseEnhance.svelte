<script lang="ts">
  /**
   * ProseEnhance.svelte · 正文增强
   * --------------------------------------------------------------------------
   * Astro 负责把 Markdown 渲染成静态 HTML，这个岛屿只做「锦上添花」的三件事：
   *   1. 给代码块套上带三点装饰 / 语言标签 / 复制按钮的外壳
   *   2. 给表格套一层横向滚动容器（窄屏不撑破布局）
   *   3. 给正文里的外链补上 target 与 rel
   * 没有 JS 时正文依然完整可读，只是少了这些便利。
   */
  import { onMount } from 'svelte';

  interface Props {
    /** 作用范围，默认文章正文 */
    selector?: string;
  }

  let { selector = '.prose' }: Props = $props();

  const DOTS = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';

  function buildCodeChrome(pre: HTMLElement) {
    if (pre.parentElement?.classList.contains('code-block')) return;

    const lang =
      pre.dataset.language ??
      pre.getAttribute('data-language') ??
      pre.closest('[data-language]')?.getAttribute('data-language') ??
      'text';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const head = document.createElement('div');
    head.className = 'code-head';
    head.innerHTML = `${DOTS}<span class="lang">${lang}</span><span class="spacer"></span>`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.dataset.copied = 'false';
    button.setAttribute('aria-label', '复制代码');
    button.textContent = '复制';

    let timer = 0;
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        // 剪贴板不可用（非 HTTPS / 权限被拒）时降级为选中文本
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      button.dataset.copied = 'true';
      button.textContent = '已复制';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.dataset.copied = 'false';
        button.textContent = '复制';
      }, 1600);
    });

    head.appendChild(button);

    pre.replaceWith(wrapper);
    wrapper.append(head, pre);
  }

  function wrapTables(root: ParentNode) {
    for (const table of root.querySelectorAll<HTMLTableElement>('table')) {
      if (table.parentElement?.classList.contains('table-wrap')) continue;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.replaceWith(wrap);
      wrap.appendChild(table);
    }
  }

  function decorateLinks(root: ParentNode) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')) {
      if (link.hostname === window.location.hostname) continue;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  onMount(() => {
    const root = document.querySelector(selector);
    if (!root) return;

    for (const pre of root.querySelectorAll<HTMLElement>('pre')) buildCodeChrome(pre);
    wrapTables(root);
    decorateLinks(root);
  });
</script>

<!-- 纯行为组件：不渲染任何可见内容 -->
