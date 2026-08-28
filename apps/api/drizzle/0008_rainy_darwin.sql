CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(80) NOT NULL,
	"native_name" varchar(80) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category_id" integer;--> statement-breakpoint
INSERT INTO "categories" ("code", "name", "native_name") VALUES
	('design', 'Design', 'Design'),
	('publishing', 'Publishing', 'Publicare'),
	('essays', 'Essays', 'Eseuri'),
	('product', 'Product', 'Produs');--> statement-breakpoint
UPDATE "posts" AS post
SET "category_id" = category."id"
FROM "categories" AS category
WHERE category."code" = post."category"::text;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;