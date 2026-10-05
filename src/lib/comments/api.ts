/* ============================================================================
   comments/api.ts · 评论系统的客户端：鉴权 + 接口调用
   ----------------------------------------------------------------------------
   · 鉴权走 SSO 的授权码 + PKCE（整页跳转），token 存 localStorage；
     PKCE 的 verifier / state 只存 sessionStorage（绑定当前标签页）。
   · access token 到期前 60s 主动刷新；请求遇到 401 再刷新并重试一次。
   · 刷新做「单飞」，避免同一页并发刷新触发服务端的重放检测（会吊销整个家族）。
   ========================================================================== */

import { commentClient } from './config';
import type {
  AdminCommentsResponse,
  AuthUser,
  CommentDto,
  CommentStatus,
  CommentsResponse,
  MeResponse,
  TokenResponse,
} from './types';

/* ---------------------------------------------------------------- 存储 --- */

const ACCESS_KEY = 'wdrs.sso.access';
const REFRESH_KEY = 'wdrs.sso.refresh';
const EXPIRES_KEY = 'wdrs.sso.expires';
const USER_KEY = 'wdrs.sso.user';
const ADMIN_KEY = 'wdrs.sso.isAdmin';

const PKCE_VERIFIER = 'wdrs.pkce.verifier';
const PKCE_STATE = 'wdrs.pkce.state';
const PKCE_RETURN = 'wdrs.pkce.return';

function ls(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function ss(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function read(store: Storage | null, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function write(store: Storage | null, key: string, value: string): void {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* 隐私模式等，忽略 */
  }
}

function drop(store: Storage | null, key: string): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* 忽略 */
  }
}

/* -------------------------------------------------------------- 错误 --- */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = 'http_error';
  let message = `请求失败（${res.status}）`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    /* 非 JSON 响应 */
  }
  return new ApiError(res.status, code, message);
}

/* ------------------------------------------------------------- PKCE --- */

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256(text: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return new Uint8Array(digest);
}

