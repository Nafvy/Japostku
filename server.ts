import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json';
import {
  createSessionToken,
  hashPassword,
  parseCookies,
  SESSION_COOKIE_NAME,
  verifyPassword,
  verifySessionToken,
} from './src/server/auth';
import {
  addAuditLog,
  deleteUploadedFiles,
  loadDb,
  saveDb,
  toPublicPost,
  toUserProfile,
  UPLOADS_DIR,
  type StoredPost,
  type StoredUser,
} from './src/server/store';
import {
  banSchema,
  deletePostAdminSchema,
  loginSchema,
  ownerNoticeSchema,
  postInputSchema,
  profileSchema,
  registerSchema,
  roleChangeSchema,
  validateUserImagePaths,
  zodFieldErrors,
} from './src/lib/schemas';
import {
  canAccessAdmin,
  canBan,
  canDeletePost,
  canManageRoles,
  canRemoveAdminRole,
  isOwnerEmail,
  isOwnerSubject,
} from './src/lib/permissions';
import { normalizeWhatsapp } from './src/lib/whatsapp';
import { isAllowedImageMime, MAX_IMAGE_BYTES } from './src/lib/images';
import { POST_CATEGORIES } from './src/lib/categories';
import type { PostCategory, PostStatus, SortOrder } from './src/lib/types';

const PORT = Number(process.env.PORT || 3000);
const DAILY_POST_LIMIT = 10;

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

function resolveOptionalUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return next();
  }
  const verified = verifySessionToken(token);
  if (!verified) {
    clearSessionCookie(res);
    return next();
  }
  const db = loadDb();
  const user = db.users.find((u) => u.id === verified.userId);
  if (!user) {
    clearSessionCookie(res);
    return next();
  }
  if (user.isBanned) {
    clearSessionCookie(res);
    return next();
  }
  req.currentUser = user;
  next();
}

function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const verified = verifySessionToken(token);
  if (!verified) {
    clearSessionCookie(res);
    res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
    return;
  }
  const db = loadDb();
  const user = db.users.find((u) => u.id === verified.userId);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ ok: false, error: 'Sesi tidak valid. Silakan masuk ulang.' });
    return;
  }
  if (user.isBanned) {
    clearSessionCookie(res);
    res.status(403).json({
      ok: false,
      banned: true,
      error: 'Akun ini diblokir. Hubungi admin.',
    });
    return;
  }
  req.currentUser = user;
  next();
}

function requireStaff(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireUser(req, res, () => {
    const user = req.currentUser;
    if (!user || !canAccessAdmin(user.roles, isOwnerSubject(user))) {
      res.status(403).json({ ok: false, error: 'Akses ditolak.' });
      return;
    }
    next();
  });
}

