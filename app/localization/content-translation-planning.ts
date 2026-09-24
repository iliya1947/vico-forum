import { sha256Text } from "./fingerprint";
import { canonicalizeTranslationLocale, parseLocaleCandidate } from "./locale";
import type { LocaleRegistry } from "./registry";
import type {
  ContentTranslationRevision,
  ContentTranslationService,
} from "./content-translation";
import type {
  ContentSourceLocaleResolution,
  ContentSourceLocaleResolver,
} from "./content-source-locale";
import type {
  ContentTopicTitleTranslationTask,
  ContentTopicTitleTranslationTaskSpecification,
  TranslationTaskEnqueuer,
} from "./translation-tasks";

const CONTENT_TOPIC_TITLE_JOB_IDENTITY_FORMAT = "vico-content-topic-title-job-v1";
const CONTENT_TOPIC_TITLE_SOURCE_FINGERPRINT_FORMAT = "vico-content-topic-title-source-v1";

export type ContentTopicTitleNoJobReason =
  | "revision-not-current"
  | "target-ineligible"
  | "source-unresolved"
  | "same-locale"
  | "target-unsupported"
  | "translation-current"
  | "request-budget-denied";

export type ContentTopicTitlePlanningResult =
  | {
      readonly kind: "original";
      readonly taskCreated: false;
      readonly targetLocale: string;
      readonly reason: ContentTopicTitleNoJobReason;
    }
  | {
      readonly kind: "queued";
      readonly taskCreated: boolean;
      readonly task: ContentTopicTitleTranslationTask;
    };

export interface ContentTopicTitleTargetPolicyInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
}

export interface ContentTopicTitleTargetPolicy {
  supports(input: ContentTopicTitleTargetPolicyInput): boolean;
}

export interface ContentTopicTitleRequestBudgetInput {
  readonly contentType: "topic-title";
  readonly topicId: string;
  readonly revisionId: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly generationPolicyVersion: string;
}

export interface ContentTopicTitleRequestBudgetPolicy {
  allows(input: ContentTopicTitleRequestBudgetInput): boolean | Promise<boolean>;
}

export type ContentTopicTitleTaskUpsertResult =
  | {
      readonly outcome: "task";
      readonly created: boolean;
      readonly task: ContentTopicTitleTranslationTask;
    }
  | { readonly outcome: "revision-changed" };

export interface ContentTopicTitlePlanningStore {
  readCurrentRevision(topicId: string): Promise<ContentTranslationRevision | undefined>;
  upsertPending(
    specification: ContentTopicTitleTranslationTaskSpecification,
    expectedRevision: ContentTranslationRevision,
  ): Promise<ContentTopicTitleTaskUpsertResult>;
}

export interface ContentTopicTitleTranslationPlannerDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly sourceLocaleResolver: ContentSourceLocaleResolver;
  readonly contentTranslations: ContentTranslationService;
  readonly targetPolicy: ContentTopicTitleTargetPolicy;
  readonly requestBudgetPolicy: ContentTopicTitleRequestBudgetPolicy;
  readonly tasks: ContentTopicTitlePlanningStore;
  readonly enqueuer: TranslationTaskEnqueuer;
  readonly generationPolicyVersion: string;
}

export class ContentTopicTitleTranslationPlanner {
  constructor(private readonly dependencies: ContentTopicTitleTranslationPlannerDependencies) {
    requireNonBlank(dependencies.generationPolicyVersion, "generationPolicyVersion");
  }

  async planAndDispatch(
    requestedRevision: ContentTranslationRevision,
    targetLocaleInput: string,
  ): Promise<ContentTopicTitlePlanningResult> {
    if (requestedRevision.contentType !== "topic-title") {
      throw new TypeError("topic-title translation planning requires a topic-title revision");
    }

    const topicId = requireNonBlank(requestedRevision.contentId, "topic id");
    const revisionId = requireNonBlank(requestedRevision.revisionId, "revision id");
    const targetLocale = strictCanonicalTargetLocale(targetLocaleInput);
    if (!targetLocale) {
      throw new TypeError("topic-title translation target must be an already-canonical non-und locale");
    }
    if (!isActiveCanonicalTarget(this.dependencies.localeRegistry, targetLocale)) {
      return original(targetLocale, "target-ineligible");
    }

    const authoritativeRevision = await this.dependencies.tasks.readCurrentRevision(topicId);
    if (
      !authoritativeRevision
      || authoritativeRevision.contentType !== "topic-title"
      || authoritativeRevision.contentId !== topicId
      || authoritativeRevision.revisionId !== revisionId
    ) {
      return original(targetLocale, "revision-not-current");
    }

    const sourcePlan = await this.dependencies.sourceLocaleResolver.plan(
      authoritativeRevision,
      targetLocale,
    );
    if (sourcePlan.kind === "original") {
      return original(
        targetLocale,
        sourcePlan.reason === "same-locale" ? "same-locale" : "source-unresolved",
      );
    }

    if (!this.dependencies.targetPolicy.supports({
      sourceLocale: sourcePlan.sourceLocale,
      targetLocale,
    })) {
      return original(targetLocale, "target-unsupported");
    }

    const current = await this.dependencies.contentTranslations.readCurrent(
      authoritativeRevision,
      targetLocale,
    );
    if (current.selected === "translation") {
      return original(targetLocale, "translation-current");
    }

    if (!await this.dependencies.requestBudgetPolicy.allows({
      contentType: "topic-title",
      topicId,
      revisionId,
      sourceLocale: sourcePlan.sourceLocale,
      targetLocale,
      generationPolicyVersion: this.dependencies.generationPolicyVersion,
    })) {
      return original(targetLocale, "request-budget-denied");
    }

    const specification = await contentTopicTitleTaskSpecification(
      authoritativeRevision,
      sourcePlan.resolution,
      sourcePlan.sourceLocale,
      targetLocale,
      this.dependencies.generationPolicyVersion,
    );
    const upserted = await this.dependencies.tasks.upsertPending(
      specification,
      authoritativeRevision,
    );
    if (upserted.outcome === "revision-changed") {
      return original(targetLocale, "revision-not-current");
    }

    await this.dependencies.enqueuer.enqueue({ translationTaskId: upserted.task.id });
    return {
      kind: "queued",
      taskCreated: upserted.created,
      task: upserted.task,
    };
  }
}

