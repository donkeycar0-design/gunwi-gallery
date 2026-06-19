# 몰입갤러리 (gunwi-gallery)

군위인재양성원 늘봄마을 몰입수학/영어 — 선생님·학생 창의적 작품 갤러리

## 기술 스택

- 정적 SPA (index.html + app.js + style.css)
- Supabase (anon key, 클라이언트 직접 연결)
- Vercel 정적 호스팅
- Lucide 아이콘 (자체 호스팅, vendor/lucide.min.js)

## 관련 테이블 
(Supabase)

| 테이블 | 용도 |
|---|---|
| `apps` | 갤러리 앱 목록 |
| `app_likes` | 좋아요 |
| `comments` | 댓글 |
| `profiles` | 사용자 프로필 |
| `posts` | 게시판 글 |
| `post_comments` | 게시판 댓글 |
