import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  MessageCircle,
  Pin,
  Share2,
  Tag,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { Link } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { formatDate, rupiah } from '../lib/format';
import { waLink } from '../lib/whatsapp';
import type { PublicPost } from '../lib/types';
import { PostGallery } from '../components/posts/PostGallery';
import { EmptyState } from '../components/shared/EmptyState';
import { VerifiedBadge } from '../components/shared/VerifiedBadge';
import { Button, Skeleton } from '../components/ui/Primitives';
import { NotFoundPage } from './NotFoundPage';

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function PostDetailPage({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { getLabel } = useCategories();
  const { showToast } = useToast();

  const [post, setPost] = useState<PublicPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    const res = await apiFetch<PublicPost>(`/api/posts/${encodeURIComponent(postId)}`);
    if (!res.ok) {
      if (res.status === 404) {
        setNotFound(true);
      } else {
        setError(res.error);
      }
      setLoading(false);
      return;
    }
    setPost(res.data);
    document.title = `${res.data.title} — Japostku`;
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void loadPost();
    return () => {
      document.title = 'Japostku — Papan Iklan Barang & Jasa';
    };
  }, [loadPost]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleTogglePin = async () => {
    if (!post || !user?.isOwner) return;
    setPinBusy(true);
    const res = await apiFetch<PublicPost>(`/api/owner/posts/${post.id}/pin`, {
      method: 'POST',
    });
    setPinBusy(false);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    setPost(res.data);
    showToast(
      res.data.isPinned ? 'Postingan disematkan sebagai sorotan.' : 'Sematan dilepas.',
      'success'
    );
  };

  const handleShare = async () => {
    if (!post) return;
    const shareUrl = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: post.title,
          text: `${post.title} - ${rupiah(post.priceIdr)}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      showToast('Tautan postingan disalin ke papan klip.', 'success');
    } else {
      showToast('Gagal menyalin tautan postingan.', 'error');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-5">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error || !post) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <EmptyState
          message={error || 'Postingan gagal dimuat.'}
          actionLabel="Coba lagi"
          onAction={() => void loadPost()}
        />
      </main>
    );
  }

  const isSold = post.status === 'sold';
  const whatsappUrl = waLink(post.contactWhatsapp, post.title);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-12">
      <div className="mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke beranda</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <PostGallery images={post.images} title={post.title} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 lg:sticky lg:top-24"
        >
          <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1 text-zinc-950">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{getLabel(post.category)}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tayang {formatDate(post.createdAt)}</span>
              </span>
              {post.isPinned && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2 py-0.5 font-semibold text-white">
                    <Pin className="h-3 w-3" aria-hidden="true" />
                    <span>Sorotan Pemilik</span>
                  </span>
                </>
              )}
              {isSold && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-950">
                    Terjual
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-3 text-xl sm:text-2xl font-bold leading-tight text-zinc-950 text-balance">
              {post.title}
            </h1>

            <p className="mt-2.5 text-2xl sm:text-3xl font-bold text-zinc-950 tabular-nums tracking-tight">
              {rupiah(post.priceIdr)}
            </p>

            <div className="mt-5 border-t border-zinc-100 pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Penjual
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <User className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                <p className="text-base font-semibold text-zinc-950 break-words">
                  {post.sellerName}
                </p>
                {(post.authorVerified || post.authorIsOwner) && (
                  <VerifiedBadge isOwner={post.authorIsOwner} showText />
                )}
              </div>
            </div>

            <div className="mt-6 hidden sm:flex sm:flex-col sm:gap-2.5">
              {isSold ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-500 cursor-not-allowed"
                >
                  Barang ini sudah terjual
                </button>
              ) : (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Hubungi via WhatsApp</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => void handleShare()}
                className="w-full min-h-11"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>Tautan disalin</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="share"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      <span>Bagikan</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>

              {user?.isOwner && (
                <Button
                  variant="outline"
                  onClick={() => void handleTogglePin()}
                  disabled={pinBusy}
                  className="w-full min-h-11"
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                  <span>{post.isPinned ? 'Lepas sorotan pemilik' : 'Sematkan sebagai sorotan'}</span>
                </Button>
              )}
            </div>
          </div>

          <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-950">
              <FileText className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              <span>Deskripsi</span>
            </h2>
            <p className="mt-3 max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-800 text-pretty">
              {post.description}
            </p>
          </section>
        </motion.div>
      </div>

      {/* Fixed bottom action bar on mobile with safe area */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleShare()}
            aria-label="Bagikan postingan"
            className="min-h-11 shrink-0 px-3.5"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Share2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{copied ? 'Disalin' : 'Bagikan'}</span>
          </Button>
          {isSold ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 cursor-not-allowed"
            >
              Barang ini sudah terjual
            </button>
          ) : (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Hubungi via WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
