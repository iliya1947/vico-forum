CREATE TABLE "content_translation_request_budget_counters" (
	"scope" text NOT NULL,
	"subject_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"used_units" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_translation_request_budget_counters_pk" PRIMARY KEY("scope","subject_key","window_start"),
	CONSTRAINT "content_translation_request_budget_counters_scope_check" CHECK ("content_translation_request_budget_counters"."scope" = btrim("content_translation_request_budget_counters"."scope")
        and "content_translation_request_budget_counters"."scope" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
	CONSTRAINT "content_translation_request_budget_counters_subject_check" CHECK ("content_translation_request_budget_counters"."subject_key" = '_global' or "content_translation_request_budget_counters"."subject_key" ~ '^[A-Za-z0-9_-]{43}$'),
	CONSTRAINT "content_translation_request_budget_counters_used_units_check" CHECK ("content_translation_request_budget_counters"."used_units" >= 0 and "content_translation_request_budget_counters"."used_units" <= 9007199254740991),
	CONSTRAINT "content_translation_request_budget_counters_window_check" CHECK ("content_translation_request_budget_counters"."expires_at" > "content_translation_request_budget_counters"."window_start"),
	CONSTRAINT "content_translation_request_budget_counters_timestamps_check" CHECK ("content_translation_request_budget_counters"."updated_at" >= "content_translation_request_budget_counters"."created_at")
);
--> statement-breakpoint
CREATE INDEX "content_translation_request_budget_counters_cleanup_idx" ON "content_translation_request_budget_counters" USING btree ("expires_at","scope","subject_key","window_start");
