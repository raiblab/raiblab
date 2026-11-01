-- 연구실적 저자 수정 (2026-11-01)
-- 「공동주택 경비원 및 청소원의 고용변동요인 분석」(2020, 인문사회 21) 저자: 전해정 → 강현석, 전해정
update public.posts
   set authors = '강현석, 전해정', updated_at = now()
 where board = 'research'
   and title = '공동주택 경비원 및 청소원의 고용변동요인 분석';
