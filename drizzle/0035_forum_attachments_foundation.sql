CREATE TABLE "forum_attachments" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL,
  "object_key" text NOT NULL,
  "file_name" text NOT NULL,
  "declared_mime" text NOT NULL,
  "detected_type" text NOT NULL,
  "response_mime" text NOT NULL,
  "byte_size" integer NOT NULL,
  "verification_status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "forum_attachments_object_key_unique" UNIQUE("object_key"),
  CONSTRAINT "forum_attachments_id_owner_unique" UNIQUE("id","owner_id")
);
--> statement-breakpoint
CREATE TABLE "forum_attachment_draft_refs" (
  "attachment_id" text NOT NULL,
  "owner_id" text NOT NULL,
  "context_key" text NOT NULL,
  "draft_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "forum_attachment_draft_refs_pk" PRIMARY KEY("attachment_id","context_key","draft_id")
);
--> statement-breakpoint
CREATE TABLE "forum_post_attachments" (
  "post_id" text NOT NULL,
  "attachment_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "forum_post_attachments_pk" PRIMARY KEY("post_id","attachment_id")
);
--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_attachment_draft_refs" ADD CONSTRAINT "forum_attachment_draft_refs_attachment_owner_fk" FOREIGN KEY ("attachment_id","owner_id") REFERENCES "public"."forum_attachments"("id","owner_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_post_attachments" ADD CONSTRAINT "forum_post_attachments_post_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "forum_post_attachments" ADD CONSTRAINT "forum_post_attachments_attachment_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."forum_attachments"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_attachments_owner_created_idx" ON "forum_attachments" USING btree ("owner_id","created_at");
--> statement-breakpoint
CREATE INDEX "forum_attachment_draft_refs_owner_context_idx" ON "forum_attachment_draft_refs" USING btree ("owner_id","context_key","draft_id");
--> statement-breakpoint
CREATE INDEX "forum_post_attachments_attachment_idx" ON "forum_post_attachments" USING btree ("attachment_id");
