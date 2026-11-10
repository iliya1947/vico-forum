-- SA-02: finite source attribution admission for each DB-assigned UTC recording hour.
-- Past epochs remain retained; creating a new epoch does not delete or reset old records.
-- No trigger/procedure changes to SA-01 append-only relations and no production grants.
CREATE TABLE "owner_attempt_patterns" (
  "id" uuid PRIMARY KEY NOT NULL,
  "recording_epoch_start" timestamp (3) with time zone NOT NULL,
  "admitted_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "pool" text NOT NULL,
  "actor_user_id" text,
  "network_ip" inet,
  "network_quality" text NOT NULL,
  "surface" text NOT NULL,
  "operation" text NOT NULL,
  "outcome" text NOT NULL,
  "http_status" integer,
  "direct_code" text,
  "first_occurred_at" timestamp (3) with time zone NOT NULL,
  "last_occurred_at" timestamp (3) with time zone NOT NULL,
  "count" bigint DEFAULT 1 NOT NULL,
  "saturated_count" boolean DEFAULT false NOT NULL,
  CONSTRAINT "owner_attempt_patterns_epoch_identity_unique" UNIQUE NULLS NOT DISTINCT
    ("recording_epoch_start", "pool", "actor_user_id", "network_ip", "network_quality",
     "surface", "operation", "outcome", "http_status", "direct_code"),
  CONSTRAINT "owner_attempt_patterns_epoch_check" CHECK
    ("recording_epoch_start" = date_trunc('hour', "recording_epoch_start", 'UTC')),
  CONSTRAINT "owner_attempt_patterns_source_check" CHECK (
    ("pool" = 'authenticated' AND "actor_user_id" IS NOT NULL)
    OR ("pool" = 'anonymous' AND "actor_user_id" IS NULL AND "network_ip" IS NOT NULL)
  ),
  CONSTRAINT "owner_attempt_patterns_network_check" CHECK (
    "network_quality" IN ('trusted', 'qualified', 'unknown')
    AND ("network_ip" IS NOT NULL OR "network_quality" = 'unknown')
    AND ("network_ip" IS NULL OR masklen("network_ip") =
      CASE family("network_ip") WHEN 4 THEN 32 ELSE 128 END)
  ),
  CONSTRAINT "owner_attempt_patterns_kind_check" CHECK (
    "surface" IN ('auth', 'access')
    AND "operation" IN (
      'sign-up', 'sign-in', 'method-link', 'password-change',
      'session-revoke', 'session-revoke-all', 'sign-out',
      'registration-admission', 'owner-guard'
    )
    AND "outcome" IN ('denied', 'failed', 'rate-limited', 'unavailable')
    AND (("http_status" BETWEEN 400 AND 599 AND "direct_code" IS NULL)
      OR ("http_status" IS NULL AND "direct_code" IN
        ('unauthorized', 'forbidden', 'invalid', 'rate-limited', 'unavailable')))
  ),
  CONSTRAINT "owner_attempt_patterns_counter_check" CHECK
    ("count" > 0 AND "first_occurred_at" <= "last_occurred_at")
);--> statement-breakpoint
CREATE INDEX "owner_attempt_patterns_timeline_idx" ON "owner_attempt_patterns"
  USING btree ("admitted_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_attempt_patterns_epoch_idx" ON "owner_attempt_patterns"
  USING btree ("recording_epoch_start", "pool");--> statement-breakpoint
CREATE TABLE "owner_attempt_telemetry_state" (
  "recording_epoch_start" timestamp (3) with time zone NOT NULL,
  "slot" text NOT NULL,
  "admitted_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "used" integer DEFAULT 0 NOT NULL,
  "capacity" integer,
  "first_occurred_at" timestamp (3) with time zone,
  "last_occurred_at" timestamp (3) with time zone,
  "count" bigint DEFAULT 0 NOT NULL,
  "saturated_count" boolean DEFAULT false NOT NULL,
  CONSTRAINT "owner_attempt_telemetry_state_pk" PRIMARY KEY ("recording_epoch_start", "slot"),
  CONSTRAINT "owner_attempt_telemetry_state_epoch_check" CHECK
    ("recording_epoch_start" = date_trunc('hour', "recording_epoch_start", 'UTC')),
  CONSTRAINT "owner_attempt_telemetry_state_slot_check" CHECK ("slot" IN (
    'quota.authenticated', 'quota.anonymous',
    'unknown.auth', 'unknown.access',
    'overflow.authenticated.auth', 'overflow.authenticated.access',
    'overflow.anonymous.auth', 'overflow.anonymous.access',
    'gap.auth', 'gap.access'
  )),
  CONSTRAINT "owner_attempt_telemetry_state_quota_check" CHECK (
    ("slot" IN ('quota.authenticated', 'quota.anonymous')
      AND "capacity" = 256 AND "used" BETWEEN 0 AND "capacity")
    OR ("slot" NOT IN ('quota.authenticated', 'quota.anonymous')
      AND "capacity" IS NULL AND "used" = 0)
  ),
  CONSTRAINT "owner_attempt_telemetry_state_counter_check" CHECK (
    "count" >= 0 AND
    (("first_occurred_at" IS NULL AND "last_occurred_at" IS NULL AND "count" = 0)
      OR ("first_occurred_at" IS NOT NULL AND "last_occurred_at" IS NOT NULL
        AND "first_occurred_at" <= "last_occurred_at" AND "count" > 0))
  )
);--> statement-breakpoint
CREATE INDEX "owner_attempt_telemetry_state_timeline_idx" ON "owner_attempt_telemetry_state"
  USING btree ("admitted_at" DESC NULLS LAST, "slot");--> statement-breakpoint
-- Time/source indexes for mixed native Owner timeline; SA-01 identities are not copied.
CREATE INDEX "owner_events_timeline_idx" ON "owner_events"
  USING btree ("occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_monitor_observations_timeline_idx" ON "owner_monitor_observations"
  USING btree ("observed_at" DESC NULLS LAST, "id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_history_timeline_idx" ON "admin_history"
  USING btree ("occurred_at" DESC NULLS LAST, "id" DESC NULLS LAST);
