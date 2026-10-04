/**
 * 产物自检：确认几个关键特性真的落到了 HTML 上。
 *   node scripts/verify-output.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
let failed = 0;

/**
 * 站点地址有两个来源，且必须一致（sitemap / RSS 要绝对地址）。
 * 这里从 astro.config.mjs 取，再跟 src/config.ts 对一次 ——
 * 改了一处忘了另一处是个很容易犯、又很难发现的错。
 */
const SITE_URL =
  fs.readFileSync('astro.config.mjs', 'utf8').match(/const SITE = '([^']+)'/)?.[1] ?? '';
const CONFIG_URL =
  fs.readFileSync('src/config.ts', 'utf8').match(/url:\s*'([^']+)'/)?.[1] ?? '';

function check(label, ok, detail = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

function read(file) {
  return fs.readFileSync(path.join(DIST, file), 'utf8');
}

console.log('\n[文章页] dist/posts/clawcloudrun-free-docker/index.html');
const post = read('posts/clawcloudrun-free-docker/index.html');

check('生成提示块 .callout', post.includes('class="callout callout-warning"'));
check('提示块标题', post.includes('callout-title'));
check('提示块保留了正文', post.includes('重要'));
check('提示块无残留标记', !post.includes(':::'));
check('标题有 id', /<h2 id="[^"]+"/.test(post));
check('标题有锚点链接', post.includes('heading-anchor'));
check('代码块高亮 (astro-code)', post.includes('astro-code'));
check('Shiki 双主题变量', post.includes('--shiki-dark') && post.includes('--shiki-light'));
check('暖色圆环头像', post.includes('avatar-ring'));
check('阅读进度条岛屿', post.includes('astro-island'));
check('Svelte 主题切换已水合', post.includes('theme-toggle'));
check('目录（侧栏 + 移动端）', post.includes('目录'));
check('RSS / canonical', post.includes('rel="canonical"') && post.includes('/rss.xml'));
check('OG 元信息', post.includes('og:title') && post.includes('og.png'));
check('面包屑', post.includes('面包屑'));

console.log('\n[迁移] 来自 Fuwari 的内容是否完整落地');
const postDirs = fs
  .readdirSync(path.join(DIST, 'posts'))
  .filter((d) => fs.existsSync(path.join(DIST, 'posts', d, 'index.html')));
check('12 篇文章全部生成', postDirs.length === 12, `实际 ${postDirs.length} 篇`);

const migratedImages = fs
  .readdirSync(path.join(DIST, '_astro'))
  .filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
check('文章图片进了优化产物', migratedImages.length >= 10, `${migratedImages.length} 个`);

const dockerPost = read('posts/clawcloudrun-free-docker/index.html');
check('正文插图渲染为 img', /<img[^>]+src="\/_astro\//.test(dockerPost));

const homeHtml = read('index.html');
check('导航不再含「工具」', !homeHtml.includes('/tools/'));
check('也没有生成 tools 目录', !fs.existsSync(path.join(DIST, 'tools')));
check('导航栏没有 logo 方块', !homeHtml.includes('class="logo"'));
check('导航含「监测」下拉', homeHtml.includes('nav-drop-panel'));
const dropPanel = homeHtml.match(/nav-drop-panel[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? '';
check(
  '监测下拉有三个外链',
  (dropPanel.match(/href="https:\/\//g) ?? []).length === 3,
  `${(dropPanel.match(/href="https:\/\//g) ?? []).length} 个`,
);
check(
  '导航项数量正确（6 个页面 + 1 个下拉）',
  (homeHtml.match(/class="nav-link|nav-drop-trigger"/g) ?? []).length === 7,
  `${(homeHtml.match(/class="nav-link|nav-drop-trigger"/g) ?? []).length} 项`,
);

console.log('\n[友链] 每条都要真的有链接');
const friendsHtml = read('friends/index.html');
const friendTags = friendsHtml.match(/<a[^>]*class="friend card[^"]*"[^>]*>/g) ?? [];
check('友链卡片已渲染', friendTags.length > 0, `${friendTags.length} 条`);

/*
 * 这条守卫来自一个真实事故：友链数据从 Fuwari 复制过来时字段名是 link，
 * 而主题读的是 href，于是 href 为 undefined —— <a> 渲染出来没有 href，
 * 点了毫无反应，页面构建、类型检查、其它自检全都不会报错。
 */
const friendHrefs = friendTags.map((tag) => tag.match(/\shref="([^"]*)"/)?.[1] ?? '');
const brokenLinks = friendHrefs.filter((h) => !/^https?:\/\/\S+$/.test(h));
check(
  '每条友链都有可用的 http(s) 地址',
  brokenLinks.length === 0,
  brokenLinks.length ? `${brokenLinks.length} 条没有链接：${friendHrefs.filter((h) => !/^https?:/.test(h)).join(' | ') || '(空)'}` : '',
);
check(
  '友链都开了新标签页',
  friendTags.every((tag) => tag.includes('target="_blank"')),
);

const aboutHtml = read('about/index.html');
check('关于页有真实自我介绍', aboutHtml.includes('精神状态良好的神人初中生'));
check(
  '关于页有技术栈',
  aboutHtml.includes('Astro') && aboutHtml.includes('Cloudflare'),
);
check(
  '关于页有仓库链接',
  /github\.com\/Wudarensheng\/[\w.-]+/.test(aboutHtml),
);

check('Bing 站点验证文件已迁移', fs.existsSync(path.join(DIST, 'BingSiteAuth.xml')));
check('头像已本地化', fs.existsSync(path.join(DIST, 'avatar.jpg')));
check('favicon 已本地化', fs.existsSync(path.join(DIST, 'favicon.ico')));

console.log('\n[首页] dist/index.html');
const home = read('index.html');
check('Banner 渲染', home.includes('class="banner'));
check('首页没有开场问候卡片', !home.includes('你好，我是'));
check('首页直接进文章列表', home.includes('id="posts"') && home.indexOf('id="posts"') < home.indexOf('post-card'));
check('文章卡片', (home.match(/class="post-card/g) ?? []).length >= 5);
check('body 标记有 Banner', home.includes('data-banner="true"'));
check('导航栏浮层', home.includes('data-transparent="true"'));
check('搜索按钮触发器', home.includes('data-search-trigger'));
check('生成封面 CoverArt', home.includes('cover-art'));

console.log('\n[归档] dist/archive/index.html');
const archive = read('archive/index.html');
check('年份分组', /<h2[^>]*>\d{4}<\/h2>/.test(archive));

console.log('\n[标签总览] dist/tags/index.html');
const tags = read('tags/index.html');
check('标签云', (tags.match(/class="tag"/g) ?? []).length >= 10);

console.log('\n[分类详情] dist/categories/白嫖/index.html');
const cat = read('categories/白嫖/index.html');
check('中文路径可生成', cat.length > 1000);
check('列表里有文章卡片', cat.includes('post-card'));

console.log('\n[搜索索引] dist/search.json');
const search = JSON.parse(read('search.json'));
check('是数组且非空', Array.isArray(search) && search.length > 0, `${search.length} 条`);
check('字段完整', ['id', 'url', 'title', 'description', 'category', 'tags', 'date', 'excerpt'].every((k) => k in search[0]));

console.log('\n[RSS] dist/rss.xml');
const rss = read('rss.xml');
check('是 RSS', rss.includes('<rss'));
check('条目数正确', (rss.match(/<item>/g) ?? []).length === search.length);

console.log('\n[robots] dist/robots.txt');
check('含 sitemap', read('robots.txt').includes('Sitemap:'));

console.log('\n[站点地址] astro.config.mjs 与 src/config.ts 必须一致');
check(
  '两处地址相同',
  SITE_URL === CONFIG_URL && SITE_URL !== '',
  `astro=${SITE_URL || '(空)'}  config=${CONFIG_URL || '(空)'}`,
);
check('是 https 绝对地址', /^https:\/\/[^/]+$/.test(SITE_URL), SITE_URL);

console.log('\n[sitemap] 与实际产出的页面对齐');
const sitemapXml = read('sitemap-0.xml');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
check('生成了 sitemap-index', /<sitemapindex/.test(read('sitemap-index.xml')));

/*
 * 这一条来自一次真实排查：sitemap 看着「怪怪的」，但把 URL 和 dist 里
 * 实际生成的页面对一遍才发现是 1:1 的 —— 真正缺的是 lastmod。
 * 所以两头都要盯：不能有指向不存在页面的条目，也不能漏掉已生成的页面。
 */
const builtPages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '_astro') walk(p);
    } else if (e.name === 'index.html') {
      const rel = path.relative(DIST, path.dirname(p)).split(path.sep).join('/');
      builtPages.push(rel === '' ? '/' : `/${rel}/`);
    }
  }
})(DIST);

const toPath = (u) => decodeURIComponent(u.replace(SITE_URL, '')) || '/';
const sitemapPaths = new Set(sitemapUrls.map(toPath));
const builtSet = new Set(builtPages);

const ghost = [...sitemapPaths].filter((u) => !builtSet.has(u));
const missing = [...builtSet].filter((u) => !sitemapPaths.has(u));
check('没有指向不存在页面的条目', ghost.length === 0, ghost.join(', '));
check('没有漏掉已生成的页面', missing.length === 0, missing.join(', '));
check('条目数与页面数一致', sitemapUrls.length === builtPages.length, `${sitemapUrls.length} vs ${builtPages.length}`);

const lastmods = (sitemapXml.match(/<lastmod>/g) ?? []).length;
check(
  '文章与聚合页都带 lastmod',
  lastmods >= sitemapUrls.length - 4,
  `${lastmods} / ${sitemapUrls.length} 条（about、friends 无日期，留空是对的）`,
);
/*
 * lastmod 的关键不变式不是「各不相同」—— 两篇文章同一天发布完全正常
 * （这里就有两篇是 2026-02-11）。真正要防的是「所有条目都被写成构建时间」，
 * 那会让搜索引擎认定这个字段不可信，进而整个忽略它。
 */
const postLastmods = [...sitemapXml.matchAll(/\/posts\/[^<]*<\/loc><lastmod>([^<]+)</g)].map(
  (m) => m[1],
);
check('每篇文章都带 lastmod', postLastmods.length === 12, `${postLastmods.length} 篇`);
check(
  'lastmod 是合法 ISO 日期',
  postLastmods.every((d) => !Number.isNaN(new Date(d).getTime())),
);
check(
  'lastmod 不是清一色的构建时间',
  new Set(postLastmods).size > 1,
  `${new Set(postLastmods).size} 个不同日期`,
);

console.log('\n[链接一致性] 检查所有内部链接是否有对应产物');
const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'index.html') pages.push(full);
  }
})(DIST);

