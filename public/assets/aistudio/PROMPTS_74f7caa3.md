# PROMPTS: Jasa Posting

> Versi 0.1 (draft) · 15 November 2026
> Dokumen pendamping: `PRD.md`, `Skill.md`, `Structure.md`

Kumpulan prompt untuk agent coding (Claude Code, Codex, Cursor, dan sejenisnya), diurutkan per tahap. Salin satu blok per sesi atau per langkah. Nomor tahap sama dengan `PRD.md` bagian 12.

## Cara memakai

1. Kerjakan berurutan. Jangan lompat tahap: tahap berikutnya bergantung pada gerbang tahap sebelumnya.
2. Mulai setiap sesi baru dengan **Prompt Pembuka** (di bawah).
3. Setelah tiap tahap, jalankan **Gerbang**: perintah yang harus bersih sebelum lanjut.
4. Jika agent menambah fitur atau dependency di luar daftar, tolak dengan **Prompt Rem** (Lampiran A).
5. Simpan dokumen di `docs/`. Kalau agent tidak membaca otomatis, minta ia membaca berkasnya.

Ringkasan perintah yang dipakai:

| Perintah | Asal | Fungsi |
|----------|------|--------|
| `/ponytail full`, `/ponytail ultra` | Ponytail | Mengatur seberapa ketat agent menjaga ukuran solusi |
| `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt` | Ponytail | Review perubahan, audit repo, kumpulkan `shortcut:` |
| `/impeccable init`, `hooks on`, `shape`, `typeset`, `layout`, `critique`, `polish`, `audit`, `harden`, `document` | Impeccable | Desain dan kualitas UI |
| `npx skills find`, `npx skills add` | find-skills | Cari dan pasang skill |

---

## Prompt Pembuka (awal setiap sesi)

```text
Kamu mengerjakan proyek "Jasa Posting", website papan iklan di mana siapa saja bisa memasang barang
atau jasa yang dijual, dengan dashboard admin.

Sebelum melakukan apa pun, baca berurutan:
1. docs/Skill.md  (aturan kerja: Ponytail, Impeccable, find-skills)
2. docs/PRD.md    (apa yang dibangun, ID persyaratan, prioritas)
3. docs/Structure.md (struktur folder, aturan ketergantungan, alur data)

Aturan yang tidak boleh dilanggar:
- Bangun hanya yang tertulis di PRD pada prioritas yang sedang dikerjakan. Fitur lain: sebut satu baris, jangan dibangun.
- Ikuti tangga keputusan Ponytail. Dependency hanya dari daftar di Skill.md bagian 2.7.
- Validasi di server, otorisasi di server dan database, aksesibilitas, dan penanganan galat tidak boleh dipotong.
- Ikuti Impeccable: tanpa font Inter atau Geist, tanpa gradien, glow, kartu bersarang, strip warna di tepi kartu.
- Teks antarmuka bahasa Indonesia. Identifier kode bahasa Inggris.

Akhiri setiap balasan dengan: "Dilewati / belum dicek: ... Risiko: ...".

Konfirmasi dalam tiga baris bahwa kamu sudah membaca ketiga dokumen, lalu tunggu instruksi tahap.
```

---

## Tahap 0: Skill dan aturan agent

### 0.1 Cari dan pasang skill (find-skills)

```text
Ikuti proses find-skills di docs/Skill.md bagian 4.

Tugas:
1. Periksa apakah skill find-skills sudah terpasang. Jika belum, minta persetujuan saya lalu pasang.
2. Untuk kebutuhan di tabel 4.3 (frontend-design, praktik React dan Next.js, Postgres dan Supabase, shadcn),
   cek leaderboard skills.sh lebih dulu, lalu jalankan npx skills find dengan kata kunci spesifik.
3. Verifikasi tiap kandidat: jumlah install (utamakan 1 ribu atau lebih), reputasi sumber, bintang repo (waspada di bawah 100).
4. Sajikan hasilnya sebagai tabel: nama skill, fungsi, jumlah install, sumber, perintah pasang, tautan skills.sh.
5. JANGAN memasang apa pun sebelum saya memilih. Jika sebuah skill tidak lolos ambang, katakan dan cari alternatif.

Catatan: jika skill bertentangan dengan Skill.md bagian 2 atau 3 (misalnya menyuruh memakai Inter atau Geist),
Skill.md yang berlaku.
```

### 0.2 Pasang Ponytail

