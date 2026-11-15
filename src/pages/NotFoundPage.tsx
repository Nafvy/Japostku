import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from '../context/RouterContext';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-950">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-sm font-semibold text-zinc-500">404</p>
      <h1 className="mt-1.5 text-2xl font-bold text-zinc-950">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-sm text-zinc-600 text-pretty">
        Halaman atau postingan yang kamu cari sudah dihapus, diblokir, atau tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Kembali ke beranda</span>
      </Link>
    </main>
  );
}
