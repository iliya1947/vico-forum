ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES ('forum.attachmentSecurity.read');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
  ('builtin-moderator', 'forum.attachmentSecurity.read'),
  ('builtin-admin', 'forum.attachmentSecurity.read');