```text
Pasang Ponytail dengan tepat. Sumber yang sah hanya DietrichGebert/ponytail di GitHub atau
@dietrichgebert/ponytail di npm.

Untuk Claude Code, jalankan sebagai dua perintah terpisah:
  /plugin marketplace add DietrichGebert/ponytail
  /plugin install ponytail@ponytail

Untuk agent lain, salin AGENTS.md dari repo itu ke akar proyek (lihat INSTALL.md di repo tersebut).

Lalu jalankan /ponytail full dan laporkan level aktif. Jangan membuat berkas yang tidak berasal dari instruksi ini.
```

### 0.3 Pasang dan inisialisasi Impeccable

```text
Pasang Impeccable lalu inisialisasi:
  npx impeccable install
  /impeccable init
  /impeccable hooks on

Saat /impeccable init menanyakan konteks, pakai isi PRODUCT.md awal dari docs/Skill.md bagian 3.2
(register product, platform web mobile-first, pengguna, tujuan produk, prinsip, aksesibilitas).

Setelah selesai:
1. Tampilkan isi PRODUCT.md yang terbentuk.
2. Beri tahu saya langkah persetujuan hooks yang harus saya lakukan di alat coding ini
   (misalnya /hooks di Codex), karena hooks tidak berjalan sebelum disetujui.
3. Jangan mulai menulis UI.
```

**Gerbang 0:** `AGENTS.md` dan `PRODUCT.md` ada di akar, hooks Impeccable disetujui, `/ponytail full` aktif.

---

## Tahap 1: Scaffold proyek

```text
Tahap 1: scaffold proyek sesuai docs/Structure.md. Referensi: PRD bagian 7 dan 8, Skill.md bagian 3.3 sampai 3.6.
Level Ponytail: full.

Kerjakan:
1. Buat proyek Next.js (App Router, TypeScript strict, Tailwind) dengan pnpm. Susun folder persis seperti
   Structure.md bagian 2, tetapi HANYA buat folder dan berkas yang punya isi pada tahap ini.
2. Inisialisasi shadcn/ui lewat CLI. Pasang hanya komponen yang dibutuhkan tahap ini: button, input, label, skeleton, sonner.
3. Font: ganti bawaan dengan Plus Jakarta Sans (UI) dan JetBrains Mono (hanya untuk ID dan stempel waktu admin)
   lewat next/font/google. Jangan memakai Inter atau Geist.
4. globals.css: pasang token warna terang dan gelap dari Skill.md bagian 3.4. Periksa kontras setiap pasangan teks
   dan latar (minimal 4,5:1 untuk teks biasa), perbaiki jika kurang. Mode gelap mengikuti preferensi sistem, tanpa toggle.
   Radius: 6 px kontrol, 8 px permukaan.
5. Buat layout dasar: site-header (logo "Jasa Posting", tombol "Pasang postingan", tautan "Masuk") dan site-footer
   sederhana. Halaman beranda sementara berisi judul satu baris dan satu kalimat, tanpa hero besar.
6. Tambahkan .env.example (Structure.md bagian 7), skrip package.json (Structure.md bagian 8), dan README singkat.
7. Siapkan Vitest dengan satu tes contoh yang lulus.
8. Jalankan /impeccable document untuk menulis DESIGN.md dari token yang baru dibuat.

Jangan: menambah halaman di luar beranda, menyentuh Supabase, atau menambah dependency di luar Skill.md bagian 2.7.
```

**Gerbang 1:**
```
pnpm typecheck && pnpm lint && pnpm test && pnpm build
npx impeccable detect src/
```
Hasil bersih. Buka di lebar 360 px: tidak ada gulir ke samping.

---

## Tahap 2: Database, RLS, storage

