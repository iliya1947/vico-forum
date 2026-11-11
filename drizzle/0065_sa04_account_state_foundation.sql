-- SA-04 A1: nullable server-owned account-state tuple, no activation or backfill.
ALTER TABLE "user" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deactivated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "retain_at_least_until" timestamp with time zone;--> statement-breakpoint
-- Compute the minimum calendar year in UTC, independent of the session TimeZone.
ALTER TABLE "user" ADD CONSTRAINT "user_deactivation_state_check" CHECK (
    ("user"."deactivated_at" is null and "user"."deactivated_by_user_id" is null
      and "user"."retain_at_least_until" is null)
    or (
      "user"."deactivated_at" is not null and "user"."deactivated_by_user_id" is not null
      and btrim("user"."deactivated_by_user_id", chr(32) || chr(9) || chr(10) || chr(13) || chr(12) || chr(11)) <> ''
      and "user"."retain_at_least_until" is not null
      and ("user"."retain_at_least_until" at time zone 'UTC') >=
        (("user"."deactivated_at" at time zone 'UTC') + interval '1 year')
    )
  );
