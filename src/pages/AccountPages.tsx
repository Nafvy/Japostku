import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ImageOff,
  LayoutList,
  Mail,
  MessageCircle,
  Pencil,
  Pin,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import {
  removePostFromFirestore,
  syncPostToFirestore,
  syncSignedInUserToFirestore,
} from '../lib/firebase';
import { formatDate, rupiah } from '../lib/format';
import { profileSchema, zodFieldErrors } from '../lib/schemas';
import type { PostCategory, PublicPost, UserProfile } from '../lib/types';
import { cn } from '../lib/utils';
import { PostForm } from '../components/posts/PostForm';
import { EmptyState } from '../components/shared/EmptyState';
import { VerifiedBadge } from '../components/shared/VerifiedBadge';
import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  Skeleton,
} from '../components/ui/Primitives';
import { NotFoundPage } from './NotFoundPage';

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname, fullPath, navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/masuk' && pathname !== '/daftar') {
      navigate(`/masuk?next=${encodeURIComponent(fullPath)}`, { replace: true });
    }
  }, [loading, user, pathname, fullPath, navigate]);

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-48 w-full" />
      </main>
    );
  }

  return <>{children}</>;
}

export function MyPostsPage() {
  const { navigate } = useRouter();
  const { user, refreshUser } = useAuth();
  const { getLabel } = useCategories();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicPost | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ items: PublicPost[] }>('/api/account/posts');
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      setLoading(false);
      return;
    }
    setPosts(res.data.items);
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleToggleStatus = async (post: PublicPost) => {
    const nextStatus = post.status === 'active' ? 'sold' : 'active';
    setBusyId(post.id);
    const res = await apiFetch<PublicPost>(`/api/account/posts/${post.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusyId(null);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      showToast(res.error, 'error');
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === post.id ? res.data : p)));
    void syncPostToFirestore(res.data).catch(() => undefined);
    showToast(
      nextStatus === 'sold' ? 'Postingan ditandai terjual.' : 'Postingan diaktifkan lagi.',
      'success'
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    const res = await apiFetch<null>(`/api/account/posts/${deleteTarget.id}`, {
      method: 'DELETE',
    });
    setBusyId(null);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      showToast(res.error, 'error');
      return;
    }
    const deletedId = deleteTarget.id;
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
    setDeleteTarget(null);
    void removePostFromFirestore(deletedId).catch(() => undefined);
    showToast('Postingan dihapus.', 'success');
  };

  return (
    <AccountGuard>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-zinc-950" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-zinc-950">Postingan saya</h1>
              {user && (user.isOwner || user.isVerified) && (
                <VerifiedBadge isOwner={user.isOwner} showText />
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              Kelola barang dan jasa yang kamu pasang di Japostku.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/akun/profil"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Profil</span>
            </Link>
            <Button onClick={() => navigate('/akun/postingan/baru')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Pasang postingan</span>
            </Button>
          </div>
        </div>

        <section className="mt-6" aria-label="Daftar postingan saya">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {!loading && error && (
            <EmptyState
              message={error}
              actionLabel="Coba lagi"
              onAction={() => void loadPosts()}
            />
          )}

          {!loading && !error && posts.length === 0 && (
            <EmptyState
              title="Belum ada postingan"
              message="Kamu belum memasang barang atau jasa saat ini."
              actionLabel="Pasang postingan"
              onAction={() => navigate('/akun/postingan/baru')}
            />
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {posts.map((post, idx) => {
                const isSold = post.status === 'sold';
                const isBusy = busyId === post.id;
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: Math.min(idx * 0.03, 0.15),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-50/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link
                        href={`/p/${post.id}`}
                        className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                      >
                        {post.images[0] ? (
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">
                            <ImageOff className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/p/${post.id}`}
                            className="block truncate text-sm sm:text-base font-semibold text-zinc-950 hover:underline"
                          >
                            {post.title}
                          </Link>
                          {post.isPinned && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-zinc-950 px-1.5 py-0.5 text-[11px] font-medium text-white">
                              <Pin className="h-3 w-3" aria-hidden="true" />
                              <span>Sorotan</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-zinc-950 tabular-nums">
                          {rupiah(post.priceIdr)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span
                            className={cn(
                              'font-semibold',
                              isSold ? 'text-zinc-500' : 'text-zinc-950'
                            )}
                          >
                            {isSold ? 'Terjual' : 'Aktif'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getLabel(post.category)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => navigate(`/akun/postingan/${post.id}/ubah`)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ubah</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => void handleToggleStatus(post)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isSold ? 'Aktifkan lagi' : 'Tandai terjual'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        aria-label={`Hapus ${post.title}`}
                        onClick={() => setDeleteTarget(post)}
                        className="border-zinc-300 hover:border-zinc-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Hapus postingan ini?"
          description={
            deleteTarget
              ? `Postingan "${deleteTarget.title}" dan seluruh fotonya akan dihapus permanen.`
              : ''
          }
          confirmLabel="Hapus postingan"
          destructive
          busy={Boolean(deleteTarget && busyId === deleteTarget.id)}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      </main>
    </AccountGuard>
  );
}

export function NewPostPage() {
  const { user, refreshUser } = useAuth();
  const { categories } = useCategories();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (values: {
    title: string;
    category: PostCategory;
    priceIdr: number;
    description: string;
    images: string[];
    contactWhatsapp: string;
  }) => {
    setSubmitting(true);
    setServerError(null);
    setServerFieldErrors({});

    const res = await apiFetch<PublicPost>('/api/account/posts', {
      method: 'POST',
      body: JSON.stringify(values),
    });

    setSubmitting(false);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setServerError(res.error);
      if (res.fieldErrors) setServerFieldErrors(res.fieldErrors);
      return;
    }

    void syncPostToFirestore(res.data).catch(() => undefined);
    showToast('Postingan berhasil tayang.', 'success');
    navigate('/akun/postingan');
  };

  return (
    <AccountGuard>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold text-zinc-950">Pasang postingan baru</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Lengkapi foto, harga, dan nomor WhatsApp agar pembeli mudah menghubungi.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
          <PostForm
            initialValues={{
              title: '',
              category: categories[0]?.slug || 'elektronik',
              priceIdr: '',
              description: '',
              images: [],
              contactWhatsapp: user?.whatsapp || '',
            }}
            submitLabel="Pasang postingan"
            submitting={submitting}
            serverError={serverError}
            serverFieldErrors={serverFieldErrors}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/akun/postingan')}
          />
        </div>
      </main>
    </AccountGuard>
  );
}

export function EditPostPage({ postId }: { postId: string }) {
  const { refreshUser } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [post, setPost] = useState<PublicPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const res = await apiFetch<PublicPost>(`/api/account/posts/${encodeURIComponent(postId)}`);
      if (!active) return;
      if (!res.ok) {
        if (res.banned) {
          await refreshUser();
          return;
        }
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(res.data);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [postId, refreshUser]);

  if (!loading && notFound) {
    return <NotFoundPage />;
  }

  const handleSubmit = async (values: {
    title: string;
    category: PostCategory;
    priceIdr: number;
    description: string;
    images: string[];
    contactWhatsapp: string;
  }) => {
    setSubmitting(true);
    setServerError(null);
    setServerFieldErrors({});

    const res = await apiFetch<PublicPost>(`/api/account/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    });

    setSubmitting(false);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setServerError(res.error);
      if (res.fieldErrors) setServerFieldErrors(res.fieldErrors);
      return;
    }

    void syncPostToFirestore(res.data).catch(() => undefined);
    showToast('Perubahan postingan disimpan.', 'success');
    navigate('/akun/postingan');
  };

  return (
    <AccountGuard>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold text-zinc-950">Ubah postingan</h1>
        {loading || !post ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
            <PostForm
              key={post.id}
              initialValues={{
                title: post.title,
                category: post.category,
                priceIdr: String(post.priceIdr),
                description: post.description,
                images: post.images,
                contactWhatsapp: post.contactWhatsapp,
              }}
              submitLabel="Simpan perubahan"
              submitting={submitting}
              serverError={serverError}
              serverFieldErrors={serverFieldErrors}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/akun/postingan')}
            />
          </div>
        )}
      </main>
    </AccountGuard>
  );
}

export function ProfilePage() {
  const { user, setUser, refreshUser } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setWhatsapp(user.whatsapp);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ displayName, whatsapp });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setError(null);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<{ user: UserProfile }>('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });

    setSubmitting(false);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setUser(res.data.user);
    void syncSignedInUserToFirestore(res.data.user.displayName, res.data.user.whatsapp).catch(
      () => undefined
    );
    showToast('Profil berhasil diperbarui.', 'success');
    navigate('/akun/postingan');
  };

  return (
    <AccountGuard>
      <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-zinc-950">Profil akun</h1>
          {user && (user.isOwner || user.isVerified) && (
            <VerifiedBadge isOwner={user.isOwner} showText />
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Nama tampilan dan nomor WhatsApp bawaan saat memasang postingan baru.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-zinc-950 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email" className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span>Email</span>
              </Label>
              <Input id="prof-email" value={user?.email || ''} disabled />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span>Nama tampilan</span>
              </Label>
              <Input
                id="prof-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.displayName)}
              />
              {fieldErrors.displayName && (
                <p className="text-xs font-medium text-zinc-950">{fieldErrors.displayName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-wa" className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span>Nomor WhatsApp bawaan</span>
              </Label>
              <Input
                id="prof-wa"
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 081234567890"
                aria-invalid={Boolean(fieldErrors.whatsapp)}
              />
              {fieldErrors.whatsapp && (
                <p className="text-xs font-medium text-zinc-950">{fieldErrors.whatsapp}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/akun/postingan')}
                disabled={submitting}
              >
                Kembali
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan profil'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AccountGuard>
  );
}
