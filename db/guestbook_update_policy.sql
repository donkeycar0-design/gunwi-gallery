-- =====================================================================
-- 방명록(포스트잇) 글 수정·삭제 RLS 정책
-- 작성자 본인 + 관리자(profiles.is_admin = true)가
-- posts 글을 UPDATE / DELETE 할 수 있도록 허용
--
-- 적용 순서: Supabase SQL Editor에서 먼저 실행 → 그다음 프론트 배포
-- (이 정책이 없으면 방명록 포스트잇의 "수정/삭제"가 RLS에 막혀 실패합니다)
-- =====================================================================

-- 현재 로그인 사용자가 관리자인지 판별하는 헬퍼
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

-- ── UPDATE: 본인 또는 관리자 ──────────────────────────────────────────
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
DROP POLICY IF EXISTS "posts_update_own_or_admin" ON public.posts;

CREATE POLICY "posts_update_own_or_admin" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

-- ── DELETE: 본인 또는 관리자 ──────────────────────────────────────────
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own_or_admin" ON public.posts;

CREATE POLICY "posts_delete_own_or_admin" ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());
