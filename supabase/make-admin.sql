-- 관리자 지정
-- 홈페이지에서 먼저 회원가입을 한 뒤, 아래 이메일을 관리자 이메일로 바꿔서 SQL Editor 에서 Run 하세요.
insert into public.admins (user_id)
select id from auth.users where email = '관리자이메일@naver.com'
on conflict do nothing;

-- 관리자 해제는:
-- delete from public.admins where user_id = (select id from auth.users where email = '이메일');
