ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_kind_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_target_locale_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_kind_check";--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" DROP CONSTRAINT "translation_task_generation_heads_locale_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "content_id" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "content_revision_id" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "revision_source_locale" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "resolved_source_locale" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD COLUMN "source_resolution_origin" text;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_kind_check" CHECK ("translation_tasks"."translation_kind" in ('ui', 'content-topic-title'));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_target_locale_check" CHECK ("translation_tasks"."target_locale" = btrim("translation_tasks"."target_locale")
    and lower("translation_tasks"."target_locale") <> 'und'
    and "translation_tasks"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_ui_target_locale_check" CHECK ("translation_tasks"."translation_kind" <> 'ui' or lower("translation_tasks"."target_locale") <> 'en');--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_content_shape_check" CHECK ((
        "translation_tasks"."translation_kind" = 'ui'
        and "translation_tasks"."content_id" is null
        and "translation_tasks"."content_revision_id" is null
        and "translation_tasks"."revision_source_locale" is null
        and "translation_tasks"."resolved_source_locale" is null
        and "translation_tasks"."source_resolution_origin" is null
      ) or (
        "translation_tasks"."translation_kind" = 'content-topic-title'
        and "translation_tasks"."content_id" is not null and btrim("translation_tasks"."content_id") <> ''
        and "translation_tasks"."content_revision_id" is not null and btrim("translation_tasks"."content_revision_id") <> ''
        and "translation_tasks"."revision_source_locale" is not null
        and "translation_tasks"."revision_source_locale" = btrim("translation_tasks"."revision_source_locale")
        and "translation_tasks"."revision_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'
        and "translation_tasks"."resolved_source_locale" is not null
        and "translation_tasks"."resolved_source_locale" = btrim("translation_tasks"."resolved_source_locale")
        and lower("translation_tasks"."resolved_source_locale") <> 'und'
        and "translation_tasks"."resolved_source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'
        and "translation_tasks"."source_resolution_origin" in ('revision-metadata', 'detector')
        and "translation_tasks"."source_namespace" = 'topic-title'
        and "translation_tasks"."source_key" = "translation_tasks"."content_id"
        and (
          (
            "translation_tasks"."source_resolution_origin" = 'revision-metadata'
            and lower("translation_tasks"."revision_source_locale") <> 'und'
            and "translation_tasks"."revision_source_locale" = "translation_tasks"."resolved_source_locale"
          ) or (
            "translation_tasks"."source_resolution_origin" = 'detector'
            and lower("translation_tasks"."revision_source_locale") = 'und'
          )
        )
      ));--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_content_revision_fk" FOREIGN KEY ("content_id","content_revision_id","revision_source_locale") REFERENCES "public"."forum_topic_title_revisions"("topic_id","id","source_locale") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_kind_check" CHECK ("translation_task_generation_heads"."translation_kind" in ('ui', 'content-topic-title'));--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_locale_check" CHECK ("translation_task_generation_heads"."target_locale" = btrim("translation_task_generation_heads"."target_locale")
    and lower("translation_task_generation_heads"."target_locale") <> 'und'
    and "translation_task_generation_heads"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$');--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_ui_locale_check" CHECK ("translation_task_generation_heads"."translation_kind" <> 'ui' or lower("translation_task_generation_heads"."target_locale") <> 'en');--> statement-breakpoint
ALTER TABLE "translation_task_generation_heads" ADD CONSTRAINT "translation_task_generation_heads_content_shape_check" CHECK ("translation_task_generation_heads"."translation_kind" <> 'content-topic-title' or "translation_task_generation_heads"."source_namespace" = 'topic-title');