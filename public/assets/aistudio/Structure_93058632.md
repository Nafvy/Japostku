# Structure: Jasa Posting

> Versi 0.1 (draft) · 15 November 2026
> Dokumen pendamping: `PRD.md` (apa yang dibangun), `Skill.md` (aturan agent), `PROMPTS.md` (urutan prompt)

Dokumen ini menjawab satu pertanyaan: file apa ada di mana, dan siapa boleh memanggil siapa. Prinsipnya Ponytail: struktur sekecil mungkin yang masih jelas. Folder baru dibuat hanya saat ada isinya.

---

## 1. Arsitektur

```
Browser (HP atau desktop)
   │  HTML dari Server Components, form via Server Actions
   │  unggah gambar langsung ke Storage (klien Supabase)
   ▼
Next.js App Router (Vercel)
   ├─ proxy        menyegarkan sesi Supabase di tiap permintaan
   ├─ Server Components   baca data lewat klien Supabase milik user
   ├─ Server Actions      tulis data, validasi Zod, cek role
   └─ admin.ts            klien service_role, hanya setelah requireRole()
   ▼
Supabase
   ├─ Auth      pendaftaran, masuk, ban_duration
   ├─ Postgres  tabel, view posts_public, RLS, trigger
   └─ Storage   bucket post-images
```

Tidak ada server API terpisah, tidak ada ORM, tidak ada state manager. Alasannya ada di `Skill.md` bagian 2.6.

### Stack

| Lapisan | Pilihan |
|---------|---------|
| Framework | Next.js (App Router, versi stabil terbaru) dengan TypeScript `strict` |
| Gaya | Tailwind CSS dan shadcn/ui |
| Backend | Supabase (Auth, Postgres, Storage) |
| Validasi | Zod |
| Tes | Vitest, ditambah tes SQL untuk RLS |
| Paket | pnpm, Node LTS aktif |
| Hosting | Vercel dan Supabase |

---

## 2. Pohon folder

