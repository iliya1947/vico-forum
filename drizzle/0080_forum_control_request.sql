CREATE TABLE "forum_control_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_ref" uuid NOT NULL,
	"receipt_ref" uuid NOT NULL,
	"grant_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"session_id" text NOT NULL,
	"digest" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"request_comment_id" text,
	"receipt_comment_id" text,
	"outcome" text,
	"result" jsonb,
	CONSTRAINT "forum_control_request_request_ref_unique" UNIQUE("request_ref"),
	CONSTRAINT "forum_control_request_receipt_ref_unique" UNIQUE("receipt_ref")
);
--> statement-breakpoint
CREATE INDEX "forum_control_request_expires_at_idx" ON "forum_control_request" USING btree ("expires_at");
