-- 2026-11-14 명단 정리: 수료생 추가, 졸업생(Alumni) 신창국 추가
-- Supabase → SQL Editor → 붙여넣고 Run (여러 번 실행해도 중복으로 들어가지 않음)

-- 1) 수료생: 명단에 없는 분 추가 (이미 있으면 구분만 수료생으로)
insert into public.members (name, course)
select n, '박사수료'
  from unnest(array['박윤정','조항신','고호진','김정현','오소영','정충희','김순종','한수동','김연옥','이석우','박규태','이우희','조남식','박정훈','유일현','조용구']) as n
 where not exists (select 1 from public.members m where m.name = n);
update public.members set course = '박사수료'
 where name in ('박윤정','조항신','고호진','김정현','오소영','정충희','김순종','한수동','김연옥','이석우','박규태','이우희','조남식','박정훈','유일현','조용구');

-- 2) 졸업생: 신창국 (한국시덴티제약)
insert into public.members (name, course, org)
select '신창국', '박사', '한국시덴티제약'
 where not exists (select 1 from public.members m where m.name = '신창국');
update public.members set course = '박사', org = coalesce(org, '한국시덴티제약') where name = '신창국';
