import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CompiledNamespaceBundle,
  TranslationBundleStore,
} from "../app/localization/bundles";
import { uiTranslationBundles } from "./schema";

export class DrizzleUiTranslationBundleStore implements TranslationBundleStore {
  constructor(private readonly database: NodePgDatabase) {}

  async read(locale: string, namespace: string): Promise<CompiledNamespaceBundle | undefined> {
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
          eq(uiTranslationBundles.locale, locale),
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

    return {
      locale: row.locale,
      namespace: row.namespace,
      bundleVersion: row.bundleVersion,
      resources,
    };
  }

  async put(bundle: CompiledNamespaceBundle): Promise<void> {
    await this.database
      .insert(uiTranslationBundles)
      .values({
        locale: bundle.locale,
        namespace: bundle.namespace,
        bundleVersion: bundle.bundleVersion,
        resources: bundle.resources,
      })
      .onConflictDoUpdate({
        target: [uiTranslationBundles.locale, uiTranslationBundles.namespace],
        set: {
          bundleVersion: bundle.bundleVersion,
          resources: bundle.resources,
          compiledAt: new Date(),
        },
      });
  }
}
