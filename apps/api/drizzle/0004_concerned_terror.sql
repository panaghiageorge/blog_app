CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(12) NOT NULL,
	"name" varchar(80) NOT NULL,
	"native_name" varchar(80) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "post_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"language_id" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"excerpt" varchar(320) DEFAULT '' NOT NULL,
	"read_time" varchar(40) DEFAULT '5 min' NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_translations_post_language_unique" ON "post_translations" USING btree ("post_id","language_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_translations_language_slug_unique" ON "post_translations" USING btree ("language_id","slug");