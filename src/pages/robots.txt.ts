import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://wudarensheng.top');
  const sitemap = new URL('sitemap-index.xml', base);

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# 搜索结果、RSS 与登录回调不需要被收录',
    'Disallow: /search.json',
    'Disallow: /auth/',
    '',
    `Sitemap: ${sitemap.href}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
