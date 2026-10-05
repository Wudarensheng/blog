/* ============================================================================
   umami.ts · 访问统计的客户端数据层
   ----------------------------------------------------------------------------
   · 埋点脚本的两个实例（自建 umami + 云）由 BaseLayout 注入 <head>。
   · 这里只负责「读数据」：用分享令牌调分享 API，拿全站与单页的访问量。
   · 不 import @/config，避免把友链/导航等大数组打进前端包。
   · 结果带 60s 模块级缓存 + 单飞去重：同页多个 island、以及 60s 内的跨页
     导航都只发一次请求。
   ========================================================================== */

export interface UmamiScript {
  src: string;
  websiteId: string;
}

export const umamiConfig = {
  /** 总开关：false 时不注入埋点脚本，也不请求统计 */
  enabled: true,
  /** 自建 umami 的 API 根 */
  apiBase: 'https://umami.wudarensheng.top/api',
  websiteId: 'a267f5d8-a89b-4272-be35-793d66e21c97',
  /** 只读分享令牌（原站同款，设计上就是给前端嵌入用） */
  shareToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3ZWJzaXRlSWQiOiJhMjY3ZjVkOC1hODliLTQyNzItYmUzNS03OTNkNjZlMjFjOTciLCJpYXQiOjE3NzA0NTI4MjR9.Ww5Nh0aJf9hN_rIYA6VtaYyHajGW269tAPGKMw3imu0',
  /** 注入到 <head> 的埋点脚本（两个 umami 实例） */
  scripts: [
    { src: 'https://umami.wudarensheng.top/script.js', websiteId: 'a267f5d8-a89b-4272-be35-793d66e21c97' },
    { src: 'https://cloud.umami.is/script.js', websiteId: '3bc203cf-babf-4944-bc2f-e03ac1c31282' },
  ] as UmamiScript[],
};

export interface SiteStats {
  pageviews: number;
  visitors: number;
}

/** 1000 → 1.0K，1000000 → 1.0M（对齐原站） */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** umami 记录的路径带尾斜杠（`/posts/x/`），这里对齐一下 */
export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const clean = pathname.replace(/index\.html$/, '');
  return clean.endsWith('/') ? clean : `${clean}/`;
}

const TTL = 60_000;

function apiHeaders(): HeadersInit {
  return { accept: 'application/json', 'x-umami-share-token': umamiConfig.shareToken };
}

function rangeQuery(): string {
  return `startAt=0&endAt=${Date.now()}`;
}

let siteCache: { at: number; promise: Promise<SiteStats | null> } | null = null;
let pathsCache: { at: number; promise: Promise<Map<string, number>> } | null = null;

/** 全站访问量 / 访客数；失败返回 null。 */
export function fetchSiteStats(): Promise<SiteStats | null> {
  const now = Date.now();
  if (siteCache && now - siteCache.at < TTL) return siteCache.promise;

  const promise = (async (): Promise<SiteStats | null> => {
    try {
      const url = `${umamiConfig.apiBase}/websites/${umamiConfig.websiteId}/stats?${rangeQuery()}&unit=hour&timezone=Asia%2FShanghai`;
      const res = await fetch(url, { headers: apiHeaders() });
      if (!res.ok) return null;
      const data = (await res.json()) as { pageviews?: number; visitors?: number };
      return { pageviews: data.pageviews ?? 0, visitors: data.visitors ?? 0 };
    } catch {
      return null;
    }
  })();

  siteCache = { at: now, promise };
  return promise;
}

/**
 * 各路径的访问量（pageviews）。`stats` 端点不支持按路径过滤，
 * 只能取 `metrics?type=path` 的整表再本地查。
 */
export function fetchPathViews(): Promise<Map<string, number>> {
  const now = Date.now();
  if (pathsCache && now - pathsCache.at < TTL) return pathsCache.promise;

  const promise = (async (): Promise<Map<string, number>> => {
    const map = new Map<string, number>();
    try {
      const url = `${umamiConfig.apiBase}/websites/${umamiConfig.websiteId}/metrics?${rangeQuery()}&type=path&limit=1000`;
      const res = await fetch(url, { headers: apiHeaders() });
      if (!res.ok) return map;
      const rows = (await res.json()) as unknown;
      if (!Array.isArray(rows)) return map;
      for (const row of rows as Array<{ x?: string; y?: number }>) {
        if (typeof row.x === 'string' && typeof row.y === 'number') map.set(row.x, row.y);
      }
    } catch {
      /* 静默失败，调用方按 0 处理 */
    }
    return map;
  })();

  pathsCache = { at: now, promise };
  return promise;
}
