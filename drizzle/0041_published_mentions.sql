ALTER TABLE "forum_reply_notifications" ADD COLUMN "kind" text DEFAULT 'reply' NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_kind_check" CHECK ("forum_reply_notifications"."kind" IN ('reply', 'mention'));
