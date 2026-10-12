CREATE TABLE "forum_attachment_security_events" (
  "id" text PRIMARY KEY NOT NULL,
  "upload_id" text NOT NULL,
  "uploaded_by_user_id" text NOT NULL,
  "context_key" text NOT NULL,
  "draft_id" text NOT NULL,
  "file_name" text NOT NULL,
  "declared_mime" text NOT NULL,
  "detected_type" text NOT NULL,
  "reason" text NOT NULL,
  "byte_size" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "forum_attachment_security_events_upload_id_unique" UNIQUE("upload_id"),
  CONSTRAINT "forum_attachment_security_events_shape_check" CHECK ("context_key" <> '' and "draft_id" <> '' and "detected_type" <> '' and "reason" <> '' and "byte_size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "forum_attachment_security_events" ADD CONSTRAINT "forum_attachment_security_events_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_attachment_security_events_created_idx" ON "forum_attachment_security_events" USING btree ("created_at","id");
