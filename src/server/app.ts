import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSessionToken,
  hashPassword,
  parseCookies,
  SESSION_COOKIE_NAME,
  verifyPassword,
  verifySessionToken,
} from './auth';
import { toPublicPost, toUserProfile, UPLOADS_DIR, type StoredUser } from './store';
import {
  clearAllPostRecords,
  createPostRecord,
  createUserRecord,
  deletePostRecord,
  getExtraUploadPrefixes,
  getOwnerNotice,
  getPostById,
  getUserByEmail,
  getUserByFirebaseUid,
  getUserById,
  listAllPosts,
  listAllUsers,
  listPostsByAuthor,
  listRecentAuditLogs,
  recordAuditLog,
  removeImageAssets,
  setOwnerNotice,
  updatePostRecord,
  updateUserRecord,
  uploadImageBytes,
} from './db';
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
} from '../lib/schemas';
import {
  canAccessAdmin,
  canBan,
  canDeletePost,
  canManageRoles,
  canRemoveAdminRole,
  isOwnerEmail,
  isOwnerSubject,
} from '../lib/permissions';
import { normalizeWhatsapp } from '../lib/whatsapp';
import { isAllowedImageMime, MAX_IMAGE_BYTES } from '../lib/images';
import { POST_CATEGORIES } from '../lib/categories';
import type { PostCategory, PostStatus, SortOrder } from '../lib/types';

const DAILY_POST_LIMIT = 10;

function readFirebaseApiKey(): string {
  if (process.env.FIREBASE_API_KEY) {
    return process.env.FIREBASE_API_KEY;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { apiKey?: string };
      return parsed.apiKey || '';
    }
  } catch {
    // Fallback to empty if unavailable
  }
  return '';
}

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

type AsyncRoute = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>;

function sanitizeServerError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('SUPABASE_URL') || msg.includes('Konfigurasi Supabase')) {
    return msg;
  }
  if (msg.includes('Could not find the table') || msg.includes('does not exist')) {
    return 'Tabel database Supabase belum dibuat. Jalankan skrip supabase/schema.sql di SQL Editor Supabase.';
  }
  if (msg.includes('Invalid API key') || msg.includes('JWT')) {
    return 'Kunci SUPABASE_SERVICE_ROLE_KEY tidak valid. Periksa kembali Environment Variables Vercel.';
  }
  return 'Terjadi kesalahan pada server.';
}

function asyncRoute(fn: AsyncRoute) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('API route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: sanitizeServerError(err) });
      } else {
        next(err);
      }
    });
  };
}

function isHttpsRequest(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  return req.secure || proto === 'https';
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: isHttpsRequest(req),
  });
}

const resolveOptionalUser = asyncRoute(async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return next();
  }
  const verified = verifySessionToken(token);
  if (!verified) {
    clearSessionCookie(req, res);
    return next();
  }
  const user = await getUserById(verified.userId);
  if (!user || user.isBanned) {
    clearSessionCookie(req, res);
    return next();
  }
  req.currentUser = user;
  next();
});

const requireUser = asyncRoute(async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const verified = verifySessionToken(token);
  if (!verified) {
    clearSessionCookie(req, res);
    res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
    return;
  }
  const user = await getUserById(verified.userId);
  if (!user) {
    clearSessionCookie(req, res);
    res.status(401).json({ ok: false, error: 'Sesi tidak valid. Silakan masuk ulang.' });
    return;
  }
  if (user.isBanned) {
    clearSessionCookie(req, res);
    res.status(403).json({
      ok: false,
      banned: true,
      error: 'Akun ini diblokir. Hubungi admin.',
    });
    return;
  }
  req.currentUser = user;
  next();
});

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
  const apiKey = readFirebaseApiKey();
  if (!idToken || typeof idToken !== 'string' || !apiKey) {
    return null;
  }
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
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

