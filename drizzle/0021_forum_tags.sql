CREATE TABLE "forum_tags" (
  "key" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "forum_tags_key_check" CHECK ("forum_tags"."key" = btrim("forum_tags"."key") and btrim("forum_tags"."key") <> ''),
  CONSTRAINT "forum_tags_name_check" CHECK (btrim("forum_tags"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "forum_topic_tags" (
  "topic_id" text NOT NULL,
  "tag_key" text NOT NULL,
  CONSTRAINT "forum_topic_tags_pk" PRIMARY KEY("topic_id","tag_key")
);
--> statement-breakpoint
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_tag_key_forum_tags_key_fk" FOREIGN KEY ("tag_key") REFERENCES "public"."forum_tags"("key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_topic_tags_tag_key_idx" ON "forum_topic_tags" USING btree ("tag_key");
