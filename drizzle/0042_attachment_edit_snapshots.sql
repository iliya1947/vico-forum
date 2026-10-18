CREATE TABLE "forum_attachment_edit_snapshots" (
	"owner_id" text NOT NULL,
	"context_key" text NOT NULL,
	"draft_id" text NOT NULL,
	"post_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_attachment_edit_snapshots_pk" PRIMARY KEY("owner_id","context_key","draft_id")
);
--> statement-breakpoint
ALTER TABLE "forum_attachment_edit_snapshots" ADD CONSTRAINT "forum_attachment_edit_snapshots_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_attachment_edit_snapshots" ADD CONSTRAINT "forum_attachment_edit_snapshots_post_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;