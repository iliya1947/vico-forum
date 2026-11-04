ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'admin.users.read', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('admin.users.read');--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key")
SELECT "id", 'admin.users.read' FROM "authz_roles" WHERE "id" = 'builtin-admin'
ON CONFLICT DO NOTHING;
