# 레이브랩 RAIB Lab 홈페이지

상명대학교 일반대학원 부동산학 박사 연구실(지도교수 전해정) 레이브랩 홈페이지입니다.

- 화면: `index.html`, `style.css`, `app.js` (Netlify가 GitHub에서 자동으로 올립니다)
- 회원·게시글·사진 저장: Supabase (무료 요금제)
- 연결 정보: `config.js` (Project URL, anon public key만 넣습니다)

## 처음 한 번 하는 설정

1. Supabase → **SQL Editor** → `supabase/schema.sql` 전체를 붙여넣고 **Run**
2. Supabase → **Authentication → Sign In / Providers → Email**에서 **Confirm email 끄기**
   (켜 두면 가입할 때마다 인증 메일이 가는데, 무료 메일 발송은 시간당 몇 통으로 제한됩니다)
3. Supabase → **Authentication → URL Configuration**의 Site URL에 홈페이지 주소 입력
4. 홈페이지에서 관리자 이메일로 **회원가입**
5. SQL Editor에서 `supabase/make-admin.sql`(이메일 바꿔서) **Run** → 관리자 지정
6. SQL Editor에서 `supabase/import-old-data.sql`(이메일 바꿔서) **Run** → 기존 글·임원 명단 옮기기

## 권한

| | 비회원 | 회원 | 관리자 |
|---|---|---|---|
| 인사말·임원·게시글 보기 | O | O | O |
| 회원 명단 보기 | X | O | O |
| 글쓰기·사진 올리기 | X | O | O |
| 남의 글 수정·삭제 | X | X | O |
| 인사말·임원 명단 편집, 회원 추가 | X | X | O |

## 주의

- Supabase 무료 프로젝트는 일주일 동안 아무도 접속하지 않으면 일시 정지됩니다. 관리 화면에서 **Restore**를 누르면 다시 켜집니다.
- `service_role` 키는 절대 이 저장소에 넣지 마세요.
