import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export type UiTranslationPayload = string | Record<string, string>;

export const locales = pgTable(
  "locales",
  {
    tag: text("tag").primaryKey(),
    translationStatus: text("translation_status").notNull(),
    publicationStatus: text("publication_status").notNull(),
    direction: text("direction").notNull(),
    fallbackChain: text("fallback_chain").array().notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    matchTags: text("match_tags").array().notNull().default(sql`'{}'::text[]`),
    nativeName: text("native_name").notNull(),
    presentationMetadata: jsonb("presentation_metadata")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "locales_translation_status_check",
      sql`${table.translationStatus} in ('draft', 'generating', 'partial', 'ready')`,
    ),
    check(
      "locales_publication_status_check",
      sql`${table.publicationStatus} in ('inactive', 'active', 'disabled')`,
    ),
    check("locales_direction_check", sql`${table.direction} in ('ltr', 'rtl')`),
    check("locales_native_name_check", sql`btrim(${table.nativeName}) <> ''`),
    check(
      "locales_presentation_metadata_object_check",
      sql`jsonb_typeof(${table.presentationMetadata}) = 'object'`,
    ),
    check(
      "locales_non_bootstrap_tag_check",
      sql`lower(${table.tag}) not in ('en', 'api', 'assets')`,
    ),
    check("locales_fallback_chain_shape_check", arrayShapeCheck(table.fallbackChain)),
    check("locales_aliases_shape_check", arrayShapeCheck(table.aliases)),
    check("locales_match_tags_shape_check", arrayShapeCheck(table.matchTags)),
  ],
);

export const uiTranslations = pgTable(
  "ui_translations",
  {
    locale: text("locale").notNull(),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    origin: text("origin").notNull(),
    status: text("status").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    translatedPayload: jsonb("translated_payload").$type<UiTranslationPayload>().notNull(),
    generationPolicyVersion: text("generation_policy_version"),
    provider: text("provider"),
    providerModel: text("provider_model"),
    provenanceMetadata: jsonb("provenance_metadata")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "ui_translations_pk",
      columns: [table.locale, table.namespace, table.key, table.origin],
    }),
    check("ui_translations_locale_check", sql`btrim(${table.locale}) <> '' and lower(${table.locale}) <> 'en'`),
    check("ui_translations_namespace_check", sql`btrim(${table.namespace}) <> ''`),
    check("ui_translations_key_check", sql`btrim(${table.key}) <> ''`),
    check(
      "ui_translations_origin_check",
      sql`${table.origin} in ('persistent_manual', 'machine')`,
    ),
    check(
      "ui_translations_status_check",
      sql`${table.status} in ('draft', 'approved', 'rejected')`,
    ),
    check(
      "ui_translations_source_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ui_translations_payload_check",
      sql`jsonb_typeof(${table.translatedPayload}) in ('string', 'object')`,
    ),
    check(
      "ui_translations_provenance_metadata_object_check",
      sql`jsonb_typeof(${table.provenanceMetadata}) = 'object'`,
    ),
    check(
      "ui_translations_machine_metadata_check",
      sql`(
        ${table.origin} = 'machine'
        and ${table.generationPolicyVersion} is not null
        and btrim(${table.generationPolicyVersion}) <> ''
        and ${table.provider} is not null
        and btrim(${table.provider}) <> ''
      ) or (
        ${table.origin} = 'persistent_manual'
        and ${table.generationPolicyVersion} is null
        and ${table.provider} is null
        and ${table.providerModel} is null
      )`,
    ),
  ],
);

export const uiTranslationBundles = pgTable(
  "ui_translation_bundles",
  {
    locale: text("locale").notNull(),
    namespace: text("namespace").notNull(),
    bundleVersion: text("bundle_version").notNull(),
    resources: jsonb("resources").$type<Record<string, UiTranslationPayload>>().notNull(),
    compiledAt: timestamp("compiled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "ui_translation_bundles_pk",
      columns: [table.locale, table.namespace],
    }),
    check(
      "ui_translation_bundles_locale_check",
      sql`btrim(${table.locale}) <> '' and lower(${table.locale}) <> 'en'`,
    ),
    check("ui_translation_bundles_namespace_check", sql`btrim(${table.namespace}) <> ''`),
    check(
      "ui_translation_bundles_version_check",
      sql`${table.bundleVersion} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ui_translation_bundles_resources_object_check",
      sql`jsonb_typeof(${table.resources}) = 'object'`,
    ),
  ],
);

function arrayShapeCheck(column: AnyPgColumn) {
  return sql`(
    cardinality(${column}) = 0
    or (array_ndims(${column}) = 1 and array_lower(${column}, 1) = 1)
  ) and array_position(${column}, null) is null`;
}
