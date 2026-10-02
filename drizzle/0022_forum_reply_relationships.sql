ALTER TABLE "forum_posts" ADD COLUMN "parent_post_id" text;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_topic_fk" FOREIGN KEY ("topic_id","parent_post_id") REFERENCES "public"."forum_posts"("topic_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_not_self_check" CHECK ("forum_posts"."parent_post_id" is null or "forum_posts"."parent_post_id" <> "forum_posts"."id");
--> statement-breakpoint
CREATE INDEX "forum_posts_parent_post_id_idx" ON "forum_posts" USING btree ("parent_post_id");
