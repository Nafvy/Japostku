-- Jalankan skrip ini di SQL Editor Supabase untuk menyiapkan database Japostku

create table if not exists public.users (
  id text primary key,
  firebase_uid text unique,
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  whatsapp text not null default '',
  roles jsonb not null default '[]'::jsonb,
  is_owner boolean not null default false,
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  banned_reason text,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key,
  author_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  price_idr bigint not null default 0,
  category text not null,
  images jsonb not null default '[]'::jsonb,
  contact_whatsapp text not null,
  status text not null default 'active',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_status_pinned_created
  on public.posts (status, is_pinned desc, created_at desc);

create index if not exists idx_posts_category
  on public.posts (category);

create index if not exists idx_posts_author
  on public.posts (author_id);

create table if not exists public.settings (
  id text primary key,
  owner_notice text not null default '',
  next_post_seq integer not null default 1
);

insert into public.settings (id, owner_notice, next_post_seq)
values ('board', '', 1)
on conflict (id) do nothing;

create table if not exists public.categories (
  slug text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, label)
values
  ('elektronik', 'Elektronik'),
  ('kendaraan', 'Kendaraan'),
  ('properti', 'Properti'),
  ('fashion', 'Fashion'),
  ('rumah_tangga', 'Rumah Tangga'),
  ('hobi', 'Hobi'),
  ('jasa', 'Jasa'),
  ('lainnya', 'Lainnya')
on conflict (slug) do nothing;

create table if not exists public.audit_logs (
  id text primary key,
  actor_id text not null,
  actor_name text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  target_label text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created
  on public.audit_logs (created_at desc);

-- Aktifkan RLS agar tabel aman dari akses langsung browser tanpa izin
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.audit_logs enable row level security;

-- Kebijakan baca publik opsional untuk postingan aktif dan kategori
drop policy if exists "Publik dapat melihat postingan aktif" on public.posts;
create policy "Publik dapat melihat postingan aktif"
  on public.posts
  for select
  using (status = 'active');

drop policy if exists "Publik dapat melihat kategori" on public.categories;
create policy "Publik dapat melihat kategori"
  on public.categories
  for select
  using (true);

-- Catatan:
-- 1. Buat Storage bucket bernama "post-images" di menu Storage Supabase lalu aktifkan Public bucket.
-- 2. Server Express backend memakai SUPABASE_SERVICE_ROLE_KEY sehingga seluruh operasi aman dikelola oleh server.
