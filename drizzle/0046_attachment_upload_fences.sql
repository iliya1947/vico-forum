CREATE TABLE "forum_attachment_sweep" (
	"id" text PRIMARY KEY NOT NULL,
	"cursor" text,
	"claim_token" text,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "forum_attachment_sweep_singleton_check" CHECK ("forum_attachment_sweep"."id" = 'reservations-v2'),
	CONSTRAINT "forum_attachment_sweep_claim_check" CHECK (
    ("forum_attachment_sweep"."claim_token" is null and "forum_attachment_sweep"."claimed_at" is null)
    or ("forum_attachment_sweep"."claim_token" is not null and "forum_attachment_sweep"."claimed_at" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "forum_attachment_upload_objects" (
	"object_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reservation_etag" text,
	"claim_token" text,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "forum_attachment_upload_objects_claim_check" CHECK (
    ("forum_attachment_upload_objects"."claim_token" is null and "forum_attachment_upload_objects"."claimed_at" is null)
    or ("forum_attachment_upload_objects"."claim_token" is not null and "forum_attachment_upload_objects"."claimed_at" is not null)
  )
);
--> statement-breakpoint
CREATE INDEX "forum_attachment_upload_objects_cleanup_idx" ON "forum_attachment_upload_objects" USING btree ("created_at");
--> statement-breakpoint
INSERT INTO "forum_attachment_sweep" ("id") VALUES ('reservations-v2');
