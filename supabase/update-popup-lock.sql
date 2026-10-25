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
