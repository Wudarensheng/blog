/* ============================================================================
   format.ts · 日期与文本格式化
   ----------------------------------------------------------------------------
   DESIGN.md 3.3：等宽字体用于所有「数据」类信息（日期、时长、编号、handle）。
   因此这里输出的日期一律是紧凑、定宽的 `YYYY-MM-DD` 形式。
   ========================================================================== */

const pad = (n: number) => String(n).padStart(2, '0');

/** 2025-03-14 */
export function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 03-14 */
export function md(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 2025-03-14 09:30 */
export function ymdhm(date: Date): string {
  return `${ymd(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 中文长日期：2025 年 3 月 14 日 */
export function longDate(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/** 相对时间：3 天前 / 2 个月前 */
export function relative(date: Date, now = new Date()): string {
  const diff = now.getTime() - date.getTime();
  const day = 86_400_000;

  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < day * 30) return `${Math.floor(diff / day)} 天前`;
  if (diff < day * 365) return `${Math.floor(diff / (day * 30))} 个月前`;
  return `${Math.floor(diff / (day * 365))} 年前`;
}

/** `1 小时 20 分钟` 这种时长文案 */
export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

/** 数字补零，用于编号（01、02…） */
export function pad2(n: number): string {
  return pad(n);
}
