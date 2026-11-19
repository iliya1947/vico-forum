CREATE TABLE "forum_topic_mutes" (
  "user_id" text NOT NULL,
  "topic_id" text NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT "forum_topic_mutes_pk" PRIMARY KEY ("user_id", "topic_id")
);
--> statement-breakpoint
ALTER TABLE "forum_topic_mutes" ADD CONSTRAINT "forum_topic_mutes_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_mutes" ADD CONSTRAINT "forum_topic_mutes_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_topic_mutes_user_created_topic_idx" ON "forum_topic_mutes"
  USING btree ("user_id", "created_at" DESC, "topic_id" DESC);
--> statement-breakpoint
CREATE INDEX "forum_topic_mutes_topic_idx" ON "forum_topic_mutes" USING btree ("topic_id");
--> statement-breakpoint
CREATE TABLE "forum_user_blocks" (
  "user_id" text NOT NULL,
  "blocked_user_id" text NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT "forum_user_blocks_pk" PRIMARY KEY ("user_id", "blocked_user_id"),
  CONSTRAINT "forum_user_blocks_not_self_check" CHECK ("user_id" <> "blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "forum_user_blocks" ADD CONSTRAINT "forum_user_blocks_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_user_blocks" ADD CONSTRAINT "forum_user_blocks_blocked_user_id_user_id_fk"
  FOREIGN KEY ("blocked_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_user_blocks_user_created_target_idx" ON "forum_user_blocks"
  USING btree ("user_id", "created_at" DESC, "blocked_user_id" DESC);
--> statement-breakpoint
CREATE INDEX "forum_user_blocks_target_idx" ON "forum_user_blocks" USING btree ("blocked_user_id");
--> statement-breakpoint
CREATE TABLE "forum_post_notification_suppressions" (
  "recipient_user_id" text NOT NULL,
  "post_id" text NOT NULL,
  CONSTRAINT "forum_post_notification_suppressions_pk" PRIMARY KEY ("recipient_user_id", "post_id")
);
--> statement-breakpoint
ALTER TABLE "forum_post_notification_suppressions" ADD CONSTRAINT "forum_post_notification_suppressions_recipient_user_id_user_id_fk"
  FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_post_notification_suppressions" ADD CONSTRAINT "forum_post_notification_suppressions_post_id_forum_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_post_notification_suppressions_post_idx" ON "forum_post_notification_suppressions" USING btree ("post_id");
