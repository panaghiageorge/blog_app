CREATE TABLE IF NOT EXISTS "tags" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(80) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tags_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" integer NOT NULL,
  "tag_id" integer NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "post_tags_post_tag_unique" ON "post_tags" USING btree ("post_id", "tag_id");
