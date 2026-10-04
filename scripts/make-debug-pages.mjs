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

/* 5. 导航栏滚动行为的确定性测试
 *
 * 无头环境里有两件事会让「直接滚动再截图」测不准，两个坑都踩过了：
 *
 *   a) base.css 有 scroll-behavior: smooth，scrollTo 是动画滚动；
 *      立刻派发 scroll 的话，判定逻辑读到的是中途位置。
 *   b) 这个内联脚本比 Astro 的 type="module" 先执行，
 *      不等水合就开始的话，派发出去的事件没有监听者。
 *
 * 所以这里先轮询等待 HeaderBehavior 水合（Astro 水合后会摘掉 ssr 属性），
 * 再把平滑滚动关掉，逐步驱动并核对每一步的 data-hidden。
 */
const SCROLL_PROBE = `<style>
  #probe {
    position: fixed; inset: auto 0 0 0; z-index: 99999; margin: 0; padding: 10px 12px;
    background: #0b0b0b; color: #eee; font: 13px/1.7 ui-monospace, monospace; white-space: pre;
  }
</style>
<pre id="probe">运行中…</pre>
<script>
(function () {
  document.documentElement.style.scrollBehavior = 'auto';

  var out = document.getElementById('probe');
  var nav = document.querySelector('[data-navbar]');
  var rows = [];

  function snap() {
    var r = nav.getBoundingClientRect();
    return {
      y: Math.round(window.scrollY),
      hidden: nav.getAttribute('data-hidden') === 'true',
      scrolled: nav.getAttribute('data-scrolled') === 'true',
      top: Math.round(r.top)
    };
  }

  var plan = [
    [0,    '顶部 0px —— 不隐藏',                 false],
    [80,   '轻滚 80px —— 未过 140px 阈值',        false],
    [400,  '下滚 400px —— 隐藏',                 true],
    [900,  '继续下滚 900px —— 保持隐藏',          true],
    [905,  '原地微动 5px（小于 8px 阈值）—— 不变', true],
    [600,  '上滚 600px —— 立刻出现',              false],
    [30,   '回到近顶 30px —— 可见',               false],
    [700,  '再下滚 700px —— 重新隐藏',            true],
    [0,    '直接跳回顶部 —— 可见',                false]
  ];

  var i = 0;
  function next() {
    if (i >= plan.length) { done(); return; }
    var p = plan[i++];
    window.scrollTo(0, p[0]);
    window.dispatchEvent(new Event('scroll'));
    var s = snap();
    rows.push({ label: p[1], expect: p[2], got: s.hidden, y: s.y, top: s.top, scrolled: s.scrolled });
    setTimeout(next, 0);
  }

  function done() {
    var bad = rows.filter(function (r) { return r.got !== r.expect; });
    out.textContent = rows.map(function (r) {
      return (r.got === r.expect ? '  OK   ' : '  FAIL ') + r.label +
        '   scrollY=' + r.y + '  hidden=' + r.got + '(期望 ' + r.expect + ')' +
        '  scrolled=' + r.scrolled;
    }).join('\\n') + '\\n\\n' + (bad.length ? bad.length + ' 项失败' : '全部 ' + rows.length + ' 项通过');
  }

  function waitForHydration(tries) {
    var el = document.querySelector('astro-island[component-url*="HeaderBehavior"]');
    if (el && !el.hasAttribute('ssr')) { next(); return; }
    if (tries > 200) {
      out.textContent = '等待 HeaderBehavior 水合超时（' +
        (el ? '元素在，但 ssr 属性未摘除' : '找不到岛屿元素') + '）';
      return;
    }
    setTimeout(function () { waitForHydration(tries + 1); }, 50);
  }

  waitForHydration(0);
})();
</script>`;

fs.writeFileSync('dist/_scroll-probe.html', inject(home, SCROLL_PROBE));

console.log('已生成 _devices / _search / _drawer / _navtest / _revealtest / _scroll-probe');

