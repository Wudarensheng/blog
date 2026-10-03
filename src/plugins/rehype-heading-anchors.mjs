/* ============================================================================
   rehype-heading-anchors.mjs
   ----------------------------------------------------------------------------
   给 h2 / h3 / h4 加上可点击的锚点，同时补上缺失的 id。

   为什么不用 rehype-slug + rehype-autolink-headings：
     Astro 的 rehype 插件跑在它自己的 `rehypeHeadingIds` **之前**，而后者会把
     标题里的所有文本节点收集成 `headings[].text`（目录显示的就是这个）。
     如果锚点里放一个 `#` 文本节点，目录里每条都会变成「#标题」。

   这里的做法是把 `#` 交给 CSS 的 ::before 去画，<a> 本身保持空元素。
   于是标题文本保持干净，目录也就干净了。

   顺序上还有一个好处：本插件先写 id，Astro 的收集器看到已有 id 会直接沿用
   （见 @astrojs/markdown-remark/dist/rehype-collect-headings.js），
   所以目录里的 slug 与锚点 href 天然一致。
   ========================================================================== */

import Slugger from 'github-slugger';

/** 这些标签里的文字不算标题文本（与 Astro 的收集逻辑保持一致） */
const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style']);

/** 递归收集标题的纯文本，用于生成 slug */
function textOf(node, out = []) {
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child.type === 'element' && SKIP_TAGS.has(child.tagName)) continue;
      textOf(child, out);
    }
  } else if (typeof node.value === 'string') {
    out.push(node.value);
  }
  return out.join('');
}

export default function rehypeHeadingAnchors(options = {}) {
  const {
    /** 锚点的 class */
    className = ['heading-anchor'],
    /** 给哪些层级加锚点 */
    depths = [2, 3, 4],
  } = options;

  return (tree) => {
    const slugger = new Slugger();

    const walk = (node) => {
      if (!Array.isArray(node.children)) return;

      for (const child of node.children) {
        if (child.type === 'element' && /^h[1-6]$/.test(child.tagName)) {
          const depth = Number.parseInt(child.tagName[1], 10);
          const text = textOf(child);

          let id = child.properties?.id;
          if (typeof id !== 'string' || id === '') {
            id = slugger.slug(text);
            child.properties = { ...(child.properties ?? {}), id };
          }

          if (depths.includes(depth)) {
            child.children.unshift({
              type: 'element',
              tagName: 'a',
              // 空元素：`#` 由 CSS 的 ::before 绘制，避免污染标题文本
              properties: {
                className: [...className],
                href: `#${id}`,
                ariaHidden: 'true',
                tabIndex: -1,
              },
              children: [],
            });
          }

          // 标题内部不会再套标题，不必继续下钻
          continue;
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
