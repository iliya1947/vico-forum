import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  compileNamespaceBundle,
  type CompiledNamespaceBundle,
  type TranslationBundleStore,
} from "../app/localization/bundles";
import { parseLocaleCandidate } from "../app/localization/locale";
import { uiTranslationBundles } from "./schema";

export class DrizzleUiTranslationBundleStore implements TranslationBundleStore {
  constructor(private readonly database: NodePgDatabase) {}

  async read(locale: string, namespace: string): Promise<CompiledNamespaceBundle | undefined> {
    const persistentLocale = persistentBundleLocale(locale);
    if (!namespace.trim()) throw new Error("persistent bundle namespace must not be blank");

    const rows = await this.database
      .select({
        locale: uiTranslationBundles.locale,
        namespace: uiTranslationBundles.namespace,
        bundleVersion: uiTranslationBundles.bundleVersion,
        resources: uiTranslationBundles.resources,
      })
      .from(uiTranslationBundles)
      .where(
        and(
          eq(uiTranslationBundles.locale, persistentLocale),
          eq(uiTranslationBundles.namespace, namespace),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;

    const resources: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.resources)) {
      if (typeof value !== "string") {
        throw new Error(`compiled bundle contains unsupported structured payload: ${namespace}:${key}`);
      }
      resources[key] = value;
    }

    const verified = await compileNamespaceBundle(row.locale, row.namespace, resources);
    if (verified.bundleVersion !== row.bundleVersion) {
      throw new Error(`compiled bundle version mismatch: ${row.locale}:${row.namespace}`);
    }
    return verified;
  }

  async put(bundle: CompiledNamespaceBundle): Promise<void> {
    const persistentLocale = persistentBundleLocale(bundle.locale);
    const verified = await compileNamespaceBundle(persistentLocale, bundle.namespace, bundle.resources);
    if (verified.bundleVersion !== bundle.bundleVersion) {
      throw new Error(`compiled bundle version mismatch: ${bundle.locale}:${bundle.namespace}`);
    }

    await this.database
      .insert(uiTranslationBundles)
      .values({
        locale: verified.locale,
        namespace: verified.namespace,
        bundleVersion: verified.bundleVersion,
        resources: verified.resources,
      })
      .onConflictDoUpdate({
        target: [uiTranslationBundles.locale, uiTranslationBundles.namespace],
        set: {
          bundleVersion: verified.bundleVersion,
          resources: verified.resources,
          compiledAt: new Date(),
        },
      });
  }
}

function persistentBundleLocale(locale: string): string {
  const parsed = parseLocaleCandidate(locale);
  if (!parsed || parsed.canonicalInput !== parsed.translationTag || parsed.translationTag === "en") {
    throw new Error(`persistent bundle locale must be a canonical non-English translation locale: ${locale}`);
  }
  return parsed.translationTag;
}