function requireOwner(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireUser(req, res, () => {
    const user = req.currentUser;
    if (!user || !isOwnerSubject(user)) {
      res.status(403).json({ ok: false, error: 'Fitur ini hanya tersedia untuk pemilik situs.' });
      return;
    }
    next();
  });
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email: string; displayName: string; emailVerified: boolean } | null> {
  if (!idToken || typeof idToken !== 'string' || !firebaseConfig.apiKey) {
    return null;
  }
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
      }>;
    };
    const fbUser = data.users?.[0];
    if (!fbUser?.localId || !fbUser?.email) {
      return null;
    }
    return {
      uid: fbUser.localId,
      email: fbUser.email.toLowerCase(),
      displayName: fbUser.displayName?.trim() || fbUser.email.split('@')[0] || 'Pengguna',
      emailVerified: Boolean(fbUser.emailVerified),
    };
  } catch {
    return null;
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');

  loadDb();

  app.use('/seed-images', express.static(path.resolve(process.cwd(), 'src/assets/images')));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.post(
    '/api/uploads',
    requireUser,
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: `${MAX_IMAGE_BYTES + 1024}b`,
    }),
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
      if (!isAllowedImageMime(contentType)) {
        res.status(400).json({ ok: false, error: 'Format gambar harus JPG, PNG, atau WebP.' });
        return;
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ ok: false, error: 'Berkas gambar kosong atau rusak.' });
        return;
      }
      if (req.body.length > MAX_IMAGE_BYTES) {
        res.status(400).json({ ok: false, error: 'Ukuran gambar maksimal 5 MB.' });
        return;
      }

      const ext =
        contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'webp';
      const userDir = path.join(UPLOADS_DIR, user.id);
      fs.mkdirSync(userDir, { recursive: true });
      const filename = `${crypto.randomUUID()}.${ext}`;
      const fullPath = path.join(userDir, filename);
      fs.writeFileSync(fullPath, req.body);

      res.json({
        ok: true,
        data: { path: `/uploads/${user.id}/${filename}` },
      });
    }
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Auth endpoints ---
  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];
    const verified = verifySessionToken(token);
    if (!verified) {
      if (token) clearSessionCookie(res);
      res.json({ ok: true, data: { user: null, banned: false } });
      return;
    }
    const db = loadDb();
    const user = db.users.find((u) => u.id === verified.userId);
    if (!user) {
      clearSessionCookie(res);
      res.json({ ok: true, data: { user: null, banned: false } });
      return;
    }
    if (user.isBanned) {
      clearSessionCookie(res);
      res.json({ ok: true, data: { user: null, banned: true } });
      return;
    }
    res.json({ ok: true, data: { user: toUserProfile(user), banned: false } });
  });

  app.post('/api/auth/firebase', async (req: Request, res: Response) => {
    const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified || !verified.emailVerified) {
      res.status(401).json({
        ok: false,
        error: 'Verifikasi akun Google gagal. Silakan coba masuk lagi.',
      });
      return;
    }

    const db = loadDb();
    const owner = isOwnerEmail(verified.email);
    let user =
      db.users.find((u) => u.firebaseUid && u.firebaseUid === verified.uid) ||
      db.users.find((u) => u.email.toLowerCase() === verified.email);

    if (!user) {
      user = {
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        firebaseUid: verified.uid,
        email: verified.email,
        passwordHash: hashPassword(crypto.randomBytes(24).toString('hex')),
        displayName: verified.displayName.slice(0, 50),
        whatsapp: '',
        roles: owner ? ['admin'] : [],
        isOwner: owner,
        isVerified: owner,
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      saveDb(db);
    } else {
      let changed = false;
      if (user.firebaseUid !== verified.uid) {
        user.firebaseUid = verified.uid;
        changed = true;
      }
      if (owner) {
        if (!user.isOwner) {
          user.isOwner = true;
          changed = true;
        }
        if (!user.isVerified) {
          user.isVerified = true;
          changed = true;
        }
        if (!user.roles.includes('admin')) {
          user.roles.push('admin');
          changed = true;
        }
      }
      if (changed) {
        saveDb(db);
      }
    }

    if (user.isBanned) {
      clearSessionCookie(res);
      res.status(403).json({
        ok: false,
        banned: true,
        error: 'Akun ini diblokir. Hubungi admin.',
      });
      return;
    }

    const token = createSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      data: { user: toUserProfile(user) },
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Periksa kembali data pendaftaran kamu.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    const db = loadDb();
    const normalizedEmail = parsed.data.email.toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({
        ok: false,
        error: 'Email sudah terdaftar.',
        fieldErrors: { email: 'Email ini sudah terdaftar. Silakan masuk.' },
      });
      return;
    }

    const owner = isOwnerEmail(normalizedEmail);
    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      firebaseUid: null,
      email: normalizedEmail,
      passwordHash: hashPassword(parsed.data.password),
      displayName: parsed.data.displayName,
      whatsapp: '',
      roles: owner ? ['admin'] : [],
      isOwner: owner,
      isVerified: owner,
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);

    const token = createSessionToken(newUser.id);
    setSessionCookie(res, token);

    res.status(201).json({
      ok: true,
      data: { user: toUserProfile(newUser) },
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Periksa kembali email dan kata sandi kamu.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    const db = loadDb();
    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      res.status(401).json({
        ok: false,
        error: 'Email atau kata sandi salah.',
      });
      return;
    }

    if (user.isBanned) {
      clearSessionCookie(res);
      res.status(403).json({
        ok: false,
        error: 'Akun ini diblokir. Hubungi admin.',
      });
      return;
    }

    const token = createSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      data: { user: toUserProfile(user) },
    });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ ok: true, data: null });
  });

  // --- Public posts endpoints ---
  app.get('/api/posts', (req: Request, res: Response) => {
    const db = loadDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const kategoriRaw = typeof req.query.kategori === 'string' ? req.query.kategori.trim() : '';
    const urutRaw = typeof req.query.urut === 'string' ? req.query.urut.trim() : 'terbaru';
    const pageRaw = Number(req.query.hal || 1);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const pageSize = 24;

    const category: PostCategory | '' = (POST_CATEGORIES as readonly string[]).includes(kategoriRaw)
      ? (kategoriRaw as PostCategory)
      : '';
    const sort: SortOrder =
      urutRaw === 'termurah' || urutRaw === 'termahal' ? urutRaw : 'terbaru';

    const userMap = new Map(db.users.map((u) => [u.id, u]));

    const items = db.posts.filter((p) => {
      if (p.status !== 'active') return false;
      const author = userMap.get(p.authorId);
      if (!author || author.isBanned) return false;
      if (category && p.category !== category) return false;
      if (q) {
        const haystack = `${p.title} ${p.description} ${author.displayName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    items.sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      if (sort === 'termurah') return a.priceIdr - b.priceIdr;
      if (sort === 'termahal') return b.priceIdr - a.priceIdr;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = items
      .slice(start, start + pageSize)
      .map((p) => toPublicPost(p, userMap.get(p.authorId) ?? 'Penjual'));

    res.json({
      ok: true,
      data: {
        items: paged,
        total,
        page: safePage,
        pageSize,
        totalPages,
        ownerNotice: db.ownerNotice || '',
      },
    });
  });

  app.get('/api/posts/:id', resolveOptionalUser, (req: AuthedRequest, res: Response) => {
    const db = loadDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }
    const author = db.users.find((u) => u.id === post.authorId);
    if (!author || author.isBanned) {
      res.status(404).json({ ok: false, error: 'Postingan tidak tersedia.' });
      return;
    }
    res.json({
      ok: true,
      data: toPublicPost(post, author),
    });
  });

  // --- Account endpoints ---
  app.get('/api/account/posts', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const db = loadDb();
    const items = db.posts
      .filter((p) => p.authorId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => toPublicPost(p, user));

    res.json({ ok: true, data: { items } });
  });

  app.get('/api/account/posts/:id', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const db = loadDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post || post.authorId !== user.id) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }
    res.json({ ok: true, data: toPublicPost(post, user) });
  });

  app.post('/api/account/posts', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const parsed = postInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Periksa kembali isian postingan kamu.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    if (!validateUserImagePaths(parsed.data.images, user.id)) {
      res.status(403).json({
        ok: false,
        error: 'Path gambar tidak valid atau bukan milik akun kamu.',
        fieldErrors: { images: 'Unggah ulang gambar milik kamu sendiri.' },
      });
      return;
    }

    const normalizedWa = normalizeWhatsapp(parsed.data.contactWhatsapp);
    if (!normalizedWa) {
      res.status(400).json({
        ok: false,
        error: 'Nomor WhatsApp tidak valid.',
        fieldErrors: { contactWhatsapp: 'Gunakan format 08 atau 62.' },
      });
      return;
    }

    const db = loadDb();
    if (!isOwnerSubject(user)) {
      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      const recentUserPosts = db.posts
        .filter((p) => p.authorId === user.id && new Date(p.createdAt).getTime() > cutoffMs)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (recentUserPosts.length >= DAILY_POST_LIMIT) {
        const oldestRecent = new Date(recentUserPosts[0].createdAt).getTime();
        const nextAllowed = new Date(oldestRecent + 24 * 60 * 60 * 1000);
        const timeLabel = new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        }).format(nextAllowed);
        res.status(429).json({
          ok: false,
          error: `Batas maksimal 10 postingan per 24 jam tercapai. Kamu bisa memasang lagi pada ${timeLabel}.`,
        });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const newPost: StoredPost = {
      id: String(db.nextPostSeq++),
      authorId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priceIdr: parsed.data.priceIdr,
      category: parsed.data.category,
      images: parsed.data.images,
      contactWhatsapp: normalizedWa,
      status: 'active',
      isPinned: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.posts.unshift(newPost);
    saveDb(db);

    res.status(201).json({
      ok: true,
      data: toPublicPost(newPost, user),
    });
  });

  app.patch('/api/account/posts/:id', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const db = loadDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post || post.authorId !== user.id) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }

    const parsed = postInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Periksa kembali isian postingan kamu.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    if (!validateUserImagePaths(parsed.data.images, user.id, post.images)) {
      res.status(403).json({
        ok: false,
        error: 'Path gambar tidak valid atau bukan milik akun kamu.',
        fieldErrors: { images: 'Unggah ulang gambar milik kamu sendiri.' },
      });
      return;
    }

    const normalizedWa = normalizeWhatsapp(parsed.data.contactWhatsapp);
    if (!normalizedWa) {
      res.status(400).json({
        ok: false,
        error: 'Nomor WhatsApp tidak valid.',
        fieldErrors: { contactWhatsapp: 'Gunakan format 08 atau 62.' },
      });
      return;
    }

    const removedImages = post.images.filter((img) => !parsed.data.images.includes(img));
    deleteUploadedFiles(removedImages);

    post.title = parsed.data.title;
    post.category = parsed.data.category;
    post.priceIdr = parsed.data.priceIdr;
    post.description = parsed.data.description;
    post.images = parsed.data.images;
    post.contactWhatsapp = normalizedWa;
    post.updatedAt = new Date().toISOString();

    saveDb(db);
    res.json({ ok: true, data: toPublicPost(post, user) });
  });

  app.patch('/api/account/posts/:id/status', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const db = loadDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post || post.authorId !== user.id) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }

    const nextStatus = req.body?.status;
    if (nextStatus !== 'active' && nextStatus !== 'sold') {
      res.status(400).json({ ok: false, error: 'Status postingan tidak valid.' });
      return;
    }

    post.status = nextStatus;
    post.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ ok: true, data: toPublicPost(post, user) });
  });

  app.delete('/api/account/posts/:id', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const db = loadDb();
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }
    const post = db.posts[idx];
    if (!canDeletePost({ id: user.id, roles: user.roles, isOwner: user.isOwner, email: user.email }, post.authorId)) {
      res.status(403).json({ ok: false, error: 'Kamu tidak berhak menghapus postingan ini.' });
      return;
    }

    deleteUploadedFiles(post.images);
    db.posts.splice(idx, 1);
    saveDb(db);

    res.json({ ok: true, data: null });
  });

  app.patch('/api/account/profile', requireUser, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Periksa kembali profil kamu.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    const normalizedWa =
      parsed.data.whatsapp === '' ? '' : normalizeWhatsapp(parsed.data.whatsapp);
    if (parsed.data.whatsapp !== '' && !normalizedWa) {
      res.status(400).json({
        ok: false,
        error: 'Nomor WhatsApp tidak valid.',
        fieldErrors: { whatsapp: 'Gunakan format 08 atau 62.' },
      });
      return;
    }

    const db = loadDb();
    const stored = db.users.find((u) => u.id === user.id);
    if (!stored) {
      res.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
      return;
    }

    stored.displayName = parsed.data.displayName;
    stored.whatsapp = normalizedWa ?? '';
    saveDb(db);

    res.json({ ok: true, data: { user: toUserProfile(stored) } });
  });

  // --- Owner-exclusive endpoints ---
  app.patch('/api/owner/notice', requireOwner, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const parsed = ownerNoticeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Teks pengumuman tidak valid.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    const db = loadDb();
    db.ownerNotice = parsed.data.notice;
    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: 'notice_update',
      targetType: 'setting',
      targetId: 'board',
      targetLabel: parsed.data.notice ? parsed.data.notice : 'Pengumuman dihapus',
      reason: null,
    });
    saveDb(db);

    res.json({ ok: true, data: { ownerNotice: db.ownerNotice } });
  });

  app.post('/api/owner/posts/:id/pin', requireOwner, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const db = loadDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }

    post.isPinned = !post.isPinned;
    post.updatedAt = new Date().toISOString();
    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: post.isPinned ? 'post_pin' : 'post_unpin',
      targetType: 'post',
      targetId: post.id,
      targetLabel: post.title,
      reason: null,
    });
    saveDb(db);

    const author = db.users.find((u) => u.id === post.authorId);
    res.json({ ok: true, data: toPublicPost(post, author ?? 'Penjual') });
  });

  app.post('/api/owner/users/:id/verify', requireOwner, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const db = loadDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }
    if (isOwnerSubject(target)) {
      res.status(400).json({ ok: false, error: 'Lencana terverifikasi pemilik selalu aktif.' });
      return;
    }

    target.isVerified = !target.isVerified;
    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: target.isVerified ? 'verify_add' : 'verify_remove',
      targetType: 'user',
      targetId: target.id,
      targetLabel: `${target.displayName} · ${target.email}`,
      reason: null,
    });
    saveDb(db);

    res.json({ ok: true, data: toUserProfile(target) });
  });

  app.delete('/api/owner/posts', requireOwner, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const db = loadDb();
    const count = db.posts.length;
    for (const post of db.posts) {
      deleteUploadedFiles(post.images);
    }
    db.posts = [];
    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: 'board_clear',
      targetType: 'post',
      targetId: 'all',
      targetLabel: `${count} postingan dibersihkan`,
      reason: null,
    });
    saveDb(db);
    res.json({ ok: true, data: { deletedCount: count } });
  });

  // --- Admin endpoints ---
  app.get('/api/admin/summary', requireStaff, (_req: AuthedRequest, res: Response) => {
    const db = loadDb();
    const userMap = new Map(db.users.map((u) => [u.id, u]));
    const activePosts = db.posts.filter((p) => {
      if (p.status !== 'active') return false;
      const author = userMap.get(p.authorId);
      return Boolean(author && !author.isBanned);
    }).length;

    const pinnedPosts = db.posts.filter((p) => p.isPinned && p.status === 'active').length;
    const bannedUsers = db.users.filter((u) => u.isBanned).length;

    res.json({
      ok: true,
      data: {
        totalUsers: db.users.length,
        activePosts,
        pinnedPosts,
        bannedUsers,
        ownerNotice: db.ownerNotice || '',
        recentActions: db.auditLogs.slice(0, 10),
      },
    });
  });

  app.get('/api/admin/users', requireStaff, (req: Request, res: Response) => {
    const db = loadDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const filter = typeof req.query.filter === 'string' ? req.query.filter : 'semua';
    const pageRaw = Number(req.query.hal || 1);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const pageSize = 25;

    const postCountByUser = new Map<string, number>();
    for (const post of db.posts) {
      postCountByUser.set(post.authorId, (postCountByUser.get(post.authorId) || 0) + 1);
    }

    const users = db.users.filter((u) => {
      if (filter === 'diblokir' && !u.isBanned) return false;
      if (filter === 'berperan' && u.roles.length === 0) return false;
      if (filter === 'terverifikasi' && !u.isVerified && !isOwnerSubject(u)) return false;
      if (q) {
        const hay = `${u.displayName} ${u.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    const items = users.slice(start, start + pageSize).map((u) => ({
      ...toUserProfile(u),
      postCount: postCountByUser.get(u.id) || 0,
    }));

    res.json({
      ok: true,
      data: { items, total, page: safePage, pageSize, totalPages },
    });
  });

  app.post('/api/admin/users/:id/ban', requireStaff, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const parsed = banSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Alasan pemblokiran wajib diisi.',
        fieldErrors: zodFieldErrors(parsed.error),
      });
      return;
    }

    const db = loadDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (
      !canBan(
        { id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email },
        { id: target.id, roles: target.roles, isOwner: target.isOwner, email: target.email }
      )
    ) {
      res.status(403).json({
        ok: false,
        error: isOwnerSubject(target)
          ? 'Akun pemilik situs tidak dapat diblokir.'
          : actor.id === target.id
            ? 'Tidak bisa memblokir akun sendiri.'
            : 'Moderator tidak dapat memblokir pengguna yang memiliki role.',
      });
      return;
    }

    target.isBanned = true;
    target.bannedReason = parsed.data.reason;
    target.bannedAt = new Date().toISOString();

    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: 'ban',
      targetType: 'user',
      targetId: target.id,
      targetLabel: `${target.displayName} · ${target.email}`,
      reason: parsed.data.reason,
    });

    saveDb(db);
    res.json({ ok: true, data: toUserProfile(target) });
  });

  app.post('/api/admin/users/:id/unban', requireStaff, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const db = loadDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (
      !canBan(
        { id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email },
        { id: target.id, roles: target.roles, isOwner: target.isOwner, email: target.email }
      )
    ) {
      res.status(403).json({
        ok: false,
        error: 'Kamu tidak memiliki izin membuka blokir pengguna ini.',
      });
      return;
    }

    target.isBanned = false;
    target.bannedReason = null;
    target.bannedAt = null;

    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: 'unban',
      targetType: 'user',
      targetId: target.id,
      targetLabel: `${target.displayName} · ${target.email}`,
      reason: null,
    });

    saveDb(db);
    res.json({ ok: true, data: toUserProfile(target) });
  });

  app.post('/api/admin/users/:id/roles', requireStaff, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    if (!canManageRoles({ id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email })) {
      res.status(403).json({ ok: false, error: 'Hanya admin atau pemilik yang dapat mengelola role.' });
      return;
    }

    const parsed = roleChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Role tidak valid.' });
      return;
    }

    const db = loadDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (!target.roles.includes(parsed.data.role)) {
      target.roles.push(parsed.data.role);
      addAuditLog(db, {
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'role_add',
        targetType: 'user',
        targetId: target.id,
        targetLabel: `${target.displayName} · ${parsed.data.role}`,
        reason: null,
      });
      saveDb(db);
    }

    res.json({ ok: true, data: toUserProfile(target) });
  });

  app.delete(
    '/api/admin/users/:id/roles/:role',
    requireStaff,
    (req: AuthedRequest, res: Response) => {
      const actor = req.currentUser!;
      if (!canManageRoles({ id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email })) {
        res.status(403).json({ ok: false, error: 'Hanya admin atau pemilik yang dapat mengelola role.' });
        return;
      }

      const roleParam = req.params.role;
      if (roleParam !== 'admin' && roleParam !== 'moderator') {
        res.status(400).json({ ok: false, error: 'Role tidak valid.' });
        return;
      }

      const db = loadDb();
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
        return;
      }

      if (isOwnerSubject(target) && roleParam === 'admin') {
        res.status(400).json({ ok: false, error: 'Role admin pemilik situs tidak dapat dihapus.' });
        return;
      }

      if (roleParam === 'admin' && target.roles.includes('admin')) {
        const adminCount = db.users.filter((u) => u.roles.includes('admin')).length;
        if (!canRemoveAdminRole(adminCount)) {
          res.status(400).json({
            ok: false,
            error: 'Tidak dapat menghapus role admin terakhir.',
          });
          return;
        }
      }

      if (target.roles.includes(roleParam)) {
        target.roles = target.roles.filter((r) => r !== roleParam);
        addAuditLog(db, {
          actorId: actor.id,
          actorName: actor.displayName,
          action: 'role_remove',
          targetType: 'user',
          targetId: target.id,
          targetLabel: `${target.displayName} · ${roleParam}`,
          reason: null,
        });
        saveDb(db);
      }

      res.json({ ok: true, data: toUserProfile(target) });
    }
  );

  app.get('/api/admin/posts', requireStaff, (req: Request, res: Response) => {
    const db = loadDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'semua';
    const kategoriRaw = typeof req.query.kategori === 'string' ? req.query.kategori : '';
    const pageRaw = Number(req.query.hal || 1);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const pageSize = 25;

    const status: PostStatus | '' =
      statusRaw === 'active' || statusRaw === 'sold' ? statusRaw : '';
    const category: PostCategory | '' = (POST_CATEGORIES as readonly string[]).includes(kategoriRaw)
      ? (kategoriRaw as PostCategory)
      : '';

    const userMap = new Map(db.users.map((u) => [u.id, u]));

    const posts = db.posts.filter((p) => {
      if (status && p.status !== status) return false;
      if (category && p.category !== category) return false;
      const author = userMap.get(p.authorId);
      if (q) {
        const hay = `${p.title} ${author?.displayName ?? ''} ${author?.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = posts.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    const items = posts.slice(start, start + pageSize).map((p) => {
      const author = userMap.get(p.authorId);
      return {
        ...toPublicPost(p, author ?? 'Pengguna'),
        authorBanned: Boolean(author?.isBanned),
      };
    });

    res.json({
      ok: true,
      data: { items, total, page: safePage, pageSize, totalPages },
    });
  });

  app.delete('/api/admin/posts/:id', requireStaff, (req: AuthedRequest, res: Response) => {
    const actor = req.currentUser!;
    const parsed = deletePostAdminSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Alasan tidak valid.' });
      return;
    }

    const db = loadDb();
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
      return;
    }

    const post = db.posts[idx];
    deleteUploadedFiles(post.images);
    db.posts.splice(idx, 1);

    addAuditLog(db, {
      actorId: actor.id,
      actorName: actor.displayName,
      action: 'post_delete',
      targetType: 'post',
      targetId: post.id,
      targetLabel: post.title,
      reason: parsed.data.reason || null,
    });

    saveDb(db);
    res.json({ ok: true, data: null });
  });

  // --- Frontend serving ---
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Japostku server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Japostku server:', err);
  process.exit(1);
});
