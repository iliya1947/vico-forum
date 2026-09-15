import { catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { DatabaseManualTranslationSource, type UiTranslationStore } from "./persistent-sources";
import type { LocaleRegistry } from "./registry";
import type { TranslationSource } from "./sources";
import type {
  TranslationTask,
  TranslationTaskMessage,
  TranslationTaskStore,
} from "./translation-tasks";

export type TranslationTaskStaleReason =
  | "source-missing"
  | "source-changed"
  | "policy-changed"
  | "target-locale-ineligible"
  | "manual-translation-exists";

export interface ClaimedUiTranslationExecutionContext {
  readonly task: TranslationTask & { readonly status: "processing"; readonly claimToken: string };
  readonly source: UiMessageDescriptor;
}

export type TranslationTaskConsumerResult =
  | { readonly outcome: "eligible"; readonly context: ClaimedUiTranslationExecutionContext }
  | { readonly outcome: "stale"; readonly reason: TranslationTaskStaleReason }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" | "claim-lost" };

export interface TranslationTaskConsumerDependencies {
  readonly tasks: TranslationTaskStore;
  readonly localeRegistry: LocaleRegistry;
  readonly localManualSource: TranslationSource;
  readonly persistentStore: UiTranslationStore;
  readonly generationPolicyVersion: string;
  readonly now: () => Date;
  readonly leaseDurationMs: number;
}

/** Claims and revalidates durable work without knowing about Queue or translation providers. */
export class UiTranslationTaskConsumer {
  readonly #persistentManualSource: TranslationSource;

  constructor(private readonly dependencies: TranslationTaskConsumerDependencies) {
    if (!dependencies.generationPolicyVersion.trim()) {
      throw new TypeError("generationPolicyVersion must not be blank");
    }
    if (!Number.isSafeInteger(dependencies.leaseDurationMs) || dependencies.leaseDurationMs <= 0) {
      throw new TypeError("leaseDurationMs must be a positive integer");
    }
    this.#persistentManualSource = new DatabaseManualTranslationSource(dependencies.persistentStore);
  }

  async consume(message: TranslationTaskMessage): Promise<TranslationTaskConsumerResult> {
    const claimedAt = this.dependencies.now();
    const claim = await this.dependencies.tasks.claim(
      message.translationTaskId,
      claimedAt,
      this.dependencies.leaseDurationMs,
    );
    if (claim.outcome !== "claimed") return { outcome: claim.outcome };

    const reason = await this.#staleReason(claim.task);
    if (!reason) {
      return { outcome: "eligible", context: { task: claim.task, source: this.#descriptor(claim.task)! } };
    }

    const transitioned = await this.dependencies.tasks.markStale(
      claim.task.id,
      claim.task.claimToken,
      this.dependencies.now(),
    );
    return transitioned ? { outcome: "stale", reason } : { outcome: "claim-lost" };
  }

  async #staleReason(task: TranslationTask): Promise<TranslationTaskStaleReason | undefined> {
    const descriptor = this.#descriptor(task);
    if (!descriptor) return "source-missing";
    if (await sourceFingerprint(descriptor) !== task.sourceFingerprint) return "source-changed";
    if (task.generationPolicyVersion !== this.dependencies.generationPolicyVersion) return "policy-changed";

    const locale = this.dependencies.localeRegistry.find(task.targetLocale);
    if (
      !locale || locale.kind !== "canonical" || locale.locale.tag !== task.targetLocale ||
      locale.locale.tag === "en" || locale.locale.publicationStatus === "disabled"
    ) return "target-locale-ineligible";

    const namespaces = [task.sourceIdentity.namespace];
    for (const source of [this.dependencies.localManualSource, this.#persistentManualSource]) {
      const result = await source.load(task.targetLocale, namespaces);
      if (Object.hasOwn(result.resources[task.sourceIdentity.namespace] ?? {}, task.sourceIdentity.key)) {
        return "manual-translation-exists";
      }
    }
    return undefined;
  }

  #descriptor(task: TranslationTask): UiMessageDescriptor | undefined {
    return catalogDescriptors().find((candidate) =>
      candidate.namespace === task.sourceIdentity.namespace && candidate.key === task.sourceIdentity.key
    );
  }
}
