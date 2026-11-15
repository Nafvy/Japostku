import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AppRole,
  AuditAction,
  AuditLogEntry,
  PostCategory,
  PostStatus,
  PublicPost,
  UserProfile,
} from '../lib/types';
import { isOwnerEmail, OWNER_EMAIL } from '../lib/permissions';
import { hashPassword } from './auth';

export interface StoredUser {
  id: string;
  firebaseUid?: string | null;
  email: string;
  passwordHash: string;
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

export interface StoredPost {
  id: string;
  authorId: string;
  title: string;
  description: string;
  priceIdr: number;
  category: PostCategory;
  images: string[];
  contactWhatsapp: string;
  status: PostStatus;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  nextPostSeq: number;
  ownerNotice: string;
  users: StoredUser[];
  posts: StoredPost[];
  auditLogs: AuditLogEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function createSeedState(): DatabaseState {
  const nowIso = new Date().toISOString();
  const ownerPasswordHash = hashPassword(crypto.randomBytes(24).toString('hex'));

  const users: StoredUser[] = [
    {
      id: 'usr-owner-01',
      firebaseUid: null,
      email: OWNER_EMAIL,
      passwordHash: ownerPasswordHash,
      displayName: 'Paundra Oktar',
      whatsapp: '',
      roles: ['admin'],
      isOwner: true,
      isVerified: true,
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
      createdAt: nowIso,
    },
  ];

  return {
    nextPostSeq: 1,
    ownerNotice: '',
    users,
    posts: [],
    auditLogs: [],
  };
}

let cachedDb: DatabaseState | null = null;

function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function normalizeDb(rawDb: DatabaseState): DatabaseState {
  const ownerNotice = typeof rawDb.ownerNotice === 'string' ? rawDb.ownerNotice : '';
  const users = Array.isArray(rawDb.users)
    ? rawDb.users.map((u) => {
        const owner = Boolean(u.isOwner) || isOwnerEmail(u.email);
        const roles: AppRole[] = Array.isArray(u.roles) ? [...u.roles] : [];
        if (owner && !roles.includes('admin')) {
          roles.push('admin');
        }
        return {
          ...u,
          firebaseUid: u.firebaseUid ?? null,
          roles,
          isOwner: owner,
          isVerified: owner ? true : Boolean(u.isVerified),
        };
      })
    : [];
  const posts = Array.isArray(rawDb.posts)
    ? rawDb.posts.map((p) => ({
        ...p,
        isPinned: Boolean(p.isPinned),
      }))
    : [];
  const auditLogs = Array.isArray(rawDb.auditLogs) ? rawDb.auditLogs : [];

  return {
    nextPostSeq: typeof rawDb.nextPostSeq === 'number' ? rawDb.nextPostSeq : 1,
    ownerNotice,
    users,
    posts,
    auditLogs,
  };
}

export function loadDb(): DatabaseState {
  if (cachedDb) {
    return cachedDb;
  }
  ensureDirs();
  if (!fs.existsSync(DB_PATH)) {
    cachedDb = createSeedState();
    saveDb(cachedDb);
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    cachedDb = normalizeDb(JSON.parse(raw) as DatabaseState);
    return cachedDb;
  } catch {
    cachedDb = createSeedState();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export function saveDb(db: DatabaseState): void {
  ensureDirs();
  cachedDb = db;
  const tmpPath = `${DB_PATH}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function toUserProfile(user: StoredUser): UserProfile {
  const owner = Boolean(user.isOwner) || isOwnerEmail(user.email);
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    whatsapp: user.whatsapp,
    roles: [...user.roles],
    isOwner: owner,
    isVerified: owner || Boolean(user.isVerified),
    isBanned: user.isBanned,
    bannedReason: user.bannedReason,
    bannedAt: user.bannedAt,
    createdAt: user.createdAt,
  };
}

export function toPublicPost(
  post: StoredPost,
  author: Pick<StoredUser, 'displayName' | 'email' | 'isOwner' | 'isVerified'> | string
): PublicPost {
  const sellerName = typeof author === 'string' ? author : author.displayName;
  const authorIsOwner =
    typeof author === 'string'
      ? false
      : Boolean(author.isOwner) || isOwnerEmail(author.email);
  const authorVerified =
    typeof author === 'string'
      ? false
      : authorIsOwner || Boolean(author.isVerified);

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    priceIdr: post.priceIdr,
    category: post.category,
    images: [...post.images],
    contactWhatsapp: post.contactWhatsapp,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorId: post.authorId,
    sellerName,
    authorIsOwner,
    authorVerified,
    isPinned: Boolean(post.isPinned),
  };
}

export function addAuditLog(
  db: DatabaseState,
  entry: {
    actorId: string;
    actorName: string;
    action: AuditAction;
    targetType: 'user' | 'post' | 'setting';
    targetId: string;
    targetLabel: string;
    reason: string | null;
  }
): void {
  db.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    ...entry,
    createdAt: new Date().toISOString(),
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs.length = 500;
  }
}

export function deleteUploadedFiles(paths: readonly string[]): void {
  for (const rel of paths) {
    if (!rel.startsWith('/uploads/')) continue;
    const subPath = rel.slice('/uploads/'.length);
    if (!subPath || subPath.includes('..') || subPath.includes('\\')) continue;
    const fullPath = path.resolve(UPLOADS_DIR, subPath);
    if (!fullPath.startsWith(UPLOADS_DIR + path.sep)) continue;
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Ignore cleanup errors for missing files
    }
  }
}
