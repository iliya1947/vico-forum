ALTER TABLE "forum_topics" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "visibility_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "visibility_changed_at" timestamp(3) with time zone;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_visibility_state_check" CHECK ("forum_topics"."visibility_version" >= 0 and (
      ("forum_topics"."visibility_version" = 0 and "forum_topics"."is_hidden" = false and "forum_topics"."visibility_changed_at" is null)
      or ("forum_topics"."visibility_version" > 0 and "forum_topics"."visibility_changed_at" is not null)
    ));
--> statement-breakpoint
CREATE INDEX "forum_topics_hidden_queue_idx" ON "forum_topics" USING btree ("visibility_changed_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE "is_hidden";
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "visibility_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "visibility_changed_at" timestamp(3) with time zone;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_visibility_state_check" CHECK ("forum_posts"."visibility_version" >= 0 and (
      ("forum_posts"."visibility_version" = 0 and "forum_posts"."is_hidden" = false and "forum_posts"."visibility_changed_at" is null)
      or ("forum_posts"."visibility_version" > 0 and "forum_posts"."visibility_changed_at" is not null)
    ));
--> statement-breakpoint
CREATE INDEX "forum_posts_hidden_queue_idx" ON "forum_posts" USING btree ("visibility_changed_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE "is_hidden";
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.topic.title.editOwn', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.content.visibility.manage', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'admin.users.read',
  'admin.users.blocks.manage', 'admin.users.blocks.managePrivileged', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('forum.content.visibility.manage');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id","permission_key")
 SELECT "id", 'forum.content.visibility.manage' FROM "authz_roles"
 WHERE "id" IN ('builtin-moderator','builtin-admin') ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "admin_history" DROP CONSTRAINT "admin_history_action_target_check";
--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')
  or ("admin_history"."action" in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened', 'topic.hidden', 'topic.restored') and "admin_history"."target_type" = 'topic')
  or ("admin_history"."action" in ('post.sourceLocaleCorrected', 'post.hidden', 'post.restored') and "admin_history"."target_type" = 'post')
  or ("admin_history"."action" in ('measure.created', 'measure.changed', 'measure.lifted', 'measure.appealResolved')
    and "admin_history"."target_type" = 'user-measure')
  or ("admin_history"."action" = 'settings.registrationChanged' and "admin_history"."target_type" = 'forum-settings'));
--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_visibility_reason_check" CHECK ("admin_history"."action" not in (
    'topic.hidden', 'topic.restored', 'post.hidden', 'post.restored'
  ) or ("admin_history"."reason" is not null and btrim("admin_history"."reason") <> ''
    and char_length("admin_history"."reason") <= 2000));
