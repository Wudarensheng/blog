// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkCallouts from './src/plugins/remark-callouts.mjs';
import rehypeHeadingAnchors from './src/plugins/rehype-heading-anchors.mjs';

/** ⚠️ 与 `src/config.ts` 中的 `site.url` 保持一致（sitemap / RSS 需要绝对地址） */
const SITE = 'https://blog.wudarensheng.top';
const POSTS_DIR = fileURLToPath(new URL('./src/content/posts', import.meta.url));

/**
 * 扫一遍文章 frontmatter，拿到每篇的 published / updated。
 *
 * 只读 `title` 与两个日期字段，不做完整 YAML 解析 —— 这里要的只是
 * sitemap 的 lastmod，为它引一个 YAML 依赖不划算。
 * 日期统一取 `updated ?? published`：改过的文章应该被重新抓取。
 */
function readPostDates() {
  /** @type {Map<string, string>} slug → ISO 日期 */
  const dates = new Map();
  /** @type {string | null} 全站最新一篇文章的日期 */
  let latest = null;

  if (!fs.existsSync(POSTS_DIR)) return { dates, latest };

  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!/\.mdx?$/.test(file)) continue;

    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!block) continue;

    /** @param {string} key */
    const pick = (key) =>
      block.match(new RegExp(`^${key}:\\s*['"]?([^'"\\r\\n]+)['"]?\\s*$`, 'm'))?.[1]?.trim();

    const published = pick('published') ?? pick('date');
    const updated = pick('updated');
    const iso = updated ?? published;
    if (!iso) continue;

    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) continue;

    dates.set(file.replace(/\.mdx?$/, ''), parsed.toISOString());
    if (!latest || parsed.toISOString() > latest) latest = parsed.toISOString();
  }

  return { dates, latest };
}

const { dates: postDates, latest: latestPostDate } = readPostDates();

/**
 * 给 sitemap 的每条补上 lastmod。
 *
 * 不区分页面类型统统塞构建时间是不行的 —— 每次构建 lastmod 都变，
 * 搜索引擎会认为这个字段不可信，进而整个忽略它，那还不如不写。
 * 所以这里只写「真的知道」的时间：文章用文章日期，聚合页用站内最新文章日期，
 * 其余（首页以外的固定页）留空。
 */
/**
 * @param {import('@astrojs/sitemap').SitemapItem} page
 * @returns {import('@astrojs/sitemap').SitemapItem}
 */
function withLastmod(page) {
  const { pathname } = new URL(page.url);

  const slug = pathname.match(/^\/posts\/(.+?)\/?$/)?.[1];
  if (slug && postDates.has(slug)) return { ...page, lastmod: postDates.get(slug) };

  const isAggregate =
    pathname === '/' ||
    /^\/(archive|tags|categories|page)(\/|$)/.test(pathname) ||
    /^\/tags\/[^/]+\/$/.test(pathname) ||
    /^\/categories\/[^/]+\/$/.test(pathname);

  if (isAggregate && latestPostDate) return { ...page, lastmod: latestPostDate };

  return page;
}

export default defineConfig({
  site: SITE,

  integrations: [svelte(), mdx(), sitemap({ serialize: withLastmod })],

  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  markdown: {
    // Astro 7 的 Markdown 处理器是可插拔的：默认是原生的 Sätteri，
    // 这里换成 unified，因为它能直接用 remark / rehype 生态。
    processor: unified({
      remarkPlugins: [remarkCallouts],
      rehypePlugins: [rehypeHeadingAnchors],
      // 中文排版不需要 SmartyPants 的弯引号转换
      smartypants: false,
    }),

    shikiConfig: {
      // 双主题：亮色黎明、暗色玫瑰松，都是低饱和的暖调配色，和橙色轴同温
      themes: { light: 'rose-pine-dawn', dark: 'rose-pine' },
      // 只输出 CSS 变量，具体用哪套由 prose.css 里的 html.dark 规则决定
      defaultColor: false,
      wrap: true,
    },
  },

  vite: {
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  },
});
