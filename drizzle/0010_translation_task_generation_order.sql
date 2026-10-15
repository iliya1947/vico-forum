ALTER TABLE "translation_tasks" ADD COLUMN "generation" integer;--> statement-breakpoint
WITH "ordered_generations" AS (
  SELECT "id",
         row_number() OVER (
           PARTITION BY "translation_kind", "source_namespace", "source_key", "target_locale"
           ORDER BY "created_at", "id"
         )::integer AS "generation"
    FROM "translation_tasks"
)
UPDATE "translation_tasks"
   SET "generation" = "ordered_generations"."generation"
  FROM "ordered_generations"
 WHERE "translation_tasks"."id" = "ordered_generations"."id";--> statement-breakpoint
ALTER TABLE "translation_tasks" ALTER COLUMN "generation" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_generation_check" CHECK ("translation_tasks"."generation" > 0);--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_unit_generation_unique" UNIQUE("translation_kind","source_namespace","source_key","target_locale","generation");--> statement-breakpoint
CREATE TABLE "translation_task_generation_heads" (
  "translation_kind" text NOT NULL,
  "source_namespace" text NOT NULL,
  "source_key" text NOT NULL,
  "target_locale" text NOT NULL,
  "current_generation" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "translation_task_generation_heads_pk" PRIMARY KEY("translation_kind","source_namespace","source_key","target_locale"),
  CONSTRAINT "translation_task_generation_heads_kind_check" CHECK ("translation_task_generation_heads"."translation_kind" = 'ui'),
  CONSTRAINT "translation_task_generation_heads_namespace_check" CHECK (btrim("translation_task_generation_heads"."source_namespace") <> ''),
  CONSTRAINT "translation_task_generation_heads_key_check" CHECK (btrim("translation_task_generation_heads"."source_key") <> ''),
  CONSTRAINT "translation_task_generation_heads_locale_check" CHECK ("translation_task_generation_heads"."target_locale" = btrim("translation_task_generation_heads"."target_locale") and "translation_task_generation_heads"."target_locale" <> '' and lower("translation_task_generation_heads"."target_locale") <> 'en'),
  CONSTRAINT "translation_task_generation_heads_generation_check" CHECK ("translation_task_generation_heads"."current_generation" > 0)
);--> statement-breakpoint
INSERT INTO "translation_task_generation_heads" (
  "translation_kind", "source_namespace", "source_key", "target_locale", "current_generation", "updated_at"
)
SELECT "translation_kind", "source_namespace", "source_key", "target_locale", max("generation"), statement_timestamp()
  FROM "translation_tasks"
 GROUP BY "translation_kind", "source_namespace", "source_key", "target_locale";
