-- SA-03: target-scoped chronological reads, no new relation or application privileges.
-- Existing global/position indexes do not support a target-prefix timeline read.
CREATE INDEX "owner_events_actor_occurred_idx" ON "owner_events"
  USING btree ("actor_user_id", "occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_events_target_occurred_idx" ON "owner_events"
  USING btree ("target_user_id", "occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_attempt_patterns_actor_admitted_idx" ON "owner_attempt_patterns"
  USING btree ("actor_user_id", "admitted_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_attachment_security_events_uploader_created_idx" ON "forum_attachment_security_events"
  USING btree ("uploaded_by_user_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_history_actor_occurred_idx" ON "admin_history"
  USING btree ("actor_id", "occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_history_target_occurred_idx" ON "admin_history"
  USING btree ("target_type", "target_id", "occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);
