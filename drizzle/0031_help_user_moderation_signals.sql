ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
  ('forum.helpSignal.create'),
  ('forum.helpNeedsDetails.manage');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
  ('builtin-user', 'forum.helpSignal.create'),
  ('builtin-moderator', 'forum.helpSignal.create'),
  ('builtin-admin', 'forum.helpSignal.create'),
  ('builtin-moderator', 'forum.helpNeedsDetails.manage'),
  ('builtin-admin', 'forum.helpNeedsDetails.manage');
--> statement-breakpoint
CREATE TABLE "forum_help_signals" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "topic_id" text NOT NULL,
  "target_post_id" text,
  "proposed_original_topic_id" text,
  "submitted_by_user_id" text NOT NULL,
  "explanation" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_by_user_id" text,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "forum_help_signals_kind_check"
    CHECK ("kind" in ('needs-details', 'needs-review', 'solution-outdated', 'duplicate')),
  CONSTRAINT "forum_help_signals_explanation_check"
    CHECK ("explanation" is null or (btrim("explanation") <> '' and char_length("explanation") <= 1000)),
  CONSTRAINT "forum_help_signals_shape_check" CHECK (
    (
      "kind" = 'needs-details'
      and "target_post_id" is null
      and "proposed_original_topic_id" is null
      and "explanation" is not null
    ) or (
      "kind" in ('needs-review', 'solution-outdated')
      and "target_post_id" is not null
      and "proposed_original_topic_id" is null
      and "explanation" is not null
    ) or (
      "kind" = 'duplicate'
      and "target_post_id" is null
      and "proposed_original_topic_id" is not null
      and "proposed_original_topic_id" <> "topic_id"
    )
  ),
  CONSTRAINT "forum_help_signals_status_check"
    CHECK ("status" in ('pending', 'accepted', 'rejected', 'withdrawn', 'superseded')),
  CONSTRAINT "forum_help_signals_lifecycle_check" CHECK (
    (
      "status" = 'pending'
      and "resolved_by_user_id" is null
      and "resolved_at" is null
    ) or (
      "status" in ('accepted', 'rejected', 'withdrawn', 'superseded')
      and "resolved_by_user_id" is not null
      and "resolved_at" is not null
      and "resolved_at" >= "created_at"
    )
  )
);
--> statement-breakpoint
ALTER TABLE "forum_help_signals" ADD CONSTRAINT "forum_help_signals_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_signals" ADD CONSTRAINT "forum_help_signals_proposed_original_topic_id_forum_topics_id_fk"
  FOREIGN KEY ("proposed_original_topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_signals" ADD CONSTRAINT "forum_help_signals_submitted_by_user_id_user_id_fk"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_signals" ADD CONSTRAINT "forum_help_signals_resolved_by_user_id_user_id_fk"
  FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_help_signals" ADD CONSTRAINT "forum_help_signals_target_post_topic_fk"
  FOREIGN KEY ("topic_id","target_post_id") REFERENCES "public"."forum_posts"("topic_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_help_signals_pending_needs_details_submitter_idx"
  ON "forum_help_signals" USING btree ("topic_id","submitted_by_user_id")
  WHERE "status" = 'pending' and "kind" = 'needs-details';
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_help_signals_pending_solution_submitter_idx"
  ON "forum_help_signals" USING btree ("topic_id","target_post_id","submitted_by_user_id","kind")
  WHERE "status" = 'pending' and "kind" in ('needs-review', 'solution-outdated');
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_help_signals_pending_duplicate_submitter_idx"
  ON "forum_help_signals" USING btree ("topic_id","proposed_original_topic_id","submitted_by_user_id")
  WHERE "status" = 'pending' and "kind" = 'duplicate';
--> statement-breakpoint
CREATE INDEX "forum_help_signals_pending_review_idx"
  ON "forum_help_signals" USING btree ("status","kind","created_at","id");
--> statement-breakpoint
CREATE INDEX "forum_help_signals_submitter_created_idx"
  ON "forum_help_signals" USING btree ("submitted_by_user_id","created_at","id");
