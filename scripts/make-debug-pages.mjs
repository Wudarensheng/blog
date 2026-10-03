/**
 * 生成交互态调试页，直接写进 dist/（下一次 build 会自然清掉）。
 * 无头浏览器截图时虚拟时钟和 CSS 过渡不同步，所以这里的脚本一律
 * 「先关过渡、再反复点击直到状态生效」，保证拍到的是终态而不是动画中间帧。
 *
 *   pnpm build && node scripts/make-debug-pages.mjs
 */
import fs from 'node:fs';

if (!fs.existsSync('dist/index.html')) {
  console.error('找不到 dist/index.html，请先运行 pnpm build');
  process.exit(1);
}

const home = fs.readFileSync('dist/index.html', 'utf8');
const frame = (src, w, h, caption) =>
  `<figure><figcaption>${caption}</figcaption><iframe src="${src}" width="${w}" height="${h}"></iframe></figure>`;
const shell = (body) => `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 16px; display: flex; gap: 16px; align-items: flex-start;
         background: #6b7280; font: 12px/1.4 system-ui, sans-serif; }
  figure { margin: 0; }
  figcaption { color: #fff; padding: 0 0 6px; font-family: ui-monospace, monospace; }
  iframe { border: 0; background: #fff; display: block; }
</style>
${body}`;
const inject = (html, snippet) => html.replace('</body>', `${snippet}</body>`);

/* 1. 双设备对照 */
fs.writeFileSync(
  'dist/_devices.html',
  shell(frame('/', 390, 1500, '390 × 1500 — 手机') + frame('/', 768, 1500, '768 × 1500 — 平板')),
);

/* 2. 自动打开搜索框 */
fs.writeFileSync(
  'dist/_search.html',
  inject(
    home,
    `<script>window.addEventListener('load',function(){setTimeout(function(){window.dispatchEvent(new CustomEvent('app:search'))},600)})</script>`,
  ),
);

/* 3. 抽屉打开态 */
fs.writeFileSync(
  'dist/_drawer-inner.html',
  inject(
    home,
    `<style>.drawer, .drawer-backdrop { transition: none !important; }</style>
     <script>
       var tries = 0;
       var timer = setInterval(function () {
         var d = document.querySelector('[data-drawer]');
         var btn = document.querySelector('[data-drawer-toggle]');
         if (d && btn && d.dataset.open !== 'true') btn.click();
         if ((d && d.dataset.open === 'true') || ++tries > 60) clearInterval(timer);
       }, 100);
     </script>`,
  ),
);
fs.writeFileSync(
  'dist/_drawer.html',
  shell(frame('/_drawer-inner.html', 390, 860, '390 × 860 — 抽屉打开')),
);

/* 4. 点导航里的「归档」——验证 ClientRouter 没把跳转弄坏 */
fs.writeFileSync(
  'dist/_navtest.html',
  inject(
    home,
    `<script>
       var tries = 0;
       var timer = setInterval(function () {
         if (location.pathname === '/archive/') { clearInterval(timer); return; }
         var link = [...document.querySelectorAll('.links a')]
           .find(function (a) { return a.getAttribute('href') === '/archive/'; });
         if (link) link.click();
         if (++tries > 50) clearInterval(timer);
       }, 150);
     </script>`,
  ),
);

/* 5. 首页：把页面滚到底再滚回来，用来确认滚动揭示的终态 */
fs.writeFileSync(
  'dist/_revealtest.html',
  inject(
    home,
    `<script>
       window.addEventListener('load', function () {
         setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 700);
         setTimeout(function () { window.scrollTo(0, 0); }, 2400);
       });
     </script>`,
  ),
);

console.log('已生成 _devices / _search / _drawer / _navtest / _revealtest');
