import React from 'react';
import { ArrowLeft, BookOpen, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link } from '../context/RouterContext';

export function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <BookOpen className="h-4 w-4 text-zinc-950" aria-hidden="true" />
        <span>Pedoman Komunitas</span>
      </div>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
        Aturan Konten dan Privasi Japostku
      </h1>
      <p className="mt-3 text-base text-zinc-600 leading-relaxed text-pretty">
        Japostku adalah papan iklan tempat penjual dan pembeli bertemu secara langsung lewat WhatsApp tanpa perantara pembayaran di dalam platform.
      </p>

      <div className="mt-8 space-y-6 border-t border-zinc-200 pt-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-950">
            <TriangleAlert className="h-5 w-5 text-zinc-950" aria-hidden="true" />
            <span>1. Barang dan jasa yang dilarang</span>
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-zinc-800">
            <li>Barang ilegal, obat-obatan terlarang, senjata tajam atau senjata api tanpa izin, dan barang hasil tindak kejahatan.</li>
            <li>Penipuan, skema investasi bodong, dokumen palsu, atau penawaran jasa yang melanggar hukum Indonesia.</li>
            <li>Konten dewasa, pornografi, perjudian, atau materi yang mengandung kebencian.</li>
            <li>Postingan duplikat berulang yang mengganggu pengguna lain, maksimal 10 postingan baru per 24 jam.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-950">
            <ShieldCheck className="h-5 w-5 text-zinc-950" aria-hidden="true" />
            <span>2. Keamanan transaksi</span>
          </h2>
          <p className="max-w-[68ch] text-[15px] leading-relaxed text-zinc-800 text-pretty">
            Japostku tidak memproses pembayaran maupun pengiriman. Pastikan kamu memeriksa kondisi barang secara langsung atau memilih metode pembayaran yang aman sebelum mentransfer uang.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-950">
            <Lock className="h-5 w-5 text-zinc-950" aria-hidden="true" />
            <span>3. Privasi dan data yang disimpan</span>
          </h2>
          <p className="max-w-[68ch] text-[15px] leading-relaxed text-zinc-800 text-pretty">
            Alamat email akun kamu disimpan untuk keperluan masuk dan tidak pernah ditampilkan ke publik. Data yang tampil pada postingan publik hanyalah nama tampilan penjual, detail barang atau jasa, dan nomor WhatsApp yang kamu cantumkan pada postingan tersebut.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-950 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke beranda</span>
        </Link>
      </div>
    </main>
  );
}
