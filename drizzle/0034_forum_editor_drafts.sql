CREATE TABLE "forum_editor_drafts" (
  "owner_id" text NOT NULL,
  "context_key" text NOT NULL,
  "version" integer NOT NULL,
  "status" text NOT NULL,
  "payload" jsonb NOT NULL,
  "edited_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "forum_editor_drafts_pk" PRIMARY KEY("owner_id","context_key")
);
--> statement-breakpoint
ALTER TABLE "forum_editor_drafts" ADD CONSTRAINT "forum_editor_drafts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_editor_drafts_owner_edited_idx" ON "forum_editor_drafts" USING btree ("owner_id","edited_at");