```text
Tahap 2: database. Referensi: PRD bagian 6 (model data dan RLS), Structure.md bagian 6.
Level Ponytail: full. Ini area keamanan: jangan memotong apa pun.

Tulis tiga migrasi di supabase/migrations/:

0001_schema.sql
- Enum app_role (admin, moderator), post_status (active, sold),
  post_category (elektronik, kendaraan, properti, fashion, rumah_tangga, hobi, jasa, lainnya).
- Tabel profiles, user_roles, posts, admin_audit_log dengan kolom, batas CHECK, dan indeks persis seperti PRD bagian 6.
  posts.images adalah text[] dengan CHECK jumlah 1 sampai 5. whatsapp dan contact_whatsapp berformat 62 diikuti 8 sampai 13 digit.
- Trigger pada auth.users yang membuat baris profiles dengan display_name dari raw_user_meta_data.

0002_rls.sql
- Fungsi has_role(uid, role) security definer dengan search_path yang dikunci.
- RLS aktif di SEMUA tabel. Kebijakan sesuai ringkasan RLS di PRD bagian 6.
- Hak kolom: authenticated hanya boleh UPDATE profiles(display_name, whatsapp).
- View posts_public: posts digabung profiles.display_name, hanya penjual yang tidak diblokir.
  Hanya kolom yang aman. Beri SELECT ke anon dan authenticated. Posts tabel sendiri TIDAK terbuka untuk anon.
- Kebijakan insert posts: pemilik, tidak diblokir, dan jumlah postingan 24 jam terakhir kurang dari 10.

0003_storage.sql
- Bucket post-images: publik, batas 5 MB, MIME image/jpeg, image/png, image/webp.
- Policy: upload dan hapus hanya pada folder {auth.uid()}/.

Tambahkan:
- supabase/seed.sql: 3 user contoh (satu admin, satu moderator, satu user biasa), 12 postingan beragam kategori. Tanpa data pribadi asli.
- supabase/tests/rls.test.sql yang membuktikan: user biasa tidak bisa mengubah is_banned, tidak bisa membaca role orang lain,
  user diblokir tidak bisa insert postingan, postingan ke-11 dalam sehari ditolak, view tidak membuka kolom rahasia,
  anon tidak bisa membaca tabel posts langsung.
- Skrip db:types dan hasil src/types/database.ts.

Jalankan supabase db reset dan semua tes RLS. Laporkan hasilnya apa adanya, termasuk yang gagal.
```

**Gerbang 2:** `supabase db reset` mulus, tes RLS lulus semua, `pnpm typecheck` bersih. Jalankan `/ponytail-review` pada migrasi.

---

## Tahap 3: Autentikasi

```text
Tahap 3: autentikasi. Persyaratan: A1 sampai A4 di PRD bagian 4.1. Referensi layar: PRD bagian 5.
Level Ponytail: full. Desain: halaman sederhana, satu kolom, label selalu terlihat.

Kerjakan:
1. lib/supabase/server.ts, browser.ts, proxy.ts, admin.ts (admin.ts memakai `import 'server-only'`) dan src/proxy.ts
   (sesuaikan nama middleware.ts atau proxy.ts dengan versi Next.js terpasang) untuk menyegarkan sesi.
2. lib/auth.ts: getUser, requireUser (redirect ke /masuk?next=...), requireRole(roles) (404 jika bukan staf).
3. lib/schemas.ts: skema Zod untuk daftar dan masuk. lib/permissions.ts diisi nanti di tahap 6.
4. app/(auth)/daftar dan masuk: form native dengan Server Action dan useActionState.
   - Daftar: nama tampilan, email, kata sandi (minimal 8). Sukses: langsung masuk, arahkan ke /akun/postingan.
   - Masuk: email dan kata sandi. Hormati ?next= hanya untuk path internal yang diawali "/" dan bukan "//".
   - Galat per field di bawah field. Galat kredensial tidak menyebut mana yang salah.
   - User diblokir: pesan "Akun ini diblokir. Hubungi admin."
   - Tombol lihat kata sandi. Tanpa ilustrasi, tanpa tombol sosial.
5. Aksi keluar di account-menu pada header (avatar, nama, "Postingan saya", "Keluar"). Header menampilkan "Masuk" jika belum masuk.
6. app/auth/confirm/route.ts untuk penukar token (dipakai nanti jika konfirmasi email dinyalakan).
7. app/akun/layout.tsx sebagai penjaga: requireUser() dan keluarkan user yang is_banned.
8. Tes untuk skema dan fungsi pemeriksaan path next.

Setelah UI jadi: /impeccable shape untuk dua halaman ini sebelum finalisasi, lalu /impeccable polish.
```

**Gerbang 3:** daftar, masuk, keluar bekerja. User diblokir (ubah `is_banned` manual di SQL) ditolak. `/akun/postingan` tanpa login mengarah ke `/masuk`. Detektor bersih. `/ponytail-review`.

---

## Tahap 4: Beranda dan detail

