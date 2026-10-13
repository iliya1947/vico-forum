CREATE TABLE "forum_attachment_draft_generations" (
	"owner_id" text NOT NULL,
	"context_key" text NOT NULL,
	"draft_id" text NOT NULL,
	"target_draft_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_attachment_draft_generations_pk" PRIMARY KEY("owner_id","context_key","draft_id"),
	CONSTRAINT "forum_attachment_draft_generations_target_check" CHECK ("forum_attachment_draft_generations"."draft_id" <> "forum_attachment_draft_generations"."target_draft_id")
);
--> statement-breakpoint
ALTER TABLE "forum_attachment_draft_generations" ADD CONSTRAINT "forum_attachment_draft_generations_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "forum_attachment_draft_generations" ("owner_id", "context_key", "draft_id", "target_draft_id")
SELECT "owner_id", "context_key", "draft_id", NULL FROM "forum_editor_drafts"
WHERE "status" <> 'active'
ON CONFLICT DO NOTHING;
