/* ============================================================================
   config.ts · 站点配置（改这一个文件就能把主题变成你自己的）
   ----------------------------------------------------------------------------
   本文件的内容来自一个已有的 Fuwari 站点（文章、友链、站点信息）。
   迁移用的是一次性脚本 scripts/migrate-fuwari.mjs，源目录全程只读。
   ========================================================================== */

/** 橙色系三站。全站的颜色轮转都基于这三个值。 */
export const ACCENTS = ['orange', 'amber', 'clay'] as const;
export type Accent = (typeof ACCENTS)[number];

/** 社交 / 友链图标的取值格式：`{图标集}:{图标名}`，由 Icon.astro 解析。 */
export interface SocialLink {
  /** 展示名 */
  name: string;
  /** 跳转地址 */
  href: string;
  /** 图标，例如 `simple-icons:github`、`lucide:mail` */
  icon: string;
  /** 悬停时背景染上的浅色，留空则按顺序轮转 */
  accent?: Accent;
}

/** 导航下拉里的子项 */
export interface NavChild {
  href: string;
  label: string;
  icon?: string;
  /** 外链会带上外链图标并在新标签页打开 */
  external?: boolean;
}

export interface NavLink {
  /** 有 children 时留空，渲染成下拉触发器 */
  href?: string;
  label: string;
  icon?: string;
  children?: NavChild[];
}

/* ----------------------------------------------------------------------------
   站点
   ⚠️ url 需要与 astro.config.mjs 中的 SITE 保持一致
   -------------------------------------------------------------------------- */
export const site = {
  url: 'https://blog.wudarensheng.top',
  title: 'Wudarensheng blog',
  subtitle: '分享科技与技术与实践',
  description:
    '分享科技与技术与实践。记录白嫖过的免费服务、折腾过的云函数，以及踩过的坑。',
  /** 站点语言 */
  lang: 'zh-CN',
} as const;

/* ----------------------------------------------------------------------------
   侧栏个人信息卡
   -------------------------------------------------------------------------- */
export const profile = {
  avatar: '/avatar.jpg',
  name: '无大人生',
  /** 头像下方的一行小字，等宽字体渲染 */
  handle: '@wudarensheng',
  bio: '远赴人间惊鸿宴，一睹人间盛世颜。',
  /** 三个数字统计 */
  stats: [
    { label: '文章', value: 'posts' },
    { label: '分类', value: 'categories' },
    { label: '标签', value: 'tags' },
  ],
};

/* ----------------------------------------------------------------------------
   导航
   -------------------------------------------------------------------------- */
export const nav: NavLink[] = [
  { href: '/', label: '首页', icon: 'lucide:house' },
  { href: '/archive/', label: '归档', icon: 'lucide:archive' },
  { href: '/categories/', label: '分类', icon: 'lucide:folder' },
  { href: '/tags/', label: '标签', icon: 'lucide:tags' },
  { href: '/friends/', label: '友链', icon: 'lucide:users' },
  { href: '/about/', label: '关于', icon: 'lucide:user' },
  {
    label: '监测',
    icon: 'lucide:activity',
    children: [
      { href: 'https://072189.xyz/umami', label: '统计', icon: 'lucide:chart-line', external: true },
      { href: 'https://eo.wudarensheng.top/', label: '流量', icon: 'lucide:globe', external: true },
      { href: 'https://uptime.wudarensheng.top/', label: '监控', icon: 'lucide:heart-pulse', external: true },
    ],
  },
];

/* ----------------------------------------------------------------------------
   社交链接
   -------------------------------------------------------------------------- */
export const socials: SocialLink[] = [
  {
    name: 'Bilibili',
    href: 'https://space.bilibili.com/3546673733175817',
    icon: 'simple-icons:bilibili',
    accent: 'orange',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/Wudarensheng',
    icon: 'simple-icons:github',
    accent: 'clay',
  },
  {
    name: '邮件',
    href: 'mailto:wdrs666@foxmail.com',
    icon: 'lucide:mail',
    accent: 'amber',
  },
  { name: 'RSS', href: '/rss.xml', icon: 'lucide:rss', accent: 'orange' },
];

/* ----------------------------------------------------------------------------
   侧栏开关
   -------------------------------------------------------------------------- */
