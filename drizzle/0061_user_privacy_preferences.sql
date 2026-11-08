-- SET-06: account-wide public online-visibility preference; missing row means ON.
CREATE TABLE "user_privacy_preferences" (
  "user_id" text PRIMARY KEY NOT NULL,
  "show_online" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_privacy_preferences" ADD CONSTRAINT "user_privacy_preferences_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
