-- 작품 본문(문학작품) + 이미지 갤러리(예술작품) 지원을 위한 컬럼 추가
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하세요.

-- B. 문학작품 본문 (긴 텍스트)
ALTER TABLE apps ADD COLUMN IF NOT EXISTS body_text TEXT;

-- C. 작품 이미지 갤러리 (URL 배열)
ALTER TABLE apps ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
