---
name: jasa-posting
description: Aturan kerja agent untuk proyek Jasa Posting. Menggabungkan cara berpikir engineering ala Ponytail, standar desain ala Impeccable, dan proses mencari skill ala find-skills. Gunakan pada setiap tugas di repo ini: menulis kode, membangun UI, review, memilih dependency, atau memasang skill.
---

# Skill: Jasa Posting

Dokumen ini dibaca agent sebelum mengerjakan tugas apa pun di repo ini. Isinya tiga aturan sumber, lalu konvensi proyek.

| Sumber | Mengatur | Bagian |
|--------|----------|--------|
| Ponytail (`DietrichGebert/ponytail`) | Seberapa banyak kode yang ditulis | 2 |
| Impeccable (`impeccable.style`) | Tampilan, tipografi, warna, gerak, teks | 3 |
| find-skills (`SKILL.md` dari pemilik proyek) | Cara menemukan dan memasang skill | 4 |

Pembaca: agent coding (Claude Code, Codex, Cursor, dan sejenisnya) dan manusia yang me-review hasilnya.

## 1. Urutan prioritas jika aturan bertabrakan

1. **Daftar jangan dipotong** (bagian 2.4): validasi, keamanan, aksesibilitas, penanganan galat yang mencegah data hilang.
2. **PRD.md**: apa yang diminta pemilik proyek. Prioritas P0, P1, P2 menentukan urutan.
3. **Ponytail**: ukuran solusi. Pilih yang terkecil yang menyelesaikan seluruh tugas.
4. **Impeccable**: kualitas tampilan. Keadaan memuat, kosong, dan galat adalah bagian dari tugas, bukan tambahan, jadi Ponytail tidak boleh membuangnya.
5. **find-skills**: hanya dipakai saat butuh kemampuan yang belum ada.

Jika dua aturan tetap bertentangan, pilih yang lebih kecil dan lebih aman, lalu sebutkan konfliknya di akhir balasan.

---

## 2. Aturan engineering: Ponytail

Sumber: `skills/ponytail/SKILL.md` di repo Ponytail. Pasang hanya dari `DietrichGebert/ponytail` (GitHub) atau `@dietrichgebert/ponytail` (npm).

### 2.1 Peran

Bertindaklah sebagai senior developer yang malas dengan cara yang benar: kode terbaik adalah kode yang tidak pernah ditulis. Selesaikan seluruh masalah dengan kode baru sesedikit mungkin. Akhiri setiap balasan dengan satu atau dua baris: apa yang dilewati atau belum dicek, dan risiko yang perlu diketahui pemilik proyek.

Tingkat: `full` (bawaan). Pakai `ultra` saat menyusun atau mengubah PRD (pertanyakan bagian yang tidak dibenarkan kebutuhan). Pakai `lite` jika pemilik proyek ingin memilih sendiri.

### 2.2 Sebelum menulis

Baca tugas dan kode yang disentuhnya. Daftar semua tempat yang harus terdampak: pemanggil, tes, fixture, konfigurasi, ekspor. Periksa apa yang bisa rusak bagi pengguna: data yang terhapus atau terbuka, pemanggil yang berhenti bekerja. Itu ruang lingkup. Fitur tambahan bukan ruang lingkup.

### 2.3 Tangga keputusan

Ambil pilihan pertama yang benar-benar berhasil:

1. **Perlu ada?** Lewati fitur, opsi, dan fleksibilitas yang tidak diminta, dan sebut dalam satu baris. Permintaan yang samar mendapat versi terkecil yang menyelesaikan inti pekerjaan.
2. **Sudah ada di codebase?** Pakai helper, komponen, atau pola yang ada, dengan cara yang sama seperti kode di sekitarnya.
3. **Library standar atau fitur platform?** Pakai, kecuali proyek punya versi sendiri. Komponen rumah (shadcn) menang atas widget native.
4. **Dependency yang sudah terpasang?** Pakai. Jangan menambah dependency demi beberapa baris kode.
5. **Bisa satu baris yang langsung terbaca?** Satu baris.
6. **Jika tidak:** kode minimum yang bekerja.

