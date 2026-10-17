CREATE TABLE "forum_attachment_draft_boundaries" (
	"owner_id" text NOT NULL,
	"context_key" text NOT NULL,
	"draft_id" text NOT NULL,
	"version" integer NOT NULL,
	"attachment_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_attachment_draft_boundaries_pk" PRIMARY KEY("owner_id","context_key","draft_id","version")
);
--> statement-breakpoint
CREATE TABLE "forum_attachment_draft_contexts" (
	"attachment_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"context_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_attachment_draft_contexts_pk" PRIMARY KEY("attachment_id","owner_id","context_key")
);
--> statement-breakpoint
ALTER TABLE "forum_attachment_draft_boundaries" ADD CONSTRAINT "forum_attachment_draft_boundaries_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_attachment_draft_contexts" ADD CONSTRAINT "forum_attachment_draft_contexts_attachment_owner_fk" FOREIGN KEY ("attachment_id","owner_id") REFERENCES "public"."forum_attachments"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_attachment_draft_contexts_owner_context_idx" ON "forum_attachment_draft_contexts" USING btree ("owner_id","context_key");--> statement-breakpoint
INSERT INTO "forum_attachment_draft_contexts" ("attachment_id", "owner_id", "context_key", "created_at")
SELECT "attachment_id", "owner_id", "context_key", min("created_at")
FROM "forum_attachment_draft_refs"
GROUP BY "attachment_id", "owner_id", "context_key"
ON CONFLICT DO NOTHING;
