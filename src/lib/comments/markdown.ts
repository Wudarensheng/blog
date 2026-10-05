/* ============================================================================
   comments/markdown.ts · 安全迷你 Markdown 渲染
   ----------------------------------------------------------------------------
   设计原则：**先转义、后处理**。

   第一步就把 `& < > " '` 全部转成实体，此后源串里不可能再出现攻击者写的标签；
   之后我们只做正则替换，输出的每个标签、每个属性都来自下面这段代码自己拼的
   固定集合。因此把结果交给 `{@html}` 是安全的 —— 唯一的风险点（用户可控的
   标签 / 属性 / URL）在转义与 scheme 校验两步里被堵死了。

   支持：围栏代码块、行内代码、图片、链接、粗体、斜体、段落 / 换行。
   不支持（也不打算支持）任何原始 HTML —— 它会被当成普通文本显示。
   ========================================================================== */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** 只允许 http(s) 绝对地址；其余（javascript: / data: / // / 相对路径）一律不接受 */
function safeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function renderMarkdown(input: string): string {
  if (!input) return '';

  // 1. 归一化换行，然后立刻转义
  let src = escapeHtml(input.replace(/\r\n?/g, '\n'));

  // 2. 把「代码」抽出来占位，避免它们被后续规则破坏。占位符用 \u0000 包裹。
  const blocks: string[] = [];
  const stash = (html: string): string => {
    blocks.push(html);
    return `\u0000${blocks.length - 1}\u0000`;
  };

  src = src.replace(/```([\s\S]*?)```/g, (_m, code: string) =>
    stash(`<pre><code>${code.replace(/^\n/, '').replace(/\n$/, '')}</code></pre>`),
  );
  src = src.replace(/`([^`\n]+)`/g, (_m, code: string) => stash(`<code>${code}</code>`));

  // 3. 图片（先于链接，否则 `![x](y)` 会被链接规则吃掉）
  src = src.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, alt: string, url: string) => {
    if (!safeUrl(url)) return m;
    return `<img src="${url}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  });

  // 4. 链接
  src = src.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, text: string, url: string) => {
    if (!safeUrl(url)) return m;
    return `<a href="${url}" target="_blank" rel="nofollow ugc noopener noreferrer">${text}</a>`;
  });

  // 5. 强调
  src = src.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  src = src.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  // 6. 段落 / 换行。独占一行的代码块占位符要原样输出，不能被 <p> 包住。
  const html = src
    .split(/\n{2,}/)
    .map((seg) => {
      const trimmed = seg.trim();
      if (/^\u0000\d+\u0000$/.test(trimmed)) return trimmed;
      return `<p>${seg.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  // 7. 还原代码块占位
  return html.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] ?? '');
}
