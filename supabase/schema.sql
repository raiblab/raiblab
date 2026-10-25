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
  phone text,
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

-- 3) 게시글 (연구실 동정·학술대회·연구실적·친목도모(golf)) ---------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board text not null check (board in ('news','conference','research','golf','edu')),
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
  section text not null default '임원',
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
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins for insert to authenticated with check (public.is_admin());
drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins for delete to authenticated using (public.is_admin() and user_id <> auth.uid());

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
create or replace function public.admin_list_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at from auth.users u order by u.created_at;
end $$;

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if target = auth.uid() then raise exception '자기 자신은 탈퇴 처리할 수 없습니다'; end if;
  delete from public.members where user_id = target;
  delete from public.admins where user_id = target;
  delete from auth.users where id = target;
end $$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
-- 팝업 공지 · 정회원 전용(비밀번호) 글
-- Supabase → SQL Editor → New query 에 전체를 붙여넣고 Run (한 번만, 여러 번 눌러도 안전)

create extension if not exists pgcrypto with schema extensions;

-- 1) 팝업 공지 --------------------------------------------------------------
create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  image_path text,
  link text,
  start_date date,
  end_date date,
  pos_x int not null default 40,
  pos_y int not null default 120,
  width int not null default 420,
  height int,                       -- 비우면 내용에 맞춰 자동
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.popups enable row level security;
drop policy if exists popups_read on public.popups;
create policy popups_read on public.popups for select using (true);
drop policy if exists popups_write on public.popups;
create policy popups_write on public.popups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) 정회원 전용 글 ----------------------------------------------------------
-- 잠근 글의 내용·사진은 post_locks 에만 저장되고, 비밀번호가 맞을 때만 unlock_post 가 돌려줍니다.
alter table public.posts add column if not exists locked boolean not null default false;

create table if not exists public.post_locks (
  post_id uuid primary key references public.posts(id) on delete cascade,
  pw_hash text not null,
  body text,
  photos jsonb not null default '[]'::jsonb
);
alter table public.post_locks enable row level security;
drop policy if exists post_locks_admin_read on public.post_locks;
create policy post_locks_admin_read on public.post_locks for select to authenticated using (public.is_admin());
drop policy if exists post_locks_admin_delete on public.post_locks;
create policy post_locks_admin_delete on public.post_locks for delete to authenticated using (public.is_admin());

-- 비밀번호 확인: 맞으면 내용·사진, 틀리면 빈 결과
create or replace function public.unlock_post(pid uuid, pw text)
returns table (body text, photos jsonb)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query
    select l.body, l.photos from public.post_locks l
    where l.post_id = pid and l.pw_hash = extensions.crypt(coalesce(pw,''), l.pw_hash);
end $$;

-- 관리자: 글 잠그기 / 내용·비밀번호 바꾸기 (비밀번호를 비우면 기존 비밀번호 유지)
create or replace function public.set_post_lock(pid uuid, pw text, b text, ph jsonb)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select pw_hash into h from public.post_locks where post_id = pid;
  if coalesce(pw,'') <> '' then h := extensions.crypt(pw, extensions.gen_salt('bf')); end if;
  if h is null then raise exception '비밀번호를 입력해 주세요'; end if;
  insert into public.post_locks (post_id, pw_hash, body, photos)
    values (pid, h, b, coalesce(ph,'[]'::jsonb))
    on conflict (post_id) do update set pw_hash = excluded.pw_hash, body = excluded.body, photos = excluded.photos;
  update public.posts set locked = true, body = null, photos = '[]'::jsonb where id = pid;
end $$;

revoke all on function public.unlock_post(uuid, text) from public;
revoke all on function public.set_post_lock(uuid, text, text, jsonb) from public, anon;
grant execute on function public.unlock_post(uuid, text) to anon, authenticated;
grant execute on function public.set_post_lock(uuid, text, text, jsonb) to authenticated;
