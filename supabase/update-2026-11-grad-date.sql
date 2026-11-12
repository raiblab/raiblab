alter table public.members add column if not exists grad_date text;
drop view if exists public.members_public;
create view public.members_public as
  select id, name, gen, course, year, org, field, scholar, grad_year, grad_date, degree, photo, joined_at
  from public.members;
grant select on public.members_public to anon, authenticated;
update public.members set grad_date = '2026.2', grad_year = 2026 where name = '이숙연' and grad_date is null;
