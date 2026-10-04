/**
 * 产物自检：确认几个关键特性真的落到了 HTML 上。
 *   node scripts/verify-output.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
let failed = 0;

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
