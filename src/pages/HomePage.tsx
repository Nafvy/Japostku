import React, { useCallback, useEffect, useState } from 'react';
import {
  Armchair,
  ArrowRight,
  ArrowUpDown,
  Briefcase,
  Camera,
  Car,
  ChevronDown,
  Gamepad2,
  Globe,
  HelpCircle,
  Home,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Search,
  Shirt,
  Smartphone,
  Store,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Link, useRouter } from '../context/RouterContext';
import { apiFetch } from '../lib/api';
import { CATEGORY_LABELS, POST_CATEGORIES } from '../lib/categories';
import type { PostCategory, PublicPost, SortOrder } from '../lib/types';
import { cn } from '../lib/utils';
import { PostCard } from '../components/posts/PostCard';
import { EmptyState } from '../components/shared/EmptyState';
import { PaginationBar } from '../components/shared/PaginationBar';
import { Button, Input, Select, Skeleton } from '../components/ui/Primitives';

interface PostsResponse {
  items: PublicPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  ownerNotice?: string;
}

const CATEGORY_ICONS: Record<PostCategory, React.ComponentType<{ className?: string }>> = {
  elektronik: Smartphone,
  kendaraan: Car,
  properti: Home,
  fashion: Shirt,
  rumah_tangga: Armchair,
  hobi: Gamepad2,
  jasa: Briefcase,
  lainnya: Package,
};

const WORKFLOW_STEPS = [
  {
    step: '1',
    title: 'Foto dan Tentukan Harga',
    description:
      'Unggah hingga lima foto barang atau layanan terbaikmu, lengkapi deskripsi singkat, lalu cantumkan nomor WhatsApp aktif.',
    icon: Camera,
  },
  {
    step: '2',
    title: 'Tayang Langsung di Papan',
    description:
      'Postingan langsung muncul di papan utama dan dapat dicari berdasarkan kata kunci, kategori, serta urutan harga.',
    icon: Globe,
  },
  {
    step: '3',
    title: 'Negosiasi Langsung via WhatsApp',
    description:
      'Pembeli menghubungi penjual langsung ke WhatsApp tanpa perantara pembayaran maupun potongan komisi di dalam platform.',
    icon: MessageCircle,
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Bagaimana cara memasang barang atau jasa di Japostku?',
    a: 'Masuk menggunakan akun Google atau email yang terdaftar, lalu tekan tombol plus di pojok kanan bawah. Isi foto, judul, kategori, harga, deskripsi, dan nomor WhatsApp aktif agar postingan langsung tayang.',
  },
  {
    q: 'Apakah ada biaya komisi atau potongan transaksi?',
    a: 'Tidak ada biaya pemasangan maupun potongan komisi. Seluruh proses tanya jawab, kesepakatan harga, dan pembayaran dilakukan langsung antara penjual dan pembeli.',
  },
  {
    q: 'Apa arti lencana centang biru pada nama penjual?',
    a: 'Lencana centang biru menandakan akun pemilik situs atau penjual resmi yang telah diverifikasi secara langsung untuk menambah kepercayaan pembeli.',
  },
  {
    q: 'Bagaimana cara menghubungi penjual dari postingan yang diminati?',
    a: 'Buka halaman detail postingan yang kamu pilih, lalu tekan tombol Hubungi via WhatsApp untuk langsung terhubung ke percakapan dengan penjual.',
  },
] as const;

