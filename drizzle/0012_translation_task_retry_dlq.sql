ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_status_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_lifecycle_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "last_failure_code" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "failure_disposition" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_attempt_count_check" CHECK ("translation_tasks"."attempt_count" >= 0 and "translation_tasks"."attempt_count" <= "translation_tasks"."max_attempts");--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_max_attempts_check" CHECK ("translation_tasks"."max_attempts" > 0);--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_failure_code_check" CHECK ("translation_tasks"."last_failure_code" is null or "translation_tasks"."last_failure_code" ~ '^[a-z0-9][a-z0-9-]{0,63}$');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_failure_disposition_check" CHECK ("translation_tasks"."failure_disposition" is null or "translation_tasks"."failure_disposition" in ('terminal', 'retry-exhausted'));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_status_check" CHECK ("translation_tasks"."status" in ('pending', 'processing', 'stale', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_lifecycle_check" CHECK ((
        "translation_tasks"."status" = 'pending'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is null
        and "translation_tasks"."completed_at" is null and "translation_tasks"."failed_at" is null
        and "translation_tasks"."failure_disposition" is null
        and "translation_tasks"."attempt_count" < "translation_tasks"."max_attempts"
      ) or (
        "translation_tasks"."status" = 'processing'
        and "translation_tasks"."claim_token" is not null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is not null and "translation_tasks"."lease_expires_at" > "translation_tasks"."claimed_at"
        and "translation_tasks"."stale_at" is null and "translation_tasks"."completed_at" is null
        and "translation_tasks"."failed_at" is null and "translation_tasks"."failure_disposition" is null
      ) or (
        "translation_tasks"."status" = 'stale'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is not null
        and "translation_tasks"."stale_at" >= "translation_tasks"."claimed_at"
        and "translation_tasks"."completed_at" is null and "translation_tasks"."failed_at" is null
        and "translation_tasks"."failure_disposition" is null and "translation_tasks"."last_failure_code" is null
      ) or (
        "translation_tasks"."status" = 'completed'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is null
        and "translation_tasks"."completed_at" is not null and "translation_tasks"."completed_at" >= "translation_tasks"."claimed_at"
        and "translation_tasks"."failed_at" is null and "translation_tasks"."failure_disposition" is null
        and "translation_tasks"."last_failure_code" is null
      ) or (
        "translation_tasks"."status" = 'failed'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is null
        and "translation_tasks"."completed_at" is null and "translation_tasks"."failed_at" is not null
        and "translation_tasks"."failed_at" >= "translation_tasks"."claimed_at"
        and "translation_tasks"."failure_disposition" is not null and "translation_tasks"."last_failure_code" is not null
        and "translation_tasks"."attempt_count" > 0
      ));