/** 只接受站内相对路径，挡掉 //evil 与 /\evil 这类开放重定向。 */
function safeReturn(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

export function callbackUrl(): string {
  return `${location.origin}${commentClient.callbackPath}`;
}

/* ------------------------------------------------------ 登录 / 回调 --- */

/** 跳转到 SSO 开始登录。 */
export async function login(provider: string): Promise<void> {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(await sha256(verifier));
  const state = b64url(randomBytes(16));

  const store = ss();
  write(store, PKCE_VERIFIER, verifier);
  write(store, PKCE_STATE, state);
  write(store, PKCE_RETURN, safeReturn(location.pathname + location.search));

  const url = new URL(`${commentClient.ssoBase}/oauth/${provider}/authorize`);
  url.searchParams.set('client_id', commentClient.clientId);
  url.searchParams.set('redirect_uri', callbackUrl());
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  location.href = url.toString();
}

function clearPkce(): void {
  const store = ss();
  drop(store, PKCE_VERIFIER);
  drop(store, PKCE_STATE);
  drop(store, PKCE_RETURN);
}

/** 在 /auth/callback 页面调用：校验 state、换 token、补齐用户信息。 */
export async function handleCallback(): Promise<{ returnTo: string }> {
  const params = new URLSearchParams(location.search);
  const store = ss();
  const expectedState = read(store, PKCE_STATE);
  const verifier = read(store, PKCE_VERIFIER);
  const returnTo = safeReturn(read(store, PKCE_RETURN));

  const error = params.get('error');
  if (error) {
    clearPkce();
    throw new ApiError(400, error, error === 'access_denied' ? '你取消了授权' : `登录失败：${error}`);
  }

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    clearPkce();
    throw new ApiError(400, 'invalid_request', '缺少授权参数');
  }
  // 不信任 URL 里的 state：必须与本标签页发起时存下的一致
  if (!expectedState || !verifier) {
    clearPkce();
    throw new ApiError(400, 'invalid_state', '登录会话已过期，请重新登录');
  }
  if (state !== expectedState) {
    clearPkce();
    throw new ApiError(400, 'invalid_state', 'state 校验失败');
  }

  const res = await fetch(`${commentClient.ssoBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: commentClient.clientId,
      redirect_uri: callbackUrl(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    clearPkce();
    throw await toApiError(res);
  }

  saveTokens((await res.json()) as TokenResponse);
  clearPkce();

  try {
    await me();
  } catch {
    /* 拿不到用户信息不影响登录本身 */
  }
  return { returnTo };
}

/* ----------------------------------------------------- token 管理 --- */

function saveTokens(token: TokenResponse): void {
  const store = ls();
  write(store, ACCESS_KEY, token.access_token);
  write(store, REFRESH_KEY, token.refresh_token);
  write(store, EXPIRES_KEY, String(Date.now() + token.expires_in * 1000));
}

export function clearTokens(): void {
  const store = ls();
  [ACCESS_KEY, REFRESH_KEY, EXPIRES_KEY, USER_KEY, ADMIN_KEY].forEach((k) => drop(store, k));
}

export function hasSession(): boolean {
  return !!read(ls(), ACCESS_KEY);
}

export function cachedUser(): AuthUser | null {
  const raw = read(ls(), USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function cachedIsAdmin(): boolean {
  return read(ls(), ADMIN_KEY) === '1';
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<string | null> {
  const store = ls();
  const refresh = read(store, REFRESH_KEY);
  if (!refresh) return null;
  try {
    const res = await fetch(`${commentClient.ssoBase}/oauth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const token = (await res.json()) as TokenResponse;
    saveTokens(token);
    return token.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const store = ls();
  const access = read(store, ACCESS_KEY);
  const refresh = read(store, REFRESH_KEY);
  const expires = Number(read(store, EXPIRES_KEY) ?? 0);

  if (!access) return refresh ? refreshTokens() : null;
  if (expires && Date.now() > expires - 60_000 && refresh) return refreshTokens();
  return access;
}

export async function logout(): Promise<void> {
  const refresh = read(ls(), REFRESH_KEY);
  if (refresh) {
    try {
      await fetch(`${commentClient.ssoBase}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {
      /* 尽力而为 */
    }
  }
  clearTokens();
}

/* --------------------------------------------------------- 请求封装 --- */

async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${commentClient.apiBase}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiFetch<T>(path, init, false);
    clearTokens();
    throw new ApiError(401, 'unauthorized', '登录已过期，请重新登录');
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ----------------------------------------------------------- 接口 --- */

export async function getComments(
  postId: string,
  opts: { page?: number; pageSize?: number; sort?: 'asc' | 'desc' } = {},
): Promise<CommentsResponse> {
  const q = new URLSearchParams();
  q.set('page', String(opts.page ?? 1));
  q.set('pageSize', String(opts.pageSize ?? commentClient.pageSize));
  if (opts.sort) q.set('sort', opts.sort);
  return apiFetch<CommentsResponse>(`/api/posts/${encodeURIComponent(postId)}/comments?${q.toString()}`);
}

export async function createComment(postId: string, content: string, parentId?: string | null): Promise<CommentDto> {
  const payload = parentId ? { content, parentId } : { content };
  const res = await apiFetch<{ data: CommentDto }>(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateComment(id: string, content: string): Promise<CommentDto> {
  const res = await apiFetch<{ data: CommentDto }>(`/api/comments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function me(): Promise<MeResponse> {
  const res = await apiFetch<MeResponse>('/api/me');
  const store = ls();
  write(store, USER_KEY, JSON.stringify(res.user));
  write(store, ADMIN_KEY, res.isAdmin ? '1' : '0');
  return res;
}

export async function adminList(params: {
  postId?: string;
  status?: CommentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminCommentsResponse> {
  const q = new URLSearchParams();
  if (params.postId) q.set('postId', params.postId);
  if (params.status) q.set('status', params.status);
  if (params.q) q.set('q', params.q);
  q.set('page', String(params.page ?? 1));
  q.set('pageSize', String(params.pageSize ?? 50));
  return apiFetch<AdminCommentsResponse>(`/api/admin/comments?${q.toString()}`);
}

export async function adminSetStatus(id: string, status: CommentStatus): Promise<void> {
  await apiFetch(`/api/admin/comments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function adminDelete(id: string, hard = false): Promise<void> {
  await apiFetch(`/api/admin/comments/${encodeURIComponent(id)}${hard ? '?hard=true' : ''}`, {
    method: 'DELETE',
  });
}

/** 把接口错误码翻译成给用户看的中文提示。 */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'rate_limited':
        return '操作过于频繁，请稍后再试';
      case 'depth_exceeded':
        return '回复层级已达上限';
      case 'unauthorized':
        return '登录已过期，请重新登录';
      case 'forbidden':
        return '没有权限执行该操作';
      default:
        return err.message || '操作失败';
    }
  }
  return '网络异常，请稍后再试';
}
