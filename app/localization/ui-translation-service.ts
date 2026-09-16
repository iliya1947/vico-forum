import { canonicalEnglishCatalog, type UiMessageDescriptor, type UiNamespace } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";
import { canonicalizeTranslationLocale } from "./locale";
import type { UiTranslationStore } from "./persistent-sources";
import {
  DatabaseMachineTranslationSource,
  DatabaseManualTranslationSource,
} from "./persistent-sources";
import type { LocaleRegistry } from "./registry";
import type { TranslationSource } from "./sources";

const UI_TRANSLATION_JOB_IDENTITY_FORMAT = "vico-ui-translation-job-v1";

export interface UiTranslationJobSourceIdentity {
  readonly namespace: string;
  readonly key: string;
}

export interface UiTranslationJobSpecification {
  readonly translationKind: "ui";
  readonly sourceIdentity: UiTranslationJobSourceIdentity;
  readonly sourceFingerprint: string;
  readonly targetLocale: string;
  readonly generationPolicyVersion: string;
  readonly taskIdentity: string;
}

/** Provider- and transport-independent boundary for dispatching planned translation jobs. */
export interface TranslationJobDispatcher {
  dispatch(jobs: readonly UiTranslationJobSpecification[]): Promise<void>;
}

export interface UiTranslationGenerationRequest {
  readonly targetLocale: string;
  readonly namespaces?: readonly string[];
}

export class UiTranslationGenerationScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UiTranslationGenerationScopeError";
  }
}

export interface UiTranslationServiceDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly localManualSource: TranslationSource;
  readonly persistentStore: UiTranslationStore;
  readonly dispatcher: TranslationJobDispatcher;
  readonly generationPolicyVersion: string;
}

export function resolveUiTranslationGenerationTarget(
  localeRegistry: LocaleRegistry,
  candidate: string,
): string | undefined {
  const canonicalCandidate = canonicalizeTranslationLocale(candidate);
  const match = canonicalCandidate ? localeRegistry.find(canonicalCandidate) : undefined;
  if (
    !canonicalCandidate ||
    !match ||
    match.kind !== "canonical" ||
    match.locale.tag !== canonicalCandidate ||
    match.locale.tag === "en" ||
    match.locale.publicationStatus === "disabled"
  ) {
    return undefined;
  }
  return match.locale.tag;
}

export class UiTranslationService {
  readonly #manualSource: TranslationSource;
  readonly #machineSource: TranslationSource;

  constructor(private readonly dependencies: UiTranslationServiceDependencies) {
    if (!dependencies.generationPolicyVersion.trim()) {
      throw new Error("generationPolicyVersion must not be blank");
    }
    this.#manualSource = new DatabaseManualTranslationSource(dependencies.persistentStore);
    this.#machineSource = new DatabaseMachineTranslationSource(
      dependencies.persistentStore,
      undefined,
      dependencies.generationPolicyVersion,
    );
  }

  async plan(request: UiTranslationGenerationRequest): Promise<readonly UiTranslationJobSpecification[]> {
    const targetLocale = this.#targetLocale(request.targetLocale);
    const namespaces = requestedNamespaces(request.namespaces);
    const sources = [this.dependencies.localManualSource, this.#manualSource, this.#machineSource];
    const current = new Set<string>();

    // Deliberately load only the exact target. Locale fallbacks and canonical English are not
    // evidence that a target-locale unit has a current translation.
    for (const source of sources) {
      const result = await source.load(targetLocale, namespaces);
      for (const [namespace, messages] of Object.entries(result.resources)) {
        for (const key of Object.keys(messages)) current.add(`${namespace}:${key}`);
      }
    }

    const jobs: UiTranslationJobSpecification[] = [];
    for (const descriptor of descriptorsFor(namespaces)) {
      if (current.has(`${descriptor.namespace}:${descriptor.key}`)) continue;
      const specification = {
        translationKind: "ui" as const,
        sourceIdentity: { namespace: descriptor.namespace, key: descriptor.key },
        sourceFingerprint: await sourceFingerprint(descriptor),
        targetLocale,
        generationPolicyVersion: this.dependencies.generationPolicyVersion,
      };
      jobs.push({
        ...specification,
        taskIdentity: await uiTranslationJobIdentity(specification),
      });
    }
    return jobs;
  }

  async planAndDispatch(
    request: UiTranslationGenerationRequest,
  ): Promise<readonly UiTranslationJobSpecification[]> {
    const jobs = await this.plan(request);
    if (jobs.length > 0) await this.dependencies.dispatcher.dispatch(jobs);
    return jobs;
  }

  #targetLocale(candidate: string): string {
    const targetLocale = resolveUiTranslationGenerationTarget(this.dependencies.localeRegistry, candidate);
    if (!targetLocale) {
      throw new UiTranslationGenerationScopeError(`UI generation is not allowed for locale: ${candidate}`);
    }
    return targetLocale;
  }
}

type JobIdentityInput = Omit<UiTranslationJobSpecification, "taskIdentity">;

export async function uiTranslationJobIdentity(specification: JobIdentityInput): Promise<string> {
  return sha256Text(JSON.stringify([
    UI_TRANSLATION_JOB_IDENTITY_FORMAT,
    specification.translationKind,
    specification.sourceIdentity.namespace,
    specification.sourceIdentity.key,
    specification.sourceFingerprint,
    specification.targetLocale,
    specification.generationPolicyVersion,
  ]));
}

function requestedNamespaces(requested: readonly string[] | undefined): UiNamespace[] {
  const namespaces = requested ?? Object.keys(canonicalEnglishCatalog);
  const unique = [...new Set(namespaces)];
  const canonicalNamespaces: UiNamespace[] = [];
  for (const namespace of unique) {
    if (!isCanonicalUiNamespace(namespace)) {
      throw new UiTranslationGenerationScopeError(`Unknown canonical UI namespace: ${namespace}`);
    }
    canonicalNamespaces.push(namespace);
  }
  return canonicalNamespaces.sort(deterministicCompare);
}

function isCanonicalUiNamespace(namespace: string): namespace is UiNamespace {
  return Object.hasOwn(canonicalEnglishCatalog, namespace);
}

function descriptorsFor(namespaces: readonly UiNamespace[]): UiMessageDescriptor[] {
  return namespaces
    .flatMap((namespace) => Object.values(canonicalEnglishCatalog[namespace]) as UiMessageDescriptor[])
    .sort((left, right) => deterministicCompare(
      `${left.namespace}\0${left.key}`,
      `${right.namespace}\0${right.key}`,
    ));
}

function deterministicCompare(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  for (let index = 0; index < Math.min(leftBytes.length, rightBytes.length); index++) {
    if (leftBytes[index] !== rightBytes[index]) return leftBytes[index]! - rightBytes[index]!;
  }
  return leftBytes.length - rightBytes.length;
}
