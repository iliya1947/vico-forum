ALTER TABLE "forum_attachments"
  ADD COLUMN "cleanup_status" text DEFAULT 'active' NOT NULL,
  ADD COLUMN "cleanup_claim_token" text,
  ADD COLUMN "cleanup_claimed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_cleanup_status_check"
  CHECK ("cleanup_status" IN ('active', 'deleting'));
--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_cleanup_claim_check"
  CHECK (
    ("cleanup_status" = 'active' AND "cleanup_claim_token" IS NULL AND "cleanup_claimed_at" IS NULL)
    OR
    ("cleanup_status" = 'deleting' AND "cleanup_claim_token" IS NOT NULL AND "cleanup_claimed_at" IS NOT NULL)
  );
--> statement-breakpoint
CREATE INDEX "forum_attachments_cleanup_queue_idx"
  ON "forum_attachments" USING btree ("cleanup_status", "created_at");
--> statement-breakpoint
-- Reference insertion must serialize with a cleanup claim, including writers
-- that have not yet acquired the ordinary foreign-key FOR KEY SHARE lock.
CREATE FUNCTION "forum_attachment_require_active_ref"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $attachment_claim$
DECLARE current_status text;
BEGIN
  -- The trigger's table schema is the only identifier, quoted as an identifier.
  -- The owner-held row lock avoids granting web-role UPDATE on asset metadata.
  EXECUTE format('SELECT cleanup_status FROM %I.forum_attachments WHERE id = $1 FOR SHARE', TG_TABLE_SCHEMA)
    INTO current_status USING NEW.attachment_id;
  IF current_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'attachment is not available for a new reference'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$attachment_claim$;
--> statement-breakpoint
CREATE TRIGGER "forum_attachment_draft_refs_active_gate"
  BEFORE INSERT OR UPDATE OF "attachment_id"
  ON "forum_attachment_draft_refs"
  FOR EACH ROW EXECUTE FUNCTION "forum_attachment_require_active_ref"();
--> statement-breakpoint
CREATE TRIGGER "forum_post_attachments_active_gate"
  BEFORE INSERT OR UPDATE OF "attachment_id"
  ON "forum_post_attachments"
  FOR EACH ROW EXECUTE FUNCTION "forum_attachment_require_active_ref"();
