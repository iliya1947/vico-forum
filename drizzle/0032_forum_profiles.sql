CREATE TABLE "forum_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"github_url" text,
	"website_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_profiles_bio_length" CHECK (char_length("forum_profiles"."bio") <= 500),
	CONSTRAINT "forum_profiles_github_url" CHECK ("forum_profiles"."github_url" is null or ("forum_profiles"."github_url" ~ '^https://github[.]com/[A-Za-z0-9][A-Za-z0-9-]{0,38}$')),
	CONSTRAINT "forum_profiles_website_url" CHECK ("forum_profiles"."website_url" is null or (char_length("forum_profiles"."website_url") <= 2048 and "forum_profiles"."website_url" ~ '^https?://'))
);
--> statement-breakpoint
ALTER TABLE "forum_profiles" ADD CONSTRAINT "forum_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;