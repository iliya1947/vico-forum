CREATE TABLE "content_translation_allowance_admissions" (
  "task_id" uuid PRIMARY KEY NOT NULL,
  "translation_kind" text NOT NULL,
  "generation" integer NOT NULL,
  "attempt_number" integer NOT NULL,
  "state" text NOT NULL,
  "claim_token" uuid,
  "claimed_at" timestamp with time zone,
  "lease_expires_at" timestamp with time zone,
  "retry_not_before" timestamp with time zone,
  "reason" text,
  "reservation_reference" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "content_translation_allowance_admissions_kind_check"
    CHECK ("translation_kind" in ('content-topic-title', 'content-post-body')),
  CONSTRAINT "content_translation_allowance_admissions_generation_check"
    CHECK ("generation" > 0),
  CONSTRAINT "content_translation_allowance_admissions_attempt_check"
    CHECK ("attempt_number" > 0),
  CONSTRAINT "content_translation_allowance_admissions_state_check"
    CHECK ("state" in ('leased', 'admitted', 'deferred')),
  CONSTRAINT "content_translation_allowance_admissions_reason_check"
    CHECK ("reason" is null or "reason" similar to '[a-z0-9][a-z0-9-]{0,63}'),
  CONSTRAINT "content_translation_allowance_admissions_reservation_check"
    CHECK ("reservation_reference" is null
      or (char_length("reservation_reference") between 1 and 256
        and btrim("reservation_reference") = "reservation_reference")),
  CONSTRAINT "content_translation_allowance_admissions_lifecycle_check"
    CHECK ((
      "state" = 'leased'
      and "claim_token" is not null
      and "claimed_at" is not null
      and "lease_expires_at" is not null
      and "lease_expires_at" > "claimed_at"
      and "retry_not_before" is null
      and "reason" is null
      and "reservation_reference" is null
    ) or (
      "state" = 'admitted'
      and "claim_token" is null
      and "claimed_at" is null
      and "lease_expires_at" is null
      and "retry_not_before" is null
      and "reason" is null
    ) or (
      "state" = 'deferred'
      and "claim_token" is null
      and "claimed_at" is null
      and "lease_expires_at" is null
      and "retry_not_before" is not null
      and "reason" is not null
      and "reservation_reference" is null
    )),
  CONSTRAINT "content_translation_allowance_admissions_timestamps_check"
    CHECK ("updated_at" >= "created_at")
);
--> statement-breakpoint
ALTER TABLE "translation_tasks"
  ADD CONSTRAINT "translation_tasks_kind_owner_unique" UNIQUE("id", "translation_kind");
--> statement-breakpoint
ALTER TABLE "content_translation_allowance_admissions"
  ADD CONSTRAINT "content_translation_allowance_admissions_task_owner_fk"
  FOREIGN KEY ("task_id", "translation_kind")
  REFERENCES "public"."translation_tasks"("id", "translation_kind")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_translation_allowance_admissions_recovery_idx"
  ON "content_translation_allowance_admissions"
  USING btree ("state", "retry_not_before", "lease_expires_at", "updated_at", "task_id");
