# 橙白 · Orange & White

一个清新、克制的 Astro + Svelte 博客主题。布局参考 [Fuwari](https://github.com/saicaca/fuwari)：
固定导航栏 + 通栏 Banner + 左内容右侧栏的两栏栅格。

视觉语言见 **[DESIGN.md](./DESIGN.md)** —— 一句话概括：**白色是画布，橙是那支笔。**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](./LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE.svg)](https://astro.build)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00.svg)](https://svelte.dev)

> 仓库里的文章与站点信息来自作者自己的博客。**想拿它当自己的主题用，
> 直接清空 `src/content/posts/` 与 `src/assets/images/posts/`，再改 `src/config.ts` 即可。**
>
> 内容从既有的 Fuwari 站点迁移而来，源目录全程只读 ——
> 迁移脚本见 `scripts/migrate-fuwari.mjs`，它会在运行前后比对源目录指纹，任何改动都会被发现。

---

## 特性

**设计**

- 单色系配色：整站只有一条暖色轴，取琥珀 / 正橙 / 陶土三站，由 CSS 变量与 `data-accent` 驱动，组件不需要知道自己是哪一站
- 中性色全部带暖调（stone 系），冷灰挨着橙色会显脏
- **全站零渐变**：装饰一律是平色——实心圆、实心描边、纯色块。`pnpm verify` 里有守卫，产物里出现 `gradient()` 就会失败
- 亮 / 暗 / 跟随系统三态主题，首次绘制前完成判定，不闪白
- 零外部字体、零图标字体、零 CSS 框架 —— 全部是手写 CSS 与构建期内联的 SVG
- 三个响应式断点，缩小屏幕时「先减装饰，再减内容」

**动效**

- 滚动揭示：卡片、侧栏、归档年份进入视口时淡入上浮，按序错峰
- 首屏元素只位移不淡入，避免拖慢 LCP
- 图片加载完成后淡入（正确处理「已缓存的图不会触发 load」这个坑）
- View Transitions 页面切换，导航栏与全局岛屿 `transition:persist`，切页不闪、不重下脚本
- **关掉 JavaScript 页面依然完整可读**；`prefers-reduced-motion` 时整个动效层停用
- 全部动画集中在 `src/styles/motion.css`，一处可看全、一处可关掉

**功能**

- 文章：分类、标签、系列、置顶、草稿、相关文章、上下篇、版权声明、阅读时长与字数
- 归档时间线、分类总览、标签云、友链页、关于页、404
- 全站搜索（构建期生成索引，`Ctrl/⌘ + K` 或 `/` 唤起）
- 侧栏目录带滚动高亮，移动端回退到零 JS 的 `<details>`
- 顶部阅读进度条、回到顶部（带环形进度）、图片灯箱、代码块复制按钮
- 导航支持下拉菜单，纯 CSS 驱动（`:hover` + `:focus-within`），不需要 JS
- 提示块语法 `:::note` / `:::tip` / `:::warning`，三种类型对应暖色三站
- RSS、Sitemap、`robots.txt`、Open Graph / Twitter Card 元信息

**工程**

- Astro 岛屿架构：默认零 JavaScript，只有 8 个真正有状态的组件挂 `client:*`
- Svelte 5 runes 编写，全部交互组件都不依赖任何第三方 UI 库
- 内容集合带 zod 校验，frontmatter 写错字段会在构建期报错
- 自带三个自检脚本（图标引用、Markdown 插件单测、产物完整性）

### 体积（实测）

| | 原始 | gzip |
|---|---|---|
| JavaScript（全站所有岛屿合计） | 91.2 KB | **38.6 KB** |
| CSS | 71.4 KB | **14.7 KB** |

其中约 42 KB 是 Astro 的岛屿运行时（含 View Transitions 路由器），其余是各个交互组件本身。
没有 UI 框架、没有图标包、没有外部字体。

---

## 快速开始

```bash
git clone https://github.com/Wudarensheng/blog.git
cd blog
pnpm install
pnpm dev          # http://localhost:4321
```

生产构建与本地预览：

```bash
pnpm build        # 产物在 dist/
pnpm preview      # 预览构建结果
```

> 需要 Node 18+（开发时使用 Node 24 / pnpm 11 验证）。
>
> 用 npm / yarn 也可以，但仓库里带的是 `pnpm-lock.yaml`，
> 另外 `pnpm-workspace.yaml` 里的 `allowBuilds` 是 pnpm 11 的必需配置
> （esbuild 与 sharp 需要允许构建脚本），换包管理器时要留意。

---

## 目录结构

```
blog/
├── astro.config.mjs          集成、Markdown 管线、Shiki 双主题
├── src/
│   ├── config.ts             ★ 站点配置：改这一个文件就能换成你自己的
│   ├── content.config.ts     内容集合的 zod schema
│   ├── content/posts/        文章（Markdown / MDX）
│   ├── assets/images/posts/  文章插图（迁移自 Fuwari，走 Astro 图片优化）
│   │
│   ├── styles/
│   │   ├── tokens.css        ★ 设计令牌：颜色、字号、圆角、阴影、间距、缓动
│   │   ├── base.css          重置 + 通用原子（.card / .pill / .dots / .btn）
│   │   ├── prose.css         正文排版（含 Shiki 双主题与提示块）
│   │   ├── layout.css        页面骨架（.site / .main-grid / .sidebar）
│   │   ├── motion.css        ★ 动效层：滚动揭示、图片淡入、页面进入、微交互
│   │   └── app.css           样式入口
│   │
│   ├── lib/
│   │   ├── accent.ts         三站轮转（序号轮转 / 标题哈希）
│   │   ├── format.ts         日期与时长格式化
│   │   └── posts.ts          文章查询、阅读时长、归档分组、相邻文章
│   │
│   ├── plugins/
│   │   ├── remark-callouts.mjs         `:::note` 容器语法（兼容 CRLF）
│   │   └── rehype-heading-anchors.mjs  标题锚点与 id
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro  <head>、主题初始化、导航栏、页脚、全局岛屿、View Transitions
│   │   └── MainLayout.astro  Fuwari 式两栏栅格 + 侧栏
│   │
│   ├── components/
│   │   ├── common/           Icon / Dots / CoverArt / PageHeader
│   │   ├── layout/           Navbar（含下拉）/ MobileDrawer / Footer / Banner / 侧栏卡片
│   │   ├── post/             PostCard / PostList / Pagination / PostNav / 版权 / 目录
│   │   ├── views/            首页 / 文章 / 归档 / 分类标签 的页面主体
│   │   └── svelte/           ★ 12 个交互岛屿
│   │
│   └── pages/                路由
└── scripts/                  迁移、图标校验、插件单测、产物自检、素材生成、调试页
```

---

## 交互组件（Svelte 岛屿）

| 组件 | 加载时机 | 职责 |
|------|---------|------|
| `ThemeToggle` | `client:load` | 亮 / 暗 / 跟随系统三态循环 |
| `HeaderBehavior` | `client:load` | 导航栏滚动状态、移动端抽屉、搜索入口（无渲染） |
| `ReadingProgress` | `client:load` | 顶部阅读进度条（平色） |
| `Reveal` | `client:load` | 滚动揭示：按选择器自动找目标并错峰（无渲染） |
| `SearchModal` | `client:idle` | 站内搜索：懒加载索引、键盘导航、高亮命中 |
| `TableOfContents` | `client:load` | 侧栏目录的滚动高亮 |
| `BackToTop` | `client:idle` | 回到顶部 + 环形进度 |
| `Lightbox` | `client:idle` | 正文图片放大 |
| `ProseEnhance` | `client:idle` | 代码块外壳与复制、表格滚动容器、外链补 `rel` |
| `ImageFade` | `client:idle` | 图片加载完成后淡入（无渲染） |
| `PetalField` | `client:idle` | 可选的暖色粒子背景（默认关闭） |

每个岛屿都不依赖外部 UI 库；图标在 Astro 侧构建期内联、在 Svelte 侧只保留了 12 个真正用到的
简单几何图形（见 `src/components/svelte/icons.ts`），因此客户端包里没有任何图标数据。

`Reveal` 与 `ImageFade` 是**无渲染的行为岛屿**：它们不产出标记，只按选择器给已有元素挂状态。
好处是 Astro 组件保持纯静态，不用为了动画改结构。

---

## 定制

### 1. 站点信息

编辑 `src/config.ts`：

```ts
export const site = {
  url: 'https://blog.wudarensheng.top',   // ⚠️ 同时改 astro.config.mjs 里的 SITE
  title: 'Wudarensheng blog',
  description: '……',
  greeting: { hello: '你好，我是', name: '无大人参', emphasis: '把折腾写下来', … },
};

export const nav = [ … ];        // 导航
export const socials = [ … ];    // 社交链接（图标写 `图标集:图标名`）
export const banner = { … };     // 首页 Banner
export const sidebar = { … };    // 侧栏开关与上限
export const comments = { … };   // 评论挂载点
```

`profile.avatar`、`friends`、`footer` 也都在同一个文件里。

### 2. 配色

只改 `src/styles/tokens.css` 顶部的九行即可：

```css
--orange: #ff9d45;  --orange-d: #b8510e;  --orange-l: #fff5ec;
--amber:  #f2bc55;  --amber-d:  #8a6210;  --amber-l:  #fdf8ea;
--clay:   #dd7350;  --clay-d:   #9c3f22;  --clay-l:   #fdf1ec;
```

连带要改的还有三处（DESIGN.md 末尾有完整清单）：
`html.dark` 里的浅色填充、`--brand` 与 `--ring` 两个全局强调色、以及 `scripts/make-assets.py` 里生成封面用的 RGB 常量。

> **注意三个站点不要挨太近。** 如果只做成同一个橙的明度变化，卡片之间的轮转就看不出来了。
> 现在这条轴的色相跨度约 35°（金黄 → 正橙 → 红棕），既统一又能一眼分辨。

### 3. 图标

图标名走 `@iconify-json/*`，在构建期查表并内联成 SVG，写错名字会直接让构建失败。
改完图标后跑一次校验：

```bash
pnpm icons        # 检查 src/ 下所有 lucide:xxx / simple-icons:xxx 引用
```

想用别的图标集，就在 `src/components/common/Icon.astro` 的 `SETS` 里加一行，
并安装对应的 `@iconify-json/<集合名>`。

---

## 写文章

在 `src/content/posts/` 下新建 `.md` 或 `.mdx`：

```markdown
---
title: 文章标题
description: 一句话摘要，列表卡片和 SEO 都用它
published: 2025-03-14
updated: 2025-04-02          # 可选
cover: ../../assets/covers/x.png   # 可选，相对本文档的路径
coverAlt: 封面描述            # 可选
category: 前端                # 一篇文章只属于一个分类
tags: [Astro, Svelte]
pinned: false                # 置顶
draft: false                 # 草稿：dev 可见，build 排除
accent: clay                 # 可选，手动指定点缀色（orange / amber / clay）
license: false               # 可选，覆盖全站版权声明开关
---

正文……
```

**没有 `cover` 时**，`CoverArt.astro` 会用平色几何块现场拼一张：底色取该文章那一站的浅色版本，
两个实心圆用另外两站（靠透明度叠层次），角落一圈描边圆环，左下三点装饰，右下角一个半透明的标题首字。
零图片请求，也不含任何渐变。

### 提示块

```
:::note 可选标题
正文，支持 **行内格式**。
:::
```

五种类型（`note` / `tip` / `important` / `warning` / `caution`）映射到暖色三站：
note 琥珀、tip 与 important 正橙、warning 与 caution 陶土。
标记行可以独占一行，也可以和正文连写（不留空行）。

---

## 从 Fuwari 迁移内容

如果你手上有一个 Fuwari 站点，想把文章搬过来，可以用仓库里的迁移脚本：

```bash
node scripts/migrate-fuwari.mjs <Fuwari 站点的根目录>
# 或
FUWARI_SRC=<Fuwari 站点的根目录> node scripts/migrate-fuwari.mjs
```

**源目录全程只读**，脚本在两个层次上保证这一点：

1. 每个写操作都要先断言「目标在本仓库内」且「目标不在源目录内」——
   后者才是真正危险的情况：迁移脚本反向污染被迁移的站点。
2. 迁移前后各算一次源目录的 SHA-256 指纹（逐文件），
   完全一致才退出 0，否则立刻报错。

跑完会打印指纹比对结果与迁移统计。

脚本做了四件事：

| 步骤 | 说明 |
|------|------|
| frontmatter 转换 | 只保留本主题认识的字段；`series` 是为此新增的；丢掉 Fuwari 内部的 `prevSlug` / `nextSlug` 等 |
| 标题层级归一化 | Fuwari 正文习惯用 `#` 当章节标题，而本主题的文章标题本身就是 `<h1>`。脚本找出每篇最浅的标题层级，整体平移到 `h2` 起步（代码块里的 `#` 注释会跳过） |
| 换行统一 | CRLF → LF |
| 图片复制 | `src/assets/images/posts/` 整目录复制，正文里的相对路径原样可用 |

> **踩过的坑**：迁移过来的文章是 CRLF 换行，而 JS 正则里的 `.` 不匹配 `\r`、
> `$` 又只匹配字符串末尾，于是 `:::warning\r` 这种标记行静默失效。
> `remark-callouts.mjs` 现在会先把 CRLF 归一化，`pnpm test` 里也补了对应的用例。

---

## 自检脚本

```bash
pnpm check        # astro check：Astro / Svelte / TS 类型与无障碍提示
pnpm icons        # 校验所有图标引用真实存在
pnpm test         # remark-callouts 插件的单元测试（含 CRLF 用例）
pnpm build && pnpm verify   # 产物自检：迁移完整性、动效接入、配色、渐变、RSS、断链……
pnpm shots        # 生成交互态调试页（真实移动端视口 / 搜索 / 抽屉 / 跳转 / 滚动行为）

# 滚动行为那个调试页会自己跑 9 步断言并把结果画在页面上，截图即可读：
#   node scripts/make-debug-pages.mjs && pnpm preview
#   → http://localhost:4321/_scroll-probe.html
```

`pnpm verify` 检查 50 多项，其中几组值得单独说：

- **迁移完整性** —— 12 篇文章、图片优化产物、导航下拉、5 条友链、关于页文案、Bing 验证文件、本地化的头像与 favicon
- **全站断链** —— 中文分类 / 标签路径容易出错，这一步能兜住
- **配色守卫** —— tokens.css 里的每个色值都进了产物，且没有上一版配色的残留
- **渐变守卫** —— 样式与标记里不出现 `gradient()`（文章正文的代码示例会被排除）
- **动效守卫** —— `html.js` 前缀的初始隐藏、`prefers-reduced-motion` 降级、`transition:persist` 标注，以及「初始隐藏没有被写死在 SSR 标记里」

`shots/` 目录里放了各页面在亮色 / 暗色 / 手机 / 平板下的实拍截图，可以直接对照着看效果。

> **注意**：`astro preview` 会在启动时缓存一份产物。改完代码重新 build 之后要**重启预览服务**，
> 否则看到的还是旧页面（这个坑我在验证时踩过一次，一度以为是路由坏了）。

---

## 部署

纯静态产物，`dist/` 丢到任何静态托管都可以：

```bash
pnpm build
# Vercel / Netlify / Cloudflare Pages 直接连仓库即可
```

部署前记得改两处站点地址（必须一致）：

1. `astro.config.mjs` 的 `SITE`
2. `src/config.ts` 的 `site.url`

---

## 实现说明

几个不那么显然的技术选择，记录一下原因。

**为什么用 unified 而不是 Astro 7 默认的 Sätteri？**
Astro 7 的默认 Markdown 处理器是原生的 Sätteri，它更快，并且内置 `:::note` 容器语法。
但它的插件接口是访客式的（visitor + 命令缓冲），remark / rehype 生态的插件不能直接用，
而本项目需要 `remark-callouts` 的紧凑写法支持。因此选择安装 `@astrojs/markdown-remark`
并使用 `unified()`。Sätteri 的原生 directive 也试过，标记块能解析，但需要自己写访客插件才能渲染。

**标题锚点为什么不用 `rehype-autolink-headings`？**
Astro 的用户 rehype 插件跑在它自己的 `rehypeHeadingIds` **之前**，而后者会把标题里的所有文本节点
收集成目录用的 `headings[].text`。如果锚点里放一个 `#` 文本节点，目录里每条都会变成「#标题」。
`src/plugins/rehype-heading-anchors.mjs` 把 `#` 交给 CSS 的 `::before` 绘制，`<a>` 保持空元素。

**移动端抽屉为什么要套一层 `overflow: hidden`？**
抽屉关闭时被 `translateX(102%)` 推到视口右侧之外。固定定位元素的「画外」部分仍然会撑大可滚动区域，
所以外面套一层 `position: fixed; inset: 0; overflow: hidden` 的裁剪层，它本身 `pointer-events: none`。

**为什么图标不用图标字体或运行时图标库？**
`@iconify-json/*` 的数据在构建期查表、内联成 SVG，用到的图标才进产物，没用到的一个字节都不带。
客户端那侧更是只留了 12 个真正用到的简单几何图标，连图标数据都不用打包。

---

## 许可

[MIT](./LICENSE) © 2025-2026 Wudarensheng

你可以自由使用、修改、分发这份主题，包括商用，只需保留版权声明。

**关于文章内容**：`src/content/posts/` 与 `src/assets/images/posts/` 里是本站自己的文章，
同样以 MIT 发布，但转载请注明出处。**如果你要拿这个主题搭自己的站，建议直接清空这两个目录。**

**关于图标**：Astro 侧的品牌图标来自
[Simple Icons](https://github.com/simple-icons/simple-icons)（CC0-1.0）
与 [Lucide](https://github.com/lucide-icons/lucide)（ISC），
通过 `@iconify-json/*` 在构建期读取，均与 MIT 兼容。

**致谢**：[Fuwari](https://github.com/saicaca/fuwari)（MIT）提供了布局上的灵感，
本项目为独立实现，未复用其代码。

