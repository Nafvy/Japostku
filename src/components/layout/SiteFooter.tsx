import React from 'react';
import { BookOpen, Compass, PlusCircle, Store } from 'lucide-react';
import { Link } from '../../context/RouterContext';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-zinc-950">
          <Store className="h-4 w-4" aria-hidden="true" />
          <p className="font-medium">
            © {new Date().getFullYear()} Japostku. Semua hak dilindungi.
          </p>
        </div>
        <nav aria-label="Tautan kaki halaman" className="flex flex-wrap items-center gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-zinc-950 transition-colors"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
          <Link
            href="/akun/postingan/baru"
            className="inline-flex items-center gap-1.5 hover:text-zinc-950 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pasang iklan</span>
          </Link>
          <Link
            href="/aturan"
            className="inline-flex items-center gap-1.5 hover:text-zinc-950 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Aturan dan Privasi</span>
          </Link>
        </nav>
      </div>
    </footer>
  );
}
