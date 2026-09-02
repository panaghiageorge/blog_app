ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb DEFAULT '[]'::jsonb NOT NULL;