Aturan pendamping:
- Malas soal solusi, tidak malas soal perubahan: selesaikan semua bagian yang dibutuhkan tugas, termasuk pemanggil, tes, dan fixture yang rusak karena perubahan.
- Tanpa abstraksi, pembungkus, konversi tipe, opsi, konfigurasi, boilerplate, atau kode "untuk nanti" yang tidak diminta. Hapus lebih baik daripada tambah. Pertahankan struktur yang sudah ada.
- Diff terpendek yang bekerja menang, setelah tahu semua yang harus disentuh. Satu baris yang perlu dibongkar untuk dipahami bukan baris pendek.
- Komentar hanya untuk alasan yang tidak terlihat dari kode, satu baris.
- Perbaikan bug: sebelum mengedit, cari semua pemanggil fungsi yang disentuh, lalu perbaiki akar masalah satu kali di kode bersama.
- Kode yang dipindah atau digabung tetap membawa validasi dan penanganan galatnya.
- Di antara dua pilihan sama kecil, pilih yang benar pada kasus tepi.
- Jalan pintas yang punya batas diberi komentar berformat: `shortcut: <batasnya>, <kapan harus ditingkatkan>`.

### 2.4 Jangan pernah dipotong

Validasi di batas kepercayaan (input pengguna, parameter URL, berkas unggahan), penanganan galat yang mencegah kehilangan data, keamanan, aksesibilitas, dan apa pun yang diminta pemilik proyek.

### 2.5 Tes

Kode baru yang tidak sepele (percabangan, perulangan, parser, uang, keamanan) meninggalkan satu tes kecil atau pengecekan mandiri berbasis assert. Perubahan sepele tidak perlu tes. Di proyek ini wajib ada tes untuk:

| Modul | Yang dites |
|-------|------------|
| `lib/permissions.ts` | Matriks hak akses PRD bagian 3, termasuk tidak boleh blokir diri sendiri, moderator tidak boleh blokir user ber-role, admin terakhir tidak boleh dihapus |
| `lib/whatsapp.ts` | Normalisasi `08…`, `+62…`, `62…`, spasi dan tanda hubung; menolak format salah |
| `lib/schemas.ts` | Batas judul, deskripsi, harga, jumlah gambar, path gambar milik user lain ditolak |
| `lib/format.ts` | Rupiah (0 menjadi "Gratis"), waktu relatif |
| Migrasi RLS | User biasa tidak bisa menulis `is_banned`, tidak bisa membaca `user_roles` orang lain, user diblokir tidak bisa insert postingan |

### 2.6 Daftar "tidak dibangun" untuk proyek ini

| Jangan | Gunakan |
|--------|---------|
| Auth buatan sendiri, penanganan JWT manual | Supabase Auth dengan `@supabase/ssr` |
| ORM | `supabase-js` dengan tipe hasil `supabase gen types` |
| State manager (Redux, Zustand) | State React, Server Components, Server Actions |
| Library form (react-hook-form) | `<form action>` native dengan `useActionState` dan Zod |
| Library tanggal (dayjs, moment) | `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` |
| Library format uang | `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` |
| Library galeri atau carousel | CSS `scroll-snap` ditambah thumbnail |
| Library kompresi gambar | Canvas API (`createImageBitmap`, `canvas.toBlob`) |
| Library i18n | Teks Indonesia langsung di komponen |
| CSS-in-JS atau pustaka UI lain | Tailwind dan komponen shadcn/ui |
| Date picker, rich text editor, drag-and-drop | Tidak diperlukan di v1 |

### 2.7 Daftar dependency yang diizinkan

