CREATE TABLE "forum_complaint_appeals" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"decision_id" text NOT NULL,
	"appellant_user_id" text NOT NULL,
	"side" text NOT NULL,
	"argument" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"outcome" text,
	"reasoning" text,
	"reviewer_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "complaint_appeal_ordinal_unique" UNIQUE("decision_id","ordinal"),
	CONSTRAINT "complaint_appeal_owner_unique" UNIQUE("case_id","id"),
	CONSTRAINT "complaint_appeal_ordinal_check" CHECK ("forum_complaint_appeals"."ordinal" between 1 and 3),
	CONSTRAINT "complaint_appeal_side_check" CHECK ("forum_complaint_appeals"."side" in ('author','reporter')),
	CONSTRAINT "complaint_appeal_argument_check" CHECK (btrim("forum_complaint_appeals"."argument") <> '' and char_length("forum_complaint_appeals"."argument") <= 2000),
	CONSTRAINT "complaint_appeal_lifecycle_check" CHECK (("forum_complaint_appeals"."status" = 'pending' and "forum_complaint_appeals"."outcome" is null and "forum_complaint_appeals"."reasoning" is null and "forum_complaint_appeals"."reviewer_user_id" is null and "forum_complaint_appeals"."resolved_at" is null) or ("forum_complaint_appeals"."status" = 'resolved' and "forum_complaint_appeals"."outcome" is not null and "forum_complaint_appeals"."outcome" in ('upheld','overturned') and "forum_complaint_appeals"."reasoning" is not null and btrim("forum_complaint_appeals"."reasoning") <> '' and char_length("forum_complaint_appeals"."reasoning") <= 10000 and "forum_complaint_appeals"."reviewer_user_id" is not null and "forum_complaint_appeals"."resolved_at" is not null and "forum_complaint_appeals"."resolved_at" >= "forum_complaint_appeals"."created_at"))
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"target_id" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"initial_decision_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "complaint_case_target_unique" UNIQUE("id","target_id"),
	CONSTRAINT "complaint_case_lifecycle" CHECK ("forum_complaint_cases"."version" > 0 and (("forum_complaint_cases"."state" = 'open' and "forum_complaint_cases"."initial_decision_id" is null and "forum_complaint_cases"."resolved_at" is null) or ("forum_complaint_cases"."state" = 'resolved' and "forum_complaint_cases"."initial_decision_id" is not null and "forum_complaint_cases"."resolved_at" is not null and "forum_complaint_cases"."resolved_at" >= "forum_complaint_cases"."created_at")))
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"outcome" text NOT NULL,
	"reviewer_user_id" text NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_decision_case_unique" UNIQUE("case_id"),
	CONSTRAINT "complaint_decision_owner_unique" UNIQUE("case_id","id"),
	CONSTRAINT "complaint_decision_outcome_check" CHECK ("forum_complaint_decisions"."outcome" in ('confirmed','not-confirmed')),
	CONSTRAINT "complaint_decision_reasoning_check" CHECK (btrim("forum_complaint_decisions"."reasoning") <> '' and char_length("forum_complaint_decisions"."reasoning") <= 10000)
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_events" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"kind" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"complaint_id" text,
	"decision_id" text,
	"note_id" text,
	"appeal_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_event_operation_unique" UNIQUE("actor_user_id","operation_id"),
	CONSTRAINT "complaint_event_fingerprint_check" CHECK ("forum_complaint_events"."fingerprint" ~ '^[0-9a-f]{64}$' and btrim("forum_complaint_events"."operation_id") <> '' and char_length("forum_complaint_events"."operation_id") <= 200),
	CONSTRAINT "complaint_event_shape_check" CHECK (("forum_complaint_events"."kind" = 'submitted' and "forum_complaint_events"."complaint_id" is not null and "forum_complaint_events"."decision_id" is null and "forum_complaint_events"."note_id" is null and "forum_complaint_events"."appeal_id" is null) or ("forum_complaint_events"."kind" = 'decided' and "forum_complaint_events"."decision_id" is not null and "forum_complaint_events"."complaint_id" is null and "forum_complaint_events"."note_id" is null and "forum_complaint_events"."appeal_id" is null) or ("forum_complaint_events"."kind" = 'noted' and "forum_complaint_events"."note_id" is not null and "forum_complaint_events"."complaint_id" is null and "forum_complaint_events"."decision_id" is null and "forum_complaint_events"."appeal_id" is null) or ("forum_complaint_events"."kind" in ('appealed','appeal-resolved') and "forum_complaint_events"."appeal_id" is not null and "forum_complaint_events"."complaint_id" is null and "forum_complaint_events"."decision_id" is null and "forum_complaint_events"."note_id" is null))
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_evidence_attachments" (
	"target_id" text NOT NULL,
	"attachment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_evidence_pk" PRIMARY KEY("target_id","attachment_id")
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_note_owner_unique" UNIQUE("case_id","id"),
	CONSTRAINT "complaint_note_body_check" CHECK (btrim("forum_complaint_notes"."body") <> '' and char_length("forum_complaint_notes"."body") <= 10000)
);
--> statement-breakpoint
CREATE TABLE "forum_complaint_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"topic_id" text NOT NULL,
	"post_id" text,
	"post_revision_id" text,
	"title_revision_id" text,
	"affected_author_id" text NOT NULL,
	CONSTRAINT "complaint_target_shape" CHECK (("forum_complaint_targets"."kind" = 'post' and "forum_complaint_targets"."post_id" is not null and "forum_complaint_targets"."post_revision_id" is not null and "forum_complaint_targets"."title_revision_id" is null) or ("forum_complaint_targets"."kind" = 'topic-title' and "forum_complaint_targets"."post_id" is null and "forum_complaint_targets"."post_revision_id" is null and "forum_complaint_targets"."title_revision_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "forum_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"target_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_reporter_target_unique" UNIQUE("reporter_user_id","target_id"),
	CONSTRAINT "complaint_case_id_unique" UNIQUE("case_id","id"),
	CONSTRAINT "complaint_reason_check" CHECK ("forum_complaints"."reason" in ('spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other')),
	CONSTRAINT "complaint_explanation_check" CHECK (("forum_complaints"."explanation" is null or (btrim("forum_complaints"."explanation") <> '' and char_length("forum_complaints"."explanation") <= 2000)) and ("forum_complaints"."reason" <> 'other' or "forum_complaints"."explanation" is not null))
);
--> statement-breakpoint
ALTER TABLE "authz_permissions" DROP CONSTRAINT "authz_permissions_catalog_check";--> statement-breakpoint
ALTER TABLE "forum_complaint_appeals" ADD CONSTRAINT "forum_complaint_appeals_appellant_user_id_user_id_fk" FOREIGN KEY ("appellant_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_appeals" ADD CONSTRAINT "forum_complaint_appeals_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_appeals" ADD CONSTRAINT "complaint_appeal_decision_fk" FOREIGN KEY ("case_id","decision_id") REFERENCES "public"."forum_complaint_decisions"("case_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_cases" ADD CONSTRAINT "forum_complaint_cases_target_id_forum_complaint_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."forum_complaint_targets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_decisions" ADD CONSTRAINT "forum_complaint_decisions_case_id_forum_complaint_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."forum_complaint_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_decisions" ADD CONSTRAINT "forum_complaint_decisions_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "forum_complaint_events_case_id_forum_complaint_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."forum_complaint_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "forum_complaint_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "complaint_event_report_fk" FOREIGN KEY ("case_id","complaint_id") REFERENCES "public"."forum_complaints"("case_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "complaint_event_decision_fk" FOREIGN KEY ("case_id","decision_id") REFERENCES "public"."forum_complaint_decisions"("case_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "complaint_event_note_fk" FOREIGN KEY ("case_id","note_id") REFERENCES "public"."forum_complaint_notes"("case_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_events" ADD CONSTRAINT "complaint_event_appeal_fk" FOREIGN KEY ("case_id","appeal_id") REFERENCES "public"."forum_complaint_appeals"("case_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_evidence_attachments" ADD CONSTRAINT "forum_complaint_evidence_attachments_target_id_forum_complaint_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."forum_complaint_targets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_evidence_attachments" ADD CONSTRAINT "forum_complaint_evidence_attachments_attachment_id_forum_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."forum_attachments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_notes" ADD CONSTRAINT "forum_complaint_notes_case_id_forum_complaint_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."forum_complaint_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_notes" ADD CONSTRAINT "forum_complaint_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_targets" ADD CONSTRAINT "forum_complaint_targets_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_targets" ADD CONSTRAINT "forum_complaint_targets_affected_author_id_user_id_fk" FOREIGN KEY ("affected_author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_targets" ADD CONSTRAINT "complaint_target_post_topic_fk" FOREIGN KEY ("topic_id","post_id") REFERENCES "public"."forum_posts"("topic_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_targets" ADD CONSTRAINT "complaint_target_post_revision_fk" FOREIGN KEY ("post_id","post_revision_id") REFERENCES "public"."forum_post_revisions"("post_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaint_targets" ADD CONSTRAINT "complaint_target_title_revision_fk" FOREIGN KEY ("topic_id","title_revision_id") REFERENCES "public"."forum_topic_title_revisions"("topic_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaints" ADD CONSTRAINT "forum_complaints_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_complaints" ADD CONSTRAINT "complaint_case_target_fk" FOREIGN KEY ("case_id","target_id") REFERENCES "public"."forum_complaint_cases"("id","target_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_appeal_pending_idx" ON "forum_complaint_appeals" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_case_open_target_unique" ON "forum_complaint_cases" USING btree ("target_id") WHERE "forum_complaint_cases"."state" = 'open';--> statement-breakpoint
CREATE INDEX "complaint_case_state_created_idx" ON "forum_complaint_cases" USING btree ("state","created_at","id");--> statement-breakpoint
CREATE INDEX "complaint_event_case_created_idx" ON "forum_complaint_events" USING btree ("case_id","created_at","id");--> statement-breakpoint
CREATE INDEX "complaint_evidence_attachment_idx" ON "forum_complaint_evidence_attachments" USING btree ("attachment_id");--> statement-breakpoint
CREATE INDEX "complaint_note_case_created_idx" ON "forum_complaint_notes" USING btree ("case_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_target_post_unique" ON "forum_complaint_targets" USING btree ("post_id","post_revision_id") WHERE "forum_complaint_targets"."kind" = 'post';--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_target_title_unique" ON "forum_complaint_targets" USING btree ("topic_id","title_revision_id") WHERE "forum_complaint_targets"."kind" = 'topic-title';--> statement-breakpoint
CREATE INDEX "complaint_case_created_idx" ON "forum_complaints" USING btree ("case_id","created_at","id");--> statement-breakpoint
ALTER TABLE "authz_permissions" ADD CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review'
));--> statement-breakpoint
ALTER TABLE forum_complaint_cases ADD CONSTRAINT complaint_case_initial_decision_fk
  FOREIGN KEY (id, initial_decision_id) REFERENCES forum_complaint_decisions(case_id,id)
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
INSERT INTO authz_permissions(key) VALUES
 ('forum.complaint.create'), ('forum.complaint.review'),
 ('forum.complaint.reporterIdentity.read'), ('forum.complaint.appeal.review');
--> statement-breakpoint
INSERT INTO authz_role_permissions(role_id,permission_key) VALUES
 ('builtin-user','forum.complaint.create'),
 ('builtin-moderator','forum.complaint.create'),
 ('builtin-moderator','forum.complaint.review'),
 ('builtin-moderator','forum.complaint.appeal.review'),
 ('builtin-admin','forum.complaint.create'),
 ('builtin-admin','forum.complaint.review'),
 ('builtin-admin','forum.complaint.appeal.review');
--> statement-breakpoint
CREATE FUNCTION reject_complaint_evidence_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'complaint evidence and history are append-only' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER complaint_targets_immutable BEFORE UPDATE OR DELETE ON forum_complaint_targets
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaints_immutable BEFORE UPDATE OR DELETE ON forum_complaints
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaint_decisions_immutable BEFORE UPDATE OR DELETE ON forum_complaint_decisions
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaint_notes_immutable BEFORE UPDATE OR DELETE ON forum_complaint_notes
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaint_events_immutable BEFORE UPDATE OR DELETE ON forum_complaint_events
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaint_evidence_immutable BEFORE UPDATE OR DELETE ON forum_complaint_evidence_attachments
 FOR EACH ROW EXECUTE FUNCTION reject_complaint_evidence_change();
--> statement-breakpoint
CREATE TRIGGER complaint_evidence_active_gate BEFORE INSERT ON forum_complaint_evidence_attachments
 FOR EACH ROW EXECUTE FUNCTION forum_attachment_require_active_ref();
--> statement-breakpoint
CREATE FUNCTION guard_complaint_appeal_resolution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  RAISE EXCEPTION 'appeal history is retained' USING ERRCODE = '55000';
 END IF;
 IF OLD.status <> 'pending' OR NEW.status <> 'resolved' OR
    (NEW.id,NEW.case_id,NEW.decision_id,NEW.appellant_user_id,NEW.side,NEW.argument,NEW.ordinal,NEW.created_at)
    IS DISTINCT FROM
    (OLD.id,OLD.case_id,OLD.decision_id,OLD.appellant_user_id,OLD.side,OLD.argument,OLD.ordinal,OLD.created_at) THEN
  RAISE EXCEPTION 'appeal evidence is immutable' USING ERRCODE = '55000';
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER complaint_appeals_resolution_guard BEFORE UPDATE OR DELETE ON forum_complaint_appeals
 FOR EACH ROW EXECUTE FUNCTION guard_complaint_appeal_resolution();
--> statement-breakpoint
CREATE FUNCTION guard_complaint_case_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id,NEW.target_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.target_id,OLD.created_at) THEN
  RAISE EXCEPTION 'case target identity is immutable' USING ERRCODE = '55000';
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER complaint_case_identity_guard BEFORE UPDATE ON forum_complaint_cases
 FOR EACH ROW EXECUTE FUNCTION guard_complaint_case_identity();