```text
Tahap 4: menjelajah postingan. Persyaratan: B1 sampai B5 di PRD bagian 4.2.
Level Ponytail: full. Referensi desain: Skill.md bagian 3.5 sampai 3.9. Jalankan /impeccable shape untuk beranda dan detail dulu.

Kerjakan:
1. lib/format.ts (rupiah, 0 menjadi "Gratis", relativeTime, formatDate) dan lib/categories.ts (Record<PostCategory, string>), lengkap dengan tes.
2. Beranda app/(publik)/page.tsx:
   - Baca dari view posts_public, hanya status active. Parameter URL: q, kategori, urut, hal.
   - Pencarian ilike pada judul dan deskripsi, dengan input yang di-escape. Tulis komentar
     `shortcut: ilike cukup sampai sekitar 10 ribu postingan, pindah ke full-text search setelahnya`.
   - Chip kategori yang bisa digeser, select pengurutan (Terbaru, Harga terendah, Harga tertinggi), paginasi 24 per halaman.
   - Grid kartu: 2 kolom di HP, 3 di tablet, 4 di desktop. Tanpa hero besar.
   - Kartu: gambar sampul rasio 4:3 lewat next/image, harga (tabular-nums), judul maksimal 2 baris, kategori, waktu relatif.
     Seluruh kartu adalah satu tautan. Datar dengan garis 1 px, tanpa bayangan.
   - Keadaan: loading.tsx dengan 8 skeleton, kosong dengan teks dan tombol "Hapus filter", galat dengan tombol coba lagi.
3. Detail app/(publik)/p/[id]/page.tsx:
   - Galeri dengan CSS scroll-snap dan thumbnail (tanpa library). Judul, harga, lencana kategori dan status, deskripsi sebagai
     teks biasa dengan baris baru dipertahankan dan lebar baca 65 sampai 75 karakter, nama penjual, tanggal tayang.
   - Tombol "Hubungi via WhatsApp" membuka wa.me dengan teks awal berisi judul. Di HP, jadikan bar tetap di bawah dengan safe area.
   - Status sold: lencana "Terjual", tombol nonaktif dengan teks "Barang ini sudah terjual".
   - Postingan tidak ada atau penjual diblokir: notFound().
   - Heading berurutan (h1 judul, h2 untuk bagian). Alt gambar berisi judul.
4. lib/whatsapp.ts: normalizeWhatsapp (08…, +62…, 62…, spasi dan tanda hubung menjadi 62…) dan waLink, dengan tes.
5. Pasang shadcn: select, badge, pagination, separator.

Jangan: filter lanjutan, favorit, bagikan, atau komponen yang tidak ada di PRD.
```

**Gerbang 4:** pakai data seed. Cari, filter, urut, paginasi bekerja dan tersimpan di URL. Postingan milik user yang diblokir tidak tampil. Detektor bersih. Lalu `/impeccable critique` pada beranda dan detail, perbaiki temuan P0 dan P1.

---

## Tahap 5: Pemasangan postingan

```text
Tahap 5: penjual memasang postingan. Persyaratan: P1 sampai P6 (P7 dan P8 setelah P0 stabil) di PRD bagian 4.3.
Level Ponytail: full. Desain: halaman penuh, bukan dialog. Jalankan /impeccable shape dulu.

Kerjakan:
1. lib/images.ts: compressImage dengan Canvas API (createImageBitmap lalu canvas.toBlob, WebP, sisi terpanjang 1600 px),
   validasi tipe (jpeg, png, webp) dan ukuran (maksimal 5 MB). Tes untuk fungsi validasinya.
2. components/posts/image-uploader.tsx (komponen klien): pilih 1 sampai 5 gambar, pratinjau, hapus, "Jadikan sampul",
   unggah langsung ke post-images/{user_id}/{acak}.webp lewat klien browser. Galat per gambar dengan tombol coba lagi.
   Pratinjau tidak boleh meloncat saat unggah selesai.
3. components/posts/post-form.tsx dipakai untuk buat dan ubah: judul (3 sampai 80), kategori, harga (Rupiah bulat, 0 atau lebih),
   deskripsi (10 sampai 2000, tampilkan penghitung karakter), WhatsApp (terisi dari profil, bisa diubah). Label selalu terlihat.
4. app/akun/actions.ts: createPost, updatePost, setSold, deletePost.
   - Zod di server. Pastikan setiap path gambar diawali "{user_id}/". Normalisasi WhatsApp.
   - updatePost yang menghapus gambar lama ikut menghapus berkasnya dari storage.
   - deletePost menghapus berkas storage lebih dulu, baru baris. Tulis komentar
     `shortcut: berkas yatim dibersihkan manual, jadwalkan job jika muncul`.
5. Halaman: /akun/postingan (daftar dengan thumbnail, judul, harga, status, tanggal, aksi baris Ubah, Tandai terjual, Hapus),
   /akun/postingan/baru, /akun/postingan/[id]/ubah. Hapus lewat alert-dialog.
   Kosong: "Kamu belum punya postingan." dengan tombol "Pasang postingan".
6. Tes untuk skema postingan (batas judul, deskripsi, harga, jumlah gambar, path milik user lain ditolak).
7. Pasang shadcn: textarea, alert-dialog, dropdown-menu, avatar, table.

Setelah P0 stabil dan lolos gerbang, baru kerjakan P7 (profil) dan P8 (batas 10 per hari, pesan galat menyebut kapan bisa memasang lagi).
```

