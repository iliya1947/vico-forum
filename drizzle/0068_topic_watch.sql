CREATE TABLE "forum_topic_watches" (
  "user_id" text NOT NULL,
  "topic_id" text NOT NULL,
  CONSTRAINT "forum_topic_watches_pk" PRIMARY KEY ("user_id", "topic_id")
);
--> statement-breakpoint
ALTER TABLE "forum_topic_watches" ADD CONSTRAINT "forum_topic_watches_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_watches" ADD CONSTRAINT "forum_topic_watches_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_topic_watches_topic_user_idx" ON "forum_topic_watches" USING btree ("topic_id", "user_id");
