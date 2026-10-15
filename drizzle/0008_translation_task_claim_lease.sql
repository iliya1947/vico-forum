ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_status_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "claim_token" uuid;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "stale_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_lifecycle_check" CHECK ((
        "translation_tasks"."status" = 'pending'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is null
      ) or (
        "translation_tasks"."status" = 'processing'
        and "translation_tasks"."claim_token" is not null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is not null and "translation_tasks"."lease_expires_at" > "translation_tasks"."claimed_at"
        and "translation_tasks"."stale_at" is null
      ) or (
        "translation_tasks"."status" = 'stale'
        and "translation_tasks"."claim_token" is null and "translation_tasks"."claimed_at" is not null
        and "translation_tasks"."lease_expires_at" is null and "translation_tasks"."stale_at" is not null
        and "translation_tasks"."stale_at" >= "translation_tasks"."claimed_at"
      ));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_status_check" CHECK ("translation_tasks"."status" in ('pending', 'processing', 'stale'));