import { sha256Text } from "./fingerprint";
import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
  type ProtectedMarkdownTranslationDocument,
} from "./content-markdown-translation";
import { canonicalizeTranslationLocale, parseLocaleCandidate } from "./locale";
import type { LocaleRegistry } from "./registry";
import type {
  ContentTranslationRevision,
  ContentTranslationService,
} from "./content-translation";
import {
  isActiveContentTranslationTarget,
} from "./content-translation-planning";
import type {
  ContentSourceLocaleResolution,
  ContentSourceLocaleResolver,
} from "./content-source-locale";
import type {
  ContentPostBodyProviderCapability,
} from "./content-translation-provider";
import type {
  ContentPostBodyTranslationTask,
  ContentPostBodyTranslationTaskSpecification,
  TranslationTaskEnqueuer,
} from "./translation-tasks";

const CONTENT_POST_BODY_JOB_IDENTITY_FORMAT = "vico-content-post-body-job-v1";
const CONTENT_POST_BODY_SOURCE_FINGERPRINT_FORMAT = "vico-content-post-body-source-v1";

export type ContentPostBodyNoJobReason =
  | "revision-not-current"
  | "target-ineligible"
  | "source-unresolved"
  | "same-locale"
  | "no-translatable-content"
  | "target-unsupported"
  | "translation-current"
  | "request-budget-denied";

export type ContentPostBodyPlanningResult =
  | {
      readonly kind: "original";
      readonly taskCreated: false;
      readonly targetLocale: string;
      readonly reason: ContentPostBodyNoJobReason;
    }
  | {
      readonly kind: "queued";
      readonly taskCreated: boolean;
      readonly task: ContentPostBodyTranslationTask;
    };

export interface ContentPostBodyRequestBudgetInput {
  readonly contentType: "post-body";
  readonly postId: string;
  readonly revisionId: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly protectedContentPolicyVersion: string;
  readonly generationPolicyVersion: string;
}

export interface ContentPostBodyRequestBudgetPolicy {
  allows(input: ContentPostBodyRequestBudgetInput): boolean | Promise<boolean>;
}

export type ContentPostBodyTaskUpsertResult =
  | {
      readonly outcome: "task";
      readonly created: boolean;
      readonly task: ContentPostBodyTranslationTask;
    }
  | { readonly outcome: "revision-changed" };

export interface ContentPostBodyPlanningStore {
  readCurrentRevision(postId: string): Promise<ContentTranslationRevision | undefined>;
  upsertPending(
    specification: ContentPostBodyTranslationTaskSpecification,
    expectedRevision: ContentTranslationRevision,
  ): Promise<ContentPostBodyTaskUpsertResult>;
}

export interface ContentPostBodyTranslationPlannerDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly sourceLocaleResolver: ContentSourceLocaleResolver;
  readonly contentTranslations: ContentTranslationService;
  readonly providerCapability: ContentPostBodyProviderCapability;
  readonly requestBudgetPolicy: ContentPostBodyRequestBudgetPolicy;
  readonly tasks: ContentPostBodyPlanningStore;
  readonly enqueuer: TranslationTaskEnqueuer;
  readonly generationPolicyVersion: string;
}

export class ContentPostBodyTranslationPlanner {
  constructor(private readonly dependencies: ContentPostBodyTranslationPlannerDependencies) {
    requireNonBlank(dependencies.generationPolicyVersion, "generationPolicyVersion");
  }

