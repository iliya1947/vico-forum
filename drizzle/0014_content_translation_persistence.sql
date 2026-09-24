ALTER TABLE "forum_topic_title_revisions" ADD CONSTRAINT "forum_topic_title_revisions_owner_source_unique" UNIQUE("topic_id","id","source_locale");--> statement-breakpoint
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_owner_source_unique" UNIQUE("post_id","id","source_locale");--> statement-breakpoint
CREATE TABLE "forum_topic_title_translations" (
	"topic_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"target_locale" text NOT NULL,
	"source_locale" text NOT NULL,
	"translated_content" text NOT NULL,
	"origin" text NOT NULL,
	"provider" text,
	"provider_model" text,
	"attribution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_topic_title_translations_pk" PRIMARY KEY("topic_id","revision_id","target_locale"),
	CONSTRAINT "forum_topic_title_translations_target_locale_check" CHECK ("forum_topic_title_translations"."target_locale" = btrim("forum_topic_title_translations"."target_locale")
    and lower("forum_topic_title_translations"."target_locale") <> 'und'
    and "forum_topic_title_translations"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "forum_topic_title_translations_source_locale_check" CHECK ("forum_topic_title_translations"."source_locale" = btrim("forum_topic_title_translations"."source_locale") and "forum_topic_title_translations"."source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "forum_topic_title_translations_distinct_locale_check" CHECK ("forum_topic_title_translations"."source_locale" = 'und' or lower("forum_topic_title_translations"."source_locale") <> lower("forum_topic_title_translations"."target_locale")),
	CONSTRAINT "forum_topic_title_translations_content_check" CHECK (btrim("forum_topic_title_translations"."translated_content") <> ''),
	CONSTRAINT "forum_topic_title_translations_origin_check" CHECK ("forum_topic_title_translations"."origin" in ('persistent_manual', 'machine')),
	CONSTRAINT "forum_topic_title_translations_metadata_check" CHECK ((
    "forum_topic_title_translations"."origin" = 'machine'
    and "forum_topic_title_translations"."provider" is not null
    and btrim("forum_topic_title_translations"."provider") <> ''
    and "forum_topic_title_translations"."provider_model" is not null
    and btrim("forum_topic_title_translations"."provider_model") <> ''
  ) or (
    "forum_topic_title_translations"."origin" = 'persistent_manual'
    and "forum_topic_title_translations"."provider" is null
    and "forum_topic_title_translations"."provider_model" is null
  )),
	CONSTRAINT "forum_topic_title_translations_attribution_check" CHECK ("forum_topic_title_translations"."attribution" is null or btrim("forum_topic_title_translations"."attribution") <> '')
);
--> statement-breakpoint
CREATE TABLE "forum_post_body_translations" (
	"post_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"target_locale" text NOT NULL,
	"source_locale" text NOT NULL,
	"translated_content" text NOT NULL,
	"origin" text NOT NULL,
	"provider" text,
	"provider_model" text,
	"attribution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_post_body_translations_pk" PRIMARY KEY("post_id","revision_id","target_locale"),
	CONSTRAINT "forum_post_body_translations_target_locale_check" CHECK ("forum_post_body_translations"."target_locale" = btrim("forum_post_body_translations"."target_locale")
    and lower("forum_post_body_translations"."target_locale") <> 'und'
    and "forum_post_body_translations"."target_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "forum_post_body_translations_source_locale_check" CHECK ("forum_post_body_translations"."source_locale" = btrim("forum_post_body_translations"."source_locale") and "forum_post_body_translations"."source_locale" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "forum_post_body_translations_distinct_locale_check" CHECK ("forum_post_body_translations"."source_locale" = 'und' or lower("forum_post_body_translations"."source_locale") <> lower("forum_post_body_translations"."target_locale")),
	CONSTRAINT "forum_post_body_translations_content_check" CHECK (btrim("forum_post_body_translations"."translated_content") <> ''),
	CONSTRAINT "forum_post_body_translations_origin_check" CHECK ("forum_post_body_translations"."origin" in ('persistent_manual', 'machine')),
	CONSTRAINT "forum_post_body_translations_metadata_check" CHECK ((
    "forum_post_body_translations"."origin" = 'machine'
    and "forum_post_body_translations"."provider" is not null
    and btrim("forum_post_body_translations"."provider") <> ''
    and "forum_post_body_translations"."provider_model" is not null
    and btrim("forum_post_body_translations"."provider_model") <> ''
  ) or (
    "forum_post_body_translations"."origin" = 'persistent_manual'
    and "forum_post_body_translations"."provider" is null
    and "forum_post_body_translations"."provider_model" is null
  )),
	CONSTRAINT "forum_post_body_translations_attribution_check" CHECK ("forum_post_body_translations"."attribution" is null or btrim("forum_post_body_translations"."attribution") <> '')
);
--> statement-breakpoint
ALTER TABLE "forum_topic_title_translations" ADD CONSTRAINT "forum_topic_title_translations_revision_fk" FOREIGN KEY ("topic_id","revision_id","source_locale") REFERENCES "public"."forum_topic_title_revisions"("topic_id","id","source_locale") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_body_translations" ADD CONSTRAINT "forum_post_body_translations_revision_fk" FOREIGN KEY ("post_id","revision_id","source_locale") REFERENCES "public"."forum_post_revisions"("post_id","id","source_locale") ON DELETE cascade ON UPDATE no action;