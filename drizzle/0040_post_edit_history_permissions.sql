ALTER TABLE "forum_posts" ADD COLUMN "edited_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";
--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin',
  'forum.solution.manageOwn', 'forum.solution.manageAny',
  'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.sourceLocale.correctOwn',
  'forum.sourceLocale.correctAny', 'forum.translation.generate',
  'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage'
));
--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
 ('forum.post.editOwn'), ('forum.post.history.read');
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-user', 'forum.post.editOwn'),
 ('builtin-moderator', 'forum.post.editOwn'),
 ('builtin-moderator', 'forum.post.history.read'),
 ('builtin-admin', 'forum.post.editOwn'),
 ('builtin-admin', 'forum.post.history.read');