**Gerbang 5:** uji di HP asli atau emulasi 360 px: foto 4 MB dari kamera berhasil terunggah dan terkecilkan. User A tidak bisa mengubah atau menghapus postingan user B (coba lewat URL). Detektor bersih. `/ponytail-review`, lalu `/impeccable polish` pada form.

---

## Tahap 6: Dashboard admin

```text
Tahap 6: dashboard admin. Persyaratan: M1 sampai M6 dan M8 di PRD bagian 4.4. Matriks hak akses: PRD bagian 3.
Level Ponytail: full. Desain: gaya dashboard Shadcn, padat dan cepat dipindai. Jalankan /impeccable shape dulu.
Impeccable: tabel dan toolbar, bukan kartu bertumpuk. Tanpa tabel yang membuat halaman tergeser ke samping.

Kerjakan:
1. lib/permissions.ts (fungsi murni) beserta TESnya terlebih dulu:
   - canBan(actor, target): tidak boleh diri sendiri. Moderator tidak boleh memblokir target yang punya role. Admin boleh kecuali diri sendiri.
   - canManageRoles(actor): hanya admin.
   - canRemoveAdminRole(adminCount): menolak jika hasilnya nol admin.
   - canDeletePost(actor, post): pemilik, moderator, atau admin.
2. app/admin/layout.tsx: requireRole(['admin','moderator']). Belum masuk diarahkan ke /masuk?next=/admin, bukan staf dapat 404.
   Sidebar: Ringkasan, Pengguna, Postingan.
3. app/admin/actions.ts: setBan, addRole, removeRole, deletePostAsStaff.
   - Setiap aksi: requireRole di server, muat target, panggil fungsi di permissions.ts, baru eksekusi lewat lib/supabase/admin.ts.
   - setBan: auth.admin.updateUserById dengan ban_duration, perbarui profiles (is_banned, banned_reason, banned_at). Alasan wajib. Buka blokir: ban_duration 'none'.
   - removeRole menghitung admin tersisa dari database, bukan dari data klien.
   - deletePostAsStaff: hapus berkas storage, lalu baris posts.
   - Kembalikan { ok, error }, jangan melempar galat mentah ke klien.
4. /admin: tiga angka sebagai daftar sederhana (user, postingan aktif, user diblokir). Jangan membuat tata letak "angka raksasa".
5. /admin/pengguna: toolbar (cari nama atau email, filter Semua, Diblokir, Punya role), tabel (nama, email, role, status, tanggal gabung,
   jumlah postingan), paginasi 25. Menu aksi baris: Blokir atau Buka blokir (ban-dialog dengan alasan wajib),
   Kelola role (dropdown berkotak centang, hanya tampil untuk admin), Lihat postingan.
6. /admin/postingan: toolbar (cari judul atau penjual, filter status dan kategori), tabel (thumbnail, judul, penjual, harga, status, tanggal),
   menu aksi Lihat dan Hapus (delete-post-dialog dengan alasan opsional).
7. Keadaan memuat (skeleton baris), kosong, dan galat di setiap tabel. Teks mono (JetBrains Mono) hanya untuk ID dan stempel waktu.
8. Tes RLS tambahan: staf bisa menghapus postingan lewat jalur server, user biasa tidak bisa memanggil aksi admin.

Jangan: impersonasi user, ekspor CSV, grafik, notifikasi, atau halaman detail user yang tidak ada di PRD.
```

Setelah P0 stabil: kerjakan **M7** (audit log) dengan prompt berikut.

