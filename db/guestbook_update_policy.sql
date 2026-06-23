-- =====================================================================
-- 방명록(포스트잇) 글 수정 기능용 RLS 정책
-- 작성자 본인만 자신의 글(posts)을 UPDATE 할 수 있도록 허용
--
-- 적용 순서: Supabase SQL Editor에서 먼저 실행 → 그다음 프론트 배포
-- (이 정책이 없으면 방명록 포스트잇의 "수정"이 RLS에 막혀 실패합니다)
-- =====================================================================

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;

CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
