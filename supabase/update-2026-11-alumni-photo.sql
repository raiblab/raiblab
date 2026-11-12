alter table public.members add column if not exists photo text;
drop view if exists public.members_public;
create view public.members_public as
  select id, name, gen, course, year, org, field, scholar, grad_year, degree, photo, joined_at
  from public.members;
grant select on public.members_public to anon, authenticated;
