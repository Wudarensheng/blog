import { ACCENTS, type Accent } from '@/config';

/* ============================================================================
   accent.ts · 三站轮转
   ----------------------------------------------------------------------------
   DESIGN.md 要求三种颜色在使用频率上大致均衡。所以：
   · 列表、网格等「有顺序」的场景用 accentByIndex —— 严格 1:1:1 轮转
   · 单个元素、独立页面用 accentFromKey —— 同一个 key 永远得到同一个颜色
   ========================================================================== */

/** FNV-1a，稳定且分布均匀 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 由字符串决定颜色：同一个标题永远得到同一种颜色 */
export function accentFromKey(key: string, offset = 0): Accent {
  const index = (hashString(key) + offset) % ACCENTS.length;
  return ACCENTS[index] as Accent;
}

/** 由序号决定颜色：保证一组元素的颜色严格均衡 */
export function accentByIndex(index: number, offset = 0): Accent {
  const len = ACCENTS.length;
  const i = (((index + offset) % len) + len) % len;
  return ACCENTS[i] as Accent;
}

/** 文章的点缀色：frontmatter 指定优先，否则按标题哈希 */
export function accentOf(entry: { data: { accent?: Accent; title: string } }): Accent {
  return entry.data.accent ?? accentFromKey(entry.data.title);
}
