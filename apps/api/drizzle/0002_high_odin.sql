CREATE TYPE "public"."post_category" AS ENUM('design', 'publishing', 'essays', 'product');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "excerpt" varchar(320) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category" "post_category" DEFAULT 'publishing' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "read_time" varchar(40) DEFAULT '5 min' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone DEFAULT now() NOT NULL;