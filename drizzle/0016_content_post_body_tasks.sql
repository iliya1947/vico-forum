ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_kind_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_content_shape_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_kind_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_content_shape_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_kind_check" CHECK ("translation_tasks"."translation_kind" in ('ui', 'content-topic-title', 'content-post-body'));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_content_shape_check" CHECK (("translation_tasks"."translation_kind" <> 'content-topic-title' or "translation_tasks"."source_namespace" = 'topic-title')
        and ("translation_tasks"."translation_kind" <> 'content-post-body' or "translation_tasks"."source_namespace" = 'post-body'));--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_kind_check" CHECK ("translation_task_generation_heads"."translation_kind" in ('ui', 'content-topic-title', 'content-post-body'));--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_content_shape_check" CHECK (("translation_task_generation_heads"."translation_kind" <> 'content-topic-title' or "translation_task_generation_heads"."source_namespace" = 'topic-title')
        and ("translation_task_generation_heads"."translation_kind" <> 'content-post-body' or "translation_task_generation_heads"."source_namespace" = 'post-body'));--> statement-breakpoint
CREATE TABLE "content_post_body_translation_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"translation_kind" text NOT NULL,
	"source_namespace" text NOT NULL,
	"post_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"revision_source_locale" text NOT NULL,
	"resolved_source_locale" text NOT NULL,
	"source_resolution_origin" text NOT NULL,
	"protected_content_policy_version" text NOT NULL,
	CONSTRAINT "content_post_body_translation_tasks_kind_check" CHECK ("content_post_body_translation_tasks"."translation_kind" = 'content-post-body'),
	CONSTRAINT "content_post_body_translation_tasks_namespace_check" CHECK ("content_post_body_translation_tasks"."source_namespace" = 'post-body'),
	CONSTRAINT "content_post_body_translation_tasks_revision_source_locale_check" CHECK ("content_post_body_translation_tasks"."revision_source_locale" = btrim("content_post_body_translation_tasks"."revision_source_locale") and "content_post_body_translation_tasks"."revision_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "content_post_body_translation_tasks_resolved_source_locale_check" CHECK ("content_post_body_translation_tasks"."resolved_source_locale" = btrim("content_post_body_translation_tasks"."resolved_source_locale")
    and lower("content_post_body_translation_tasks"."resolved_source_locale") <> 'und'
    and "content_post_body_translation_tasks"."resolved_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "content_post_body_translation_tasks_resolution_origin_check" CHECK ("content_post_body_translation_tasks"."source_resolution_origin" in ('revision-metadata', 'detector')),
	CONSTRAINT "content_post_body_translation_tasks_resolution_check" CHECK ((
        "content_post_body_translation_tasks"."source_resolution_origin" = 'revision-metadata'
        and lower("content_post_body_translation_tasks"."revision_source_locale") <> 'und'
        and "content_post_body_translation_tasks"."revision_source_locale" = "content_post_body_translation_tasks"."resolved_source_locale"
      ) or (
        "content_post_body_translation_tasks"."source_resolution_origin" = 'detector'
        and lower("content_post_body_translation_tasks"."revision_source_locale") = 'und'
      )),
	CONSTRAINT "content_post_body_translation_tasks_protection_policy_check" CHECK (btrim("content_post_body_translation_tasks"."protected_content_policy_version") <> '')
);
--> statement-breakpoint
ALTER TABLE "content_post_body_translation_tasks" ADD CONSTRAINT "content_post_body_translation_tasks_task_fk" FOREIGN KEY ("task_id","translation_kind","source_namespace","post_id") REFERENCES "public"."translation_tasks"("id","translation_kind","source_namespace","source_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_post_body_translation_tasks" ADD CONSTRAINT "content_post_body_translation_tasks_revision_fk" FOREIGN KEY ("post_id","revision_id","revision_source_locale") REFERENCES "public"."forum_post_revisions"("post_id","id","source_locale") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "require_content_topic_title_task_binding"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.translation_kind = 'content-topic-title' AND NOT EXISTS (
    SELECT 1
      FROM content_topic_title_translation_tasks metadata
     WHERE metadata.task_id = NEW.id
       AND metadata.translation_kind = NEW.translation_kind
       AND metadata.source_namespace = NEW.source_namespace
       AND metadata.topic_id = NEW.source_key
  ) THEN
    RAISE EXCEPTION 'content topic-title task requires revision metadata'
      USING ERRCODE = '23514', CONSTRAINT = 'translation_tasks_content_binding_required';
  ELSIF NEW.translation_kind = 'content-post-body' AND NOT EXISTS (
    SELECT 1
      FROM content_post_body_translation_tasks metadata
     WHERE metadata.task_id = NEW.id
       AND metadata.translation_kind = NEW.translation_kind
       AND metadata.source_namespace = NEW.source_namespace
       AND metadata.post_id = NEW.source_key
  ) THEN
    RAISE EXCEPTION 'content post-body task requires revision metadata'
      USING ERRCODE = '23514', CONSTRAINT = 'translation_tasks_content_binding_required';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION "delete_content_post_body_task_with_metadata"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM translation_tasks
   WHERE id = OLD.task_id
     AND translation_kind = 'content-post-body';
  RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "content_post_body_translation_tasks_delete_task"
AFTER DELETE ON "content_post_body_translation_tasks"
FOR EACH ROW
EXECUTE FUNCTION "delete_content_post_body_task_with_metadata"();