  async planAndDispatch(
    requestedRevision: ContentTranslationRevision,
    targetLocaleInput: string,
  ): Promise<ContentPostBodyPlanningResult> {
    if (requestedRevision.contentType !== "post-body") {
      throw new TypeError("post-body translation planning requires a post-body revision");
    }

    const postId = requireNonBlank(requestedRevision.contentId, "post id");
    const revisionId = requireNonBlank(requestedRevision.revisionId, "revision id");
    const targetLocale = strictCanonicalTargetLocale(targetLocaleInput);
    if (!targetLocale || !isActiveContentTranslationTarget(this.dependencies.localeRegistry, targetLocale)) {
      return original(targetLocale ?? targetLocaleInput, "target-ineligible");
    }

    const authoritativeRevision = await this.dependencies.tasks.readCurrentRevision(postId);
    if (
      !authoritativeRevision
      || authoritativeRevision.contentType !== "post-body"
      || authoritativeRevision.contentId !== postId
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

    const protectedDocument = protectMarkdownForTranslation(authoritativeRevision.originalContent);
    if (protectedDocument.segments.length === 0) {
      return original(targetLocale, "no-translatable-content");
    }

    if (!this.dependencies.providerCapability.supports({
      sourceLocale: sourcePlan.sourceLocale,
      targetLocale,
      segmentCharacterCounts: protectedDocument.segments.map((segment) => segment.text.length),
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
      contentType: "post-body",
      postId,
      revisionId,
      sourceLocale: sourcePlan.sourceLocale,
      targetLocale,
      protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      generationPolicyVersion: this.dependencies.generationPolicyVersion,
    })) {
      return original(targetLocale, "request-budget-denied");
    }

    const specification = await contentPostBodyTaskSpecification(
      authoritativeRevision,
      sourcePlan.resolution,
      sourcePlan.sourceLocale,
      targetLocale,
      CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      this.dependencies.generationPolicyVersion,
      protectedDocument,
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

export async function contentPostBodyTaskSpecification(
  revision: ContentTranslationRevision,
  resolution: Exclude<ContentSourceLocaleResolution, { kind: "unresolved" }>,
  resolvedSourceLocale: string,
  targetLocale: string,
  protectedContentPolicyVersion: string,
  generationPolicyVersion: string,
  protectedDocument: Pick<ProtectedMarkdownTranslationDocument, "protectedMarkdown" | "segments">,
): Promise<ContentPostBodyTranslationTaskSpecification> {
  if (revision.contentType !== "post-body") {
    throw new TypeError("content task specification requires a post-body revision");
  }
  const postId = requireNonBlank(revision.contentId, "post id");
  const revisionId = requireNonBlank(revision.revisionId, "revision id");
  const revisionSourceLocale = strictCanonicalRevisionSourceLocale(revision.sourceLocale);
  const canonicalResolvedSourceLocale = strictCanonicalTargetLocale(resolvedSourceLocale);
  const canonicalTargetLocale = strictCanonicalTargetLocale(targetLocale);
  const protectionVersion = requireNonBlank(
    protectedContentPolicyVersion,
    "protectedContentPolicyVersion",
  );
  const generationVersion = requireNonBlank(
    generationPolicyVersion,
    "generationPolicyVersion",
  );

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
  if (protectedDocument.segments.length === 0) {
    throw new TypeError("post-body task requires at least one translatable protected segment");
  }

  const sourceFingerprint = await contentPostBodySourceFingerprint({
    postId,
    revisionId,
    revisionSourceLocale,
    resolvedSourceLocale: canonicalResolvedSourceLocale,
    sourceResolutionOrigin,
    protectedContentPolicyVersion: protectionVersion,
    protectedMarkdown: protectedDocument.protectedMarkdown,
    segments: protectedDocument.segments,
  });
  const identityInput = {
    translationKind: "content-post-body" as const,
    sourceIdentity: { postId, revisionId },
    revisionSourceLocale,
    resolvedSourceLocale: canonicalResolvedSourceLocale,
    sourceResolutionOrigin,
    sourceFingerprint,
    targetLocale: canonicalTargetLocale,
    protectedContentPolicyVersion: protectionVersion,
    generationPolicyVersion: generationVersion,
  };

  return {
    ...identityInput,
    taskIdentity: await contentPostBodyTaskIdentity(identityInput),
  };
}

export interface ContentPostBodySourceFingerprintInput {
  readonly postId: string;
  readonly revisionId: string;
  readonly revisionSourceLocale: string;
  readonly resolvedSourceLocale: string;
  readonly sourceResolutionOrigin: "revision-metadata" | "detector";
  readonly protectedContentPolicyVersion: string;
  readonly protectedMarkdown: string;
  readonly segments: readonly {
    readonly id: string;
    readonly text: string;
  }[];
}

export async function contentPostBodySourceFingerprint(
  input: ContentPostBodySourceFingerprintInput,
): Promise<string> {
  return sha256Text(JSON.stringify([
    CONTENT_POST_BODY_SOURCE_FINGERPRINT_FORMAT,
    "post-body",
    input.postId,
    input.revisionId,
    input.revisionSourceLocale,
    input.resolvedSourceLocale,
    input.sourceResolutionOrigin,
    input.protectedContentPolicyVersion,
    input.protectedMarkdown,
    input.segments.map((segment) => [segment.id, segment.text]),
  ]));
}

type ContentPostBodyIdentityInput = Omit<
  ContentPostBodyTranslationTaskSpecification,
  "taskIdentity"
>;

export async function contentPostBodyTaskIdentity(
  specification: ContentPostBodyIdentityInput,
): Promise<string> {
  return sha256Text(JSON.stringify([
    CONTENT_POST_BODY_JOB_IDENTITY_FORMAT,
    specification.translationKind,
    specification.sourceIdentity.postId,
    specification.sourceIdentity.revisionId,
    specification.revisionSourceLocale,
    specification.resolvedSourceLocale,
    specification.sourceResolutionOrigin,
    specification.sourceFingerprint,
    specification.targetLocale,
    specification.protectedContentPolicyVersion,
    specification.generationPolicyVersion,
  ]));
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
  reason: ContentPostBodyNoJobReason,
): ContentPostBodyPlanningResult {
  return {
    kind: "original",
    taskCreated: false,
    targetLocale,
    reason,
  };
}
