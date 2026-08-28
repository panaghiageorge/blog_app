CREATE TYPE "public"."user_role" AS ENUM('admin', 'author');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'author' NOT NULL;