CREATE TABLE "forum_reply_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_user_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"post_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "forum_reply_notifications_recipient_post_unique" UNIQUE("recipient_user_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_post_topic_fk" FOREIGN KEY ("topic_id","post_id") REFERENCES "public"."forum_posts"("topic_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_reply_notifications_recipient_created_idx" ON "forum_reply_notifications" USING btree ("recipient_user_id","created_at","id");
--> statement-breakpoint
CREATE INDEX "forum_reply_notifications_recipient_read_idx" ON "forum_reply_notifications" USING btree ("recipient_user_id","read_at");