const broken = new Set();
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  // 只看站内绝对链接（跳过静态资源与锚点）
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/_astro/')) continue;
    const target = path.join(DIST, href.endsWith('/') ? `${href}index.html` : href);
    const alt = path.join(DIST, `${href}/index.html`);
    if (!fs.existsSync(target) && !fs.existsSync(alt) && !fs.existsSync(path.join(DIST, href))) {
      broken.add(`${href}  (来自 ${path.relative(DIST, page)})`);
    }
  }
}

check('没有断链', broken.size === 0, broken.size ? `\n      ${[...broken].slice(0, 12).join('\n      ')}` : '');

console.log('\n[配色] 令牌是否完整落地到产物');
// 从 tokens.css 里读出当前配色，反向确认它们真的进了构建好的 CSS；
// 顺便挡住任何「换了配色但漏改一处」的情况。
const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8');
const declared = [...tokens.matchAll(/(#[0-9a-f]{6})\b/gi)].map((m) => m[1].toLowerCase());
const unique = [...new Set(declared)];

const bundleCss = fs
  .readdirSync(path.join(DIST, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(DIST, '_astro', f), 'utf8'))
  .join('')
  .toLowerCase();

const notShipped = unique.filter((hex) => !bundleCss.includes(hex));
check(
  `tokens.css 里的 ${unique.length} 个色值都进了产物`,
  notShipped.length === 0,
  notShipped.length ? `缺失 ${notShipped.join(', ')}` : '',
);

// 旧配色的残留检查（换配色时把上一版的色值填进来）
const RETIRED = ['#f9b8c9', '#d4496a', '#fff2f6', '#a8ddbc', '#3a9166', '#eefaf3', '#94cfe8', '#3585aa', '#eef8fd'];
const allHtml = pages.map((p) => fs.readFileSync(p, 'utf8')).join('') + bundleCss;
const leaked = RETIRED.filter((hex) => allHtml.includes(hex));
check('没有上一版配色的残留', leaked.length === 0, leaked.join(', '));

// 变量名也不能有残留
const sourceFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(astro|svelte|ts|css|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
})('src');
const legacyVars = sourceFiles.filter((f) =>
  /--(sakura|mint|sky)\b/.test(fs.readFileSync(f, 'utf8')),
);
check('源码里没有旧变量名', legacyVars.length === 0, legacyVars.join(', '));

console.log('\n[质感] 全站不含渐变');
// 设计上完全不用渐变——这里从产物反向确认，防止以后不小心又引入。
// 注意：只检查「样式」，文章正文里的代码示例不算（比如讲 CSS 的文章会引用 gradient()）。
const stripContent = (html) =>
  html
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code[\s\S]*?<\/code>/g, '');

const gradientHits = [];
for (const page of pages) {
  const html = stripContent(fs.readFileSync(page, 'utf8'));
  for (const m of html.matchAll(/[\w-]*gradient\(/g)) {
    gradientHits.push(`${path.relative(DIST, page)} → ${m[0]}`);
  }
}
for (const m of bundleCss.matchAll(/[\w-]*gradient\(/g)) {
  gradientHits.push(`_astro/*.css → ${m[0]}`);
}
check(
  '样式与标记里没有 gradient()',
  gradientHits.length === 0,
  gradientHits.length ? `\n      ${[...new Set(gradientHits)].slice(0, 8).join('\n      ')}` : '',
);

const gradSources = sourceFiles.filter((f) =>
  /gradient\(/.test(fs.readFileSync(f, 'utf8')),
);
check('源码里没有 gradient()', gradSources.length === 0, gradSources.join(', '));

const svgGradients = fs
  .readdirSync('public')
  .filter((f) => f.endsWith('.svg'))
  .filter((f) => /Gradient/i.test(fs.readFileSync(path.join('public', f), 'utf8')));
check('public/*.svg 里没有渐变元素', svgGradients.length === 0, svgGradients.join(', '));

console.log('\n[动效] 动画层是否正确接入');
const homeForMotion = read('index.html');

check('初始化脚本挂了 html.js', /classList\.add\(['"]js['"]\)/.test(homeForMotion));
check(
  '动效只在 html.js 下生效',
  bundleCss.includes('html.js [data-reveal'),
  '没找到 html.js 前缀的初始隐藏规则',
);
check('动效层提供了降级', bundleCss.includes('prefers-reduced-motion'));
check('页面进入动画已注入', bundleCss.includes('page-enter'));
check('Reveal 岛屿已挂载', homeForMotion.includes('astro-island'));
check(
  'View Transitions 已启用',
  /astro-router|astro:transitions|ClientRouter/i.test(homeForMotion),
);
check(
  '导航栏 / 抽屉 / 全局岛屿标注了 persist',
  (homeForMotion.match(/data-astro-transition-persist/g) ?? []).length >= 6,
  `${(homeForMotion.match(/data-astro-transition-persist/g) ?? []).length} 处`,
);
check(
  '导航栏有向下滚隐藏的样式',
  // bundleCss 已统一转小写；CSS 压缩后 [data-hidden='true'] 也会变成 [data-hidden=true]
  /\[data-hidden[^\]]*\]/.test(bundleCss) && bundleCss.includes('translatey(-100%)'),
);
// 服务端渲染时导航栏必须是可见的：不能把隐藏状态写死在标记里，
// 否则关掉 JS 的读者一进页面就没有导航栏。
check(
  '导航栏初始不隐藏（SSR 标记里没有 data-hidden）',
  !/data-navbar[^>]*data-hidden/.test(homeForMotion),
);

// 服务端渲染的 HTML 里不应该出现 data-reveal —— 那是 JS 在运行时加的。
// 如果出现了，说明初始隐藏被写死在标记里，关掉 JS 的读者会看到一片空白。
check(
  '初始隐藏没有写死在 SSR 标记里',
  !/data-reveal=/.test(homeForMotion),
);

console.log('\n[404] 快捷入口是否只取真实页面链接');
const notFound = read('404.html');
const shortcuts = [...notFound.matchAll(/<a class="btn"[^>]*href="([^"]*)"/g)].map((m) => m[1]);
check('有 6 个快捷入口', shortcuts.length === 6, `${shortcuts.length} 个`);
check('首页排在第一', shortcuts[0] === '/');
check(
  '没有空 href',
  !/href="(undefined|)"/.test(notFound),
  '导航里没有 href 的下拉父项泄进了 404 按钮',
);
check(
  '下拉父项没有被当成按钮',
  !/class="btn"[^>]*>\s*<svg[^>]*>[\s\S]{0,400}?监测/.test(notFound),
);

console.log(`\n${failed === 0 ? '全部通过 ✓' : `${failed} 项未通过`}\n`);
process.exit(failed === 0 ? 0 : 1);
