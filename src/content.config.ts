import { defineCollection } from 'astro:content';
// Astro 7 起推荐直接从 astro/zod 取 z（astro:content 的 z 已标记废弃）
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/* ============================================================================
   内容集合
   ----------------------------------------------------------------------------
   文章放在 src/content/posts/ 下，支持 .md 与 .mdx。
   ========================================================================== */

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      /** 标题 */
      title: z.string().max(80),
      /** 摘要，列表卡片与 SEO description 共用 */
      description: z.string().max(240),
      /** 发布日期 */
      published: z.coerce.date(),
      /** 最后更新日期，留空则不显示 */
      updated: z.coerce.date().optional(),
      /** 封面图：相对当前 Markdown 文件的本地图片路径，会走 Astro 图片优化 */
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** 分类：一篇文章只属于一个分类 */
      category: z.string().default('未分类'),
      /** 系列：跨分类的横向归类（从 Fuwari 迁移过来的字段） */
      series: z.string().optional(),
      /** 标签 */
      tags: z.array(z.string()).default([]),
      /** 草稿：dev 下可见，build 时会被排除 */
      draft: z.boolean().default(false),
      /** 置顶 */
      pinned: z.boolean().default(false),
      /** 手动指定该文章的点缀色；留空则按标题哈希自动分配 */
      accent: z.enum(['orange', 'amber', 'clay']).optional(),
      /** 正文语言覆盖，默认跟随站点 */
      lang: z.string().optional(),
      /** 是否显示文末版权声明，默认跟随 posts.license.enabled */
      license: z.boolean().optional(),
    }),
});

export const collections = { posts };