```text
Kerjakan M7: audit log. Tulis ke admin_audit_log dari setiap aksi di app/admin/actions.ts (ban, unban, role_add, role_remove, post_delete)
dengan actor_id, target_type, target_id, reason, dan waktu. Hanya server yang menulis. Tampilkan 10 entri terakhir di /admin sebagai daftar
sederhana (siapa, aksi, target, kapan). Jika penulisan log gagal, aksi utama tetap dicatat di log server dan pengguna melihat pesan jelas.
Tes: aksi tercatat dan user biasa tidak bisa membaca log.
```

**Gerbang 6:** coba setiap baris di matriks hak akses dengan tiga akun seed (admin, moderator, user biasa), termasuk percobaan yang harus ditolak. Moderator tidak bisa memblokir admin. Admin tidak bisa memblokir diri sendiri atau menghapus admin terakhir. Detektor bersih. `/ponytail-review`.

---

## Tahap 7: Kualitas

Jalankan berurutan, satu per satu, dan tunggu hasil sebelum lanjut.

### 7.1 Tinjauan desain

```text
/impeccable critique pada: beranda, detail, daftar, masuk, buat postingan, /admin/pengguna.
Tampilkan temuan diurutkan P0 ke P3 dengan skor hierarki, kejelasan, dan kerajinan. Jangan memperbaiki dulu.
Setelah saya setuju, perbaiki P0 dan P1 dengan perintah yang paling tepat (typeset, layout, colorize, distill, clarify), satu perintah per masalah.
```

### 7.2 Pemolesan dan pengerasan

```text
Jalankan /impeccable polish lalu /impeccable harden pada seluruh aplikasi. Fokus harden: nama penjual yang sangat panjang,
judul 80 karakter tanpa spasi, harga sangat besar, teks Indonesia yang lebih panjang dari yang diperkirakan, gambar gagal dimuat,
jaringan lambat, dan zoom teks 200 persen. Pastikan konten tidak pernah tertahan di opacity 0 dan tidak ada gulir ke samping.
Hasilkan DESIGN.md terbaru dengan /impeccable document.
```

### 7.3 Aksesibilitas

```text
/impeccable audit. Periksa khusus: kontras seluruh pasangan token (terang dan gelap), label field, urutan heading,
fokus keyboard di tabel admin, dialog, dan menu, target sentuh 44 px, prefers-reduced-motion, alt gambar.
Laporkan temuan dengan lokasi berkas dan baris. Perbaiki yang termasuk P0 dan P1.
```

### 7.4 Review dan audit kode

```text
Jalankan /ponytail-review pada seluruh perubahan tahap 1 sampai 6, lalu /ponytail-audit pada seluruh repo.
Urutkan temuan dari yang paling penting. Untuk setiap temuan: apa yang kode lakukan, apa yang salah, cara memperbaiki, dan akibatnya jika dibiarkan.
Perhatikan khusus: aksi admin tanpa cek role di server, service_role yang bocor ke kode klien, input yang belum divalidasi,
path gambar milik user lain, dan tes yang belum ada untuk modul di Skill.md bagian 2.5.
Setelah saya menyetujui, perbaiki temuan "harus diperbaiki". Lalu jalankan /ponytail-debt dan tampilkan daftar komentar shortcut: yang tersisa.
```

**Gerbang 7:**
```
pnpm typecheck && pnpm lint && pnpm test && pnpm build
npx impeccable detect src/
npx impeccable detect http://localhost:3000
```
Semua bersih. Tidak ada temuan P0 atau P1 terbuka.

---

## Tahap 8: Deploy

```text
Tahap 8: persiapan rilis. Level Ponytail: full.

Kerjakan:
1. Perbarui README: cara jalan lokal, variabel lingkungan, cara membuat admin pertama (SQL di Structure.md bagian 8), cara deploy.
2. Siapkan konfigurasi Vercel dan daftar variabel yang harus diisi. SUPABASE_SERVICE_ROLE_KEY hanya sebagai variabel server.
   Pastikan tidak ada kunci rahasia di repo dan tidak ada awalan NEXT_PUBLIC_ pada kunci rahasia.
3. Buat daftar langkah untuk proyek Supabase produksi: jalankan migrasi, cek RLS aktif di semua tabel, cek bucket dan batasnya,
   atur URL situs dan redirect Auth, putuskan konfirmasi email (PRD bagian 11 nomor 2).
4. Tambahkan CI sederhana: typecheck, lint, test, build, dan npx impeccable detect src/.
5. Halaman /aturan (B7) jika belum ada: aturan konten dan kebijakan privasi singkat.
6. Daftar periksa rilis di bawah, laporkan tiap butir sebagai lulus atau gagal beserta buktinya.
```

