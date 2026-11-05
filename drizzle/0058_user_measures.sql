-- AP-10 explicit-grant-only permission keys and independently lifecycled measures.
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'admin.users.read',
  'admin.users.blocks.manage', 'admin.users.blocks.managePrivileged', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
  ('admin.users.blocks.manage'), ('admin.users.blocks.managePrivileged');--> statement-breakpoint
-- No role-grant INSERT or backfill: all built-in roles retain zero initial block permissions.

CREATE TABLE "user_measures" (
  "id" uuid PRIMARY KEY NOT NULL,
  "target_user_id" text NOT NULL,
  "issuer_user_id" text NOT NULL,
  "issuer_authority_floor" integer NOT NULL,
  "create_fingerprint" text NOT NULL,
  "initial_reason" text NOT NULL,
  "latest_change_reason" text,
  "created_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "expires_at" timestamp (3) with time zone,
  "version" integer DEFAULT 1 NOT NULL,
  "lifted_at" timestamp (3) with time zone,
  "lifted_by_user_id" text,
  "lift_reason" text,
  CONSTRAINT "user_measures_issuer_floor_check" CHECK ("user_measures"."issuer_authority_floor" between 1 and 3),
  CONSTRAINT "user_measures_version_check" CHECK ("user_measures"."version" > 0),
  CONSTRAINT "user_measures_fingerprint_check" CHECK (char_length("user_measures"."create_fingerprint") = 64 and "user_measures"."create_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "user_measures_initial_reason_check" CHECK (btrim("user_measures"."initial_reason") <> '' and char_length("user_measures"."initial_reason") <= 2000),
  CONSTRAINT "user_measures_change_reason_check" CHECK ("user_measures"."latest_change_reason" is null or (btrim("user_measures"."latest_change_reason") <> '' and char_length("user_measures"."latest_change_reason") <= 2000)),
  CONSTRAINT "user_measures_lift_reason_check" CHECK ("user_measures"."lift_reason" is null or (btrim("user_measures"."lift_reason") <> '' and char_length("user_measures"."lift_reason") <= 2000)),
  CONSTRAINT "user_measures_lift_consistency_check" CHECK ((
    "user_measures"."lifted_at" is null and "user_measures"."lifted_by_user_id" is null and "user_measures"."lift_reason" is null
  ) or (
    "user_measures"."lifted_at" is not null and "user_measures"."lifted_by_user_id" is not null and "user_measures"."lift_reason" is not null
  ))
);--> statement-breakpoint
CREATE INDEX "user_measures_target_created_idx" ON "user_measures" USING btree ("target_user_id","created_at","id");--> statement-breakpoint
ALTER TABLE "user_measures" ADD CONSTRAINT "user_measures_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_measures" ADD CONSTRAINT "user_measures_issuer_user_id_user_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_measures" ADD CONSTRAINT "user_measures_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE TABLE "user_measure_restrictions" (
  "measure_id" uuid NOT NULL,
  "restriction_key" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  CONSTRAINT "user_measure_restrictions_pk" PRIMARY KEY("measure_id","restriction_key"),
  CONSTRAINT "user_measure_restrictions_key_check" CHECK ("user_measure_restrictions"."restriction_key" in (
    'topics.create', 'replies.create', 'attachments.upload',
    'posts.edit', 'profile.edit', 'complaints.submit', 'helpSignals.submit',
    'translations.generate', 'admin.forum', 'admin.complaints',
    'admin.security', 'admin.usersAccess'
  ))
);--> statement-breakpoint
ALTER TABLE "user_measure_restrictions" ADD CONSTRAINT "user_measure_restrictions_measure_id_user_measures_id_fk" FOREIGN KEY ("measure_id") REFERENCES "public"."user_measures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE TABLE "user_measure_appeals" (
  "id" uuid PRIMARY KEY NOT NULL,
  "measure_id" uuid NOT NULL,
  "subject_user_id" text NOT NULL,
  "ordinal" integer NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "reviewer_user_id" text,
  "resolved_at" timestamp (3) with time zone,
  "reviewer_explanation" text,
  "remedy" text,
  CONSTRAINT "user_measure_appeals_measure_ordinal_unique" UNIQUE("measure_id","ordinal"),
  CONSTRAINT "user_measure_appeals_ordinal_check" CHECK ("user_measure_appeals"."ordinal" between 1 and 3),
  CONSTRAINT "user_measure_appeals_status_check" CHECK ("user_measure_appeals"."status" in ('pending', 'rejected', 'accepted', 'moot')),
  CONSTRAINT "user_measure_appeals_body_check" CHECK (btrim("user_measure_appeals"."body") <> '' and char_length("user_measure_appeals"."body") <= 2000),
  CONSTRAINT "user_measure_appeals_explanation_check" CHECK ("user_measure_appeals"."reviewer_explanation" is null or (btrim("user_measure_appeals"."reviewer_explanation") <> '' and char_length("user_measure_appeals"."reviewer_explanation") <= 2000)),
  CONSTRAINT "user_measure_appeals_remedy_check" CHECK ("user_measure_appeals"."remedy" is null or "user_measure_appeals"."remedy" in ('lift', 'change')),
  CONSTRAINT "user_measure_appeals_resolution_check" CHECK ((
    "user_measure_appeals"."status" = 'pending' and "user_measure_appeals"."reviewer_user_id" is null and "user_measure_appeals"."resolved_at" is null
      and "user_measure_appeals"."reviewer_explanation" is null and "user_measure_appeals"."remedy" is null
  ) or (
    "user_measure_appeals"."status" = 'rejected' and "user_measure_appeals"."reviewer_user_id" is not null and "user_measure_appeals"."resolved_at" is not null
      and "user_measure_appeals"."reviewer_explanation" is not null and "user_measure_appeals"."remedy" is null
  ) or (
    "user_measure_appeals"."status" = 'accepted' and "user_measure_appeals"."reviewer_user_id" is not null and "user_measure_appeals"."resolved_at" is not null
      and "user_measure_appeals"."reviewer_explanation" is not null and "user_measure_appeals"."remedy" in ('lift', 'change')
  ) or (
    "user_measure_appeals"."status" = 'moot' and "user_measure_appeals"."reviewer_user_id" is null and "user_measure_appeals"."remedy" is null
  ))
);--> statement-breakpoint
CREATE UNIQUE INDEX "user_measure_appeals_one_pending_idx" ON "user_measure_appeals" USING btree ("measure_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "user_measure_appeals_measure_created_idx" ON "user_measure_appeals" USING btree ("measure_id","created_at","id");--> statement-breakpoint
ALTER TABLE "user_measure_appeals" ADD CONSTRAINT "user_measure_appeals_measure_id_user_measures_id_fk" FOREIGN KEY ("measure_id") REFERENCES "public"."user_measures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_measure_appeals" ADD CONSTRAINT "user_measure_appeals_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_measure_appeals" ADD CONSTRAINT "user_measure_appeals_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "admin_history" DROP CONSTRAINT "admin_history_action_target_check";--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')
  or ("admin_history"."action" in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened') and "admin_history"."target_type" = 'topic')
  or ("admin_history"."action" = 'post.sourceLocaleCorrected' and "admin_history"."target_type" = 'post')
  or ("admin_history"."action" in ('measure.created', 'measure.changed', 'measure.lifted', 'measure.appealResolved')
    and "admin_history"."target_type" = 'user-measure'));--> statement-breakpoint
