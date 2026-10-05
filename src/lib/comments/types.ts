/* ============================================================================
   comments/types.ts · 评论接口的 TS 镜像
   ========================================================================== */

export type CommentStatus = 'approved' | 'pending' | 'hidden' | 'deleted';

/** 管理员可执行的操作 */
export type AdminAction = 'hide' | 'restore' | 'soft-delete' | 'hard-delete';

export interface CommentAuthor {
  /** 作者的 SSO sub，用于判断「这条是不是我发的」 */
  userId: string;
  provider: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

export interface CommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  depth: number;
  author: CommentAuthor;
  /** 原始文本 / Markdown（非 approved 的节点会被置空） */
  content: string;
  status: CommentStatus;
  /** Unix 秒 */
  createdAt: number;
  updatedAt: number;
  editedAt: number | null;
  deleted: boolean;
  replies?: CommentDto[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CommentsResponse {
  data: CommentDto[];
  pagination: Pagination;
}

export interface AuthUser {
  sub: string;
  provider: string;
  username: string | null;
  name: string | null;
  picture: string | null;
  sid: string;
}

export interface MeResponse {
  user: AuthUser;
  isAdmin: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
}

export interface AdminCommentsResponse {
  data: CommentDto[];
  pagination: { page: number; pageSize: number; total: number };
}
