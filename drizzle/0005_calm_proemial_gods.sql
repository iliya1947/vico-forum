ALTER TABLE "forum_topics" ADD COLUMN "is_solved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "best_answer_post_id" text;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topic_id_id_unique" UNIQUE("topic_id","id");--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_best_answer_topic_post_fk" FOREIGN KEY ("id", "best_answer_post_id") REFERENCES "public"."forum_posts"("topic_id", "id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_best_answer_requires_solved_check" CHECK ("forum_topics"."best_answer_post_id" is null or "forum_topics"."is_solved");
