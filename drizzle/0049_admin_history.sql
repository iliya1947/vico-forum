CREATE TABLE "admin_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
	"actor_id" text NOT NULL,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"target_label" text NOT NULL,
	"context" jsonb NOT NULL,
	"reason" text,
	CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')),
	CONSTRAINT "admin_history_context_check" CHECK (jsonb_typeof("admin_history"."context") = 'object' and octet_length("admin_history"."context"::text) <= 16384),
	CONSTRAINT "admin_history_labels_check" CHECK (char_length("admin_history"."actor_label") <= 200 and char_length("admin_history"."target_label") <= 200),
	CONSTRAINT "admin_history_reason_check" CHECK ("admin_history"."reason" is null or (char_length("admin_history"."reason") <= 2000 and btrim("admin_history"."reason") <> ''))
);
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
CREATE INDEX "admin_history_order_idx" ON "admin_history" USING btree ("occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('admin.history.read');
--> statement-breakpoint
-- Explicit initial grant to built-in admin only; retain existing grants/overrides.
INSERT INTO "authz_role_permissions" ("role_id", "permission_key")
SELECT "id", 'admin.history.read' FROM "authz_roles" WHERE "slug" = 'admin';
