ALTER TABLE "forum_reply_notifications" ADD COLUMN "complaint_decision_id" text;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ALTER COLUMN "actor_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ALTER COLUMN "topic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ALTER COLUMN "post_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" DROP CONSTRAINT "forum_reply_notifications_kind_check";--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_kind_check" CHECK (
  (kind in ('reply','mention') and actor_user_id is not null and topic_id is not null and post_id is not null and complaint_decision_id is null)
  or (kind='complaint-decision' and complaint_decision_id is not null and actor_user_id is null and topic_id is null and post_id is null)
);--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_complaint_decision_id_forum_complaint_decisions_id_fk"
  FOREIGN KEY ("complaint_decision_id") REFERENCES "public"."forum_complaint_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_recipient_decision_unique" UNIQUE("recipient_user_id","complaint_decision_id");--> statement-breakpoint
CREATE INDEX "complaint_case_history_idx" ON "forum_complaint_cases" USING btree ("resolved_at" DESC,"id" DESC) WHERE "forum_complaint_cases"."state" = 'resolved';--> statement-breakpoint
ALTER TABLE "forum_complaint_events" DROP CONSTRAINT "complaint_event_shape_check";--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "complaint_event_shape_check" CHECK (
  (kind='submitted' and complaint_id is not null and decision_id is null and note_id is null and appeal_id is null)
  or (kind='decided' and decision_id is not null and complaint_id is null and note_id is null and appeal_id is null)
  or (kind='noted' and note_id is not null and complaint_id is null and decision_id is null and appeal_id is null)
  or (kind in ('appealed','appeal-resolved') and appeal_id is not null and complaint_id is null and decision_id is null and note_id is null)
  or (kind in ('priority-changed','review-started') and complaint_id is null and decision_id is null and note_id is null and appeal_id is null)
);--> statement-breakpoint
INSERT INTO forum_reply_notifications (id,recipient_user_id,complaint_decision_id,kind,created_at)
SELECT gen_random_uuid()::text, recipients.user_id,d.id,'complaint-decision',d.created_at
FROM forum_complaint_decisions d
JOIN forum_complaint_cases c ON c.id=d.case_id
JOIN forum_complaint_targets t ON t.id=c.target_id
CROSS JOIN LATERAL (
 SELECT t.affected_author_id AS user_id
 UNION
 SELECT r.reporter_user_id FROM forum_complaints r WHERE r.case_id=c.id
) recipients
WHERE c.initial_decision_id=d.id
ON CONFLICT ("recipient_user_id","complaint_decision_id") DO NOTHING;
