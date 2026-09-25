ALTER TABLE "translation_tasks" ADD COLUMN "allowance_state" text;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_generation" integer;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_attempt" integer;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_claim_token" uuid;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_lease_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_retry_not_before" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_reason" text;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_reservation_reference" text;
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "allowance_updated_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "translation_tasks_allowance_recovery_idx" ON "translation_tasks" USING btree ("allowance_state","allowance_retry_not_before","allowance_lease_expires_at","updated_at","id");
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_allowance_reason_check" CHECK ("translation_tasks"."allowance_reason" is null or "translation_tasks"."allowance_reason" ~ '^[a-z0-9][a-z0-9-]{0,63}$');
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_allowance_reservation_check" CHECK ("translation_tasks"."allowance_reservation_reference" is null or "translation_tasks"."allowance_reservation_reference" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$');
--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_allowance_shape_check" CHECK (
  (
    "translation_tasks"."allowance_state" is null
    and "translation_tasks"."allowance_generation" is null
    and "translation_tasks"."allowance_attempt" is null
    and "translation_tasks"."allowance_claim_token" is null
    and "translation_tasks"."allowance_lease_expires_at" is null
    and "translation_tasks"."allowance_retry_not_before" is null
    and "translation_tasks"."allowance_reason" is null
    and "translation_tasks"."allowance_reservation_reference" is null
    and "translation_tasks"."allowance_updated_at" is null
  ) or (
    "translation_tasks"."translation_kind" in ('content-topic-title', 'content-post-body')
    and "translation_tasks"."allowance_generation" = "translation_tasks"."generation"
    and "translation_tasks"."allowance_attempt" = "translation_tasks"."attempt_count" + 1
    and "translation_tasks"."allowance_attempt" <= "translation_tasks"."max_attempts"
    and "translation_tasks"."allowance_updated_at" is not null
    and (
      (
        "translation_tasks"."allowance_state" = 'leasing'
        and "translation_tasks"."allowance_claim_token" is not null
        and "translation_tasks"."allowance_lease_expires_at" is not null
        and "translation_tasks"."allowance_lease_expires_at" > "translation_tasks"."allowance_updated_at"
        and "translation_tasks"."allowance_retry_not_before" is null
        and "translation_tasks"."allowance_reason" is null
        and "translation_tasks"."allowance_reservation_reference" is null
      ) or (
        "translation_tasks"."allowance_state" = 'admitted'
        and "translation_tasks"."allowance_claim_token" is null
        and "translation_tasks"."allowance_lease_expires_at" is null
        and "translation_tasks"."allowance_retry_not_before" is null
        and "translation_tasks"."allowance_reason" is null
      ) or (
        "translation_tasks"."allowance_state" = 'deferred'
        and "translation_tasks"."allowance_claim_token" is null
        and "translation_tasks"."allowance_lease_expires_at" is null
        and "translation_tasks"."allowance_retry_not_before" is not null
        and "translation_tasks"."allowance_retry_not_before" > "translation_tasks"."allowance_updated_at"
        and "translation_tasks"."allowance_reason" is not null
        and "translation_tasks"."allowance_reservation_reference" is null
      )
    )
  )
);
