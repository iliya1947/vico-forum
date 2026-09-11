CREATE TABLE "ui_translations" (
	"locale" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"origin" text NOT NULL,
	"status" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"translated_payload" jsonb NOT NULL,
	"generation_policy_version" text,
	"provider" text,
	"provider_model" text,
	"provenance_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ui_translations_pk" PRIMARY KEY("locale","namespace","key","origin"),
	CONSTRAINT "ui_translations_locale_check" CHECK (btrim("ui_translations"."locale") <> '' and lower("ui_translations"."locale") <> 'en'),
	CONSTRAINT "ui_translations_namespace_check" CHECK (btrim("ui_translations"."namespace") <> ''),
	CONSTRAINT "ui_translations_key_check" CHECK (btrim("ui_translations"."key") <> ''),
	CONSTRAINT "ui_translations_origin_check" CHECK ("ui_translations"."origin" in ('persistent_manual', 'machine')),
	CONSTRAINT "ui_translations_status_check" CHECK ("ui_translations"."status" in ('draft', 'approved', 'rejected')),
	CONSTRAINT "ui_translations_source_fingerprint_check" CHECK ("ui_translations"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "ui_translations_payload_check" CHECK (jsonb_typeof("ui_translations"."translated_payload") in ('string', 'object')),
	CONSTRAINT "ui_translations_provenance_metadata_object_check" CHECK (jsonb_typeof("ui_translations"."provenance_metadata") = 'object'),
	CONSTRAINT "ui_translations_machine_metadata_check" CHECK ((
        "ui_translations"."origin" = 'machine'
        and "ui_translations"."generation_policy_version" is not null
        and btrim("ui_translations"."generation_policy_version") <> ''
        and "ui_translations"."provider" is not null
        and btrim("ui_translations"."provider") <> ''
      ) or (
        "ui_translations"."origin" = 'persistent_manual'
        and "ui_translations"."generation_policy_version" is null
        and "ui_translations"."provider" is null
        and "ui_translations"."provider_model" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "ui_translation_bundles" (
	"locale" text NOT NULL,
	"namespace" text NOT NULL,
	"bundle_version" text NOT NULL,
	"resources" jsonb NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ui_translation_bundles_pk" PRIMARY KEY("locale","namespace"),
	CONSTRAINT "ui_translation_bundles_locale_check" CHECK (btrim("ui_translation_bundles"."locale") <> '' and lower("ui_translation_bundles"."locale") <> 'en'),
	CONSTRAINT "ui_translation_bundles_namespace_check" CHECK (btrim("ui_translation_bundles"."namespace") <> ''),
	CONSTRAINT "ui_translation_bundles_version_check" CHECK ("ui_translation_bundles"."bundle_version" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "ui_translation_bundles_resources_object_check" CHECK (jsonb_typeof("ui_translation_bundles"."resources") = 'object')
);
