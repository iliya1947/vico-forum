import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  verifyCompiledNamespaceBundle,
  type CompiledNamespaceBundle,
  type TranslationBundleStore,
} from "../app/localization/bundles";
import { parseLocaleCandidate } from "../app/localization/locale";
import { uiTranslationBundles } from "./schema";

export interface PersistedBundleIdentity {
  locale: string;
  namespace: string;
}

export type PersistedBundleReconciliationOutcome = "absent" | "current" | "deleted";

export class DrizzleUiTranslationBundleStore implements TranslationBundleStore {
  constructor(
    private readonly database: NodePgDatabase,
    private readonly afterReconciliationLock?: (identity: PersistedBundleIdentity) => void | Promise<void>,
  ) {}

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

    return verifyPersistedCompiledBundle(row);
  }

  async put(bundle: CompiledNamespaceBundle): Promise<void> {
    const persistentLocale = persistentBundleLocale(bundle.locale);
    const verified = await verifyCompiledNamespaceBundle(persistentLocale, bundle.namespace, bundle.resources);
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

  async listPersistedBundleIdentities(): Promise<PersistedBundleIdentity[]> {
    return this.database
      .select({
        locale: uiTranslationBundles.locale,
        namespace: uiTranslationBundles.namespace,
      })
      .from(uiTranslationBundles)
      .orderBy(asc(uiTranslationBundles.locale), asc(uiTranslationBundles.namespace));
  }

  async reconcilePersistedBundle(
    locale: string,
    namespace: string,
  ): Promise<PersistedBundleReconciliationOutcome> {
    if (!locale.trim()) throw new Error("persisted bundle reconciliation locale must not be blank");
    if (!namespace.trim()) throw new Error("persisted bundle reconciliation namespace must not be blank");

    return this.database.transaction(async (transaction) => {
      const locked = await transaction.execute<{
        locale: string;
        namespace: string;
        bundle_version: string;
        resources: unknown;
      }>(sql`
        select
          ${uiTranslationBundles.locale} as locale,
          ${uiTranslationBundles.namespace} as namespace,
          ${uiTranslationBundles.bundleVersion} as bundle_version,
          ${uiTranslationBundles.resources} as resources
        from ${uiTranslationBundles}
        where ${uiTranslationBundles.locale} = ${locale}
          and ${uiTranslationBundles.namespace} = ${namespace}
        for update
      `);

      const row = locked.rows[0];
      if (!row) return "absent";

      await this.afterReconciliationLock?.({ locale: row.locale, namespace: row.namespace });

      try {
        await verifyPersistedCompiledBundle({
          locale: row.locale,
          namespace: row.namespace,
          bundleVersion: row.bundle_version,
          resources: row.resources,
        });
        return "current";
      } catch (error) {
        if (!(error instanceof PersistentBundleIntegrityError)) throw error;
      }

      await transaction
        .delete(uiTranslationBundles)
        .where(
          and(
            eq(uiTranslationBundles.locale, row.locale),
            eq(uiTranslationBundles.namespace, row.namespace),
          ),
        );

      return "deleted";
    });
  }
}

export class PersistentBundleIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistentBundleIntegrityError";
  }
}

export async function verifyPersistedCompiledBundle(row: {
  locale: string;
  namespace: string;
  bundleVersion: string;
  resources: unknown;
}): Promise<CompiledNamespaceBundle> {
  try {
    if (!row.resources || typeof row.resources !== "object" || Array.isArray(row.resources)) {
      throw new Error("compiled bundle resources must be an object");
    }
    const resources: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.resources)) {
      if (typeof value !== "string") {
        throw new Error(`compiled bundle contains unsupported structured payload: ${row.namespace}:${key}`);
      }
      resources[key] = value;
    }
    const verified = await verifyCompiledNamespaceBundle(row.locale, row.namespace, resources);
    if (verified.bundleVersion !== row.bundleVersion) {
      throw new Error(`compiled bundle version mismatch: ${row.locale}:${row.namespace}`);
    }
    return verified;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new PersistentBundleIntegrityError(
      `persisted compiled bundle is not current or valid: ${row.locale}:${row.namespace}${detail}`,
      { cause: error },
    );
  }
}

function persistentBundleLocale(locale: string): string {
  const parsed = parseLocaleCandidate(locale);
  if (!parsed || parsed.canonicalInput !== parsed.translationTag || parsed.translationTag === "en") {
    throw new Error(`persistent bundle locale must be a canonical non-English translation locale: ${locale}`);
  }
  return parsed.translationTag;
}