**Daftar periksa rilis**

- [ ] Alur penjual di HP: daftar, pasang postingan dengan foto kamera, ubah, tandai terjual, hapus.
- [ ] Alur pembeli di HP: cari, filter kategori, buka detail, tombol WhatsApp membuka chat dengan teks awal yang benar.
- [ ] Alur admin: blokir user (postingannya hilang dari publik, ia tidak bisa masuk), buka blokir, tambah dan hapus role, hapus postingan.
- [ ] Percobaan yang harus ditolak benar-benar ditolak: ubah atau hapus postingan orang lain, buka `/admin` sebagai user biasa, panggil aksi admin tanpa role.
- [ ] RLS aktif di semua tabel produksi. Tidak ada `service_role` di bundel klien.
- [ ] Admin pertama ada. Lebih dari satu admin disarankan.
- [ ] Lighthouse mobile: LCP di bawah 2,5 detik di beranda.
- [ ] Detektor Impeccable: 0 temuan. `/ponytail-debt`: daftar `shortcut:` sudah dibaca pemilik proyek.

---

## Lampiran A: Prompt pendukung

### A.1 Prompt Rem (saat agent melebar)

```text
Berhenti. Kamu menambah sesuatu yang tidak ada di docs/PRD.md pada prioritas yang sedang dikerjakan.
Sebutkan: apa yang kamu tambah, persyaratan PRD mana yang memintanya, dan versi terkecil yang tetap menyelesaikan tugas.
Jika tidak ada persyaratan yang memintanya, hapus. Jika itu dependency baru, kembali ke tangga keputusan Ponytail
(Skill.md bagian 2.3) dan daftar yang diizinkan (2.7). Jangan menunggu saya untuk memangkas.
```

### A.2 Menambah fitur baru

```text
/ponytail ultra
Saya ingin menambah: <fitur>. Sebelum menulis kode:
1. Pertanyakan: apakah kebutuhan ini benar-benar membenarkan fiturnya? Apa versi terkecilnya?
2. Daftar semua tempat yang tersentuh (tabel, RLS, aksi, halaman, tes, PRD, dokumen lain).
3. Sebut risiko keamanan dan aksesibilitas.
Usulkan perubahan PRD (ID persyaratan, prioritas, kriteria penerimaan) dan tunggu persetujuan saya. Baru setelah itu /ponytail full dan bangun.
```

### A.3 Memperbaiki bug

```text
Bug: <gejala dan langkah mengulang>.
Sebelum mengedit, cari semua pemanggil fungsi yang terlibat dan temukan akar masalah. Perbaiki satu kali di kode bersama, bukan di tiap pemanggil.
Tambahkan satu tes yang gagal sebelum perbaikan dan lulus sesudahnya. Laporkan pemanggil lain yang terdampak.
```

### A.4 Review sebelum merge

```text
/ponytail-review pada perubahan saat ini, lalu npx impeccable detect src/.
Baca kode yang disentuh perubahan, bukan hanya diff. Periksa bug, keamanan, otorisasi di server, beban nyata, tes yang hilang, dan apa yang bisa dibuang.
Setiap temuan: apa yang kode lakukan, apa yang salah, cara memperbaiki, akibat jika dibiarkan.
```

### A.5 Memangkas kompleksitas

```text
Lihat <berkas atau folder>. Dengan tangga keputusan Ponytail, tunjukkan kode yang bisa dihapus, diganti fitur platform,
atau diganti komponen yang sudah ada. Usulkan diff terkecil. Pertahankan validasi, penanganan galat, keamanan, dan aksesibilitas.
Jangan mengubah perilaku yang terlihat pengguna.
```

### A.6 Mengubah keputusan PRD (bagian 11)

```text
Saya mengubah keputusan nomor <n> di PRD bagian 11 menjadi: <pilihan baru>.
Daftar semua dokumen dan berkas yang terdampak (PRD, Structure, Skill, PROMPTS, migrasi, RLS, aksi, halaman, tes).
Usulkan perubahan terkecil dan tunggu persetujuan saya sebelum mengedit.
```
