# PRD: Jasa Posting

> Versi 0.1 (draft) · 15 November 2026
> Dokumen pendamping: `Skill.md` (aturan agent), `Structure.md` (struktur proyek), `PROMPTS.md` (urutan prompt build)
> Aturan yang dipatuhi: Ponytail, Impeccable, dan find-skills (detail di `Skill.md`)

---

## 1. Ringkasan

Jasa Posting adalah website papan iklan tempat siapa saja bisa mendaftar lalu memasang barang atau jasa yang mereka jual. Setiap postingan memuat judul, harga, gambar, deskripsi, dan kontak penjual. Pembeli menghubungi penjual langsung lewat WhatsApp. Tidak ada pembayaran dan tidak ada chat di dalam platform.

Admin punya dashboard untuk memblokir pengguna, menambah atau menghapus role, dan menghapus postingan.

Prinsip pengerjaan (Ponytail): bangun versi terkecil yang menyelesaikan pekerjaan inti. Apa pun yang tidak ada di dokumen ini tidak dibangun sebelum diminta.

## 2. Tujuan dan non-tujuan

### Tujuan

| ID | Tujuan | Cara mengukur |
|----|--------|---------------|
| G1 | Penjual memasang postingan lengkap dengan cepat | Median waktu dari halaman daftar sampai postingan pertama tayang kurang dari 5 menit |
| G2 | Pembeli menemukan postingan dan menghubungi penjual | Dari kartu di beranda ke tombol WhatsApp maksimal 2 ketukan |
| G3 | Admin bisa bertindak cepat | Blokir, ubah role, atau hapus postingan maksimal 3 klik dari `/admin` |
| G4 | Tampilan modern dan konsisten | Gaya SaaS/dashboard ala Shadcn UI dan Tailwind, 0 temuan pada `npx impeccable detect src/` |

### Non-tujuan (tidak dibangun di v1)

Pembayaran, chat internal, ulasan dan rating, favorit, notifikasi, verifikasi identitas, multi-bahasa, aplikasi native, iklan berbayar atau boost, lokasi atau kota, tombol laporkan postingan (kandidat P2).

## 3. Pengguna dan peran

| Peran | Siapa | Catatan |
|-------|-------|---------|
| Pengunjung | Belum masuk | Boleh menjelajah dan melihat kontak penjual |
| User | Sudah daftar | Peran bawaan, tidak disimpan di tabel role |
| Moderator | User dengan role `moderator` | Menghapus postingan dan memblokir user biasa |
| Admin | User dengan role `admin` | Semua hak moderator, plus mengatur role |

### Matriks hak akses

| Aksi | Pengunjung | User | Moderator | Admin |
|------|:---------:|:----:|:---------:|:-----:|
| Melihat beranda dan detail postingan | ✓ | ✓ | ✓ | ✓ |
| Memasang, mengubah, menghapus postingan sendiri | | ✓ | ✓ | ✓ |
| Membuka `/admin` | | | ✓ | ✓ |
| Menghapus postingan user lain | | | ✓ | ✓ |
| Memblokir atau membuka blokir user | | | ✓ (hanya user tanpa role) | ✓ (kecuali diri sendiri) |
| Menambah atau menghapus role | | | | ✓ |

## 4. Persyaratan fungsional

Prioritas: **P0** wajib untuk rilis pertama, **P1** dikerjakan setelah P0 stabil, **P2** hanya jika diminta.

### 4.1 Akun

| ID | P | Persyaratan | Kriteria penerimaan |
|----|---|-------------|---------------------|
| A1 | P0 | Daftar dengan nama tampilan, email, kata sandi | Tiga field berlabel. Kata sandi minimal 8 karakter. Galat tampil di bawah field terkait dalam bahasa Indonesia. Setelah sukses, user langsung masuk dan diarahkan ke `/akun/postingan` |
| A2 | P0 | Masuk dengan email dan kata sandi | Galat kredensial tidak menyebut mana yang salah. Parameter `next` dihormati, hanya untuk path internal |
| A3 | P0 | Keluar | Sesi dihapus, kembali ke beranda |
| A4 | P0 | User yang diblokir tidak bisa masuk | Pesan: "Akun ini diblokir. Hubungi admin." Sesi aktif milik user yang baru diblokir berakhir pada permintaan berikutnya |
| A5 | P1 | Lupa kata sandi lewat email | Memakai fitur bawaan Supabase Auth, tanpa halaman buatan sendiri selain form email dan form kata sandi baru |
| A6 | P2 | Masuk dengan Google | Hanya jika diminta |

