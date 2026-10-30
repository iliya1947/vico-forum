ALTER TABLE "forum_complaint_cases" DROP CONSTRAINT "complaint_case_previous_target_fk";
--> statement-breakpoint
ALTER TABLE "forum_complaint_cases" ADD CONSTRAINT "complaint_case_previous_fk" FOREIGN KEY ("previous_case_id") REFERENCES "public"."forum_complaint_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_reporter_created_idx" ON "forum_complaints" USING btree ("reporter_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_complaint_case_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.previous_case_id IS NOT NULL THEN
   PERFORM 1 FROM forum_complaint_cases pc
    JOIN forum_complaint_targets pt ON pt.id=pc.target_id
    JOIN forum_complaint_targets nt ON nt.id=NEW.target_id
    WHERE pc.id=NEW.previous_case_id AND pt.kind=nt.kind AND pt.topic_id=nt.topic_id
      AND pt.post_id IS NOT DISTINCT FROM nt.post_id
      AND (pc.target_id<>NEW.target_id OR pc.state='resolved')
    FOR SHARE OF pc;
   IF NOT FOUND THEN
    RAISE EXCEPTION 'previous case must belong to the same content; same-revision predecessor must be resolved' USING ERRCODE = '23514';
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
