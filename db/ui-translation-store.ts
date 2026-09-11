import { and, asc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { UiTranslationStore } from "../app/localization/persistent-sources";
import { uiTranslations } from "./schema";

export class DrizzleUiTranslationStore implements UiTranslationStore {
  constructor(private readonly database: NodePgDatabase) {}

  readApproved(locale: string, namespaces: readonly string[]) {
    const requestedNamespaces = [...new Set(namespaces)];
    if (locale === "en" || requestedNamespaces.length === 0) return Promise.resolve([]);

    return this.database
      .select({
        locale: uiTranslations.locale,
        namespace: uiTranslations.namespace,
        key: uiTranslations.key,
        origin: uiTranslations.origin,
        status: uiTranslations.status,
        sourceFingerprint: uiTranslations.sourceFingerprint,
        translatedPayload: uiTranslations.translatedPayload,
      })
      .from(uiTranslations)
      .where(
        and(
          eq(uiTranslations.locale, locale),
          eq(uiTranslations.status, "approved"),
          inArray(uiTranslations.namespace, requestedNamespaces),
        ),
      )
      .orderBy(asc(uiTranslations.namespace), asc(uiTranslations.key), asc(uiTranslations.origin));
  }
}