export function HomePage() {
  const { user } = useAuth();
  const { search, navigate } = useRouter();
  const params = new URLSearchParams(search);
  const urlQ = params.get('q') || '';
  const urlCategory = (params.get('kategori') || '') as PostCategory | '';
  const urlSort = (params.get('urut') || 'terbaru') as SortOrder;
  const urlPage = Math.max(1, Number(params.get('hal') || 1) || 1);

  const [searchInput, setSearchInput] = useState(urlQ);
  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  const updateUrlParams = useCallback(
    (updates: {
      q?: string;
      kategori?: string;
      urut?: SortOrder;
      hal?: number;
    }) => {
      const next = new URLSearchParams(search);
      if (updates.q !== undefined) {
        const trimmed = updates.q.trim();
        if (trimmed) next.set('q', trimmed);
        else next.delete('q');
      }
      if (updates.kategori !== undefined) {
        if (updates.kategori) next.set('kategori', updates.kategori);
        else next.delete('kategori');
      }
      if (updates.urut !== undefined) {
        if (updates.urut && updates.urut !== 'terbaru') next.set('urut', updates.urut);
        else next.delete('urut');
      }
      if (updates.hal !== undefined) {
        if (updates.hal > 1) next.set('hal', String(updates.hal));
        else next.delete('hal');
      }
      const qs = next.toString();
      navigate(qs ? `/?${qs}` : '/');
    },
    [search, navigate]
  );

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    if (urlQ) query.set('q', urlQ);
    if (urlCategory) query.set('kategori', urlCategory);
    if (urlSort) query.set('urut', urlSort);
    query.set('hal', String(urlPage));

    const res = await apiFetch<PostsResponse>(`/api/posts?${query.toString()}`);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setData(res.data);
    setLoading(false);
  }, [urlQ, urlCategory, urlSort, urlPage]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: searchInput, hal: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    navigate('/');
  };

  const hasActiveFilters = Boolean(urlQ || urlCategory || urlSort !== 'terbaru');
  const createHref = user ? '/akun/postingan/baru' : '/masuk?next=/akun/postingan/baru';

  return (
    <main className="flex-1 bg-white">
      {/* Hero section inspired by codecuy.my.id */}
      <section className="border-b border-zinc-200 bg-grid-mono">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          {data?.ownerNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-auto mb-6 flex max-w-2xl items-center justify-center gap-2 rounded-lg border border-zinc-950 bg-white px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-zinc-950 shadow-xs"
            >
              <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{data.ownerNotice}</span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0.96, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
              <span>Papan Iklan Barang dan Jasa Terbuka</span>
            </div>

            <h1 className="mt-5 text-3xl leading-[1.18] font-bold tracking-tight text-zinc-950 sm:text-5xl sm:leading-[1.12] text-balance">
              Jual dan Temukan Barang
              <span className="block text-zinc-500">Tanpa Ribet. Langsung Terhubung.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-zinc-600 leading-relaxed text-pretty">
              Pasang barang atau jasa pilihan kamu dalam hitungan menit, lalu negosiasi langsung dengan pembeli lewat WhatsApp.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto mt-7 flex max-w-xl flex-col gap-2.5 sm:flex-row sm:items-center"
              role="search"
              aria-label="Cari postingan"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari barang atau jasa..."
                  aria-label="Kata kunci pencarian"
                  className="h-12 pl-10 pr-10 shadow-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      if (urlQ) updateUrlParams({ q: '', hal: 1 });
                    }}
                    aria-label="Hapus kata kunci"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-950 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Cari</span>
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-zinc-600">
              <Link
                href={createHref}
                className="inline-flex items-center gap-1.5 font-semibold text-zinc-950 hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Pasang iklan gratis sekarang</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Active Board Section */}
      <section id="jelajahi" aria-label="Daftar postingan" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Etalase Terbaru</span>
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
              Jelajahi Postingan
            </h2>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {data && (
              <span className="text-xs font-medium text-zinc-500 tabular-nums">
                {data.total} postingan
              </span>
            )}
            <div className="inline-flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              <label htmlFor="sort-select" className="sr-only">
                Urutkan postingan
              </label>
              <Select
                id="sort-select"
                value={urlSort}
                onChange={(e) =>
                  updateUrlParams({ urut: e.target.value as SortOrder, hal: 1 })
                }
              >
                <option value="terbaru">Terbaru</option>
                <option value="termurah">Harga terendah</option>
                <option value="termahal">Harga tertinggi</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Category filter tabs */}
        <div
          role="group"
          aria-label="Filter kategori"
          className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          <button
            type="button"
            onClick={() => updateUrlParams({ kategori: '', hal: 1 })}
            aria-pressed={urlCategory === ''}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer',
              urlCategory === ''
                ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950'
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span>Semua</span>
          </button>
          {POST_CATEGORIES.map((cat) => {
            const active = urlCategory === cat;
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => updateUrlParams({ kategori: cat, hal: 1 })}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer',
                  active
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{CATEGORY_LABELS[cat]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {loading && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2.5 p-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <EmptyState
              title="Gagal memuat postingan"
              message={error}
              actionLabel="Coba lagi"
              onAction={() => void fetchPosts()}
            />
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <EmptyState
              title={urlQ ? 'Pencarian tidak ditemukan' : 'Papan iklan masih kosong'}
              message={
                urlQ
                  ? `Tidak ada postingan untuk kata kunci "${urlQ}". Coba kata lain atau hapus filter.`
                  : hasActiveFilters
                    ? 'Belum ada postingan pada kategori atau filter ini.'
                    : 'Belum ada barang atau jasa yang ditayangkan saat ini. Jadilah yang pertama memasang postingan di Japostku.'
              }
              actionLabel={hasActiveFilters ? 'Hapus filter' : 'Pasang postingan pertama'}
              onAction={
                hasActiveFilters ? handleResetFilters : () => navigate(createHref)
              }
            />
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <>
              <div
                data-testid="posts-grid"
                className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
              >
                {data.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              <PaginationBar
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(nextPage) => updateUrlParams({ hal: nextPage })}
              />
            </>
          )}
        </div>
      </section>

      {/* Workflow Section inspired by codecuy.my.id */}
      <section className="border-t border-zinc-200 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Cara Kerja
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
              Alur Sederhana dari Iklan hingga Transaksi
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-600 leading-relaxed">
              Dirancang agar penjual cepat menayangkan barang dan pembeli mudah menghubungi tanpa proses berbelit.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.step}
                  className="smooth-lift flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white tabular-nums">
                        {item.step}
                      </span>
                      <Icon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-zinc-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section inspired by codecuy.my.id */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <HelpCircle className="h-4 w-4 text-zinc-950" aria-hidden="true" />
            <span>Informasi</span>
          </div>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Pertanyaan yang Sering Diajukan
          </h2>

          <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm sm:text-base font-medium text-zinc-950 hover:text-zinc-700 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200',
                        isOpen && 'rotate-180 text-zinc-950'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-4 text-sm leading-relaxed text-zinc-600">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
