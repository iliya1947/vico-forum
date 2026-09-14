import type { BetterAuthOptions } from "better-auth";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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

// Better Auth 1.7.4 core schema, generated for PostgreSQL/Drizzle with
// database-backed rate limiting. `locale` is server-owned auth metadata and is
// intentionally not constrained to the persistent locale registry.
export const betterAuthUserAdditionalFields = {
  locale: { type: "string", required: false, input: false },
} satisfies NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  locale: text("locale"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const forumCategories = pgTable(
  "forum_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("forum_categories_name_check", sql`btrim(${table.name}) <> ''`)],
);

export const forumSections = pgTable(
  "forum_sections",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => forumCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_sections_category_id_idx").on(table.categoryId),
    check("forum_sections_name_check", sql`btrim(${table.name}) <> ''`),
  ],
);

export const forumTopics = pgTable(
  "forum_topics",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => forumSections.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // The migration adds a deferred owner-matching FK to (topic_id, revision_id).
    // Drizzle 0.45.2's PostgreSQL foreign-key builder has no deferrability API.
    currentTitleRevisionId: text("current_title_revision_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    unique("forum_topics_id_current_title_revision_unique").on(table.id, table.currentTitleRevisionId),
  ],
);

export const forumTopicTitleRevisions = pgTable(
  "forum_topic_title_revisions",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    originalContent: text("original_content").notNull(),
    sourceLocale: text("source_locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("forum_topic_title_revisions_topic_id_id_unique").on(table.topicId, table.id),
    foreignKey({
      name: "forum_topic_title_revisions_topic_id_fk",
      columns: [table.topicId],
      foreignColumns: [forumTopics.id],
    }).onDelete("cascade"),
    index("forum_topic_title_revisions_topic_id_idx").on(table.topicId),
    check("forum_topic_title_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
    check("forum_topic_title_revisions_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
  ],
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // The migration adds a deferred owner-matching FK to (post_id, revision_id).
    currentRevisionId: text("current_revision_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_id_current_revision_unique").on(table.id, table.currentRevisionId),
  ],
);

export const forumPostRevisions = pgTable(
  "forum_post_revisions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    originalContent: text("original_content").notNull(),
    sourceLocale: text("source_locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("forum_post_revisions_post_id_id_unique").on(table.postId, table.id),
    foreignKey({
      name: "forum_post_revisions_post_id_fk",
      columns: [table.postId],
      foreignColumns: [forumPosts.id],
    }).onDelete("cascade"),
    index("forum_post_revisions_post_id_idx").on(table.postId),
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
    check("forum_post_revisions_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

function arrayShapeCheck(column: AnyPgColumn) {
  return sql`(
    cardinality(${column}) = 0
    or (array_ndims(${column}) = 1 and array_lower(${column}, 1) = 1)
  ) and array_position(${column}, null) is null`;
}

function sourceLocaleCheck(column: AnyPgColumn) {
  return sql`${column} = btrim(${column}) and ${column} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`;
}
