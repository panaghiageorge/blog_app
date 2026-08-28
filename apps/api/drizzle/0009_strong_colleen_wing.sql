ALTER TABLE "posts" ALTER COLUMN "category" SET DATA TYPE varchar(40);--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "category" SET DEFAULT 'publishing';