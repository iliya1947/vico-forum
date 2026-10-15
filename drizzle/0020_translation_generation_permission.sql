ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.sourceLocale.correctOwn',
  'forum.sourceLocale.correctAny', 'forum.translation.generate',
  'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
 ('forum.translation.generate');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-user', 'forum.translation.generate'),
 ('builtin-moderator', 'forum.translation.generate'),
 ('builtin-admin', 'forum.translation.generate');
