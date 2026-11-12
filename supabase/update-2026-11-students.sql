insert into public.members (name, course, gen)
select v.n, '박사과정', v.g from (values ('김정순',18),('이충길',18),('정진월',18),('최광현',18),('추영애',19),('이태현',20)) as v(n,g)
 where not exists (select 1 from public.members m where m.name = v.n);
update public.members m set course = '박사과정', gen = v.g
  from (values ('김정순',18),('이충길',18),('정진월',18),('최광현',18),('추영애',19),('이태현',20)) as v(n,g)
 where m.name = v.n;
