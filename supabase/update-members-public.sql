-- 회원 명단을 로그인하지 않은 방문자도 볼 수 있게 (이메일·전화번호는 빼고 공개)
create or replace view public.members_public as
  select id, name, gen, course, year, org, field, scholar, joined_at
  from public.members;
grant select on public.members_public to anon, authenticated;