export function createApiApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  if (!process.env.VERCEL) {
    app.use('/seed-images', express.static(path.resolve(process.cwd(), 'src/assets/images')));
    app.use('/uploads', express.static(UPLOADS_DIR));
  }

  app.post(
    '/api/uploads',
    requireUser,
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: `${MAX_IMAGE_BYTES + 1024}b`,
    }),
    asyncRoute(async (req, res) => {
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
      const uploadedPath = await uploadImageBytes(user.id, ext, contentType, req.body);

      res.json({
        ok: true,
        data: { path: uploadedPath },
      });
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Auth endpoints ---
  app.get(
    '/api/auth/me',
    asyncRoute(async (req, res) => {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[SESSION_COOKIE_NAME];
      const verified = verifySessionToken(token);
      if (!verified) {
        if (token) clearSessionCookie(req, res);
        res.json({ ok: true, data: { user: null, banned: false } });
        return;
      }
      const user = await getUserById(verified.userId);
      if (!user) {
        clearSessionCookie(req, res);
        res.json({ ok: true, data: { user: null, banned: false } });
        return;
      }
      if (user.isBanned) {
        clearSessionCookie(req, res);
        res.json({ ok: true, data: { user: null, banned: true } });
        return;
      }
      res.json({ ok: true, data: { user: toUserProfile(user), banned: false } });
    })
  );

  app.post(
    '/api/auth/firebase',
    asyncRoute(async (req, res) => {
      const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified || !verified.emailVerified) {
        res.status(401).json({
          ok: false,
          error: 'Verifikasi akun Google gagal. Silakan coba masuk lagi.',
        });
        return;
      }

      const owner = isOwnerEmail(verified.email);
      let user =
        (await getUserByFirebaseUid(verified.uid)) || (await getUserByEmail(verified.email));

      if (!user) {
        user = await createUserRecord({
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
        });
      } else {
        const patch: Parameters<typeof updateUserRecord>[1] = {};
        let changed = false;
        if (user.firebaseUid !== verified.uid) {
          patch.firebaseUid = verified.uid;
          changed = true;
        }
        if (owner) {
          if (!user.isOwner) {
            patch.isOwner = true;
            changed = true;
          }
          if (!user.isVerified) {
            patch.isVerified = true;
            changed = true;
          }
          if (!user.roles.includes('admin')) {
            patch.roles = [...user.roles, 'admin'];
            changed = true;
          }
        }
        if (changed) {
          user = (await updateUserRecord(user.id, patch)) || user;
        }
      }

      if (user.isBanned) {
        clearSessionCookie(req, res);
        res.status(403).json({
          ok: false,
          banned: true,
          error: 'Akun ini diblokir. Hubungi admin.',
        });
        return;
      }

      const token = createSessionToken(user.id);
      setSessionCookie(req, res, token);
      res.json({
        ok: true,
        data: { user: toUserProfile(user) },
      });
    })
  );

  app.post(
    '/api/auth/register',
    asyncRoute(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: 'Periksa kembali data pendaftaran kamu.',
          fieldErrors: zodFieldErrors(parsed.error),
        });
        return;
      }

      const normalizedEmail = parsed.data.email.toLowerCase();
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({
          ok: false,
          error: 'Email sudah terdaftar.',
          fieldErrors: { email: 'Email ini sudah terdaftar. Silakan masuk.' },
        });
        return;
      }

      const owner = isOwnerEmail(normalizedEmail);
      const newUser = await createUserRecord({
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
      });

      const token = createSessionToken(newUser.id);
      setSessionCookie(req, res, token);

      res.status(201).json({
        ok: true,
        data: { user: toUserProfile(newUser) },
      });
    })
  );

  app.post(
    '/api/auth/login',
    asyncRoute(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: 'Periksa kembali email dan kata sandi kamu.',
          fieldErrors: zodFieldErrors(parsed.error),
        });
        return;
      }

      const user = await getUserByEmail(parsed.data.email);
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        res.status(401).json({
          ok: false,
          error: 'Email atau kata sandi salah.',
        });
        return;
      }

      if (user.isBanned) {
        clearSessionCookie(req, res);
        res.status(403).json({
          ok: false,
          error: 'Akun ini diblokir. Hubungi admin.',
        });
        return;
      }

      const token = createSessionToken(user.id);
      setSessionCookie(req, res, token);
      res.json({
        ok: true,
        data: { user: toUserProfile(user) },
      });
    })
  );

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true, data: null });
  });

  // --- Public posts endpoints ---
  app.get(
    '/api/posts',
    asyncRoute(async (req, res) => {
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

      const [allUsers, allPosts, ownerNotice] = await Promise.all([
        listAllUsers(),
        listAllPosts(),
        getOwnerNotice(),
      ]);

      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const items = allPosts.filter((p) => {
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
          ownerNotice,
        },
      });
    })
  );

  app.get(
    '/api/posts/:id',
    resolveOptionalUser,
    asyncRoute(async (req, res) => {
      const post = await getPostById(req.params.id);
      if (!post) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }
      const author = await getUserById(post.authorId);
      if (!author || author.isBanned) {
        res.status(404).json({ ok: false, error: 'Postingan tidak tersedia.' });
        return;
      }
      res.json({
        ok: true,
        data: toPublicPost(post, author),
      });
    })
  );

  // --- Account endpoints ---
  app.get(
    '/api/account/posts',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = req.currentUser!;
      const posts = await listPostsByAuthor(user.id);
      const items = posts.map((p) => toPublicPost(p, user));
      res.json({ ok: true, data: { items } });
    })
  );

  app.get(
    '/api/account/posts/:id',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = req.currentUser!;
      const post = await getPostById(req.params.id);
      if (!post || post.authorId !== user.id) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }
      res.json({ ok: true, data: toPublicPost(post, user) });
    })
  );

  app.post(
    '/api/account/posts',
    requireUser,
    asyncRoute(async (req, res) => {
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

      if (
        !validateUserImagePaths(
          parsed.data.images,
          user.id,
          [],
          getExtraUploadPrefixes(user.id)
        )
      ) {
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

      if (!isOwnerSubject(user)) {
        const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
        const userPosts = await listPostsByAuthor(user.id);
        const recentUserPosts = userPosts
          .filter((p) => new Date(p.createdAt).getTime() > cutoffMs)
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
      const newPost = await createPostRecord({
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
      });

      res.status(201).json({
        ok: true,
        data: toPublicPost(newPost, user),
      });
    })
  );

  app.patch(
    '/api/account/posts/:id',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = req.currentUser!;
      const post = await getPostById(req.params.id);
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

      if (
        !validateUserImagePaths(
          parsed.data.images,
          user.id,
          post.images,
          getExtraUploadPrefixes(user.id)
        )
      ) {
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
      await removeImageAssets(removedImages);

      const updated = await updatePostRecord(post.id, {
        title: parsed.data.title,
        category: parsed.data.category,
        priceIdr: parsed.data.priceIdr,
        description: parsed.data.description,
        images: parsed.data.images,
        contactWhatsapp: normalizedWa,
        updatedAt: new Date().toISOString(),
      });

      res.json({ ok: true, data: toPublicPost(updated || post, user) });
    })
  );

  app.patch(
    '/api/account/posts/:id/status',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = req.currentUser!;
      const post = await getPostById(req.params.id);
      if (!post || post.authorId !== user.id) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }

      const nextStatus = req.body?.status;
      if (nextStatus !== 'active' && nextStatus !== 'sold') {
        res.status(400).json({ ok: false, error: 'Status postingan tidak valid.' });
        return;
      }

      const updated = await updatePostRecord(post.id, {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });

      res.json({ ok: true, data: toPublicPost(updated || post, user) });
    })
  );

  app.delete(
    '/api/account/posts/:id',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = req.currentUser!;
      const post = await getPostById(req.params.id);
      if (!post) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }
      if (
        !canDeletePost(
          { id: user.id, roles: user.roles, isOwner: user.isOwner, email: user.email },
          post.authorId
        )
      ) {
        res.status(403).json({ ok: false, error: 'Kamu tidak berhak menghapus postingan ini.' });
        return;
      }

      await removeImageAssets(post.images);
      await deletePostRecord(post.id);

      res.json({ ok: true, data: null });
    })
  );

  app.patch(
    '/api/account/profile',
    requireUser,
    asyncRoute(async (req, res) => {
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

      const updated = await updateUserRecord(user.id, {
        displayName: parsed.data.displayName,
        whatsapp: normalizedWa ?? '',
      });
      if (!updated) {
        res.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
        return;
      }

      res.json({ ok: true, data: { user: toUserProfile(updated) } });
    })
  );

  // --- Owner-exclusive endpoints ---
  app.patch(
    '/api/owner/notice',
    requireOwner,
    asyncRoute(async (req, res) => {
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

      const savedNotice = await setOwnerNotice(parsed.data.notice);
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'notice_update',
        targetType: 'setting',
        targetId: 'board',
        targetLabel: savedNotice ? savedNotice : 'Pengumuman dihapus',
        reason: null,
      });

      res.json({ ok: true, data: { ownerNotice: savedNotice } });
    })
  );

  app.post(
    '/api/owner/posts/:id/pin',
    requireOwner,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      const post = await getPostById(req.params.id);
      if (!post) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }

      const nextPinned = !post.isPinned;
      const updated = await updatePostRecord(post.id, {
        isPinned: nextPinned,
        updatedAt: new Date().toISOString(),
      });

      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: nextPinned ? 'post_pin' : 'post_unpin',
        targetType: 'post',
        targetId: post.id,
        targetLabel: post.title,
        reason: null,
      });

      const author = await getUserById(post.authorId);
      res.json({ ok: true, data: toPublicPost(updated || post, author ?? 'Penjual') });
    })
  );

  app.post(
    '/api/owner/users/:id/verify',
    requireOwner,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      const target = await getUserById(req.params.id);
      if (!target) {
        res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
        return;
      }
      if (isOwnerSubject(target)) {
        res.status(400).json({ ok: false, error: 'Lencana terverifikasi pemilik selalu aktif.' });
        return;
      }

      const nextVerified = !target.isVerified;
      const updated = await updateUserRecord(target.id, { isVerified: nextVerified });

      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: nextVerified ? 'verify_add' : 'verify_remove',
        targetType: 'user',
        targetId: target.id,
        targetLabel: `${target.displayName} · ${target.email}`,
        reason: null,
      });

      res.json({ ok: true, data: toUserProfile(updated || target) });
    })
  );

  app.delete(
    '/api/owner/posts',
    requireOwner,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      const removed = await clearAllPostRecords();
      for (const post of removed) {
        await removeImageAssets(post.images);
      }
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'board_clear',
        targetType: 'post',
        targetId: 'all',
        targetLabel: `${removed.length} postingan dibersihkan`,
        reason: null,
      });
      res.json({ ok: true, data: { deletedCount: removed.length } });
    })
  );

  // --- Admin endpoints ---
  app.get(
    '/api/admin/summary',
    requireStaff,
    asyncRoute(async (_req, res) => {
      const [allUsers, allPosts, ownerNotice, recentActions] = await Promise.all([
        listAllUsers(),
        listAllPosts(),
        getOwnerNotice(),
        listRecentAuditLogs(10),
      ]);

      const userMap = new Map(allUsers.map((u) => [u.id, u]));
      const activePosts = allPosts.filter((p) => {
        if (p.status !== 'active') return false;
        const author = userMap.get(p.authorId);
        return Boolean(author && !author.isBanned);
      }).length;

      const pinnedPosts = allPosts.filter((p) => p.isPinned && p.status === 'active').length;
      const bannedUsers = allUsers.filter((u) => u.isBanned).length;

      res.json({
        ok: true,
        data: {
          totalUsers: allUsers.length,
          activePosts,
          pinnedPosts,
          bannedUsers,
          ownerNotice,
          recentActions,
        },
      });
    })
  );

  app.get(
    '/api/admin/users',
    requireStaff,
    asyncRoute(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const filter = typeof req.query.filter === 'string' ? req.query.filter : 'semua';
      const pageRaw = Number(req.query.hal || 1);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      const pageSize = 25;

      const [allUsers, allPosts] = await Promise.all([listAllUsers(), listAllPosts()]);

      const postCountByUser = new Map<string, number>();
      for (const post of allPosts) {
        postCountByUser.set(post.authorId, (postCountByUser.get(post.authorId) || 0) + 1);
      }

      const users = allUsers.filter((u) => {
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
    })
  );

  app.post(
    '/api/admin/users/:id/ban',
    requireStaff,
    asyncRoute(async (req, res) => {
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

      const target = await getUserById(req.params.id);
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

      const updated = await updateUserRecord(target.id, {
        isBanned: true,
        bannedReason: parsed.data.reason,
        bannedAt: new Date().toISOString(),
      });

      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'ban',
        targetType: 'user',
        targetId: target.id,
        targetLabel: `${target.displayName} · ${target.email}`,
        reason: parsed.data.reason,
      });

      res.json({ ok: true, data: toUserProfile(updated || target) });
    })
  );

  app.post(
    '/api/admin/users/:id/unban',
    requireStaff,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      const target = await getUserById(req.params.id);
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

      const updated = await updateUserRecord(target.id, {
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
      });

      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'unban',
        targetType: 'user',
        targetId: target.id,
        targetLabel: `${target.displayName} · ${target.email}`,
        reason: null,
      });

      res.json({ ok: true, data: toUserProfile(updated || target) });
    })
  );

  app.post(
    '/api/admin/users/:id/roles',
    requireStaff,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      if (
        !canManageRoles({
          id: actor.id,
          roles: actor.roles,
          isOwner: actor.isOwner,
          email: actor.email,
        })
      ) {
        res.status(403).json({ ok: false, error: 'Hanya admin atau pemilik yang dapat mengelola role.' });
        return;
      }

      const parsed = roleChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: 'Role tidak valid.' });
        return;
      }

      let target = await getUserById(req.params.id);
      if (!target) {
        res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
        return;
      }

      if (!target.roles.includes(parsed.data.role)) {
        target =
          (await updateUserRecord(target.id, {
            roles: [...target.roles, parsed.data.role],
          })) || target;

        await recordAuditLog({
          actorId: actor.id,
          actorName: actor.displayName,
          action: 'role_add',
          targetType: 'user',
          targetId: target.id,
          targetLabel: `${target.displayName} · ${parsed.data.role}`,
          reason: null,
        });
      }

      res.json({ ok: true, data: toUserProfile(target) });
    })
  );

  app.delete(
    '/api/admin/users/:id/roles/:role',
    requireStaff,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      if (
        !canManageRoles({
          id: actor.id,
          roles: actor.roles,
          isOwner: actor.isOwner,
          email: actor.email,
        })
      ) {
        res.status(403).json({ ok: false, error: 'Hanya admin atau pemilik yang dapat mengelola role.' });
        return;
      }

      const roleParam = req.params.role;
      if (roleParam !== 'admin' && roleParam !== 'moderator') {
        res.status(400).json({ ok: false, error: 'Role tidak valid.' });
        return;
      }

      let target = await getUserById(req.params.id);
      if (!target) {
        res.status(404).json({ ok: false, error: 'Pengguna tidak ditemukan.' });
        return;
      }

      if (isOwnerSubject(target) && roleParam === 'admin') {
        res.status(400).json({ ok: false, error: 'Role admin pemilik situs tidak dapat dihapus.' });
        return;
      }

      if (roleParam === 'admin' && target.roles.includes('admin')) {
        const allUsers = await listAllUsers();
        const adminCount = allUsers.filter((u) => u.roles.includes('admin')).length;
        if (!canRemoveAdminRole(adminCount)) {
          res.status(400).json({
            ok: false,
            error: 'Tidak dapat menghapus role admin terakhir.',
          });
          return;
        }
      }

      if (target.roles.includes(roleParam)) {
        target =
          (await updateUserRecord(target.id, {
            roles: target.roles.filter((r) => r !== roleParam),
          })) || target;

        await recordAuditLog({
          actorId: actor.id,
          actorName: actor.displayName,
          action: 'role_remove',
          targetType: 'user',
          targetId: target.id,
          targetLabel: `${target.displayName} · ${roleParam}`,
          reason: null,
        });
      }

      res.json({ ok: true, data: toUserProfile(target) });
    })
  );

  app.get(
    '/api/admin/posts',
    requireStaff,
    asyncRoute(async (req, res) => {
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

      const [allUsers, allPosts] = await Promise.all([listAllUsers(), listAllPosts()]);
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const posts = allPosts.filter((p) => {
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
    })
  );

  app.delete(
    '/api/admin/posts/:id',
    requireStaff,
    asyncRoute(async (req, res) => {
      const actor = req.currentUser!;
      const parsed = deletePostAdminSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: 'Alasan tidak valid.' });
        return;
      }

      const post = await getPostById(req.params.id);
      if (!post) {
        res.status(404).json({ ok: false, error: 'Postingan tidak ditemukan.' });
        return;
      }

      await removeImageAssets(post.images);
      await deletePostRecord(post.id);

      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.displayName,
        action: 'post_delete',
        targetType: 'post',
        targetId: post.id,
        targetLabel: post.title,
        reason: parsed.data.reason || null,
      });

      res.json({ ok: true, data: null });
    })
  );

  return app;
}
