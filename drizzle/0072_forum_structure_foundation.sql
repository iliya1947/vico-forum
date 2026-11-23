CREATE TABLE "forum_structure_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "forum_structure_state_singleton_check" CHECK ("forum_structure_state"."id" = 1),
	CONSTRAINT "forum_structure_state_version_check" CHECK ("forum_structure_state"."version" >= 0)
);
--> statement-breakpoint
ALTER TABLE "admin_history" DROP CONSTRAINT "admin_history_action_target_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "forum_categories" ADD COLUMN "sort_position" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_sections" ADD COLUMN "sort_position" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "location_version" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX "forum_categories_order_idx" ON "forum_categories" USING btree ("sort_position","id" COLLATE "C");
--> statement-breakpoint
CREATE INDEX "forum_sections_order_idx" ON "forum_sections" USING btree ("category_id","sort_position","id" COLLATE "C");
--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')
  or ("admin_history"."action" in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened', 'topic.hidden', 'topic.restored', 'topic.moved') and "admin_history"."target_type" = 'topic')
  or ("admin_history"."action" in ('post.sourceLocaleCorrected', 'post.hidden', 'post.restored') and "admin_history"."target_type" = 'post')
  or ("admin_history"."action" in ('measure.created', 'measure.changed', 'measure.lifted', 'measure.appealResolved')
    and "admin_history"."target_type" = 'user-measure')
  or ("admin_history"."action" in ('category.created', 'category.renamed', 'category.reordered') and "admin_history"."target_type" = 'category')
  or ("admin_history"."action" in ('section.created', 'section.renamed', 'section.moved', 'section.reordered') and "admin_history"."target_type" = 'section')
  or ("admin_history"."action" = 'settings.registrationChanged' and "admin_history"."target_type" = 'forum-settings'));
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.topic.title.editOwn', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.content.visibility.manage', 'forum.structure.manage', 'forum.topic.move', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'admin.users.read',
  'admin.users.blocks.manage', 'admin.users.blocks.managePrivileged', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));
--> statement-breakpoint
ALTER TABLE "forum_categories" ADD CONSTRAINT "forum_categories_sort_position_check" CHECK ("forum_categories"."sort_position" >= 0);
--> statement-breakpoint
ALTER TABLE "forum_sections" ADD CONSTRAINT "forum_sections_sort_position_check" CHECK ("forum_sections"."sort_position" >= 0);
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_location_version_check" CHECK ("forum_topics"."location_version" >= 0);
--> statement-breakpoint
-- Preserve the legacy ordinary (created_at,id) order without touching content metadata.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS position
  FROM "forum_categories" WHERE id <> 'help-solutions'
)
UPDATE "forum_categories" AS category SET sort_position = ordered.position
FROM ordered WHERE category.id = ordered.id;
--> statement-breakpoint
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY created_at, id) - 1 AS position
  FROM "forum_sections"
)
UPDATE "forum_sections" AS section SET sort_position = ordered.position
FROM ordered WHERE section.id = ordered.id;
--> statement-breakpoint
INSERT INTO "forum_structure_state" (id, version) VALUES (1, 0);
--> statement-breakpoint
INSERT INTO "authz_permissions" (key) VALUES ('forum.structure.manage'), ('forum.topic.move');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" (role_id, permission_key)
 SELECT id, 'forum.structure.manage' FROM "authz_roles" WHERE id = 'builtin-admin'
 ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "authz_role_permissions" (role_id, permission_key)
 SELECT id, 'forum.topic.move' FROM "authz_roles" WHERE id IN ('builtin-admin', 'builtin-moderator')
 ON CONFLICT DO NOTHING;
