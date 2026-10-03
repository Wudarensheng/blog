import type { APIRoute } from 'astro';
import { excerpt, getAllPosts, postHref } from '@/lib/posts';

/**
 * 构建期生成静态搜索索引。
 * 只在客户端首次打开搜索框时才会被请求，不影响首屏。
 */
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();

  const docs = posts.map((post) => ({
    id: post.id,
    url: postHref(post),
    title: post.data.title,
    description: post.data.description,
    category: post.data.category,
    tags: post.data.tags,
    date: post.data.published.toISOString().slice(0, 10),
    // 摘要留长一点，搜索时会从中截取命中上下文
    excerpt: excerpt(post, 900),
  }));

  return new Response(JSON.stringify(docs), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