`next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`, `vitest`, dependency bawaan shadcn/ui (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`). Menambah yang lain butuh satu baris alasan dan persetujuan pemilik proyek. Jangan tambah dependency demi beberapa baris kode.

### 2.8 Perintah Ponytail

| Perintah | Kapan |
|----------|-------|
| `/ponytail full` | Awal sesi build |
| `/ponytail ultra` | Saat membahas PRD atau menimbang fitur baru |
| `/ponytail-review` | Setelah setiap tahap di `PROMPTS.md` |
| `/ponytail-audit` | Sebelum rilis |
| `/ponytail-debt` | Sebelum rilis: kumpulkan semua komentar `shortcut:` menjadi daftar |

Pasang (Claude Code, dua perintah terpisah):
```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```
Agent lain: salin `AGENTS.md` dari repo Ponytail ke akar proyek ini. Panduan lengkap ada di `INSTALL.md` repo tersebut.

---

## 3. Aturan desain: Impeccable

Sumber: `impeccable.style`, termasuk katalog "Slop" (62 aturan detektor dan 6 pola untuk review desain). Temuan detektor adalah alasan untuk melihat lebih dekat, bukan hukuman otomatis. Jika sebuah pilihan memang disengaja, catat alasannya di `DESIGN.md`.

### 3.1 Pemasangan

```
npx impeccable install
/impeccable init          # membuat PRODUCT.md
/impeccable hooks on      # pemeriksaan otomatis setiap kali agent mengedit UI
```
Lalu setujui hooks di alat coding yang dipakai (misalnya Codex: buka `/hooks` dan percayai hook `PostToolUse` dan `Stop`).

### 3.2 Isi awal PRODUCT.md

Pakai jawaban ini saat `/impeccable init`:

```
## Register
product

## Platform
web (mobile-first, 360 px)

## Users
Penjual perorangan dan pelaku usaha kecil Indonesia yang memasang barang atau jasa dari HP.
Pembeli yang mencari dan menghubungi penjual lewat WhatsApp.
Admin dan moderator yang menertibkan konten dengan cepat.

## Product Purpose
Papan iklan sederhana: pasang postingan lengkap dalam hitungan menit, temukan dan hubungi penjual dalam dua ketukan.

## Principles
Satu aksi utama per layar. Tenang dan datar: garis tipis, tanpa hiasan. Teks Indonesia yang jelas dan pendek.
Dashboard admin padat dan cepat dipindai. Beranda dan detail fokus pada gambar dan harga.

## Accessibility & Inclusion
WCAG 2.2 AA. Terbaca di HP kecil dan koneksi lambat. Label selalu terlihat. Target sentuh 44 px.
```

### 3.3 Arah visual

Gaya: Modern SaaS / Developer Dashboard ala Shadcn UI dan Tailwind. Struktur komponen shadcn dipertahankan, tetapi bawaan yang ditandai Impeccable sebagai "slop" diganti.

| Bawaan shadcn atau kebiasaan umum | Di proyek ini |
|-----------------------------------|---------------|
| Font Inter atau Geist (ditandai "overused font") | **Plus Jakarta Sans** untuk UI, **JetBrains Mono** hanya untuk ID dan stempel waktu di admin. Ganti di `layout.tsx` lewat `next/font/google` |
| Palet zinc polos plus aksen biru atau ungu | Netral dingin sedikit kebiruan, satu aksen hijau kebiruan (teal-hijau). Tanpa ungu, tanpa cyan neon, tanpa krem |
| Kartu dengan bayangan lebar | Garis tepi 1 px saja. Bayangan hanya untuk popover dan dialog, satu token |
| Mode gelap dengan glow | Mode gelap mengikuti preferensi sistem tanpa tombol toggle di v1, tanpa glow |

### 3.4 Token awal

Nilai awal dalam OKLCH. Agent wajib memeriksa kontras setiap pasangan teks dan latar (minimal 4,5:1 untuk teks biasa, 3:1 untuk teks besar dan komponen UI), menyesuaikan jika kurang, lalu mencatat nilai final di `DESIGN.md` lewat `/impeccable document`.

| Token | Terang | Gelap |
|-------|--------|-------|
| `--background` | `oklch(0.985 0.003 240)` | `oklch(0.17 0.01 255)` |
| `--foreground` | `oklch(0.20 0.02 255)` | `oklch(0.96 0.004 245)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.20 0.012 255)` |
| `--muted` | `oklch(0.955 0.005 245)` | `oklch(0.24 0.012 255)` |
| `--muted-foreground` | `oklch(0.45 0.02 250)` | `oklch(0.72 0.015 250)` |
| `--border` | `oklch(0.91 0.006 245)` | `oklch(0.30 0.012 255)` |
| `--input` | `oklch(0.88 0.008 245)` | `oklch(0.34 0.014 255)` |
| `--primary` | `oklch(0.48 0.10 170)` | `oklch(0.72 0.12 170)` |
| `--primary-foreground` | `oklch(0.985 0.003 240)` | `oklch(0.18 0.02 170)` |
| `--destructive` | `oklch(0.52 0.19 27)` | `oklch(0.70 0.17 25)` |
| `--ring` | sama dengan `--primary` | sama dengan `--primary` |

Lencana status: Aktif memakai tint `--primary`, Terjual memakai `--muted`, Diblokir memakai tint `--destructive`. Warna tidak boleh jadi satu-satunya penanda: selalu sertakan teks.

### 3.5 Tipografi, jarak, bentuk

| Aspek | Aturan |
|-------|--------|
| Skala | 12, 14, 16, 20, 24, 32 px. Teks isi 16 px, tabel padat dan kontrol 14 px, metadata minimal 12 px. Tidak ada teks antarmuka di bawah 12 px |
| Bobot | 400, 500, 600, 700. Judul halaman 600 atau 700. Hierarki harus jelas terbaca dari ukuran dan bobot, bukan hanya warna |
| Tinggi baris | 1,5 untuk teks isi, 1,2 sampai 1,3 untuk judul |
| Panjang baris | 65 sampai 75 karakter untuk deskripsi (`max-w-prose` atau `max-w-[68ch]`) |
| Pembungkusan | `text-wrap: balance` untuk judul, `text-wrap: pretty` untuk paragraf |
| Angka | `tabular-nums` untuk harga dan kolom tabel |
| Huruf | Tanpa huruf kapital penuh untuk teks isi, tanpa teks rata kiri-kanan (justify), letter spacing bawaan |
| Jarak | Skala 4, 8, 12, 16, 24, 32, 48, 64 px. Elemen yang berkaitan didekatkan, grup yang terpisah dijauhkan. Jangan memakai jarak sama di semua tempat |
| Radius | 6 px untuk kontrol (tombol, input), 8 px untuk permukaan dan gambar, penuh hanya untuk avatar dan lencana. Tidak ada radius di atas 12 px pada kartu |
| Permukaan | Datar dengan garis 1 px. Tanpa kartu di dalam kartu: pisahkan dengan jarak, garis pemisah, atau tipografi |

### 3.6 Komponen shadcn yang dipakai

`button`, `input`, `label`, `textarea`, `select`, `badge`, `card` (datar), `table`, `dropdown-menu`, `alert-dialog`, `sheet` (filter di HP), `skeleton`, `sonner`, `avatar`, `separator`, `pagination`. Pasang lewat CLI shadcn, jangan membuat ulang dengan tangan. Komponen lain butuh alasan.

Dialog hanya untuk konfirmasi singkat (hapus, blokir). Tugas yang butuh banyak field (buat postingan) memakai halaman penuh.

### 3.7 Daftar larangan visual (dari katalog Slop Impeccable)

**Wajib dihindari (AI slop)**
- Gradien pada teks atau latar, palet ungu-biru, cyan neon di latar gelap, palet krem atau beige sebagai kebiasaan.
- Glow, halo, sorotan lembut di belakang konten, glassmorphism, bayangan keras bergeser (neobrutalist).
- Strip warna tebal di satu sisi kartu (side-tab), garis tipis ditambah bayangan lebar pada kartu yang sama, garis aksen tebal pada elemen membulat.
- Kartu di dalam kartu, ikon dalam kotak membulat di atas judul, label kecil di atas judul (eyebrow), lencana di atas judul utama, nomor bagian kecil ("01 Temukan").
- Judul hero berukuran raksasa, judul serif miring, tata letak angka besar plus statistik kecil, grid fitur yang semuanya sama.
- Latar kotak-kotak dekoratif, garis diagonal berulang, ilustrasi SVG kasar atau maskot buatan tangan, ilustrasi pengisi dari lingkaran dan balok.
- Titik status berdenyut, kursor berkedip dekoratif, teks atau logo yang bergulir otomatis (marquee), easing memantul atau elastis.
- Jarak seragam di semua tempat, judul yang lebih dekat ke blok sebelumnya daripada ke isinya sendiri.

**Masalah kualitas**
- Kontras rendah, teks abu-abu di atas latar berwarna, teks terlalu kecil, tinggi baris terlalu rapat, letter spacing lebar pada teks isi.
- Label field berupa placeholder saja. Label harus terlihat.
- Level heading melompat (misalnya h1 langsung ke h3).
- Paragraf yang berakhir dengan satu kata sendirian, judul dengan baris terakhir pendek.
- Konten yang menggantung di `opacity: 0` menunggu animasi. Konten harus terlihat secara bawaan.
- Halaman yang bisa digulir ke samping, konten yang meluap dari wadahnya, menu atau popover yang terpotong, elemen yang menutupi teks, kartu menempel di tepi area gulir.
- Padding sempit pada tombol atau kartu, teks menempel di tepi layar.
- Gambar rusak atau bersumber kosong, lapisan hampir buram yang menyembunyikan gambar.
- Dialog yang berisi banyak kolom dan bisa digulir (modal abuse): pindahkan ke halaman.
- Error JavaScript saat halaman dimuat.

**Teks antarmuka**
- Bahasa Indonesia, kalimat pendek, langsung ke pokok.
- Tanpa klaim pemasaran umum ("terbaik", "super", "kelas dunia"), tanpa kontras paksa ("Bukan sekadar X, tapi Y"), tanpa dash panjang (em dash) berulang, tanpa menyebut sesuatu "teater".
- Teks yang sama tidak diulang di dalam satu wadah.
- Tombol memakai kata kerja spesifik: "Pasang postingan", "Simpan perubahan", "Blokir pengguna", "Hapus postingan". Hindari "Lanjut" dan "Kirim" yang generik.
- Pesan galat menjelaskan apa yang terjadi dan apa yang bisa dilakukan.

### 3.8 Gerak

Durasi 120 sampai 160 ms, `ease-out`, hanya `opacity` dan `transform`. Umpan balik hover dan tekan saja. Tanpa pantulan, tanpa animasi masuk saat gulir. Hormati `prefers-reduced-motion`.

### 3.9 Keadaan dan responsivitas

- Setiap layar punya keadaan memuat (skeleton), kosong, dan galat. Teks kosong berisi satu kalimat dan satu aksi.
- Mobile-first dari 360 px. Tabel admin boleh digulir ke samping hanya di dalam wadahnya sendiri, halaman tidak boleh ikut tergeser.
- Input 16 px. Target sentuh minimal 44 px. Bar aksi tetap di bawah pada detail postingan di HP harus memperhitungkan safe area.

### 3.10 Perintah Impeccable per momen

| Momen | Perintah |
|-------|----------|
| Awal proyek | `/impeccable init`, `/impeccable hooks on` |
| Merancang layar baru | `/impeccable shape` |
| Tipografi terasa datar | `/impeccable typeset` |
| Tata letak dan jarak | `/impeccable layout` |
| Warna | `/impeccable colorize` |
| Terlalu ramai | `/impeccable distill`, `/impeccable clarify` |
| Responsif | `/impeccable adapt` |
| Evaluasi desain | `/impeccable critique` |
| Evaluasi kualitas produksi | `/impeccable audit` |
| Pemolesan akhir | `/impeccable polish`, `/impeccable harden` |
| Merekam sistem desain | `/impeccable document` (menulis `DESIGN.md`) |

### 3.11 Gerbang kualitas

Sebelum sebuah tahap dianggap selesai:
```
npx impeccable detect src/
npx impeccable detect http://localhost:3000
```
Hasil harus 0 temuan, atau tiap temuan yang tersisa punya alasan tertulis di `DESIGN.md` (untuk pilihan yang disengaja gunakan atribut `data-impeccable-ignore="<id-aturan>"`). Jalankan juga di CI.

---

## 4. Menemukan dan memasang skill: find-skills

Sumber: `SKILL.md` (find-skills) yang diberikan pemilik proyek. Gunakan proses ini saat tugas membutuhkan kemampuan khusus yang mungkin sudah ada sebagai skill.

### 4.1 Perintah inti

```
npx skills find [kata kunci] [--owner <pemilik>]   # cari
npx skills add <pemilik/repo@skill>                # pasang
npx skills update                                  # perbarui semua
```
Direktori: https://skills.sh/

### 4.2 Proses

1. **Pahami kebutuhan**: domain (misalnya Next.js, shadcn, Supabase), tugas spesifik, dan apakah tugasnya cukup umum untuk punya skill.
2. **Cek leaderboard dulu** di skills.sh sebelum mencari lewat CLI.
3. **Cari** dengan kata kunci spesifik ("nextjs supabase" lebih baik daripada "backend"). Coba istilah lain jika kosong.
4. **Verifikasi kualitas sebelum merekomendasikan.** Jangan merekomendasikan hanya karena muncul di hasil pencarian:
   - **Jumlah install**: utamakan 1 ribu atau lebih. Waspada di bawah 100.
   - **Reputasi sumber**: sumber resmi (`vercel-labs`, `anthropics`, `microsoft`) lebih tepercaya daripada penulis tak dikenal.
   - **Bintang GitHub**: repo di bawah 100 bintang diperlakukan dengan curiga.
5. **Sajikan opsi** ke pemilik proyek: nama dan fungsi skill, jumlah install dan sumber, perintah pasang, dan tautan skills.sh.
6. **Tawarkan pemasangan.** Pasang hanya setelah pemilik proyek setuju. Flag `-g -y` (global, tanpa konfirmasi) hanya jika diminta.
7. Jika tidak ada skill yang cocok: katakan terus terang, tawarkan mengerjakan langsung, dan sebut `npx skills init` jika tugasnya akan sering berulang.

### 4.3 Kandidat untuk proyek ini

Agent tidak boleh menganggap tabel ini sudah terverifikasi. Jalankan langkah 4 dan perbarui kolom status sebelum memasang. Angka install berubah dari waktu ke waktu dan sumber yang saya periksa saat menulis dokumen ini adalah direktori pihak ketiga.

| Kebutuhan | Kandidat | Status |
|-----------|----------|--------|
| Mencari skill itu sendiri | `find-skills` (`vercel-labs/skills`) | Sumber resmi, tercatat sebagai skill dengan install terbanyak di berbagai direktori. Verifikasi angka terkini |
| Desain frontend | `frontend-design` (`anthropics/skills`) | Sumber resmi, peringkat atas. Verifikasi. Jika dipakai bersama Impeccable, **Impeccable yang menang** saat ada konflik |
| Praktik React dan Next.js | `vercel-react-best-practices`, `web-design-guidelines` (`vercel-labs/agent-skills`) | Sumber resmi. Disebut 100 ribu+ install di `SKILL.md` find-skills. Verifikasi |
| Postgres dan Supabase | `supabase-postgres-best-practices` | Verifikasi sumber (organisasi Supabase) dan angka install |
| Shadcn dan Next.js | `nextjs-shadcn` (`laguagu/claude-code-nextjs-skills`) | **Jangan direkomendasikan**: sekitar 700 install dan 57 bintang menurut direktori pihak ketiga (Agustus 2026), di bawah ambang 1 ribu install dan 100 bintang. Cari alternatif yang lolos |

Catatan: skill tidak boleh bertentangan dengan Bagian 2 dan 3. Jika sebuah skill menyuruh menambah dependency di luar daftar 2.7 atau memakai Inter atau Geist, aturan dokumen ini yang berlaku.

---

## 5. Konvensi kode

- TypeScript `strict`. Tanpa `any`. Tipe database dari `supabase gen types`.
- Zod di setiap batas: Server Action, parameter URL, hasil unggahan. Skema hidup di `lib/schemas.ts` dan dipakai bersama klien dan server.
- Server Action mengembalikan `{ ok: true, data? } | { ok: false, error: string, fieldErrors? }`. Galat yang tidak terduga dicatat di server dan dikembalikan sebagai pesan umum.
- Cek otorisasi lewat `requireUser()` dan `requireRole()` di `lib/auth.ts`. Dilarang membuat cek role di komponen sebagai satu-satunya pengaman.
- Klien `service_role` hanya di `lib/supabase/admin.ts` dengan `import 'server-only'`, dan hanya dipanggil setelah `requireRole()`.
- Logika izin berupa fungsi murni di `lib/permissions.ts` agar mudah dites.
- Komponen presentasional tidak memanggil database. Halaman (`page.tsx`) tipis: ambil data, panggil komponen.
- Nama berkas `kebab-case`, komponen `PascalCase`, identifier kode dalam bahasa Inggris, teks yang dilihat pengguna dalam bahasa Indonesia, segmen URL publik dalam bahasa Indonesia (lihat `Structure.md`).
- Commit mengikuti Conventional Commits (`feat:`, `fix:`, `chore:`), satu perubahan logis per commit.

## 6. Definisi selesai untuk satu tugas

- [ ] Persyaratan PRD yang dituju terpenuhi dan kriteria penerimaannya diperiksa satu per satu.
- [ ] Validasi di server ada. Otorisasi diperiksa di server dan database.
- [ ] Keadaan memuat, kosong, dan galat ada.
- [ ] Tes untuk modul di tabel 2.5 ditulis dan lulus. `pnpm typecheck`, `pnpm lint`, `pnpm test` bersih.
- [ ] `npx impeccable detect src/` menghasilkan 0 temuan atau ada alasan tertulis.
- [ ] Kontras, label, urutan heading, fokus keyboard, dan target sentuh diperiksa.
- [ ] Tidak ada dependency baru di luar daftar 2.7. Tidak ada kode "untuk nanti".
- [ ] `/ponytail-review` dijalankan dan temuan "harus diperbaiki" sudah ditangani.
- [ ] Balasan diakhiri dengan: yang dilewati atau belum dicek, dan risikonya.

## 7. Format balasan agent

1. Satu kalimat: apa yang dibuat atau diubah.
2. Daftar berkas yang disentuh.
3. Cara memeriksa (perintah atau langkah klik).
4. Baris penutup: **Dilewati / belum dicek:** … **Risiko:** …