```
jasa-posting/
├─ AGENTS.md                   Aturan Ponytail ringkas (salin dari repo Ponytail)
├─ PRODUCT.md                  Dibuat /impeccable init: pengguna, tujuan, prinsip
├─ DESIGN.md                   Dibuat /impeccable document: token dan komponen final
├─ README.md                   Cara menjalankan lokal dan deploy
├─ .env.example                Daftar variabel lingkungan tanpa nilai rahasia
├─ docs/
│  ├─ PRD.md
│  ├─ Skill.md
│  ├─ Structure.md
│  └─ PROMPTS.md
├─ .claude/skills/             Skill terpasang (atau .agents/skills/, sesuai alat yang dipakai)
│
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 0001_schema.sql       Enum, tabel, indeks, trigger pembuat profil
│  │  ├─ 0002_rls.sql          RLS, hak kolom, fungsi has_role, view posts_public
│  │  └─ 0003_storage.sql      Bucket post-images dan policy folder per user
│  ├─ seed.sql                 Data contoh untuk lokal
│  └─ tests/
│     └─ rls.test.sql          Tes kebijakan RLS
│
├─ src/
│  ├─ proxy.ts                 Menyegarkan sesi (bernama middleware.ts di Next.js 15 ke bawah)
│  │
│  ├─ app/
│  │  ├─ layout.tsx            Font, metadata dasar, toaster
│  │  ├─ globals.css           Token warna dan tema Tailwind
│  │  ├─ not-found.tsx         404 yang dipakai bersama
│  │  ├─ error.tsx             Batas galat yang dipakai bersama
│  │  │
│  │  ├─ (publik)/
│  │  │  ├─ layout.tsx         Header dan footer situs
│  │  │  ├─ page.tsx           Beranda: cari, filter, grid, paginasi
│  │  │  ├─ loading.tsx        Skeleton beranda
│  │  │  ├─ p/[id]/page.tsx    Detail postingan
│  │  │  └─ aturan/page.tsx    Aturan dan privasi (P1)
│  │  │
│  │  ├─ (auth)/
│  │  │  ├─ masuk/page.tsx
│  │  │  ├─ daftar/page.tsx
│  │  │  └─ actions.ts         signIn, signUp, signOut
│  │  │
│  │  ├─ auth/confirm/route.ts Penukar token untuk email konfirmasi dan reset sandi
│  │  │
│  │  ├─ akun/
│  │  │  ├─ layout.tsx         Penjaga: requireUser(), keluarkan user diblokir
│  │  │  ├─ actions.ts         createPost, updatePost, setSold, deletePost, updateProfile
│  │  │  ├─ postingan/
│  │  │  │  ├─ page.tsx        Postingan saya
│  │  │  │  ├─ baru/page.tsx
│  │  │  │  └─ [id]/ubah/page.tsx
│  │  │  └─ profil/page.tsx    (P1)
│  │  │
│  │  └─ admin/
│  │     ├─ layout.tsx         Penjaga: requireRole(['admin','moderator']), sidebar
│  │     ├─ actions.ts         setBan, addRole, removeRole, deletePostAsStaff
│  │     ├─ page.tsx           Ringkasan
│  │     ├─ pengguna/page.tsx
│  │     └─ postingan/page.tsx
│  │
│  ├─ components/
│  │  ├─ ui/                   Komponen shadcn (dihasilkan CLI, jangan diedit tanpa alasan)
│  │  ├─ layout/               site-header.tsx, site-footer.tsx, account-menu.tsx, admin-sidebar.tsx
│  │  ├─ posts/                post-card.tsx, post-grid.tsx, post-gallery.tsx, post-form.tsx,
│  │  │                        image-uploader.tsx, search-bar.tsx, category-chips.tsx,
│  │  │                        whatsapp-button.tsx, status-badge.tsx, my-post-row.tsx
│  │  ├─ admin/                users-table.tsx, posts-table.tsx, role-menu.tsx,
│  │  │                        ban-dialog.tsx, delete-post-dialog.tsx, recent-actions.tsx
│  │  └─ shared/               empty-state.tsx, form-field.tsx, pagination-bar.tsx
│  │
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ server.ts          Klien untuk Server Components dan Actions (cookie user)
│  │  │  ├─ browser.ts         Klien untuk komponen klien (unggah gambar)
│  │  │  ├─ proxy.ts           Logika penyegaran sesi yang dipanggil src/proxy.ts
│  │  │  └─ admin.ts           service_role, `import 'server-only'`
│  │  ├─ auth.ts               getUser, requireUser, requireRole
│  │  ├─ permissions.ts        Fungsi murni: canBan, canManageRoles, canDeletePost
│  │  ├─ schemas.ts            Skema Zod bersama klien dan server
│  │  ├─ categories.ts         Label kategori, bertipe Record<PostCategory, string>
│  │  ├─ format.ts             rupiah(), relativeTime(), formatDate()
│  │  ├─ whatsapp.ts           normalizeWhatsapp(), waLink()
│  │  ├─ images.ts             compressImage() dengan Canvas, validasi tipe dan ukuran
│  │  └─ utils.ts              cn() bawaan shadcn
│  │
│  └─ types/
│     └─ database.ts           Dihasilkan oleh supabase gen types, jangan diedit
│
└─ tests/
   ├─ permissions.test.ts
   ├─ whatsapp.test.ts
   ├─ schemas.test.ts
   └─ format.test.ts
```

---

## 3. Konvensi penamaan dan lokasi

| Hal | Aturan |
|-----|--------|
| Berkas | `kebab-case.tsx` |
| Komponen | `PascalCase`, satu komponen utama per berkas, ekspor bernama |
| Identifier kode | Bahasa Inggris (`createPost`, `isBanned`) |
| Segmen URL publik | Bahasa Indonesia (`/masuk`, `/daftar`, `/akun/postingan`, `/admin/pengguna`) |
| Teks untuk pengguna | Bahasa Indonesia, ditulis langsung di komponen |
| Route group | `(publik)` dan `(auth)` tidak muncul di URL |
| Server Actions | Satu `actions.ts` per area (`(auth)`, `akun`, `admin`), diawali `'use server'` |
| Pengambilan data | Di `page.tsx` atau komponen server, tidak di komponen klien |
| Komponen klien | Diberi `'use client'` hanya jika butuh state, efek, atau API browser (uploader, dialog, menu) |

