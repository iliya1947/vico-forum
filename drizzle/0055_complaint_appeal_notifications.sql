CREATE UNIQUE INDEX "complaint_appeal_single_pending_idx" ON "forum_complaint_appeals" USING btree ("decision_id") WHERE "forum_complaint_appeals"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD COLUMN "complaint_appeal_id" text;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" DROP CONSTRAINT "forum_reply_notifications_kind_check";--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_kind_check" CHECK (
 (kind IN ('reply','mention') AND actor_user_id IS NOT NULL AND topic_id IS NOT NULL AND post_id IS NOT NULL AND complaint_decision_id IS NULL AND complaint_appeal_id IS NULL)
 OR (kind='complaint-decision' AND complaint_decision_id IS NOT NULL AND complaint_appeal_id IS NULL AND actor_user_id IS NULL AND topic_id IS NULL AND post_id IS NULL)
 OR (kind='complaint-appeal-result' AND complaint_appeal_id IS NOT NULL AND complaint_decision_id IS NULL AND actor_user_id IS NULL AND topic_id IS NULL AND post_id IS NULL)
);--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_appeal_fk"
 FOREIGN KEY ("complaint_appeal_id") REFERENCES "public"."forum_complaint_appeals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_notifications" ADD CONSTRAINT "forum_reply_notifications_recipient_appeal_unique" UNIQUE ("recipient_user_id","complaint_appeal_id");--> statement-breakpoint
INSERT INTO forum_reply_notifications(id,recipient_user_id,complaint_appeal_id,kind,created_at)
SELECT gen_random_uuid()::text,recipients.user_id,a.id,'complaint-appeal-result',a.resolved_at
FROM forum_complaint_appeals a
JOIN forum_complaint_cases c ON c.id=a.case_id AND c.initial_decision_id=a.decision_id
JOIN forum_complaint_targets t ON t.id=c.target_id
CROSS JOIN LATERAL (
 SELECT t.affected_author_id AS user_id
 UNION
 SELECT r.reporter_user_id FROM forum_complaints r WHERE r.case_id=c.id
) recipients
WHERE a.status='resolved' AND a.resolved_at IS NOT NULL
ON CONFLICT ("recipient_user_id","complaint_appeal_id") DO NOTHING;
