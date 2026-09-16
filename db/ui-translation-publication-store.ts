import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  compileExactLocaleNamespaceBundle,
  type CompiledNamespaceBundle,
} from "../app/localization/bundles";
import { manualTranslationPacks } from "../app/localization/manual-packs";
import {
  DatabaseMachineTranslationSource,
  DatabaseManualTranslationSource,
  type PersistentUiTranslationRow,
  type UiTranslationStore,
} from "../app/localization/persistent-sources";
import { LocalTranslationSource } from "../app/localization/sources";
import type {
  MachineUiTranslationPublication,
  UiTranslationPublicationStore,
} from "../app/localization/translation-publication";
import { canonicalPayload } from "../app/localization/sources";
import { translationTaskGenerationHeads, translationTasks, uiTranslationBundles, uiTranslations } from "./schema";

type PublicationBundleCompiler = (
  locale: string,
  namespace: string,
  store: UiTranslationStore,
  generationPolicyVersion: string,
) => Promise<CompiledNamespaceBundle>;

const compilePublicationBundle: PublicationBundleCompiler = (locale, namespace, store, policy) =>
  compileExactLocaleNamespaceBundle(locale, namespace, [
    new LocalTranslationSource(manualTranslationPacks),
    new DatabaseManualTranslationSource(store),
    new DatabaseMachineTranslationSource(store, undefined, policy),
  ]);

export class DrizzleUiTranslationPublicationStore implements UiTranslationPublicationStore {
  constructor(
    private readonly database: NodePgDatabase,
    private readonly compileBundle: PublicationBundleCompiler = compilePublicationBundle,
  ) {}

  async publishClaimedMachineResult(publication: MachineUiTranslationPublication): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const databaseNow = sql`statement_timestamp()`;
      // Lock the whole existing namespace head set in deterministic order. Every publishable
      // task owns one of these rows, so publications for different keys cannot compile from
      // mutually stale namespace snapshots or overwrite each other's bundle.
      const heads = await transaction.execute<{ source_key: string; current_generation: number }>(sql`
        select source_key, current_generation
          from ${translationTaskGenerationHeads}
         where ${translationTaskGenerationHeads.translationKind} = ${publication.task.translationKind}
           and ${translationTaskGenerationHeads.sourceNamespace} = ${publication.task.sourceIdentity.namespace}
           and ${translationTaskGenerationHeads.targetLocale} = ${publication.task.targetLocale}
         order by source_key
         for update
      `);
      const head = heads.rows.find((candidate) => candidate.source_key === publication.task.sourceIdentity.key);
      if (head?.current_generation !== publication.task.generation) return false;
      const completed = await transaction
        .update(translationTasks)
        .set({
          status: "completed",
          claimToken: null,
          leaseExpiresAt: null,
          staleAt: null,
          completedAt: databaseNow,
          updatedAt: databaseNow,
        })
        .where(and(
          eq(translationTasks.id, publication.task.id),
          eq(translationTasks.taskIdentity, publication.task.taskIdentity),
          eq(translationTasks.status, "processing"),
          eq(translationTasks.claimToken, publication.task.claimToken),
          eq(translationTasks.sourceNamespace, publication.task.sourceIdentity.namespace),
          eq(translationTasks.sourceKey, publication.task.sourceIdentity.key),
          eq(translationTasks.sourceFingerprint, publication.task.sourceFingerprint),
          eq(translationTasks.targetLocale, publication.task.targetLocale),
          eq(translationTasks.generationPolicyVersion, publication.task.generationPolicyVersion),
        ))
        .returning({ id: translationTasks.id });

      if (!completed[0]) return false;

      const provenanceMetadata: Record<string, string> = {};
      const attribution = publication.provenance.attribution?.trim();
      if (attribution) provenanceMetadata.attribution = attribution;
      const translatedPayload = canonicalPayload(publication.value);

      await transaction
        .insert(uiTranslations)
        .values({
          locale: publication.task.targetLocale,
          namespace: publication.task.sourceIdentity.namespace,
          key: publication.task.sourceIdentity.key,
          origin: "machine",
          status: "approved",
          sourceFingerprint: publication.task.sourceFingerprint,
          translatedPayload,
          generationPolicyVersion: publication.task.generationPolicyVersion,
          provider: publication.provenance.provider,
          providerModel: publication.provenance.model,
          provenanceMetadata,
        })
        .onConflictDoUpdate({
          target: [uiTranslations.locale, uiTranslations.namespace, uiTranslations.key, uiTranslations.origin],
          set: {
            status: "approved",
            sourceFingerprint: publication.task.sourceFingerprint,
            translatedPayload,
            generationPolicyVersion: publication.task.generationPolicyVersion,
            provider: publication.provenance.provider,
            providerModel: publication.provenance.model,
            provenanceMetadata,
            updatedAt: databaseNow,
          },
        });

      const rows = await transaction
        .select({
          locale: uiTranslations.locale,
          namespace: uiTranslations.namespace,
          key: uiTranslations.key,
          origin: uiTranslations.origin,
          status: uiTranslations.status,
          sourceFingerprint: uiTranslations.sourceFingerprint,
          translatedPayload: uiTranslations.translatedPayload,
          generationPolicyVersion: uiTranslations.generationPolicyVersion,
        })
        .from(uiTranslations)
        .where(and(
          eq(uiTranslations.locale, publication.task.targetLocale),
          eq(uiTranslations.namespace, publication.task.sourceIdentity.namespace),
          eq(uiTranslations.status, "approved"),
        ))
        .orderBy(asc(uiTranslations.key), asc(uiTranslations.origin));
      const bundleStore: UiTranslationStore = {
        readApproved: async () => rows satisfies readonly PersistentUiTranslationRow[],
      };
      const bundle = await this.compileBundle(
        publication.task.targetLocale,
        publication.task.sourceIdentity.namespace,
        bundleStore,
        publication.task.generationPolicyVersion,
      );
      await transaction
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
            compiledAt: databaseNow,
          },
        });

      return true;
    });
  }
}
