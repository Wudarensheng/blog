import { getCollection, type CollectionEntry } from 'astro:content';

/* ============================================================================
   posts.ts · 文章工具集
   ========================================================================== */

export type Post = CollectionEntry<'posts'>;

/* ------------------------------------------------------------- 过滤与排序 --- */

/** 草稿只在 dev 下可见 */
function visible(post: Post): boolean {
  return import.meta.env.DEV || !post.data.draft;
}

/**
 * 全部已发布文章。
 * 排序规则：置顶优先 → 发布日期倒序 → 标题兜底（保证顺序稳定）
 */
export async function getAllPosts(): Promise<Post[]> {
  const posts = (await getCollection('posts')).filter(visible);

  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    const diff = b.data.published.valueOf() - a.data.published.valueOf();
    if (diff !== 0) return diff;
    return a.data.title.localeCompare(b.data.title, 'zh-CN');
  });
}

/** 置顶文章 */
export function pinnedPosts(posts: Post[]): Post[] {
  return posts.filter((p) => p.data.pinned);
}

/* --------------------------------------------------------------- 阅读时长 --- */

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/g;

/** 从 Markdown 源码估算正文字数（中英分开计数） */
export function wordCount(post: Post): number {
  const text = stripMarkdown(post.body ?? '');
  const cjk = (text.match(CJK) ?? []).length;
  const latin = (text.replace(CJK, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).length;
  return cjk + latin;
}

/**
 * 阅读时长（分钟）。
 * 中文约 350 字/分钟，英文约 220 词/分钟，代码块按半速折算。
 */
export function readingTime(post: Post): number {
  const body = post.body ?? '';
  const codeBlocks = body.match(/```[\s\S]*?```/g) ?? [];
  const codeChars = codeBlocks.join('').length;

  const text = stripMarkdown(body.replace(/```[\s\S]*?```/g, ' '));
  const cjk = (text.match(CJK) ?? []).length;
  const latin = (text.replace(CJK, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).length;

  const minutes = cjk / 350 + latin / 220 + codeChars / 900;
  return Math.max(1, Math.round(minutes));
}

/** 去掉 Markdown 语法，得到近似纯文本 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 生成搜索索引用的纯文本摘要（截断到指定长度） */
export function excerpt(post: Post, length = 400): string {
  const text = stripMarkdown(post.body ?? '');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

/* ----------------------------------------------------------------- 邻篇 --- */

export interface Adjacent {
  /** 时间上更早的一篇 */
  older?: Post;
  /** 时间上更晚的一篇 */
  newer?: Post;
}

/**
 * 上下篇。传入的 posts 必须是 `getAllPosts()` 的顺序（置顶在前、日期倒序）。
 * 置顶文章不参与上下篇推导，避免时间线错乱。
 */
export function getAdjacent(posts: Post[], id: string): Adjacent {
  const timeline = posts.filter((p) => !p.data.pinned);
  const index = timeline.findIndex((p) => p.id === id);
  if (index === -1) return {};
  return {
    newer: index > 0 ? timeline[index - 1] : undefined,
    older: index < timeline.length - 1 ? timeline[index + 1] : undefined,
  };
}

/** 相关文章：同分类 +1 分，每个共同标签 +2 分 */
export function getRelated(posts: Post[], current: Post, limit = 3): Post[] {
  const tags = new Set(current.data.tags);

  return posts
    .filter((p) => p.id !== current.id)
    .map((p) => {
      let score = 0;
      if (p.data.category === current.data.category) score += 1;
      for (const tag of p.data.tags) if (tags.has(tag)) score += 2;
      return { post: p, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.data.published.valueOf() - a.post.data.published.valueOf(),
    )
    .slice(0, limit)
    .map((item) => item.post);
}

/* ------------------------------------------------------------ 归档与索引 --- */

export interface YearGroup {
  year: number;
  posts: Post[];
}

export function groupByYear(posts: Post[]): YearGroup[] {
  const map = new Map<number, Post[]>();

  for (const post of posts) {
    const year = post.data.published.getFullYear();
    const bucket = map.get(year);
    if (bucket) bucket.push(post);
    else map.set(year, [post]);
  }

  return [...map.entries()]
    .map(([year, list]) => ({
      year,
      posts: list.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf()),
    }))
    .sort((a, b) => b.year - a.year);
}

export interface FacetItem {
  name: string;
  slug: string;
  count: number;
}

export function countByCategory(posts: Post[]): FacetItem[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    map.set(post.data.category, (map.get(post.data.category) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function countByTag(posts: Post[]): FacetItem[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

/* ------------------------------------------------------------------ 链接 --- */

/**
 * 生成 URL 片段。保留中日韩文字，去掉标点与空格。
 * 注意：`getStaticPaths` 里的参数与页面里的链接必须走同一个函数。
 */
export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'untagged';
}

export const postHref = (post: Post): string => `/posts/${post.id}/`;
export const categoryHref = (name: string): string => `/categories/${slugify(name)}/`;
export const tagHref = (name: string): string => `/tags/${slugify(name)}/`;

/** 按 slug 反查分类 / 标签的原始名称 */
export function findFacet(items: FacetItem[], slug: string): FacetItem | undefined {
  return items.find((item) => item.slug === slug);
}
