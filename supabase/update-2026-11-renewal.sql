-- 2026-11 홈페이지 개편(연구실 중심 · 로그인 없이 모두 공개)
-- Supabase → SQL Editor → New query 에 전체를 붙여넣고 Run (한 번만, 여러 번 눌러도 안전)

-- 1) 구성원: 졸업연도·학위 칸 추가, 명단을 로그인 없이 공개(이메일·전화번호는 빼고) -------------
alter table public.members add column if not exists scholar text;
alter table public.members add column if not exists grad_year int;
alter table public.members add column if not exists degree text;
drop view if exists public.members_public;
create view public.members_public as
  select id, name, gen, course, year, org, field, scholar, grad_year, degree, joined_at
  from public.members;
grant select on public.members_public to anon, authenticated;

-- 2) 게시글: 연구과제 기간·진행상태 칸, 교류 활동(community) 게시판 추가 ----------------------
alter table public.posts add column if not exists period text;
alter table public.posts add column if not exists status text;
alter table public.posts drop constraint if exists posts_board_check;
alter table public.posts add constraint posts_board_check
  check (board in ('news','conference','research','golf','edu','community'));

-- 3) 지도교수 정보·입학 안내·골프회 모임 안내를 저장할 칸 -------------------------------------
alter table public.pages add column if not exists data jsonb;

-- 4) 모든 게시물 공개: 정회원 전용(비밀번호) 글을 일반 글로 되돌림 ------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='post_locks') then
    update public.posts p set body = l.body, photos = l.photos, locked = false
      from public.post_locks l where l.post_id = p.id;
    delete from public.post_locks;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='locked') then
    update public.posts set locked = false where locked;
  end if;
end $$;

-- 5) 학술대회 글은 News로 합침 -------------------------------------------------------------
update public.posts set board = 'news', kind = coalesce(kind, '학술대회 발표') where board = 'conference';

-- 6) 사진 설명 간결하게: 장소(숙소·식당·골프장 등) 칸 비우기, 기존 글 정리 -----------------------
update public.posts set place = null where board <> 'research';

update public.posts set kind = '출간',
  body = '레이브랩 9기 강현석 박사(의정부시 부시장)의 신간 『미래경영 체인지업 소상공인 법과 제도』가 출간되었습니다.'
  where title = '레이브랩 9기 강현석 박사님 신간 출간';
update public.posts set title = '제23회 한중일+ASEAN 주거환경·산업 국제학술대회 발표',
  body = '전해정 교수가 「Housing, Urban Environment, and Obesity Risk: An Explainable AI and SHAP Approach」를 발표했습니다. 이현미·허진·이숙연 박사가 함께 참여했습니다.'
  where title = '제 23회 한중일 +ASEAN 주거환경 산업 국제학술대회';
update public.posts set title = '레이브랩 골프회 창단',
  body = '레이브랩 골프회 창단 모임을 가졌습니다.'
  where title = '제1회 레이브랩 골프 창단식';
update public.posts set kind = '학위',
  body = '2026학년도 2학기 박사학위 심사에 양건필·박윤정·한준수 님이 등록했습니다.'
  where title = '2026년 2학기 박사학위 심사';

-- 7) 연구과제: 내용에 적힌 '수행기간: …'을 기간 칸으로 옮기고, 기존 과제는 완료로 표시 ----------
update public.posts
   set period = trim(regexp_replace(body, '^\s*수행기간\s*[:：]\s*', '')), body = null
 where board = 'research' and kind = '공동연구과제' and body ~ '^\s*수행기간\s*[:：]' and period is null;
update public.posts set status = '완료' where board = 'research' and kind = '공동연구과제' and status is null;
