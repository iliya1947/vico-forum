ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.sourceLocale.correctOwn',
  'forum.sourceLocale.correctAny', 'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
 ('forum.sourceLocale.correctOwn'),
 ('forum.sourceLocale.correctAny');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-user', 'forum.sourceLocale.correctOwn'),
 ('builtin-moderator', 'forum.sourceLocale.correctOwn'),
 ('builtin-moderator', 'forum.sourceLocale.correctAny'),
 ('builtin-admin', 'forum.sourceLocale.correctOwn'),
 ('builtin-admin', 'forum.sourceLocale.correctAny');
