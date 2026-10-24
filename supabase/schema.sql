-- 레이브랩 홈페이지 데이터베이스 설정
-- Supabase 관리 화면 → SQL Editor → New query 에 전체를 붙여넣고 Run 을 누르세요. (한 번만)

-- 1) 관리자 목록 ----------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;

-- 2) 회원 명단 -----------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  gen int,
  course text,
  year int,
  email text,
  org text,
  field text,
  joined_at timestamptz not null default now(),
  updated_at timestamptz
);
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.members where user_id = auth.uid());
$$;

-- 3) 게시글 (연구실 동정·학술대회·연구실적·골프) ---------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board text not null check (board in ('news','conference','research','golf')),
  title text not null,
  body text,
  date date,
  place text,
  kind text,
  year int,
  authors text,
  venue text,
  source text,
  link text,
  author_name text,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- 4) 역대 임원 -----------------------------------------------------------
create table if not exists public.officers (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  period text,
  role text not null,
  name text not null,
  note text,
  term_order int
);

-- 5) 인사말 (greeting = 교수님, chair = 회장) ------------------------------
create table if not exists public.pages (
  key text primary key,
  name text, role text, aff text, heading text, body text,
  updated_at timestamptz
);

-- 6) 접근 권한 -------------------------------------------------------------
alter table public.admins   enable row level security;
alter table public.members  enable row level security;
alter table public.posts    enable row level security;
alter table public.officers enable row level security;
alter table public.pages    enable row level security;

-- 관리자 표: 본인 행만 확인 가능
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());

-- 게시글: 누구나 읽기 / 명단에 등록된 회원이 쓰기 / 본인 글 또는 관리자만 수정·삭제
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check ((public.is_member() or public.is_admin()) and author_id = auth.uid());
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 임원·인사말: 누구나 읽기 / 관리자만 쓰기
drop policy if exists officers_read on public.officers;
create policy officers_read on public.officers for select using (true);
drop policy if exists officers_write on public.officers;
create policy officers_write on public.officers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists pages_read on public.pages;
create policy pages_read on public.pages for select using (true);
drop policy if exists pages_write on public.pages;
create policy pages_write on public.pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 회원 명단: 로그인한 사람만 읽기 / 본인 행 등록·수정·삭제 / 관리자는 전부
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (true);
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 7) 사진 저장소 -----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos','photos', true, 20971520, array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');
drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
