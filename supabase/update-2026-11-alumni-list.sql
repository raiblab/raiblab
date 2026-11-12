update public.members set course = '박사'
 where name in ('김세형','강현석','이현미','김종희','손갑주','허진','진원겸','이숙연');
insert into public.members (name, course)
select n, '박사' from unnest(array['김세형','강현석','이현미','김종희','손갑주','허진','진원겸','이숙연']) as n
 where not exists (select 1 from public.members m where m.name = n);
update public.members set gen = 9  where name = '강현석' and gen is null;
update public.members set gen = 12 where name = '손갑주' and gen is null;
update public.members set gen = 14 where name = '이숙연' and gen is null;
