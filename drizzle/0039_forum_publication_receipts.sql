CREATE TABLE "forum_publication_receipts" (
  "owner_id" text NOT NULL,
  "context_key" text NOT NULL,
  "draft_id" text NOT NULL,
  "fingerprint" text NOT NULL,
  "topic_id" text NOT NULL,
  "post_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "forum_publication_receipts_pk" PRIMARY KEY("owner_id","context_key","draft_id")
);
--> statement-breakpoint
ALTER TABLE "forum_publication_receipts" ADD CONSTRAINT "forum_publication_receipts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- A published message may consist solely of authorized attachment references.
-- Application publication transactions require verified refs for an empty body.
ALTER TABLE "forum_post_revisions" DROP CONSTRAINT "forum_post_revisions_content_check";
