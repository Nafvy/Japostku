import React, { useCallback, useEffect, useState } from 'react';
import {
  Crown,
  FileText,
  FolderPlus,
  ImageOff,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Plus,
  Search,
  Shield,
  Tag,
  Tags,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { formatDate, formatDateTime, rupiah } from '../lib/format';
import {
  canAccessAdmin,
  canBan,
  canManageRoles,
} from '../lib/permissions';
import type {
  AdminUserRow,
  AppRole,
  AuditAction,
  AuditLogEntry,
  CategoryItem,
  PostCategory,
  PrivatePost,
} from '../lib/types';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/shared/EmptyState';
import { PaginationBar } from '../components/shared/PaginationBar';
import { VerifiedBadge } from '../components/shared/VerifiedBadge';
import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
} from '../components/ui/Primitives';
import { NotFoundPage } from './NotFoundPage';

const AUDIT_LABELS: Record<AuditAction, string> = {
  ban: 'memblokir pengguna',
  unban: 'membuka blokir',
  role_add: 'menambah role',
  role_remove: 'menghapus role',
  post_delete: 'menghapus postingan',
  post_pin: 'menyematkan postingan',
  post_unpin: 'melepas sematan postingan',
  verify_add: 'memberi lencana terverifikasi',
  verify_remove: 'mencabut lencana terverifikasi',
  notice_update: 'memperbarui pengumuman beranda',
  board_clear: 'membersihkan seluruh papan postingan',
  category_add: 'menambah kategori',
  category_remove: 'menghapus kategori',
};

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname, fullPath, navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/masuk' && pathname !== '/daftar') {
      navigate(`/masuk?next=${encodeURIComponent(fullPath)}`, { replace: true });
    }
  }, [loading, user, pathname, fullPath, navigate]);

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-6 h-64 w-full" />
      </main>
    );
  }

  if (!canAccessAdmin(user.roles, user.isOwner)) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/admin/pengguna', label: 'Pengguna', icon: Users },
  { href: '/admin/postingan', label: 'Postingan', icon: FileText },
  { href: '/admin/kategori', label: 'Kategori', icon: Tags },
] as const;

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const activeItem =
    ADMIN_NAV_ITEMS.find((item) =>
      item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
    ) || ADMIN_NAV_ITEMS[0];

  const renderSidebarLinks = (mobile = false) => (
    <nav aria-label="Sidebar admin" className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (mobile) setDrawerOpen(false);
            }}
            className={cn(
              'relative inline-flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150',
              active
                ? 'text-white'
                : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950'
            )}
          >
            {active && !mobile && (
              <motion.span
                layoutId="admin-sidebar-active"
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                className="absolute inset-0 rounded-lg bg-zinc-950"
                aria-hidden="true"
              />
            )}
            {active && mobile && (
              <span
                className="absolute inset-0 rounded-lg bg-zinc-950"
                aria-hidden="true"
              />
            )}
            <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex w-full flex-1 flex-col md:flex-row">
      {/* Mobile top-left sidebar bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka sidebar admin"
            aria-expanded={drawerOpen}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-400 cursor-pointer"
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
            <span>Menu</span>
          </button>
          <span className="text-sm font-semibold text-zinc-950">{activeItem.label}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {user?.isOwner ? (
            <Crown className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-zinc-700" aria-hidden="true" />
          )}
          <span>{user?.isOwner ? 'Pemilik' : 'Admin'}</span>
        </div>
      </div>

      {/* Mobile slide-in top-left sidebar drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar admin"
          >
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex w-64 max-w-[80vw] flex-col border-r border-zinc-200 bg-white p-4 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  {user?.isOwner ? (
                    <Crown className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
                  )}
                  <span>{user?.isOwner ? 'Panel Pemilik' : 'Dashboard Admin'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Tutup sidebar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderSidebarLinks(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop top-left docked sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-zinc-50/75 md:block">
        <div className="sticky top-16 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            {user?.isOwner ? (
              <Crown className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
            ) : (
              <Shield className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
            )}
            <span>{user?.isOwner ? 'Panel Pemilik' : 'Dashboard Admin'}</span>
          </div>
          {renderSidebarLinks(false)}
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 md:py-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-5xl"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

interface SummaryResponse {
  totalUsers: number;
  activePosts: number;
  pinnedPosts?: number;
  bannedUsers: number;
  ownerNotice?: string;
  recentActions: AuditLogEntry[];
}

export function AdminOverviewPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noticeInput, setNoticeInput] = useState('');
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<SummaryResponse>('/api/admin/summary');
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      setLoading(false);
      return;
    }
    setSummary(res.data);
    setNoticeInput(res.data.ownerNotice || '');
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeBusy(true);
    const res = await apiFetch<{ ownerNotice: string }>('/api/owner/notice', {
      method: 'PATCH',
      body: JSON.stringify({ notice: noticeInput.trim() }),
    });
    setNoticeBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(
      res.data.ownerNotice ? 'Pengumuman beranda disimpan.' : 'Pengumuman beranda dihapus.',
      'success'
    );
    void loadSummary();
  };

  const handleClearBoard = async () => {
    setClearBusy(true);
    const res = await apiFetch<{ deletedCount: number }>('/api/owner/posts', {
      method: 'DELETE',
    });
    setClearBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    setClearConfirmOpen(false);
    showToast('Seluruh postingan pada papan berhasil dibersihkan.', 'success');
    void loadSummary();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <LayoutDashboard className="h-5 w-5 text-zinc-950" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-zinc-950">Ringkasan</h1>
          {user?.isOwner && <VerifiedBadge isOwner showText />}
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {!loading && error && (
          <EmptyState
            message={error}
            actionLabel="Coba lagi"
            onAction={() => void loadSummary()}
          />
        )}

        {!loading && !error && summary && (
          <>
            <section
              aria-label="Statistik utama"
              className="rounded-xl border border-zinc-200 bg-white"
            >
              <dl className="divide-y divide-zinc-200">
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                  <dt className="text-sm font-medium text-zinc-600">
                    Total pengguna terdaftar
                  </dt>
                  <dd className="text-base font-bold text-zinc-950 tabular-nums">
                    {summary.totalUsers}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                  <dt className="text-sm font-medium text-zinc-600">
                    Postingan aktif publik
                  </dt>
                  <dd className="text-base font-bold text-zinc-950 tabular-nums">
                    {summary.activePosts}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                  <dt className="text-sm font-medium text-zinc-600">
                    Postingan sorotan pemilik
                  </dt>
                  <dd className="text-base font-bold text-zinc-950 tabular-nums">
                    {summary.pinnedPosts ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                  <dt className="text-sm font-medium text-zinc-600">
                    Pengguna diblokir
                  </dt>
                  <dd className="text-base font-bold text-zinc-950 tabular-nums">
                    {summary.bannedUsers}
                  </dd>
                </div>
              </dl>
            </section>

            {user?.isOwner && (
              <section
                aria-label="Kontrol khusus pemilik"
                className="relative rounded-xl border border-zinc-950 bg-grid-mono p-5 sm:p-6 space-y-5"
              >
                <span aria-hidden="true" className="absolute -left-1 -top-1 h-2 w-2 bg-zinc-950" />
                <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 bg-zinc-950" />
                <span aria-hidden="true" className="absolute -bottom-1 -left-1 h-2 w-2 bg-zinc-950" />
                <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-2 w-2 bg-zinc-950" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      <Crown className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
                      <span>Fitur Khusus Pemilik Situs</span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-zinc-950">
                      Kontrol Pemilik
                    </h2>
                  </div>
                  <VerifiedBadge isOwner />
                </div>

                <form onSubmit={handleSaveNotice} className="space-y-3">
                  <Label htmlFor="owner-notice" className="inline-flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                    <span>Pengumuman di halaman beranda</span>
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="owner-notice"
                      value={noticeInput}
                      maxLength={200}
                      onChange={(e) => setNoticeInput(e.target.value)}
                      placeholder="Tulis pengumuman singkat untuk seluruh pengunjung..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={noticeBusy}>
                      {noticeBusy ? 'Menyimpan...' : 'Simpan pengumuman'}
                    </Button>
                    {summary.ownerNotice && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={noticeBusy}
                        onClick={async () => {
                          setNoticeBusy(true);
                          const res = await apiFetch<{ ownerNotice: string }>('/api/owner/notice', {
                            method: 'PATCH',
                            body: JSON.stringify({ notice: '' }),
                          });
                          setNoticeBusy(false);
                          if (!res.ok) {
                            showToast(res.error, 'error');
                            return;
                          }
                          setNoticeInput('');
                          showToast('Pengumuman beranda dihapus.', 'success');
                          void loadSummary();
                        }}
                      >
                        Kosongkan
                      </Button>
                    )}
                  </div>
                </form>

                <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      Bersihkan papan postingan
                    </p>
                    <p className="text-xs text-zinc-600">
                      Hapus seluruh postingan yang tersimpan di papan secara bersamaan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearConfirmOpen(true)}
                    disabled={summary.activePosts === 0}
                    className="border-zinc-950 text-zinc-950 hover:bg-zinc-950 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Bersihkan semua postingan</span>
                  </Button>
                </div>
              </section>
            )}

            <section aria-label="Tindakan admin terakhir" className="space-y-3">
              <h2 className="text-base font-semibold text-zinc-950">
                10 tindakan admin terakhir
              </h2>
              {summary.recentActions.length === 0 ? (
                <EmptyState message="Belum ada tindakan." />
              ) : (
                <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                  {summary.recentActions.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm text-zinc-950">
                          <span className="font-semibold">{entry.actorName}</span>{' '}
                          <span className="text-zinc-600">
                            {AUDIT_LABELS[entry.action]}
                          </span>{' '}
                          <span className="font-medium">{entry.targetLabel}</span>
                        </p>
                        {entry.reason && (
                          <p className="text-xs text-zinc-500">
                            Alasan: {entry.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-500 font-mono tabular-nums">
                        <span>{entry.targetId}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <ConfirmDialog
          open={clearConfirmOpen}
          title="Bersihkan seluruh papan postingan?"
          description="Seluruh postingan dan foto unggahan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
          confirmLabel="Hapus semua postingan"
          destructive
          busy={clearBusy}
          onConfirm={() => void handleClearBoard()}
          onCancel={() => setClearConfirmOpen(false)}
        />
      </div>
    </AdminLayout>
  );
}

interface UsersResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function AdminUsersPage() {
  const { user: actor, refreshUser } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [q, setQ] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('semua');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [menuState, setMenuState] = useState<{
    row: AdminUserRow;
    top: number;
    right: number;
  } | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banError, setBanError] = useState<string | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUserRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!menuState) return;
    const close = () => setMenuState(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuState]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (filter !== 'semua') params.set('filter', filter);
    params.set('hal', String(page));

    const res = await apiFetch<UsersResponse>(`/api/admin/users?${params.toString()}`);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      setLoading(false);
      return;
    }
    setData(res.data);
    setLoading(false);
  }, [searchTerm, filter, page, refreshUser]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleBanSubmit = async () => {
    if (!banTarget) return;
    if (banReason.trim().length < 3) {
      setBanError('Alasan pemblokiran minimal 3 karakter.');
      return;
    }
    setBusy(true);
    setBanError(null);
    const res = await apiFetch(`/api/admin/users/${banTarget.id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason: banReason.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setBanError(res.error);
      return;
    }
    showToast(`Pengguna ${banTarget.displayName} diblokir.`, 'success');
    setBanTarget(null);
    setBanReason('');
    void loadUsers();
  };

  const handleUnbanConfirm = async () => {
    if (!unbanTarget) return;
    setBusy(true);
    const res = await apiFetch(`/api/admin/users/${unbanTarget.id}/unban`, {
      method: 'POST',
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(`Blokir ${unbanTarget.displayName} dibuka.`, 'success');
    setUnbanTarget(null);
    void loadUsers();
  };

  const handleToggleRole = async (target: AdminUserRow, role: AppRole) => {
    const has = target.roles.includes(role);
    setBusy(true);
    const res = has
      ? await apiFetch(`/api/admin/users/${target.id}/roles/${role}`, { method: 'DELETE' })
      : await apiFetch(`/api/admin/users/${target.id}/roles`, {
          method: 'POST',
          body: JSON.stringify({ role }),
        });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(
      has ? `Role ${role} dihapus.` : `Role ${role} ditambahkan.`,
      'success'
    );
    setRoleTarget((prev) =>
      prev && prev.id === target.id
        ? {
            ...prev,
            roles: has
              ? prev.roles.filter((r) => r !== role)
              : [...prev.roles, role],
          }
        : prev
    );
    void loadUsers();
  };

  const handleToggleVerify = async (target: AdminUserRow) => {
    setBusy(true);
    const res = await apiFetch<{ isVerified: boolean }>(
      `/api/owner/users/${target.id}/verify`,
      { method: 'POST' }
    );
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(
      res.data.isVerified
        ? `Lencana terverifikasi diberikan ke ${target.displayName}.`
        : `Lencana terverifikasi dicabut dari ${target.displayName}.`,
      'success'
    );
    void loadUsers();
  };

  const isAdmin = actor
    ? canManageRoles({ id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email })
    : false;

  const menuRow = menuState?.row;
  const menuAllowedBan =
    menuRow && actor
      ? canBan(
          { id: actor.id, roles: actor.roles, isOwner: actor.isOwner, email: actor.email },
          { id: menuRow.id, roles: menuRow.roles, isOwner: menuRow.isOwner, email: menuRow.email }
        )
      : false;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-zinc-950">Kelola pengguna</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(q.trim());
              setPage(1);
            }}
            className="flex flex-1 items-center gap-2 max-w-md"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau email..."
                aria-label="Cari pengguna"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          <Select
            aria-label="Filter pengguna"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="semua">Semua pengguna</option>
            <option value="terverifikasi">Terverifikasi</option>
            <option value="berperan">Punya role</option>
            <option value="diblokir">Diblokir</option>
          </Select>
        </div>

        {loading && <Skeleton className="h-64 w-full" />}

        {!loading && error && (
          <EmptyState
            message={error}
            actionLabel="Coba lagi"
            onAction={() => void loadUsers()}
          />
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState message="Tidak ada pengguna yang cocok." />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                    <th className="px-3.5 py-3">Nama</th>
                    <th className="px-3.5 py-3">Email</th>
                    <th className="px-3.5 py-3">Role</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Bergabung</th>
                    <th className="px-3.5 py-3 text-right">Postingan</th>
                    <th className="px-3.5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.items.map((row) => {
                    const menuOpen = menuState?.row.id === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-zinc-50/70">
                        <td className="px-3.5 py-3 font-medium text-zinc-950">
                          <div className="flex max-w-[170px] items-center gap-1.5">
                            <span className="truncate">{row.displayName}</span>
                            {(row.isVerified || row.isOwner) && (
                              <VerifiedBadge isOwner={row.isOwner} />
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-zinc-600">
                          <div className="max-w-[180px] truncate">{row.email}</div>
                        </td>
                        <td className="px-3.5 py-3 text-zinc-950 whitespace-nowrap">
                          {row.isOwner
                            ? 'Pemilik'
                            : row.roles.length > 0
                              ? row.roles.join(', ')
                              : 'Pengguna'}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {row.isBanned ? (
                            <span className="rounded bg-zinc-950 px-2 py-0.5 text-xs font-medium text-white">
                              Diblokir
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-zinc-950">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                          {row.postCount}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`Aksi untuk ${row.displayName}`}
                            aria-expanded={menuOpen}
                            onClick={(e) => {
                              if (menuOpen) {
                                setMenuState(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuState({
                                row,
                                top: Math.min(window.innerHeight - 210, rect.bottom + 4),
                                right: Math.max(12, window.innerWidth - rect.right),
                              });
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {menuState && menuRow && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuState(null)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  style={{ top: menuState.top, right: menuState.right }}
                  className="fixed z-50 w-52 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
                >
                  {actor?.isOwner && !menuRow.isOwner && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuState(null);
                        void handleToggleVerify(menuRow);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                    >
                      {menuRow.isVerified
                        ? 'Cabut centang biru'
                        : 'Beri centang biru'}
                    </button>
                  )}
                  {menuAllowedBan && !menuRow.isBanned && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuState(null);
                        setBanTarget(menuRow);
                        setBanReason('');
                        setBanError(null);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                    >
                      Blokir pengguna
                    </button>
                  )}
                  {menuAllowedBan && menuRow.isBanned && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuState(null);
                        setUnbanTarget(menuRow);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                    >
                      Buka blokir
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuState(null);
                        setRoleTarget(menuRow);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                    >
                      Kelola role
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuState(null);
                      navigate(`/admin/postingan?q=${encodeURIComponent(menuRow.displayName)}`);
                    }}
                    className="block w-full px-3.5 py-2 text-left text-sm text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                  >
                    Lihat postingan
                  </button>
                </div>
              </>
            )}

            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        )}

        <ConfirmDialog
          open={Boolean(banTarget)}
          title="Blokir pengguna?"
          description={
            banTarget
              ? `${banTarget.displayName} · ${banTarget.email} tidak akan bisa masuk dan semua postingannya disembunyikan dari publik.`
              : ''
          }
          confirmLabel="Blokir pengguna"
          destructive
          busy={busy}
          onConfirm={() => void handleBanSubmit()}
          onCancel={() => setBanTarget(null)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason">Alasan pemblokiran</Label>
            <Textarea
              id="ban-reason"
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Contoh: Memasang iklan penipuan atau barang terlarang."
            />
            {banError && <p className="text-xs font-medium text-zinc-950">{banError}</p>}
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={Boolean(unbanTarget)}
          title="Buka blokir pengguna?"
          description={
            unbanTarget
              ? `${unbanTarget.displayName} dapat masuk kembali dan postingan aktifnya akan tampil lagi.`
              : ''
          }
          confirmLabel="Buka blokir"
          busy={busy}
          onConfirm={() => void handleUnbanConfirm()}
          onCancel={() => setUnbanTarget(null)}
        />

        <ConfirmDialog
          open={Boolean(roleTarget)}
          title={roleTarget ? `Kelola role: ${roleTarget.displayName}` : 'Kelola role'}
          description="Pilih role staf untuk pengguna ini. Role admin terakhir tidak dapat dihapus."
          confirmLabel="Selesai"
          cancelLabel="Tutup"
          busy={busy}
          onConfirm={() => setRoleTarget(null)}
          onCancel={() => setRoleTarget(null)}
        >
          {roleTarget && (
            <div className="space-y-3">
              {(['admin', 'moderator'] as const).map((role) => {
                const checked = roleTarget.roles.includes(role);
                return (
                  <label
                    key={role}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-zinc-50"
                  >
                    <span className="font-medium capitalize">{role}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy || (roleTarget.isOwner && role === 'admin')}
                      onChange={() => void handleToggleRole(roleTarget, role)}
                      className="h-4 w-4 accent-zinc-950"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </ConfirmDialog>
      </div>
    </AdminLayout>
  );
}

interface AdminPostsResponse {
  items: PrivatePost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function AdminPostsPage() {
  const { user: actor, refreshUser } = useAuth();
  const { categories, getLabel } = useCategories();
  const { search } = useRouter();
  const { showToast } = useToast();
  const urlQ = new URLSearchParams(search).get('q') || '';

  const [q, setQ] = useState(urlQ);
  const [searchTerm, setSearchTerm] = useState(urlQ);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [categoryFilter, setCategoryFilter] = useState<PostCategory | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setQ(urlQ);
    setSearchTerm(urlQ);
    setPage(1);
  }, [urlQ]);

  const [data, setData] = useState<AdminPostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [postMenuState, setPostMenuState] = useState<{
    post: PrivatePost;
    top: number;
    right: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PrivatePost | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!postMenuState) return;
    const close = () => setPostMenuState(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [postMenuState]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== 'semua') params.set('status', statusFilter);
    if (categoryFilter) params.set('kategori', categoryFilter);
    params.set('hal', String(page));

    const res = await apiFetch<AdminPostsResponse>(`/api/admin/posts?${params.toString()}`);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      setLoading(false);
      return;
    }
    setData(res.data);
    setLoading(false);
  }, [searchTerm, statusFilter, categoryFilter, page, refreshUser]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleTogglePin = async (post: PrivatePost) => {
    setBusy(true);
    const res = await apiFetch<PrivatePost>(`/api/owner/posts/${post.id}/pin`, {
      method: 'POST',
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(
      res.data.isPinned ? 'Postingan disematkan di atas papan.' : 'Sematan dilepas.',
      'success'
    );
    void loadPosts();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await apiFetch(`/api/admin/posts/${deleteTarget.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: deleteReason.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast('Postingan dihapus oleh staf.', 'success');
    setDeleteTarget(null);
    setDeleteReason('');
    void loadPosts();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-zinc-950">Kelola postingan</h1>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(q.trim());
              setPage(1);
            }}
            className="flex flex-1 items-center gap-2 max-w-md"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari judul atau nama penjual..."
                aria-label="Cari postingan"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter status postingan"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="semua">Semua status</option>
              <option value="active">Aktif</option>
              <option value="sold">Terjual</option>
            </Select>

            <Select
              aria-label="Filter kategori postingan"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as PostCategory | '');
                setPage(1);
              }}
            >
              <option value="">Semua kategori</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading && <Skeleton className="h-64 w-full" />}

        {!loading && error && (
          <EmptyState
            message={error}
            actionLabel="Coba lagi"
            onAction={() => void loadPosts()}
          />
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState message="Tidak ada postingan yang cocok." />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                    <th className="px-3.5 py-3">Postingan</th>
                    <th className="px-3.5 py-3">Penjual</th>
                    <th className="px-3.5 py-3">Harga</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Tanggal</th>
                    <th className="px-3.5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.items.map((post) => {
                    const menuOpen = postMenuState?.post.id === post.id;
                    return (
                      <tr key={post.id} className="hover:bg-zinc-50/70">
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-3">
                            {post.images[0] ? (
                              <img
                                src={post.images[0]}
                                alt={post.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                className="aspect-[4/3] w-14 shrink-0 rounded-md border border-zinc-200 object-cover bg-zinc-100"
                              />
                            ) : (
                              <div className="flex aspect-[4/3] w-14 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-zinc-400">
                                <ImageOff className="h-4 w-4" aria-hidden="true" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="max-w-[180px] truncate font-medium text-zinc-950">
                                  {post.title}
                                </p>
                                {post.isPinned && (
                                  <Pin className="h-3.5 w-3.5 shrink-0 text-zinc-950" aria-label="Disematkan" />
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
                                {getLabel(post.category)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex max-w-[140px] items-center gap-1.5 text-zinc-950">
                            <span className="truncate">{post.sellerName}</span>
                            {(post.authorVerified || post.authorIsOwner) && (
                              <VerifiedBadge isOwner={post.authorIsOwner} />
                            )}
                          </div>
                          {post.authorBanned && (
                            <span className="text-xs font-medium text-zinc-600">
                              Penjual diblokir
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-medium tabular-nums whitespace-nowrap">
                          {rupiah(post.priceIdr)}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {post.status === 'sold' ? 'Terjual' : 'Aktif'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                          {formatDate(post.createdAt)}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`Aksi untuk ${post.title}`}
                            aria-expanded={menuOpen}
                            onClick={(e) => {
                              if (menuOpen) {
                                setPostMenuState(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPostMenuState({
                                post,
                                top: Math.min(window.innerHeight - 150, rect.bottom + 4),
                                right: Math.max(12, window.innerWidth - rect.right),
                              });
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {postMenuState && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPostMenuState(null)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  style={{ top: postMenuState.top, right: postMenuState.right }}
                  className="fixed z-50 w-48 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
                >
                  <Link
                    role="menuitem"
                    href={`/p/${postMenuState.post.id}`}
                    onClick={() => setPostMenuState(null)}
                    className="block w-full px-3.5 py-2 text-left text-sm text-zinc-950 hover:bg-zinc-50"
                  >
                    Lihat postingan
                  </Link>
                  {actor?.isOwner && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => {
                        const target = postMenuState.post;
                        setPostMenuState(null);
                        void handleTogglePin(target);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                    >
                      {postMenuState.post.isPinned ? 'Lepas sorotan' : 'Sematkan di atas'}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const target = postMenuState.post;
                      setPostMenuState(null);
                      setDeleteTarget(target);
                      setDeleteReason('');
                    }}
                    className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                  >
                    Hapus postingan
                  </button>
                </div>
              </>
            )}

            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Hapus postingan ini?"
          description={
            deleteTarget
              ? `Postingan "${deleteTarget.title}" milik ${deleteTarget.sellerName} beserta fotonya akan dihapus permanen.`
              : ''
          }
          confirmLabel="Hapus postingan"
          destructive
          busy={busy}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteTarget(null)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-del-reason">Alasan penghapusan, opsional</Label>
            <Input
              id="admin-del-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Contoh: Melanggar aturan konten"
            />
          </div>
        </ConfirmDialog>
      </div>
    </AdminLayout>
  );
}

interface AdminCategoryRow extends CategoryItem {
  postCount: number;
}

export function AdminCategoriesPage() {
  const { refreshUser } = useAuth();
  const { refreshCategories } = useCategories();
  const { showToast } = useToast();

  const [items, setItems] = useState<AdminCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminCategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ items: AdminCategoryRow[] }>('/api/admin/categories');
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setError(res.error);
      setLoading(false);
      return;
    }
    setItems(res.data.items);
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (trimmed.length < 2) {
      setFormError('Nama kategori minimal 2 karakter.');
      return;
    }
    setFormError(null);
    setCreating(true);
    const res = await apiFetch<CategoryItem>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ label: trimmed }),
    });
    setCreating(false);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      setFormError(res.fieldErrors?.label || res.error);
      return;
    }
    setNewLabel('');
    showToast(`Kategori "${res.data.label}" berhasil ditambahkan.`, 'success');
    await Promise.all([loadCategories(), refreshCategories()]);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch<null>(
      `/api/admin/categories/${encodeURIComponent(deleteTarget.slug)}`,
      { method: 'DELETE' }
    );
    setDeleting(false);
    if (!res.ok) {
      if (res.banned) {
        await refreshUser();
        return;
      }
      showToast(res.error, 'error');
      return;
    }
    showToast(`Kategori "${deleteTarget.label}" dihapus.`, 'success');
    setDeleteTarget(null);
    await Promise.all([loadCategories(), refreshCategories()]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Tags className="h-5 w-5 text-zinc-950" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-zinc-950">Kelola kategori</h1>
        </div>

        <section
          aria-label="Tambah kategori baru"
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <form onSubmit={handleAddCategory} noValidate className="space-y-3">
            <Label htmlFor="new-category-label" className="inline-flex items-center gap-1.5">
              <FolderPlus className="h-4 w-4 text-zinc-600" aria-hidden="true" />
              <span>Tambah kategori postingan</span>
            </Label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1.5">
                <Input
                  id="new-category-label"
                  value={newLabel}
                  maxLength={32}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Contoh: Alat Musik"
                  aria-invalid={Boolean(formError)}
                />
                {formError ? (
                  <p className="text-xs font-medium text-zinc-950">{formError}</p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Kategori baru otomatis muncul di filter beranda dan formulir pasang postingan.
                  </p>
                )}
              </div>
              <Button type="submit" disabled={creating} className="sm:shrink-0">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{creating ? 'Menambahkan...' : 'Tambah kategori'}</span>
              </Button>
            </div>
          </form>
        </section>

        {loading && <Skeleton className="h-64 w-full" />}

        {!loading && error && (
          <EmptyState
            message={error}
            actionLabel="Coba lagi"
            onAction={() => void loadCategories()}
          />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState message="Belum ada kategori yang tersimpan." />
        )}

        {!loading && !error && items.length > 0 && (
          <section aria-label="Daftar kategori aktif" className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-3">Nama Kategori</th>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3 text-right">Postingan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((cat) => (
                  <tr key={cat.slug} className="transition-colors hover:bg-zinc-50/70">
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      <div className="inline-flex items-center gap-2">
                        <Tag className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                        <span>{cat.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                      {cat.postCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={items.length <= 1 || deleting}
                        onClick={() => setDeleteTarget(cat)}
                        aria-label={`Hapus kategori ${cat.label}`}
                        className="border-zinc-200 hover:border-zinc-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Hapus kategori ini?"
          description={
            deleteTarget
              ? `Kategori "${deleteTarget.label}" akan dihapus dari daftar pilihan dan filter baru. Postingan lama yang memakai kategori ini tetap aman ditampilkan.`
              : ''
          }
          confirmLabel="Hapus kategori"
          destructive
          busy={deleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </AdminLayout>
  );
}

