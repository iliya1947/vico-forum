ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpDuplicate.manage',
  'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('forum.helpDuplicate.manage');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-moderator', 'forum.helpDuplicate.manage'),
 ('builtin-admin', 'forum.helpDuplicate.manage');
--> statement-breakpoint
CREATE TABLE "forum_help_duplicate_relationships" (
  "id" text PRIMARY KEY NOT NULL,
  "duplicate_topic_id" text NOT NULL,
  "original_topic_id" text NOT NULL,
  "confirmed_by_user_id" text NOT NULL,
  "confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "removed_by_user_id" text,
  "removed_at" timestamp with time zone,
  CONSTRAINT "forum_help_duplicate_relationships_not_self_check" CHECK ("duplicate_topic_id" <> "original_topic_id"),
  CONSTRAINT "forum_help_duplicate_relationships_removal_check" CHECK (
    ("removed_at" is null and "removed_by_user_id" is null)
    or (
      "removed_at" is not null
      and "removed_by_user_id" is not null
      and "removed_at" >= "confirmed_at"
    )
  )
);
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_relationships" ADD CONSTRAINT "forum_help_duplicate_relationships_duplicate_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("duplicate_topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_relationships" ADD CONSTRAINT "forum_help_duplicate_relationships_original_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("original_topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_relationships" ADD CONSTRAINT "forum_help_duplicate_relationships_confirmed_by_user_id_user_id_fk"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_relationships" ADD CONSTRAINT "forum_help_duplicate_relationships_removed_by_user_id_user_id_fk"
  FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_help_duplicate_relationships_active_duplicate_idx"
  ON "forum_help_duplicate_relationships" USING btree ("duplicate_topic_id") WHERE "removed_at" is null;
--> statement-breakpoint
CREATE INDEX "forum_help_duplicate_relationships_active_original_idx"
  ON "forum_help_duplicate_relationships" USING btree ("original_topic_id","removed_at");
--> statement-breakpoint
CREATE TABLE "forum_help_duplicate_appeals" (
  "id" text PRIMARY KEY NOT NULL,
  "relationship_id" text NOT NULL,
  "appellant_user_id" text NOT NULL,
  "explanation" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_by_user_id" text,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "forum_help_duplicate_appeals_explanation_check"
    CHECK (btrim("explanation") <> '' and char_length("explanation") <= 1000),
  CONSTRAINT "forum_help_duplicate_appeals_status_check"
    CHECK ("status" in ('pending', 'rejected', 'accepted')),
  CONSTRAINT "forum_help_duplicate_appeals_lifecycle_check" CHECK (
    (
      "status" = 'pending'
      and "resolved_by_user_id" is null
      and "resolved_at" is null
    )
    or (
      "status" in ('rejected', 'accepted')
      and "resolved_by_user_id" is not null
      and "resolved_at" is not null
      and "resolved_at" >= "created_at"
    )
  )
);
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_appeals" ADD CONSTRAINT "forum_help_duplicate_appeals_relationship_id_forum_help_duplicate_relationships_id_fk"
  FOREIGN KEY ("relationship_id") REFERENCES "public"."forum_help_duplicate_relationships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_appeals" ADD CONSTRAINT "forum_help_duplicate_appeals_appellant_user_id_user_id_fk"
  FOREIGN KEY ("appellant_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_duplicate_appeals" ADD CONSTRAINT "forum_help_duplicate_appeals_resolved_by_user_id_user_id_fk"
  FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_help_duplicate_appeals_pending_relationship_idx"
  ON "forum_help_duplicate_appeals" USING btree ("relationship_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX "forum_help_duplicate_appeals_relationship_created_idx"
  ON "forum_help_duplicate_appeals" USING btree ("relationship_id","created_at","id");
