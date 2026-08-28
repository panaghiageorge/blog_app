CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "published_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "published_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" "post_status" DEFAULT 'draft' NOT NULL;