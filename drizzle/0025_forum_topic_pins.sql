ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.sourceLocale.correctOwn',
  'forum.sourceLocale.correctAny', 'forum.translation.generate',
  'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('forum.topic.pin');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-moderator', 'forum.topic.pin'),
 ('builtin-admin', 'forum.topic.pin');
--> statement-breakpoint
CREATE TABLE "forum_topic_pins" (
  "topic_id" text PRIMARY KEY NOT NULL,
  "pinned_by_user_id" text NOT NULL,
  "pinned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_topic_pins" ADD CONSTRAINT "forum_topic_pins_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_topic_pins" ADD CONSTRAINT "forum_topic_pins_pinned_by_user_id_user_id_fk"
  FOREIGN KEY ("pinned_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_topic_pins_order_idx" ON "forum_topic_pins" USING btree ("pinned_at","topic_id");
