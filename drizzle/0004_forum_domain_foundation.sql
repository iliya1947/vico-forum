CREATE TABLE "forum_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_categories_name_check" CHECK (btrim("forum_categories"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "forum_post_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"original_content" text NOT NULL,
	"source_locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_post_revisions_post_id_id_unique" UNIQUE("post_id","id"),
	CONSTRAINT "forum_post_revisions_content_check" CHECK (btrim("forum_post_revisions"."original_content") <> ''),
	CONSTRAINT "forum_post_revisions_source_locale_check" CHECK ("forum_post_revisions"."source_locale" = btrim("forum_post_revisions"."source_locale") and "forum_post_revisions"."source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$')
);
--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"author_id" text NOT NULL,
	"current_revision_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_sections_name_check" CHECK (btrim("forum_sections"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "forum_topic_title_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"author_id" text NOT NULL,
	"original_content" text NOT NULL,
	"source_locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_topic_title_revisions_topic_id_id_unique" UNIQUE("topic_id","id"),
	CONSTRAINT "forum_topic_title_revisions_content_check" CHECK (btrim("forum_topic_title_revisions"."original_content") <> ''),
	CONSTRAINT "forum_topic_title_revisions_source_locale_check" CHECK ("forum_topic_title_revisions"."source_locale" = btrim("forum_topic_title_revisions"."source_locale") and "forum_topic_title_revisions"."source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$')
);
--> statement-breakpoint
CREATE TABLE "forum_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"author_id" text NOT NULL,
	"current_title_revision_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_sections" ADD CONSTRAINT "forum_sections_category_id_forum_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_title_revisions" ADD CONSTRAINT "forum_topic_title_revisions_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_title_revisions" ADD CONSTRAINT "forum_topic_title_revisions_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_section_id_forum_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."forum_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_posts_topic_id_idx" ON "forum_posts" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "forum_posts_author_id_idx" ON "forum_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "forum_sections_category_id_idx" ON "forum_sections" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "forum_topics_section_id_idx" ON "forum_topics" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "forum_topics_author_id_idx" ON "forum_topics" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_current_title_revision_fk"
  FOREIGN KEY ("id", "current_title_revision_id")
  REFERENCES "public"."forum_topic_title_revisions"("topic_id", "id")
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_current_revision_fk"
  FOREIGN KEY ("id", "current_revision_id")
  REFERENCES "public"."forum_post_revisions"("post_id", "id")
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION reject_forum_revision_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'forum revisions are immutable' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER forum_topic_title_revisions_immutable
  BEFORE UPDATE ON "forum_topic_title_revisions"
  FOR EACH ROW EXECUTE FUNCTION reject_forum_revision_update();
--> statement-breakpoint
CREATE TRIGGER forum_post_revisions_immutable
  BEFORE UPDATE ON "forum_post_revisions"
  FOR EACH ROW EXECUTE FUNCTION reject_forum_revision_update();