export async function contentTopicTitleTaskSpecification(
  revision: ContentTranslationRevision,
  resolution: Exclude<ContentSourceLocaleResolution, { kind: "unresolved" }>,
  resolvedSourceLocale: string,
  targetLocale: string,
  generationPolicyVersion: string,
): Promise<ContentTopicTitleTranslationTaskSpecification> {
  if (revision.contentType !== "topic-title") {
    throw new TypeError("content task specification requires a topic-title revision");
  }
  const topicId = requireNonBlank(revision.contentId, "topic id");
  const revisionId = requireNonBlank(revision.revisionId, "revision id");
  const revisionSourceLocale = strictCanonicalRevisionSourceLocale(revision.sourceLocale);
  const canonicalResolvedSourceLocale = strictCanonicalTargetLocale(resolvedSourceLocale);
  const canonicalTargetLocale = strictCanonicalTargetLocale(targetLocale);
  const policyVersion = requireNonBlank(generationPolicyVersion, "generationPolicyVersion");

  if (!revisionSourceLocale || !canonicalResolvedSourceLocale || !canonicalTargetLocale) {
    throw new TypeError("content task locales must be canonical translation locales");
  }
  if (canonicalResolvedSourceLocale === canonicalTargetLocale) {
    throw new TypeError("content task target locale must differ from resolved source locale");
  }

  const sourceResolutionOrigin = resolution.resolutionOrigin;
  if (
    sourceResolutionOrigin !== "revision-metadata"
    && sourceResolutionOrigin !== "detector"
  ) {
    throw new TypeError("content task source resolution origin is invalid");
  }
  if (
    (sourceResolutionOrigin === "revision-metadata"
      && (revisionSourceLocale === "und" || revisionSourceLocale !== canonicalResolvedSourceLocale))
    || (sourceResolutionOrigin === "detector" && revisionSourceLocale !== "und")
  ) {
    throw new TypeError("content task source resolution does not match immutable revision metadata");
  }

  const sourceFingerprint = await sha256Text(JSON.stringify([
    CONTENT_TOPIC_TITLE_SOURCE_FINGERPRINT_FORMAT,
    "topic-title",
    topicId,
    revisionId,
    revisionSourceLocale,
    canonicalResolvedSourceLocale,
    sourceResolutionOrigin,
  ]));
  const identityInput = {
    translationKind: "content-topic-title" as const,
    sourceIdentity: { topicId, revisionId },
    revisionSourceLocale,
    resolvedSourceLocale: canonicalResolvedSourceLocale,
    sourceResolutionOrigin,
    sourceFingerprint,
    targetLocale: canonicalTargetLocale,
    generationPolicyVersion: policyVersion,
  };

  return {
    ...identityInput,
    taskIdentity: await contentTopicTitleTaskIdentity(identityInput),
  };
}

type ContentTopicTitleIdentityInput = Omit<
  ContentTopicTitleTranslationTaskSpecification,
  "taskIdentity"
>;

export async function contentTopicTitleTaskIdentity(
  specification: ContentTopicTitleIdentityInput,
): Promise<string> {
  return sha256Text(JSON.stringify([
    CONTENT_TOPIC_TITLE_JOB_IDENTITY_FORMAT,
    specification.translationKind,
    specification.sourceIdentity.topicId,
    specification.sourceIdentity.revisionId,
    specification.revisionSourceLocale,
    specification.resolvedSourceLocale,
    specification.sourceResolutionOrigin,
    specification.targetLocale,
    specification.generationPolicyVersion,
  ]));
}

function isActiveCanonicalTarget(registry: LocaleRegistry, targetLocale: string): boolean {
  const match = registry.find(targetLocale);
  return Boolean(
    match
    && match.kind === "canonical"
    && match.locale.tag === targetLocale
    && match.locale.publicationStatus === "active",
  );
}

function strictCanonicalRevisionSourceLocale(value: string): string | undefined {
  if (value === "und") return value;
  return strictCanonicalTargetLocale(value);
}

function strictCanonicalTargetLocale(value: string): string | undefined {
  const parsed = parseLocaleCandidate(value);
  const canonical = canonicalizeTranslationLocale(value);
  if (
    !parsed
    || !canonical
    || canonical === "und"
    || parsed.canonicalInput !== value
    || parsed.translationTag !== value
    || canonical !== value
  ) {
    return undefined;
  }
  return canonical;
}

function requireNonBlank(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-blank string`);
  }
  return value;
}

function original(
  targetLocale: string,
  reason: ContentTopicTitleNoJobReason,
): ContentTopicTitlePlanningResult {
  return {
    kind: "original",
    taskCreated: false,
    targetLocale,
    reason,
  };
}
