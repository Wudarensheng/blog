import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '@/config';
import { excerpt, getAllPosts, postHref } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: postHref(post),
      categories: [post.data.category, ...post.data.tags],
      author: site.title,
      // 只带一段纯文本摘要，读者点进站内阅读全文
      content: excerpt(post, 300),
    })),
    customData: `<language>zh-cn</language><copyright>${site.title}</copyright>`,
  });
}
