ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_kind_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_target_locale_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_kind_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_locale_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_kind_check" CHECK ("translation_tasks"."translation_kind" in ('ui', 'content-topic-title'));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_target_locale_check" CHECK ("translation_tasks"."target_locale" = btrim("translation_tasks"."target_locale")
    and lower("translation_tasks"."target_locale") <> 'und'
    and "translation_tasks"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_ui_target_locale_check" CHECK ("translation_tasks"."translation_kind" <> 'ui' or lower("translation_tasks"."target_locale") <> 'en');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_content_shape_check" CHECK ("translation_tasks"."translation_kind" <> 'content-topic-title' or "translation_tasks"."source_namespace" = 'topic-title');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_content_owner_unique" UNIQUE("id","translation_kind","source_namespace","source_key");--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_kind_check" CHECK ("translation_task_generation_heads"."translation_kind" in ('ui', 'content-topic-title'));--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_locale_check" CHECK ("translation_task_generation_heads"."target_locale" = btrim("translation_task_generation_heads"."target_locale")
    and lower("translation_task_generation_heads"."target_locale") <> 'und'
    and "translation_task_generation_heads"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$');--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_ui_locale_check" CHECK ("translation_task_generation_heads"."translation_kind" <> 'ui' or lower("translation_task_generation_heads"."target_locale") <> 'en');--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_content_shape_check" CHECK ("translation_task_generation_heads"."translation_kind" <> 'content-topic-title' or "translation_task_generation_heads"."source_namespace" = 'topic-title');--> statement-breakpoint
CREATE TABLE "content_topic_title_translation_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"translation_kind" text NOT NULL,
	"source_namespace" text NOT NULL,
	"topic_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"revision_source_locale" text NOT NULL,
	"resolved_source_locale" text NOT NULL,
	"source_resolution_origin" text NOT NULL,
	CONSTRAINT "content_topic_title_translation_tasks_kind_check" CHECK ("content_topic_title_translation_tasks"."translation_kind" = 'content-topic-title'),
	CONSTRAINT "content_topic_title_translation_tasks_namespace_check" CHECK ("content_topic_title_translation_tasks"."source_namespace" = 'topic-title'),
	CONSTRAINT "content_topic_title_translation_tasks_revision_source_locale_check" CHECK ("content_topic_title_translation_tasks"."revision_source_locale" = btrim("content_topic_title_translation_tasks"."revision_source_locale") and "content_topic_title_translation_tasks"."revision_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "content_topic_title_translation_tasks_resolved_source_locale_check" CHECK ("content_topic_title_translation_tasks"."resolved_source_locale" = btrim("content_topic_title_translation_tasks"."resolved_source_locale")
    and lower("content_topic_title_translation_tasks"."resolved_source_locale") <> 'und'
    and "content_topic_title_translation_tasks"."resolved_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "content_topic_title_translation_tasks_resolution_origin_check" CHECK ("content_topic_title_translation_tasks"."source_resolution_origin" in ('revision-metadata', 'detector')),
	CONSTRAINT "content_topic_title_translation_tasks_resolution_check" CHECK ((
        "content_topic_title_translation_tasks"."source_resolution_origin" = 'revision-metadata'
        and lower("content_topic_title_translation_tasks"."revision_source_locale") <> 'und'
        and "content_topic_title_translation_tasks"."revision_source_locale" = "content_topic_title_translation_tasks"."resolved_source_locale"
      ) or (
        "content_topic_title_translation_tasks"."source_resolution_origin" = 'detector'
        and lower("content_topic_title_translation_tasks"."revision_source_locale") = 'und'
      ))
);
--> statement-breakpoint
ALTER TABLE "content_topic_title_translation_tasks" ADD CONSTRAINT "content_topic_title_translation_tasks_task_fk" FOREIGN KEY ("task_id","translation_kind","source_namespace","topic_id") REFERENCES "public"."translation_tasks"("id","translation_kind","source_namespace","source_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_topic_title_translation_tasks" ADD CONSTRAINT "content_topic_title_translation_tasks_revision_fk" FOREIGN KEY ("topic_id","revision_id","revision_source_locale") REFERENCES "public"."forum_topic_title_revisions"("topic_id","id","source_locale") ON DELETE cascade ON UPDATE no action;