export const sidebar = {
  /** 公告卡 */
  announcement: {
    enabled: true,
    title: '公告',
    /** 支持一组段落 */
    content: [
      '本站基于 Astro + Svelte 重写，主题「橙白」。',
      '全站没有外部字体、没有统计脚本、没有广告。',
    ],
    accent: 'orange' as Accent,
  },
  /** 分类卡最多显示几项 */
  categoriesLimit: 8,
  /** 标签卡最多显示几个 */
  tagsLimit: 24,
  /** 分类 / 标签卡里的条形图配色顺序 */
  barAccents: ['orange', 'amber', 'clay'] as Accent[],
};

/* ----------------------------------------------------------------------------
   首页 Banner
   -------------------------------------------------------------------------- */
export const banner = {
  /** 关掉后首页直接进入正文，导航栏恢复为不透明 */
  enabled: true,
  /** 高度（vh） */
  height: 52,
  /** 背景图；留空则使用一整块平色暖白 */
  image: '',
  /** 细颗粒噪点纹理，让大面积平色不至于太「塑料」 */
  noise: true,
  /** Fuwari 风格的暖色粒子背景（默认关闭：DESIGN.md 主张少动效、多留白） */
  petals: false,
};

/* ----------------------------------------------------------------------------
   文章
   -------------------------------------------------------------------------- */
export const posts = {
  /** 每页文章数 */
  perPage: 8,
  /** 详情页底部版权声明 */
  license: {
    enabled: true,
    name: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  /** 上下篇导航 */
  prevNext: true,
};

/* ----------------------------------------------------------------------------
   评论。主题只预留挂载点，填上任意第三方评论系统的片段即可。
   -------------------------------------------------------------------------- */
export const comments = {
  enabled: false,
  /** 一个返回 HTML 字符串的函数；例如 Giscus / Waline / Twikoo 的初始化片段 */
  provider: '' as string,
  note: '评论系统尚未接入，这里是一个预留的挂载点。',
};

/* ----------------------------------------------------------------------------
   友链
   -------------------------------------------------------------------------- */
export interface FriendLink {
  name: string;
  href: string;
  avatar: string;
  desc: string;
}

/** 迁移自 Fuwari 的 src/components/FriendsData.astro */
export const friends: FriendLink[] = [
  {
    name: 'THW’s Blog',
    href: 'https://blog.tianhw.top',
    avatar: 'https://image.tianhw.top/avatar.webp',
    desc: '前途似海，来日方长',
  },
  {
    name: 'Acofork Blog',
    href: 'https://2x.nz',
    avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0',
    desc: '爱你所爱~ ❤',
  },
  {
    name: 'GuYang17’s Blog',
    href: 'https://guyang17.github.io',
    avatar: 'https://s1.imagehub.cc/images/2025/10/02/4298d9dec11238bcaab7e2c37c25b204.png',
    desc: '指针所向即天涯，内存深处是故乡',
  },
  {
    name: 'UpXuu’s blog',
    href: 'https://upxuu.com',
    avatar: 'https://upxuu.com/images/20260214145619.jpg',
    desc: '逐光而上！',
  },
  {
    name: '他说',
    href: 'https://090909.top',
    avatar: 'https://090909.top/assets/images/logo.ico',
    desc: '梁栋烨的博客网站。',
  },
];

/** 申请友链时展示给对方的站点信息 */
export const friendApplication = {
  enabled: true,
  title: '申请友链',
  intro: '欢迎交换友链。请先在贵站加上本站信息，然后通过邮件或评论区告诉我，我会尽快回访。',
  fields: [
    { key: '名称', value: 'Wudarensheng blog' },
    { key: '地址', value: 'https://blog.wudarensheng.top' },
    { key: '头像', value: 'https://blog.wudarensheng.top/avatar.jpg' },
    { key: '简介', value: '分享科技与技术与实践' },
  ],
  requirements: [
    '内容原创为主，且能正常访问',
    '已经加上本站链接',
    '没有全屏广告或强制跳转',
  ],
};

/* ----------------------------------------------------------------------------
   页脚
   -------------------------------------------------------------------------- */
export const footer = {
  /** 建站年份（Fuwari 里的 buildDate 是 2025/08/03） */
  since: 2025,
  /** ICP / 公网安备等备案信息，留空则不显示 */
  icp: {
    text: '',
    href: '',
  },
  /** 页脚右侧的自定义链接 */
  links: [
    { href: '/rss.xml', label: 'RSS' },
    { href: '/sitemap-index.xml', label: 'Sitemap' },
  ],
};
