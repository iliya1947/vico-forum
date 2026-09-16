import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  MachineUiTranslationPublication,
  UiTranslationPublicationStore,
} from "../app/localization/translation-publication";
import { canonicalPayload } from "../app/localization/sources";
import { translationTasks, uiTranslations } from "./schema";

export class DrizzleUiTranslationPublicationStore implements UiTranslationPublicationStore {
  constructor(private readonly database: NodePgDatabase) {}

  async publishClaimedMachineResult(publication: MachineUiTranslationPublication): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const databaseNow = sql`statement_timestamp()`;
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

      const provenanceMetadata = publication.provenance.attribution?.trim()
        ? { attribution: publication.provenance.attribution }
        : {};
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

      return true;
    });
  }
}