### 4.2 Menjelajah dan melihat postingan

| ID | P | Persyaratan | Kriteria penerimaan |
|----|---|-------------|---------------------|
| B1 | P0 | Beranda dengan pencarian, filter kategori, pengurutan, paginasi | Cari di judul dan deskripsi. Urutan: Terbaru, Harga terendah, Harga tertinggi. 24 kartu per halaman. Filter tersimpan di URL (`?q=&kategori=&urut=&hal=`). Hanya postingan `active` dari user yang tidak diblokir |
| B2 | P0 | Kartu postingan | Gambar sampul rasio 4:3, harga format Rupiah, judul maksimal 2 baris, nama kategori, waktu relatif. Seluruh kartu adalah satu tautan |
| B3 | P0 | Halaman detail `/p/[id]` | Galeri hingga 5 gambar, judul, harga, deskripsi (teks biasa, baris baru dipertahankan), kategori, tanggal tayang, nama penjual, tombol "Hubungi via WhatsApp" yang membuka `wa.me` dengan teks awal berisi judul postingan |
| B4 | P0 | Status terjual | Postingan `sold` tetap bisa dibuka, menampilkan lencana "Terjual", tombol WhatsApp nonaktif. Tidak muncul di beranda |
| B5 | P0 | Postingan tidak tersedia | Postingan yang tidak ada, sudah dihapus, atau milik user yang diblokir menampilkan halaman 404 |
| B6 | P1 | Metadata SEO dan Open Graph | Judul, harga, dan gambar sampul per postingan |
| B7 | P1 | Halaman `/aturan` | Satu halaman statis: aturan konten (larangan barang ilegal, penipuan, konten dewasa) dan kebijakan privasi singkat |

### 4.3 Memasang postingan (penjual)

| ID | P | Persyaratan | Kriteria penerimaan |
|----|---|-------------|---------------------|
| P1 | P0 | Buat postingan | Field: judul (3 sampai 80 karakter), kategori, harga (Rupiah bulat, 0 atau lebih), deskripsi (10 sampai 2000 karakter), gambar (1 sampai 5), nomor WhatsApp. Nomor terisi otomatis dari profil dan boleh diubah. Semua validasi dijalankan ulang di server |
| P2 | P0 | Unggah gambar | Format JPG, PNG, WebP. Gambar dikecilkan di browser (sisi terpanjang maksimal 1600 px) sebelum diunggah. Batas keras 5 MB per file. Pratinjau tampil sebelum disimpan. Gambar pertama menjadi sampul |
| P3 | P0 | Ubah postingan milik sendiri | Form sama dengan P1, terisi data lama. Menghapus gambar lama ikut menghapus berkasnya dari storage |
| P4 | P0 | Tandai terjual atau aktifkan lagi | Satu ketukan dari daftar "Postingan saya" |
| P5 | P0 | Hapus postingan sendiri | Dialog konfirmasi. Gambar di storage ikut terhapus |
| P6 | P0 | Daftar "Postingan saya" | Thumbnail, judul, harga, status, tanggal, aksi baris (Ubah, Tandai terjual, Hapus) |
| P7 | P1 | Profil | Ubah nama tampilan dan nomor WhatsApp bawaan |
| P8 | P1 | Batas pemasangan | Maksimal 10 postingan baru per user per 24 jam. Pesan galat menyebut kapan bisa memasang lagi |

### 4.4 Dashboard admin

| ID | P | Persyaratan | Kriteria penerimaan |
|----|---|-------------|---------------------|
| M1 | P0 | Akses `/admin` | Hanya admin dan moderator. Belum masuk: arahkan ke `/masuk?next=/admin`. Sudah masuk tapi bukan staf: 404 |
| M2 | P0 | Ringkasan | Jumlah user, postingan aktif, user diblokir. Daftar 10 tindakan admin terakhir (setelah M7) |
| M3 | P0 | Daftar user | Cari nama atau email. Filter: Semua, Diblokir, Punya role. Kolom: nama, email, role, status, tanggal gabung, jumlah postingan. Paginasi 25 baris |
| M4 | P0 | Blokir dan buka blokir | Alasan wajib saat memblokir. Tidak bisa memblokir diri sendiri. Moderator tidak bisa memblokir user yang punya role. Postingan user yang diblokir hilang dari publik dan kembali saat blokir dibuka |
| M5 | P0 | Tambah dan hapus role | Hanya admin. Role: `admin`, `moderator`. Tidak bisa menghapus role admin terakhir |
| M6 | P0 | Daftar semua postingan | Cari judul atau nama penjual. Filter status dan kategori. Hapus dengan dialog konfirmasi dan alasan opsional. Berkas gambar ikut terhapus |
| M7 | P1 | Audit log | Setiap blokir, buka blokir, tambah role, hapus role, hapus postingan tercatat: siapa, apa, target, alasan, waktu |
| M8 | P0 | Otorisasi di server | Setiap aksi admin memeriksa role di server dan di database. Menyembunyikan tombol saja tidak dianggap cukup |

