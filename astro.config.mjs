// @ts-check
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

export default defineConfig({
  site: SITE,

  integrations: [svelte(), mdx(), sitemap()],

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
