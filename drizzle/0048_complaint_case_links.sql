ALTER TABLE "forum_complaint_cases" ADD COLUMN "previous_case_id" text;--> statement-breakpoint
ALTER TABLE "forum_complaint_cases" ADD CONSTRAINT "complaint_case_previous_target_fk" FOREIGN KEY ("previous_case_id","target_id") REFERENCES "public"."forum_complaint_cases"("id","target_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_case_target_resolved_idx" ON "forum_complaint_cases" USING btree ("target_id","resolved_at" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "forum_complaint_cases"."state" = 'resolved';--> statement-breakpoint
ALTER TABLE "forum_complaint_cases" ADD CONSTRAINT "complaint_case_previous_not_self" CHECK ("forum_complaint_cases"."previous_case_id" is null or "forum_complaint_cases"."previous_case_id" <> "forum_complaint_cases"."id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_complaint_case_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.previous_case_id IS NOT NULL THEN
   PERFORM 1 FROM forum_complaint_cases
    WHERE id = NEW.previous_case_id AND target_id = NEW.target_id AND state = 'resolved'
    FOR SHARE;
   IF NOT FOUND THEN
    RAISE EXCEPTION 'previous case must be resolved for the same target' USING ERRCODE = '23514';
   END IF;
  END IF;
 ELSE
  IF (NEW.id,NEW.target_id,NEW.previous_case_id,NEW.created_at)
     IS DISTINCT FROM (OLD.id,OLD.target_id,OLD.previous_case_id,OLD.created_at) THEN
   RAISE EXCEPTION 'case target identity is immutable' USING ERRCODE = '55000';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER complaint_case_previous_guard BEFORE INSERT ON forum_complaint_cases
 FOR EACH ROW EXECUTE FUNCTION guard_complaint_case_identity();