## 5. Peta halaman dan spesifikasi layar

```
/                          Beranda (publik)
/p/[id]                    Detail postingan (publik)
/aturan                    Aturan dan privasi (publik, P1)
/masuk   /daftar           Autentikasi
/akun/postingan            Postingan saya
/akun/postingan/baru       Buat postingan
/akun/postingan/[id]/ubah  Ubah postingan
/akun/profil               Profil (P1)
/admin                     Ringkasan
/admin/pengguna            Kelola user
/admin/postingan           Kelola postingan
```

Setiap layar punya satu aksi utama dan tiga keadaan: memuat (skeleton), kosong (satu kalimat dan satu aksi), galat (apa yang terjadi dan apa yang bisa dilakukan).

| Layar | Aksi utama | Isi | Keadaan kosong atau galat |
|-------|-----------|-----|---------------------------|
| Beranda | Mencari | Header (logo, "Pasang postingan", Masuk atau menu akun), judul satu baris "Cari barang dan jasa yang dijual", kolom cari, chip kategori yang bisa digeser di HP, pengurutan, grid kartu (2 kolom HP, 3 tablet, 4 desktop), paginasi. Tanpa hero besar | Kosong: "Tidak ada postingan untuk “{q}”. Coba kata lain atau hapus filter." dengan tombol "Hapus filter" |
| Detail | Hubungi via WhatsApp (bar tetap di bawah pada HP) | Galeri scroll-snap dengan thumbnail, judul, harga, lencana kategori dan status, deskripsi dengan lebar baca maksimal 65 sampai 75 karakter, info penjual | Terjual: tombol nonaktif dengan teks "Barang ini sudah terjual" |
| Masuk, Daftar | Satu tombol kirim | Satu kolom 360 sampai 400 px, label selalu terlihat, tombol lihat kata sandi, tautan silang antar halaman. Tanpa ilustrasi dan tanpa tombol sosial | Galat per field di bawah field |
| Postingan saya | Pasang postingan | Daftar dengan thumbnail dan aksi baris | "Kamu belum punya postingan." dengan tombol "Pasang postingan" |
| Buat dan ubah | Pasang postingan, Simpan perubahan | Satu kolom: gambar, judul, kategori, harga, deskripsi, WhatsApp. Satu halaman penuh, bukan dialog | Galat unggah per gambar, bisa dicoba ulang |
| Admin: Ringkasan | Pergi ke Pengguna atau Postingan | Sidebar (Ringkasan, Pengguna, Postingan), tiga angka sebagai daftar sederhana, tindakan terakhir | "Belum ada tindakan." |
| Admin: Pengguna | Blokir | Toolbar cari dan filter, tabel, menu aksi baris (Blokir atau Buka blokir, Kelola role, Lihat postingan). Konfirmasi hanya lewat dialog kecil | "Tidak ada pengguna yang cocok." |
| Admin: Postingan | Hapus | Toolbar cari dan filter, tabel dengan thumbnail, menu aksi baris (Lihat, Hapus) | "Tidak ada postingan yang cocok." |

## 6. Model data

Backend memakai Supabase: Auth, Postgres dengan Row Level Security (RLS), dan Storage. Tidak ada server API buatan sendiri.

### Enum

- `app_role`: `admin`, `moderator`
- `post_status`: `active`, `sold`
- `post_category`: `elektronik`, `kendaraan`, `properti`, `fashion`, `rumah_tangga`, `hobi`, `jasa`, `lainnya`

### Tabel

