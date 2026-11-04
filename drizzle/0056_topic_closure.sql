ALTER TABLE "forum_topics" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "closure_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_closure_version_check" CHECK ("forum_topics"."closure_version" >= 0);--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));--> statement-breakpoint
ALTER TABLE "admin_history" DROP CONSTRAINT "admin_history_action_target_check";--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')
  or ("admin_history"."action" in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened') and "admin_history"."target_type" = 'topic')
  or ("admin_history"."action" = 'post.sourceLocaleCorrected' and "admin_history"."target_type" = 'post'));--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('forum.topic.close');--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id","permission_key")
SELECT "id", 'forum.topic.close' FROM "authz_roles"
WHERE "id" IN ('builtin-moderator','builtin-admin')
ON CONFLICT DO NOTHING;
