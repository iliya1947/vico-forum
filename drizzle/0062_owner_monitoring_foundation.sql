-- SA-01: retained Owner-only events and measured monitor observations.
-- No FK cascade to ordinary accounts: past Owner history remains retained.
CREATE TABLE "owner_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "position" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "occurred_at" timestamp (3) with time zone NOT NULL,
  "recorded_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "source" text NOT NULL,
  "occurrence_key" text NOT NULL,
  "kind" text NOT NULL,
  "monitor_key" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "actor_user_id" text,
  "target_user_id" text,
  "correlation_id" text,
  "payload" jsonb NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "owner_events_position_idx" ON "owner_events" USING btree ("position" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "owner_events_occurrence_idx" ON "owner_events" USING btree ("source", "occurrence_key");--> statement-breakpoint
CREATE INDEX "owner_events_monitor_idx" ON "owner_events" USING btree ("monitor_key", "position" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_events_kind_idx" ON "owner_events" USING btree ("kind", "position" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_events_entity_idx" ON "owner_events" USING btree ("entity_type", "entity_id", "position" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_events_actor_idx" ON "owner_events" USING btree ("actor_user_id", "position" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_events_target_idx" ON "owner_events" USING btree ("target_user_id", "position" DESC NULLS LAST);--> statement-breakpoint
CREATE TABLE "owner_monitor_observations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "position" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "monitor_key" text NOT NULL,
  "resource_scope" text NOT NULL,
  "observed_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
  "source" text NOT NULL,
  "schema_version" integer NOT NULL,
  "quality" text NOT NULL,
  "value" jsonb NOT NULL,
  "fingerprint" text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "owner_monitor_observations_position_idx" ON "owner_monitor_observations" USING btree ("position" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "owner_monitor_observations_scope_idx" ON "owner_monitor_observations" USING btree ("monitor_key", "resource_scope", "position" DESC NULLS LAST);
