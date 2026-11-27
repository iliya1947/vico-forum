CREATE TABLE "auth_lifecycle_budget" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "auth_lifecycle_budget_key_check" CHECK ("auth_lifecycle_budget"."key" ~ '^vico-auth-budget:v1:[0-9a-f]{64}$'),
  CONSTRAINT "auth_lifecycle_budget_count_check" CHECK ("auth_lifecycle_budget"."count" > 0),
  CONSTRAINT "auth_lifecycle_budget_expiry_check" CHECK (isfinite("auth_lifecycle_budget"."expires_at"))
);
--> statement-breakpoint
CREATE INDEX "auth_lifecycle_budget_cleanup_idx" ON "auth_lifecycle_budget" USING btree ("expires_at","key");
