CREATE TABLE "forum_complaint_priority_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"weights" jsonb NOT NULL,
	CONSTRAINT "complaint_priority_settings_singleton" CHECK ("forum_complaint_priority_settings"."id" = 1),
	CONSTRAINT "complaint_priority_settings_version" CHECK ("forum_complaint_priority_settings"."version" > 0),
	CONSTRAINT "complaint_priority_settings_weights" CHECK (jsonb_typeof("forum_complaint_priority_settings"."weights") = 'object'
    and "forum_complaint_priority_settings"."weights" - array['spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other'] = '{}'::jsonb
    and "forum_complaint_priority_settings"."weights"->'spam' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'harassment' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'threats' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'fraud-phishing' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'malicious-content' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'personal-data' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'impersonation' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights"->'other' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and "forum_complaint_priority_settings"."weights" ?& array['spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other'])
);
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
));
--> statement-breakpoint
INSERT INTO forum_complaint_priority_settings(id,weights) VALUES (1,
  '{"spam":1,"harassment":2,"threats":3,"fraud-phishing":3,"malicious-content":3,"personal-data":3,"impersonation":2,"other":1}'::jsonb);
--> statement-breakpoint
INSERT INTO authz_permissions(key) VALUES ('forum.complaint.priority.manage');
--> statement-breakpoint
INSERT INTO authz_role_permissions(role_id,permission_key)
  SELECT id,'forum.complaint.priority.manage' FROM authz_roles WHERE id='builtin-admin';
