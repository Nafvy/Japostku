import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  Crown,
  LayoutList,
  LogIn,
  LogOut,
  Shield,
  Store,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdmin } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import { VerifiedBadge } from '../shared/VerifiedBadge';

export function SiteHeader() {
  const { pathname, navigate } = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaff = user ? canAccessAdmin(user.roles, user.isOwner) : false;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initials = user?.displayName
    ? user.displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
    : '';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Japostku</span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-600"
        >
          <Link
            href="/"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap shrink-0 transition-colors hover:bg-zinc-100 hover:text-zinc-950',
              pathname === '/' && 'bg-zinc-100 text-zinc-950 font-semibold'
            )}
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>Jelajahi</span>
          </Link>
          <Link
            href="/aturan"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap shrink-0 transition-colors hover:bg-zinc-100 hover:text-zinc-950',
              pathname === '/aturan' && 'bg-zinc-100 text-zinc-950 font-semibold'
            )}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Aturan</span>
          </Link>
          {user && (
            <Link
              href="/akun/postingan"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap shrink-0 transition-colors hover:bg-zinc-100 hover:text-zinc-950',
                pathname.startsWith('/akun') && 'bg-zinc-100 text-zinc-950 font-semibold'
              )}
            >
              <LayoutList className="h-4 w-4" aria-hidden="true" />
              <span>Postingan saya</span>
            </Link>
          )}
          {isStaff && (
            <Link
              href="/admin"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap shrink-0 transition-colors hover:bg-zinc-100 hover:text-zinc-950',
                pathname.startsWith('/admin') && 'bg-zinc-100 text-zinc-950 font-semibold'
              )}
            >
              {user?.isOwner ? (
                <Crown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Shield className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{user?.isOwner ? 'Panel Pemilik' : 'Admin'}</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {!loading && !user && (
            <>
              <Link
                href="/masuk"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-950 whitespace-nowrap shrink-0 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/daftar"
                className="hidden sm:inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-all hover:bg-zinc-800"
              >
                <span>Daftar</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={`Menu akun ${user.displayName}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                  {initials || 'U'}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.displayName}
                </span>
                {(user.isOwner || user.isVerified) && (
                  <VerifiedBadge isOwner={user.isOwner} />
                )}
                <ChevronDown className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
                  >
                    <div className="border-b border-zinc-100 px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {user.displayName}
                        </p>
                        {(user.isOwner || user.isVerified) && (
                          <VerifiedBadge isOwner={user.isOwner} />
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-500 mt-0.5">
                        {user.email}
                      </p>
                      {user.isOwner && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2 py-0.5 text-[11px] font-medium text-white">
                          <Crown className="h-3 w-3" aria-hidden="true" />
                          <span>Pemilik Situs</span>
                        </span>
                      )}
                    </div>
                    <Link
                      role="menuitem"
                      href="/akun/postingan"
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-950 transition-colors hover:bg-zinc-50"
                    >
                      <LayoutList className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                      <span>Postingan saya</span>
                    </Link>
                    <Link
                      role="menuitem"
                      href="/akun/profil"
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-950 transition-colors hover:bg-zinc-50"
                    >
                      <User className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                      <span>Profil</span>
                    </Link>
                    <Link
                      role="menuitem"
                      href="/aturan"
                      className="flex md:hidden items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-950 transition-colors hover:bg-zinc-50"
                    >
                      <BookOpen className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                      <span>Aturan</span>
                    </Link>
                    {isStaff && (
                      <Link
                        role="menuitem"
                        href="/admin"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-950 transition-colors hover:bg-zinc-50"
                      >
                        {user.isOwner ? (
                          <Crown className="h-4 w-4 text-zinc-950" aria-hidden="true" />
                        ) : (
                          <Shield className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                        )}
                        <span>{user.isOwner ? 'Panel Pemilik' : 'Dashboard admin'}</span>
                      </Link>
                    )}
                    <div className="my-1 border-t border-zinc-100" />
                    <button
                      role="menuitem"
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-zinc-600" aria-hidden="true" />
                      <span>Keluar</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
