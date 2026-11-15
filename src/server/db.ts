import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppRole, AuditAction, AuditLogEntry, PostCategory, PostStatus } from '../lib/types';
import { isOwnerEmail, OWNER_EMAIL } from '../lib/permissions';
import { hashPassword } from './auth';
import {
  addAuditLog as addLocalAuditLog,
  deleteUploadedFiles,
  loadDb,
  saveDb,
  UPLOADS_DIR,
  type StoredPost,
  type StoredUser,
} from './store';

interface SupabaseUserRow {
  id: string;
  firebase_uid: string | null;
  email: string;
  password_hash: string;
  display_name: string;
  whatsapp: string;
  roles: AppRole[];
  is_owner: boolean;
  is_verified: boolean;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  created_at: string;
}

interface SupabasePostRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  price_idr: number | string;
  category: PostCategory;
  images: string[];
  contact_whatsapp: string;
  status: PostStatus;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseAuditRow {
  id: string;
  actor_id: string;
  actor_name: string;
  action: AuditAction;
  target_type: 'user' | 'post' | 'setting';
  target_id: string;
  target_label: string;
  reason: string | null;
  created_at: string;
}

let cachedSupabase: SupabaseClient | null = null;
let seededPromise: Promise<void> | null = null;

export function isSupabaseEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'post-images';
}

function getSupabase(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;
  const url = process.env.SUPABASE_URL?.trim() || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  cachedSupabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedSupabase;
}

function mapUserRow(row: SupabaseUserRow): StoredUser {
  const owner = Boolean(row.is_owner) || isOwnerEmail(row.email);
  const roles = Array.isArray(row.roles) ? [...row.roles] : [];
  if (owner && !roles.includes('admin')) {
    roles.push('admin');
  }
  return {
    id: row.id,
    firebaseUid: row.firebase_uid ?? null,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    whatsapp: row.whatsapp || '',
    roles,
    isOwner: owner,
    isVerified: owner || Boolean(row.is_verified),
    isBanned: Boolean(row.is_banned),
    bannedReason: row.banned_reason ?? null,
    bannedAt: row.banned_at ?? null,
    createdAt: row.created_at,
  };
}

function mapPostRow(row: SupabasePostRow): StoredPost {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    priceIdr: Number(row.price_idr) || 0,
    category: row.category,
    images: Array.isArray(row.images) ? row.images : [],
    contactWhatsapp: row.contact_whatsapp,
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditRow(row: SupabaseAuditRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    reason: row.reason ?? null,
    createdAt: row.created_at,
  };
}

export async function ensureInitialized(): Promise<void> {
  if (!isSupabaseEnabled()) {
    if (process.env.VERCEL) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah diisi di Environment Variables Vercel lalu Redeploy.'
      );
    }
    loadDb();
    return;
  }
  if (!seededPromise) {
    seededPromise = (async () => {
      const sb = getSupabase();
      const { data: settingsRow, error: settingsErr } = await sb
        .from('settings')
        .select('id')
        .eq('id', 'board')
        .maybeSingle();

      if (settingsErr) {
        throw new Error(settingsErr.message);
      }

      if (!settingsRow) {
        const { error: upsertErr } = await sb.from('settings').upsert(
          { id: 'board', owner_notice: '', next_post_seq: 1 },
          { onConflict: 'id' }
        );
        if (upsertErr) throw new Error(upsertErr.message);
      }

      const { data: ownerRow, error: ownerErr } = await sb
        .from('users')
        .select('id')
        .eq('email', OWNER_EMAIL)
        .maybeSingle();

      if (ownerErr) {
        throw new Error(ownerErr.message);
      }

      if (!ownerRow) {
        const { error: insertOwnerErr } = await sb.from('users').insert({
          id: 'usr-owner-01',
          firebase_uid: null,
          email: OWNER_EMAIL,
          password_hash: hashPassword(crypto.randomBytes(24).toString('hex')),
          display_name: 'Paundra Oktar',
          whatsapp: '',
          roles: ['admin'],
          is_owner: true,
          is_verified: true,
          is_banned: false,
          banned_reason: null,
          banned_at: null,
          created_at: new Date().toISOString(),
        });
        if (insertOwnerErr) throw new Error(insertOwnerErr.message);
      }
    })().catch((err) => {
      seededPromise = null;
      throw err;
    });
  }
  await seededPromise;
}

