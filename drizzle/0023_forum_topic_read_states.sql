CREATE TABLE "forum_topic_read_states" (
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"last_read_post_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_topic_read_states_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "forum_topic_read_states" ADD CONSTRAINT "forum_topic_read_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_read_states" ADD CONSTRAINT "forum_topic_read_states_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_read_states" ADD CONSTRAINT "forum_topic_read_states_post_topic_fk" FOREIGN KEY ("topic_id","last_read_post_id") REFERENCES "public"."forum_posts"("topic_id","id") ON DELETE restrict ON UPDATE no action;
