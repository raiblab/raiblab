-- 2026-10-25 업데이트: 회원 전화번호 · 골프 임원 · 관리자 추가 지정
-- Supabase → SQL Editor → New query 에 전체를 붙여넣고 Run (한 번만, 여러 번 눌러도 안전)

-- 1) 회원 전화번호
alter table public.members add column if not exists phone text;

-- 2) 임원 구분 (임원 / 골프 임원)
alter table public.officers add column if not exists section text not null default '임원';

-- 3) 관리자가 다른 회원을 관리자로 지정·해제할 수 있게
drop policy if exists admins_self on public.admins;
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins for insert to authenticated
  with check (public.is_admin());
drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());   -- 자기 자신은 해제 못 함(관리자가 0명 되는 것 방지)

-- 4) 미래교육원 게시판 추가
alter table public.posts drop constraint if exists posts_board_check;
alter table public.posts add constraint posts_board_check check (board in ('news','conference','research','golf','edu'));