| Tabel | Kolom penting | Catatan |
|-------|---------------|---------|
| `profiles` | `id` (uuid, sama dengan `auth.users.id`), `display_name` (2 sampai 50), `whatsapp` (format `62` diikuti 8 sampai 13 digit, boleh kosong), `is_banned`, `banned_reason`, `banned_at`, `created_at` | Dibuat otomatis oleh trigger saat user mendaftar |
| `user_roles` | `user_id`, `role`, `granted_by`, `created_at`. Kunci utama (`user_id`, `role`) | User tanpa baris = user biasa |
| `posts` | `id` (bigint identity), `author_id`, `title` (3 sampai 80), `description` (10 sampai 2000), `price_idr` (bigint, minimal 0), `category`, `images` (text[], 1 sampai 5 path), `contact_whatsapp`, `status`, `created_at`, `updated_at` | Indeks: (`status`, `created_at` desc), (`category`, `created_at` desc), (`author_id`) |
| `admin_audit_log` | `id`, `actor_id`, `action`, `target_type`, `target_id`, `reason`, `created_at` | Hanya ditulis oleh server |

Tampilan (view) `posts_public`: gabungan `posts` dan `profiles.display_name`, hanya baris dengan penjual yang tidak diblokir. Semua pembacaan publik lewat view ini supaya status blokir dan data profil lain tidak pernah terbuka.

Storage: bucket publik `post-images`, path `{user_id}/{nama-acak}.{ext}`, batas 5 MB, MIME dibatasi `image/jpeg`, `image/png`, `image/webp`.

### Ringkasan RLS

| Tabel | Baca | Tulis |
|-------|------|-------|
| `profiles` | Diri sendiri, staf | Diri sendiri, hanya kolom `display_name` dan `whatsapp` (hak kolom). `is_banned` hanya lewat server |
| `user_roles` | Diri sendiri, staf | Hanya admin |
| `posts` | Pemilik, staf. Publik lewat `posts_public` | Insert: pemilik, tidak diblokir, di bawah batas harian. Update dan delete: pemilik tidak diblokir. Delete: staf |
| `admin_audit_log` | Staf | Tidak ada dari klien |
| Storage `post-images` | Publik | Upload dan hapus: hanya di folder `{auth.uid()}/`. Hapus oleh staf lewat server |

Pemblokiran berlapis: (1) `ban_duration` di Supabase Auth mencegah masuk dan refresh sesi, (2) `profiles.is_banned` dipakai RLS sehingga token lama tidak bisa menulis, (3) layout `/akun` memeriksa `is_banned` dan mengeluarkan user.

## 7. Persyaratan non-fungsional

**Keamanan**
- RLS aktif di semua tabel. Kunci `service_role` hanya ada di modul server, tidak pernah dikirim ke browser.
- Semua input divalidasi dengan Zod di server. Deskripsi dirender sebagai teks, bukan HTML.
- Nomor WhatsApp dinormalisasi ke format `62…` sebelum disimpan. Parameter `next` hanya menerima path internal.
- Aksi admin: cek role di server, cek lagi di database, tulis audit log.

**Performa**
- LCP di bawah 2,5 detik pada HP kelas menengah dengan 4G.
- Gambar lewat `next/image` dengan ukuran responsif dan pemuatan malas, kecuali gambar sampul di atas lipatan.
- Pencarian memakai `ilike` pada judul dan deskripsi. `shortcut: ilike cukup sampai sekitar 10 ribu postingan, pindah ke full-text search setelahnya.`

**Aksesibilitas (WCAG 2.2 AA)**
- Kontras teks minimal 4,5:1 (3:1 untuk teks besar). Label field selalu terlihat, bukan hanya placeholder.
- Semua fungsi bisa dipakai dengan keyboard. Fokus terlihat jelas. Urutan heading tidak melompat.
- Target sentuh minimal 44 px. Teks input 16 px agar iOS tidak memperbesar halaman.
- Hormati `prefers-reduced-motion`. Gambar punya `alt` berisi judul postingan.

**Privasi**
- Email tidak pernah tampil publik. Satu-satunya data kontak publik adalah nomor WhatsApp yang diisi penjual pada postingan.
- Halaman `/aturan` (P1) menjelaskan data yang disimpan dan aturan konten.

**Kompatibilitas**: browser evergreen terbaru, mobile-first dengan lebar dasar 360 px.

## 8. Arah desain

Gaya: Modern SaaS / Developer Dashboard ala Shadcn UI dan Tailwind CSS. Permukaan datar dengan garis tepi 1 px, radius kecil, banyak ruang kosong, tipografi jelas, warna aksen tunggal.

