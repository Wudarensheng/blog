/* ============================================================================
   icons.ts · Svelte 侧的内联图标
   ----------------------------------------------------------------------------
   只收录「交互控件」真正用到的简单几何图标，全部按 Lucide 的 24×24 / 描边风格手写。
   品牌图标（GitHub、Bilibili…）由 Astro 侧的 <Icon> 组件负责，不进客户端包。

   这里的每一条都对应某个组件里的一次 <Icon name="..." />。加新图标前先确认
   确实有使用者 —— 没人用的条目只会让客户端包白白变大。
   ========================================================================== */

export const ICONS = {
  /* ThemeToggle：亮 / 暗 / 跟随系统 */
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',

  /* SearchModal */
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',

  /* Lightbox / SearchModal 的关闭按钮 */
  x: '<path d="M18 6 6 18M6 6l12 12"/>',

  /* BackToTop */
  'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',

  /* TableOfContents */
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',

  /* Lightbox 的缩放按钮 */
  'zoom-in': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function iconBody(name: string): string {
  return (ICONS as Record<string, string>)[name] ?? '';
}