Padanan istilah: halaman `/akun/postingan` = "Postingan saya", `/admin/pengguna` = kelola user, `/admin/postingan` = kelola postingan. Perubahan nama URL harus diperbarui di `PRD.md` bagian 5.

---

## 4. Aturan ketergantungan

```
app/  ──▶  components/  ──▶  lib/
 │                            ▲
 └────────────────────────────┘
components/ui  tidak mengimpor apa pun dari components/ lain atau lib/ (kecuali utils.ts)
lib/          tidak mengimpor dari app/ atau components/
```

| Aturan | Alasan |
|--------|--------|
| `components/ui` murni presentasi | Tetap bisa diganti lewat CLI shadcn |
| `lib/supabase/admin.ts` hanya diimpor dari `app/admin/actions.ts` dan `lib/auth.ts` | Membatasi tempat kunci `service_role` dipakai |
| Komponen klien tidak mengimpor `lib/supabase/server.ts` atau `admin.ts` | Mencegah kebocoran kode server ke browser |
| `lib/permissions.ts` tanpa efek samping dan tanpa impor Supabase | Bisa dites tanpa database |
| Skema Zod dipakai di klien (pratinjau galat) dan server (keputusan akhir) | Satu sumber kebenaran, server tetap yang menentukan |

---

## 5. Alur data utama

### 5.1 Membuat postingan

1. User membuka `/akun/postingan/baru`. Layout `akun` memanggil `requireUser()`.
2. `image-uploader` memilih berkas, `compressImage()` mengecilkannya (sisi terpanjang maksimal 1600 px, WebP), lalu klien Supabase di browser mengunggah ke `post-images/{user_id}/{acak}.webp`. Kebijakan storage hanya mengizinkan folder milik user.
3. Form mengirim judul, kategori, harga, deskripsi, WhatsApp, dan daftar path gambar ke `createPost`.
4. `createPost` memvalidasi dengan Zod, memastikan setiap path diawali `{user_id}/`, menormalisasi WhatsApp, lalu insert ke `posts`. RLS memeriksa pemilik, status blokir, dan batas 10 per hari.
5. Sukses: redirect ke `/akun/postingan` dengan toast. Gagal: galat per field.

### 5.2 Memblokir user (admin atau moderator)

1. Menu aksi di `users-table` membuka `ban-dialog` (alasan wajib).
2. `setBan` memanggil `requireRole(['admin','moderator'])`, memuat target, lalu `canBan(actor, target)` dari `permissions.ts`.
3. Jika lolos, `admin.ts` memanggil `auth.admin.updateUserById` dengan `ban_duration`, memperbarui `profiles.is_banned`, `banned_reason`, `banned_at`, dan menulis `admin_audit_log`.
4. Hasil: postingan user hilang dari `posts_public`, sesi lama tidak bisa menulis, layout `akun` mengeluarkan user pada permintaan berikutnya.
5. Buka blokir: kebalikannya, `ban_duration: 'none'`.

### 5.3 Menambah atau menghapus role (hanya admin)

1. `role-menu` menampilkan item berkotak centang untuk `admin` dan `moderator`.
2. `addRole` atau `removeRole` memanggil `requireRole(['admin'])` dan memeriksa `canManageRoles`. Penghapusan role admin menghitung jumlah admin yang tersisa dan menolak jika hasilnya nol.
3. Perubahan ditulis ke `user_roles` dan `admin_audit_log`.

### 5.4 Menghapus postingan oleh staf