Pembaruan dari aturan Impeccable yang berbeda dengan bawaan Shadcn:
- Inter dan Geist (font bawaan Shadcn) diganti karena dinilai terlalu umum. Pilihan: Plus Jakarta Sans untuk UI, JetBrains Mono untuk ID dan stempel waktu di admin.
- Tanpa gradien, glow, glassmorphism, bayangan keras, kartu di dalam kartu, atau strip warna di tepi kartu.
- Dashboard admin dirancang untuk bekerja (padat, jelas, cepat dipindai). Beranda dan detail dirancang untuk meyakinkan dan dibaca.

Token warna, tipografi, dan daftar larangan visual lengkap ada di `Skill.md` bagian 3.

## 9. Metrik keberhasilan (target awal)

| Metrik | Target |
|--------|--------|
| User baru yang memasang postingan dalam 24 jam | 40% atau lebih |
| Form posting yang dimulai dan diselesaikan | 70% atau lebih |
| Klik WhatsApp per tampilan halaman detail | 8% atau lebih |
| Waktu dari postingan bermasalah ditemukan sampai dihapus admin | Di bawah 1 menit |

Angka-angka ini tebakan awal untuk dikalibrasi, bukan hasil pengukuran.

## 10. Risiko

| Risiko | Dampak | Mitigasi v1 |
|--------|--------|-------------|
| Spam dan penipuan karena siapa saja bisa memasang | Pembeli dirugikan, reputasi turun | Batas harian (P8), blokir dan hapus oleh staf, halaman aturan (B7). Kandidat P2: tombol laporkan, captcha, verifikasi email |
| Nomor WhatsApp dikumpulkan bot | Penjual diganggu | Diterima di v1. Opsi: sembunyikan nomor sampai user masuk |
| Biaya storage naik | Biaya tak terduga | Gambar dikecilkan di browser, batas 5 MB, maksimal 5 gambar per postingan |
| Berkas gambar yatim setelah penghapusan gagal | Storage bocor | Hapus berkas sebelum baris. `shortcut: pembersihan yatim manual, jadwalkan job jika muncul.` |
| Admin terakhir terkunci | Dashboard tak bisa dikelola | Aturan M5 dan admin pertama dibuat lewat SQL |

## 11. Asumsi dan keputusan yang bisa diubah

Ini keputusan awal untuk dikoreksi. Ubah di sini lebih dulu, lalu sesuaikan dokumen lain.

| # | Keputusan | Pilihan awal | Alternatif |
|---|-----------|--------------|------------|
| 1 | Role moderator | Ada (admin dan moderator) | Hanya admin: hapus role `moderator` dan sederhanakan M4 |
| 2 | Konfirmasi email saat daftar | Mati, demi pendaftaran yang tidak ribet. Pertahanan: batas harian dan blokir | Nyalakan di Supabase, tidak perlu ubah kode |
| 3 | Kontak penjual | Tampil untuk semua pengunjung | Tampil hanya setelah masuk |
| 4 | Harga | Rupiah bulat, 0 ditampilkan "Gratis", tanpa opsi nego | Tambah kolom `is_negotiable` atau "Hubungi untuk harga" |
| 5 | Penghapusan oleh admin | Hapus permanen, tercatat di audit log | Hapus lunak dengan kolom `deleted_at` |
| 6 | Lokasi | Tidak ada di v1 | Kolom `city` opsional dan filter kota (P2) |
| 7 | Hosting | Vercel (aplikasi) dan Supabase (data) | Platform lain tanpa mengubah desain |
| 8 | Bahasa antarmuka | Indonesia saja, tanpa library i18n | Tambah i18n bila perlu bahasa kedua |

## 12. Urutan pengerjaan

Setiap tahap punya prompt di `PROMPTS.md` dengan nomor yang sama.

| Tahap | Isi | Selesai bila |
|-------|-----|--------------|
| 0 | Skill dan aturan agent terpasang (find-skills, Ponytail, Impeccable) | `/impeccable init` dan hooks aktif, `AGENTS.md` ada |
| 1 | Scaffold proyek, token desain, layout dasar | Halaman kosong tampil, 0 temuan detector |
| 2 | Database, RLS, storage | Migrasi jalan, tes RLS lulus |
| 3 | Autentikasi | A1 sampai A4 lulus |
| 4 | Beranda dan detail | B1 sampai B5 lulus |
| 5 | Pemasangan postingan | P1 sampai P6 lulus |
| 6 | Dashboard admin | M1 sampai M6 dan M8 lulus |
| 7 | Kualitas: critique, polish, audit, harden, review | Tidak ada temuan P0 atau P1 yang terbuka |
| 8 | Deploy | Daftar periksa rilis terpenuhi |
