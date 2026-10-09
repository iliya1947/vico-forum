CREATE TABLE "forum_online_presence" (
  "user_id" text PRIMARY KEY NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_online_presence" ADD CONSTRAINT "forum_online_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_online_presence_seen_at_idx" ON "forum_online_presence" USING btree ("last_seen_at");
