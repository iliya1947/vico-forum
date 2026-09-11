CREATE TABLE "locales" (
	"tag" text PRIMARY KEY NOT NULL,
	"translation_status" text NOT NULL,
	"publication_status" text NOT NULL,
	"direction" text NOT NULL,
	"fallback_chain" text[] NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"match_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"native_name" text NOT NULL,
	"presentation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locales_translation_status_check" CHECK ("locales"."translation_status" in ('draft', 'generating', 'partial', 'ready')),
	CONSTRAINT "locales_publication_status_check" CHECK ("locales"."publication_status" in ('inactive', 'active', 'disabled')),
	CONSTRAINT "locales_direction_check" CHECK ("locales"."direction" in ('ltr', 'rtl')),
	CONSTRAINT "locales_native_name_check" CHECK (btrim("locales"."native_name") <> ''),
	CONSTRAINT "locales_presentation_metadata_object_check" CHECK (jsonb_typeof("locales"."presentation_metadata") = 'object'),
	CONSTRAINT "locales_non_bootstrap_tag_check" CHECK (lower("locales"."tag") not in ('en', 'api', 'assets')),
	CONSTRAINT "locales_fallback_chain_shape_check" CHECK ((
    cardinality("locales"."fallback_chain") = 0
    or (array_ndims("locales"."fallback_chain") = 1 and array_lower("locales"."fallback_chain", 1) = 1)
  ) and array_position("locales"."fallback_chain", null) is null),
	CONSTRAINT "locales_aliases_shape_check" CHECK ((
    cardinality("locales"."aliases") = 0
    or (array_ndims("locales"."aliases") = 1 and array_lower("locales"."aliases", 1) = 1)
  ) and array_position("locales"."aliases", null) is null),
	CONSTRAINT "locales_match_tags_shape_check" CHECK ((
    cardinality("locales"."match_tags") = 0
    or (array_ndims("locales"."match_tags") = 1 and array_lower("locales"."match_tags", 1) = 1)
  ) and array_position("locales"."match_tags", null) is null)
);
