-- 회원관리 기능 (관리자: 로그인 계정·가입일·최근 접속 보기, 탈퇴 처리)
-- Supabase → SQL Editor → 붙여넣고 Run (여러 번 눌러도 안전)

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