export function getExtraUploadPrefixes(userId: string): string[] {
  if (!isSupabaseEnabled()) return [];
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const bucket = getBucketName();
  return [`${url}/storage/v1/object/public/${bucket}/${userId}/`];
}

export async function uploadImageBytes(
  userId: string,
  ext: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  const filename = `${crypto.randomUUID()}.${ext}`;
  if (!isSupabaseEnabled()) {
    const userDir = path.join(UPLOADS_DIR, userId);
    fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, filename), body);
    return `/uploads/${userId}/${filename}`;
  }

  const sb = getSupabase();
  const bucket = getBucketName();
  const objectPath = `${userId}/${filename}`;
  const { error } = await sb.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Gagal mengunggah gambar ke penyimpanan: ${error.message}`);
  }
  const { data } = sb.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function removeImageAssets(paths: readonly string[]): Promise<void> {
  deleteUploadedFiles(paths);
  if (!isSupabaseEnabled()) return;

  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const bucket = getBucketName();
  const publicPrefix = `${url}/storage/v1/object/public/${bucket}/`;
  const objectPaths = paths
    .filter((p) => p.startsWith(publicPrefix))
    .map((p) => decodeURIComponent(p.slice(publicPrefix.length)))
    .filter((p) => p && !p.includes('..'));

  if (objectPaths.length === 0) return;
  try {
    await getSupabase().storage.from(bucket).remove(objectPaths);
  } catch {
    // Ignore storage cleanup failures
  }
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb().users.find((u) => u.id === id) ?? null;
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as SupabaseUserRow) : null;
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  await ensureInitialized();
  const normalized = email.trim().toLowerCase();
  if (!isSupabaseEnabled()) {
    return loadDb().users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .ilike('email', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as SupabaseUserRow) : null;
}

export async function getUserByFirebaseUid(uid: string): Promise<StoredUser | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb().users.find((u) => u.firebaseUid === uid) ?? null;
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('firebase_uid', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as SupabaseUserRow) : null;
}

export async function listAllUsers(): Promise<StoredUser[]> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return [...loadDb().users];
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as SupabaseUserRow[]).map(mapUserRow);
}

export async function createUserRecord(user: StoredUser): Promise<StoredUser> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    db.users.push(user);
    saveDb(db);
    return user;
  }
  const { data, error } = await getSupabase()
    .from('users')
    .insert({
      id: user.id,
      firebase_uid: user.firebaseUid ?? null,
      email: user.email,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      whatsapp: user.whatsapp,
      roles: user.roles,
      is_owner: user.isOwner,
      is_verified: user.isVerified,
      is_banned: user.isBanned,
      banned_reason: user.bannedReason,
      banned_at: user.bannedAt,
      created_at: user.createdAt,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapUserRow(data as SupabaseUserRow);
}

export async function updateUserRecord(
  id: string,
  patch: Partial<
    Pick<
      StoredUser,
      | 'firebaseUid'
      | 'displayName'
      | 'whatsapp'
      | 'roles'
      | 'isOwner'
      | 'isVerified'
      | 'isBanned'
      | 'bannedReason'
      | 'bannedAt'
    >
  >
): Promise<StoredUser | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    saveDb(db);
    return user;
  }

  const updatePayload: Record<string, unknown> = {};
  if (patch.firebaseUid !== undefined) updatePayload.firebase_uid = patch.firebaseUid;
  if (patch.displayName !== undefined) updatePayload.display_name = patch.displayName;
  if (patch.whatsapp !== undefined) updatePayload.whatsapp = patch.whatsapp;
  if (patch.roles !== undefined) updatePayload.roles = patch.roles;
  if (patch.isOwner !== undefined) updatePayload.is_owner = patch.isOwner;
  if (patch.isVerified !== undefined) updatePayload.is_verified = patch.isVerified;
  if (patch.isBanned !== undefined) updatePayload.is_banned = patch.isBanned;
  if (patch.bannedReason !== undefined) updatePayload.banned_reason = patch.bannedReason;
  if (patch.bannedAt !== undefined) updatePayload.banned_at = patch.bannedAt;

  const { data, error } = await getSupabase()
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as SupabaseUserRow) : null;
}

export async function listAllPosts(): Promise<StoredPost[]> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return [...loadDb().posts];
  }
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as SupabasePostRow[]).map(mapPostRow);
}

export async function listPostsByAuthor(authorId: string): Promise<StoredPost[]> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb()
      .posts.filter((p) => p.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as SupabasePostRow[]).map(mapPostRow);
}

export async function getPostById(id: string): Promise<StoredPost | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb().posts.find((p) => p.id === id) ?? null;
  }
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPostRow(data as SupabasePostRow) : null;
}

export async function createPostRecord(
  input: Omit<StoredPost, 'id'>
): Promise<StoredPost> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    const created: StoredPost = {
      id: String(db.nextPostSeq++),
      ...input,
    };
    db.posts.unshift(created);
    saveDb(db);
    return created;
  }

  const postId = `p-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`;
  const { data, error } = await getSupabase()
    .from('posts')
    .insert({
      id: postId,
      author_id: input.authorId,
      title: input.title,
      description: input.description,
      price_idr: input.priceIdr,
      category: input.category,
      images: input.images,
      contact_whatsapp: input.contactWhatsapp,
      status: input.status,
      is_pinned: input.isPinned,
      created_at: input.createdAt,
      updated_at: input.updatedAt,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapPostRow(data as SupabasePostRow);
}

export async function updatePostRecord(
  id: string,
  patch: Partial<
    Pick<
      StoredPost,
      'title' | 'category' | 'priceIdr' | 'description' | 'images' | 'contactWhatsapp' | 'status' | 'isPinned' | 'updatedAt'
    >
  >
): Promise<StoredPost | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    const post = db.posts.find((p) => p.id === id);
    if (!post) return null;
    Object.assign(post, patch);
    saveDb(db);
    return post;
  }

  const updatePayload: Record<string, unknown> = {};
  if (patch.title !== undefined) updatePayload.title = patch.title;
  if (patch.category !== undefined) updatePayload.category = patch.category;
  if (patch.priceIdr !== undefined) updatePayload.price_idr = patch.priceIdr;
  if (patch.description !== undefined) updatePayload.description = patch.description;
  if (patch.images !== undefined) updatePayload.images = patch.images;
  if (patch.contactWhatsapp !== undefined) updatePayload.contact_whatsapp = patch.contactWhatsapp;
  if (patch.status !== undefined) updatePayload.status = patch.status;
  if (patch.isPinned !== undefined) updatePayload.is_pinned = patch.isPinned;
  if (patch.updatedAt !== undefined) updatePayload.updated_at = patch.updatedAt;

  const { data, error } = await getSupabase()
    .from('posts')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPostRow(data as SupabasePostRow) : null;
}

export async function deletePostRecord(id: string): Promise<StoredPost | null> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    const idx = db.posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [removed] = db.posts.splice(idx, 1);
    saveDb(db);
    return removed;
  }

  const existing = await getPostById(id);
  if (!existing) return null;
  const { error } = await getSupabase().from('posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return existing;
}

export async function clearAllPostRecords(): Promise<StoredPost[]> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    const removed = [...db.posts];
    db.posts = [];
    saveDb(db);
    return removed;
  }

  const existing = await listAllPosts();
  if (existing.length > 0) {
    const { error } = await getSupabase().from('posts').delete().neq('id', '');
    if (error) throw new Error(error.message);
  }
  return existing;
}

export async function getOwnerNotice(): Promise<string> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb().ownerNotice || '';
  }
  const { data, error } = await getSupabase()
    .from('settings')
    .select('owner_notice')
    .eq('id', 'board')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return typeof data?.owner_notice === 'string' ? data.owner_notice : '';
}

export async function setOwnerNotice(notice: string): Promise<string> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    db.ownerNotice = notice;
    saveDb(db);
    return notice;
  }
  const { error } = await getSupabase()
    .from('settings')
    .upsert({ id: 'board', owner_notice: notice }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return notice;
}

export async function recordAuditLog(entry: {
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: 'user' | 'post' | 'setting';
  targetId: string;
  targetLabel: string;
  reason: string | null;
}): Promise<void> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    const db = loadDb();
    addLocalAuditLog(db, entry);
    saveDb(db);
    return;
  }
  const { error } = await getSupabase().from('audit_logs').insert({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    target_label: entry.targetLabel,
    reason: entry.reason,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function listRecentAuditLogs(limit: number = 10): Promise<AuditLogEntry[]> {
  await ensureInitialized();
  if (!isSupabaseEnabled()) {
    return loadDb().auditLogs.slice(0, limit);
  }
  const { data, error } = await getSupabase()
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data || []) as SupabaseAuditRow[]).map(mapAuditRow);
}
