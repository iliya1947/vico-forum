-- SET-02: independent new-account registration policy; both methods open by default.
CREATE TABLE "forum_registration_settings" (
  "id" integer PRIMARY KEY NOT NULL,
  "google_registration_enabled" boolean DEFAULT true NOT NULL,
  "email_registration_enabled" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT "forum_registration_settings_singleton_check" CHECK ("forum_registration_settings"."id" = 1),
  CONSTRAINT "forum_registration_settings_version_check" CHECK ("forum_registration_settings"."version" > 0)
);--> statement-breakpoint
INSERT INTO "forum_registration_settings" ("id") VALUES (1);--> statement-breakpoint

ALTER TABLE "admin_history" DROP CONSTRAINT "admin_history_action_target_check";--> statement-breakpoint
ALTER TABLE "admin_history" ADD CONSTRAINT "admin_history_action_target_check" CHECK ((
    "admin_history"."action" in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and "admin_history"."target_type" = 'role'
  ) or ("admin_history"."action" in ('user.roleAssigned', 'user.overrideChanged') and "admin_history"."target_type" = 'user')
  or ("admin_history"."action" in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened') and "admin_history"."target_type" = 'topic')
  or ("admin_history"."action" = 'post.sourceLocaleCorrected' and "admin_history"."target_type" = 'post')
  or ("admin_history"."action" in ('measure.created', 'measure.changed', 'measure.lifted', 'measure.appealResolved')
    and "admin_history"."target_type" = 'user-measure')
  or ("admin_history"."action" = 'settings.registrationChanged'
    and "admin_history"."target_type" = 'forum-settings'));--> statement-breakpoint
