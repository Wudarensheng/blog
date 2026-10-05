/* ============================================================================
   comments/config.ts · 评论系统的客户端配置
   ----------------------------------------------------------------------------
   单独放一个小文件（而不是塞进 src/config.ts），这样客户端 island 引入它时
   不会把 src/config.ts 里的友链 / 导航等大数组一起打进前端包。

   本地开发可用 PUBLIC_* 环境变量覆盖（例如 .env 里写
   PUBLIC_COMMENT_API=http://localhost:8787）。
   ========================================================================== */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const commentClient = {
  /** 评论 Worker */
  apiBase: env.PUBLIC_COMMENT_API || 'https://comment.wudarensheng.top',
  /** SSO Worker */
  ssoBase: env.PUBLIC_SSO_BASE || 'https://sso.wudarensheng.top',
  /** 在 SSO 里登记的下游 client id */
  clientId: env.PUBLIC_COMMENT_CLIENT_ID || 'blog',
  /** 展示哪些登录方式 */
  providers: ['github', 'cloudflare'] as string[],
  /** 每页顶层评论数 */
  pageSize: 20,
  /** OAuth 回调路径（带尾斜杠，避免 Cloudflare 的 307 归一化） */
  callbackPath: '/auth/callback/',
  /** 单条评论最大长度（与后端 MAX_COMMENT_LEN 保持一致，仅用于前端计数提示） */
  maxLength: 5000,
};
