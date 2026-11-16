-- SA06 source/person chronological access paths; no new tables, writers or privileges.
CREATE INDEX "owner_events_scope_time_idx" ON "owner_events" USING btree ("monitor_key", "occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_observations_scope_time_idx" ON "owner_monitor_observations" USING btree ("monitor_key", "resource_scope", "observed_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_topic_title_revisions_time_idx" ON "forum_topic_title_revisions" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_topic_title_revisions_author_time_idx" ON "forum_topic_title_revisions" USING btree ("author_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_post_revisions_time_idx" ON "forum_post_revisions" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_post_revisions_author_time_idx" ON "forum_post_revisions" USING btree ("author_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "measure_appeals_time_idx" ON "user_measure_appeals" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "measure_appeals_subject_time_idx" ON "user_measure_appeals" USING btree ("subject_user_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "measure_appeals_moot_time_idx" ON "user_measure_appeals" USING btree ("resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status='moot' AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "measure_appeals_moot_subject_time_idx" ON "user_measure_appeals" USING btree ("subject_user_id", "resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status='moot' AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "measure_appeals_moot_measure_time_idx" ON "user_measure_appeals" USING btree ("measure_id", "resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status='moot' AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "user_measures_lift_actor_idx" ON "user_measures" USING btree ("lifted_by_user_id", "id") WHERE lifted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "complaint_events_time_idx" ON "forum_complaint_events" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "complaint_events_actor_time_idx" ON "forum_complaint_events" USING btree ("actor_user_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "help_signals_time_idx" ON "forum_help_signals" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "duplicate_appeals_time_idx" ON "forum_help_duplicate_appeals" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "duplicate_appeals_appellant_time_idx" ON "forum_help_duplicate_appeals" USING btree ("appellant_user_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "complaint_targets_affected_idx" ON "forum_complaint_targets" USING btree ("affected_author_id", "id");--> statement-breakpoint
CREATE INDEX "complaint_cases_target_all_idx" ON "forum_complaint_cases" USING btree ("target_id", "id");--> statement-breakpoint
CREATE INDEX "help_signals_terminal_time_idx" ON "forum_help_signals" USING btree ("resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status IN ('withdrawn','superseded') AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "help_signals_terminal_resolver_time_idx" ON "forum_help_signals" USING btree ("resolved_by_user_id", "resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status IN ('withdrawn','superseded') AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "help_signals_terminal_submitter_time_idx" ON "forum_help_signals" USING btree ("submitted_by_user_id", "resolved_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE status IN ('withdrawn','superseded') AND resolved_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "admin_history_signal_direct_review_idx" ON "admin_history" USING btree ((context ->> 'signalId'), "target_id") WHERE action='help.signalReviewed' AND target_type='topic';--> statement-breakpoint
CREATE INDEX "notification_created_time_idx" ON "forum_reply_notifications" USING btree ("created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notification_read_time_idx" ON "forum_reply_notifications" USING btree ("read_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE read_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_actor_time_idx" ON "forum_reply_notifications" USING btree ("actor_user_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE actor_user_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_recipient_read_time_idx" ON "forum_reply_notifications" USING btree ("recipient_user_id", "read_at" DESC NULLS LAST, "id" DESC NULLS LAST) WHERE read_at IS NOT NULL;
