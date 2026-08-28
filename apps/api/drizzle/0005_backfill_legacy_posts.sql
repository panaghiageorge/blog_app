-- Preserve posts created before multilingual translations were introduced.
INSERT INTO "post_translations" (
  "post_id",
  "language_id",
  "title",
  "slug",
  "excerpt",
  "read_time",
  "content",
  "updated_at",
  "created_at"
)
SELECT
  post."id",
  language."id",
  post."title",
  post."slug",
  post."excerpt",
  post."read_time",
  post."content",
  post."updated_at",
  post."created_at"
FROM "posts" AS post
CROSS JOIN LATERAL (
  SELECT "id"
  FROM "languages"
  WHERE "is_active" = true
  ORDER BY "is_default" DESC, "id" ASC
  LIMIT 1
) AS language
WHERE NOT EXISTS (
  SELECT 1
  FROM "post_translations" AS translation
  WHERE translation."post_id" = post."id"
);
--> statement-breakpoint