1. `delete-post-dialog` meminta konfirmasi dan alasan opsional.
2. `deletePostAsStaff` memeriksa role, mengambil `images`, menghapus berkas di storage lewat `admin.ts`, lalu menghapus baris `posts`, lalu menulis audit log. Berkas dihapus lebih dulu agar kegagalan tidak menyisakan berkas yatim yang tak terlacak.

### 5.5 Pembacaan publik

Beranda dan detail membaca dari view `posts_public` memakai klien Supabase biasa. View sudah menyaring penjual yang diblokir dan hanya membuka `display_name`.

---

## 6. Supabase

| Hal | Aturan |
|-----|--------|
| Migrasi | Berkas SQL berurutan di `supabase/migrations/`, tidak pernah diedit setelah dijalankan di produksi. Perubahan baru = berkas baru |
| Tipe | `pnpm db:types` menghasilkan `src/types/database.ts` |
| Seed | `seed.sql` hanya untuk lokal: beberapa user, role, dan postingan contoh |
| Bucket | `post-images`, publik, 5 MB, MIME `image/jpeg`, `image/png`, `image/webp` |
| Admin pertama | Dibuat manual lewat SQL setelah mendaftar (lihat bagian 8) |
| Konfirmasi email | Mati (keputusan #2 di PRD bagian 11). Nyalakan lewat pengaturan Auth tanpa perubahan kode |

---

## 7. Variabel lingkungan

`.env.example` (tanpa nilai rahasia):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # kunci publishable/anon, boleh ke browser
SUPABASE_SERVICE_ROLE_KEY=           # rahasia, hanya server, jangan beri awalan NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=                # untuk metadata dan tautan email
```

`SUPABASE_SERVICE_ROLE_KEY` tidak pernah dikomit dan tidak pernah dikirim ke browser. Di Vercel, isi sebagai variabel lingkungan server.

---

## 8. Skrip dan setup lokal

`package.json` (skrip minimum):

| Skrip | Fungsi |
|-------|--------|
| `dev` | Jalankan Next.js lokal |
| `build`, `start` | Build dan jalankan produksi |
| `lint` | Lint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest |
| `db:types` | `supabase gen types typescript --local > src/types/database.ts` |
| `design:check` | `npx impeccable detect src/` |

Setup lokal:

```
pnpm install
supabase start                  # Postgres, Auth, Storage lokal
supabase db reset               # jalankan migrasi dan seed
cp .env.example .env.local      # isi dari output supabase start
pnpm db:types
pnpm dev
```

Menjadikan akun pertama sebagai admin (jalankan sekali di SQL editor setelah akun itu mendaftar):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'email-anda@contoh.com';
```

---

## 9. Tes

| Jenis | Lokasi | Isi |
|-------|--------|-----|
| Unit | `tests/*.test.ts` | `permissions`, `whatsapp`, `schemas`, `format` (daftar lengkap di `Skill.md` bagian 2.5) |
| RLS | `supabase/tests/rls.test.sql` | User biasa tidak bisa menulis `is_banned`, tidak bisa membaca role orang lain, user diblokir tidak bisa insert, batas 10 per hari, view tidak membuka kolom rahasia |
| Desain | `pnpm design:check` | 0 temuan Impeccable |
| Manual | Daftar periksa rilis di `PROMPTS.md` tahap 8 | Alur utama di HP |

---

## 10. Berkas untuk agent

| Berkas | Dibuat oleh | Dibaca oleh |
|--------|-------------|-------------|
| `AGENTS.md` | Salin dari repo Ponytail | Semua agent, otomatis |
| `PRODUCT.md` | `/impeccable init` | Perintah Impeccable |
| `DESIGN.md` | `/impeccable document` | Perintah Impeccable dan detektor (periksa font, warna, radius terhadap sistem) |
| `docs/Skill.md` | Dokumen ini | Agent, di awal setiap sesi |
| `docs/PRD.md` | Pemilik proyek | Agent, sebagai sumber persyaratan |
| `docs/PROMPTS.md` | Pemilik proyek | Pemilik proyek menyalin prompt dari sini |
