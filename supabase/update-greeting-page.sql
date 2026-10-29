-- 인사말을 '편집한 한 페이지(그림 + PDF)'로 올리기 위한 변경 (한 번만 실행)
alter table public.pages add column if not exists page_img text;
alter table public.pages add column if not exists page_pdf text;
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf']
 where id = 'photos';

-- 회원 명단에 Google Scholar 주소 칸 추가
alter table public.members add column if not exists scholar text;
update public.members set scholar = 'https://scholar.google.com/citations?hl=ko&user=onpLQXoAAAAJ'
 where name = '이숙연' and scholar is null;
