import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";

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

function arrayShapeCheck(column: AnyPgColumn) {
  return sql`(
    cardinality(${column}) = 0
    or (array_ndims(${column}) = 1 and array_lower(${column}, 1) = 1)
  ) and array_position(${column}, null) is null`;
}
