CREATE TABLE "forum_topic_bookmarks" (
  "user_id" text NOT NULL,
  "topic_id" text NOT NULL,
  "saved_at" timestamp(3) with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT "forum_topic_bookmarks_pk" PRIMARY KEY ("user_id", "topic_id")
);
--> statement-breakpoint
ALTER TABLE "forum_topic_bookmarks" ADD CONSTRAINT "forum_topic_bookmarks_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_bookmarks" ADD CONSTRAINT "forum_topic_bookmarks_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_topic_bookmarks_user_saved_topic_idx" ON "forum_topic_bookmarks"
  USING btree ("user_id", "saved_at" DESC, "topic_id" DESC);
--> statement-breakpoint
CREATE INDEX "forum_topic_bookmarks_topic_idx" ON "forum_topic_bookmarks" USING btree ("topic_id");
