CREATE TABLE "legal_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(40) NOT NULL,
	"language_code" varchar(12) NOT NULL,
	"title" varchar(160) NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"language_code" varchar(12) DEFAULT 'ro' NOT NULL,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"marketing_accepted" boolean DEFAULT false NOT NULL,
	"marketing_accepted_at" timestamp with time zone,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "legal_pages_key_language_unique" ON "legal_pages" USING btree ("key","language_code");