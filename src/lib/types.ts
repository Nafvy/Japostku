export type AppRole = 'admin' | 'moderator';

export type PostStatus = 'active' | 'sold';

export type PostCategory = string;

export interface CategoryItem {
  slug: string;
  label: string;
  createdAt?: string;
}

export type SortOrder = 'terbaru' | 'termurah' | 'termahal';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  whatsapp: string;
  roles: AppRole[];
  isOwner: boolean;
  isVerified: boolean;
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  createdAt: string;
}

export interface PublicPost {
  id: string;
  title: string;
  description: string;
  priceIdr: number;
  category: PostCategory;
  images: string[];
  contactWhatsapp: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  sellerName: string;
  authorIsOwner: boolean;
  authorVerified: boolean;
  isPinned: boolean;
}

export interface PrivatePost extends PublicPost {
  authorBanned?: boolean;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  whatsapp: string;
  roles: AppRole[];
  isOwner: boolean;
  isVerified: boolean;
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  createdAt: string;
  postCount: number;
}

export type AuditAction =
  | 'ban'
  | 'unban'
  | 'role_add'
  | 'role_remove'
  | 'post_delete'
  | 'post_pin'
  | 'post_unpin'
  | 'verify_add'
  | 'verify_remove'
  | 'notice_update'
  | 'board_clear'
  | 'category_add'
  | 'category_remove';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: 'user' | 'post' | 'setting' | 'category';
  targetId: string;
  targetLabel: string;
  reason: string | null;
  createdAt: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
