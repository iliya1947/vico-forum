import { sha256Text } from "./fingerprint";
import {
  contentPostBodyTaskPreflight,
  type ContentPostBodyTaskPreflightDependencies,
  type ContentPostBodyTaskStaleReason,
} from "./content-post-body-task-consumer";
import {
  contentTopicTitleTaskPreflight,
  type ContentTopicTitleTaskPreflightDependencies,
  type ContentTopicTitleTaskStaleReason,
} from "./content-translation-task-consumer";
import {
  PUBLIC_FORUM_POST_BODY_CLASSIFICATION,
  PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION,
  publicForumPostBodyProviderCapabilities,
  publicForumTopicTitleProviderCapability,
} from "./content-translation-provider";
import type { TranslationProviderRouter } from "./translation-provider";
import type {
  ContentPostBodyTranslationTask,
  ContentTopicTitleTranslationTask,
  TranslationTaskMessage,
} from "./translation-tasks";

const OCCURRENCE_KEY_FORMAT = "vico-content-provider-attempt-v1";
const SAFE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_PROVIDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_RESERVATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DEFAULT_UNCONFIGURED_RETRY_MS = 60_000;

export interface ContentProviderAllowanceEnvelope {
  readonly maxCalls: number;
  readonly maxSourceCharacters: number;
  readonly segmentCharacterCounts: readonly number[];
}

export interface ContentProviderAllowanceRequest {
  readonly provider: string;
  readonly contentClassification:
    | typeof PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION
    | typeof PUBLIC_FORUM_POST_BODY_CLASSIFICATION;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly occurrenceKey: string;
  readonly envelope: ContentProviderAllowanceEnvelope;
}

export type ContentProviderAllowanceDecision =
  | {
      readonly outcome: "admitted";
      readonly reservationReference?: string;
    }
  | {
      readonly outcome: "deferred" | "unavailable";
      readonly retryNotBefore: Date;
      readonly reason: string;
    };

export interface ContentProviderAllowanceAdapter {
  admit(request: ContentProviderAllowanceRequest): Promise<ContentProviderAllowanceDecision>;
}

export interface ContentProviderAllowanceOccurrence {
  readonly generation: number;
  readonly attempt: number;
}

export type ContentProviderAllowanceTask =
  | ContentTopicTitleTranslationTask
  | ContentPostBodyTranslationTask;

export type ContentProviderAllowanceAcquireResult =
  | {
      readonly outcome: "acquired";
      readonly task: ContentProviderAllowanceTask;
      readonly occurrence: ContentProviderAllowanceOccurrence;
      readonly admissionToken: string;
    }
  | {
      readonly outcome: "admitted";
      readonly task: ContentProviderAllowanceTask;
      readonly occurrence: ContentProviderAllowanceOccurrence;
      readonly provider: string;
    }
  | {
      readonly outcome: "deferred";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | {
      readonly outcome:
        | "admission-in-progress"
        | "execution-in-progress"
        | "terminal"
        | "not-found"
        | "exhausted";
    };

export interface ContentProviderAllowanceStore {
  acquireContentProviderAllowance(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentProviderAllowanceAcquireResult>;

  persistContentProviderAllowanceAdmission(
    id: string,
    admissionToken: string,
    occurrence: ContentProviderAllowanceOccurrence,
    provider: string,
    reservationReference?: string,
  ): Promise<boolean>;

  persistContentProviderAllowanceDeferral(
    id: string,
    admissionToken: string,
    occurrence: ContentProviderAllowanceOccurrence,
    retryNotBefore: Date,
    reason: string,
  ): Promise<Date | undefined>;

  markContentTaskStaleFromAllowance(
    id: string,
    admissionToken: string,
  ): Promise<boolean>;
}

export type ContentProviderAllowanceGateResult<StaleReason extends string> =
  | { readonly outcome: "admitted"; readonly provider: string }
  | { readonly outcome: "exhausted" }
  | { readonly outcome: "terminal" | "not-found" | "execution-in-progress" | "admission-in-progress" }
  | {
      readonly outcome: "deferred";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | { readonly outcome: "stale"; readonly reason: StaleReason }
  | { readonly outcome: "claim-lost" };

interface CommonGateDependencies {
  readonly store: ContentProviderAllowanceStore;
  readonly adapter?: ContentProviderAllowanceAdapter;
  readonly providerRouter: Pick<TranslationProviderRouter, "selectProvider">;
  readonly admissionLeaseDurationMs: number;
  readonly unconfiguredRetryMs?: number;
}

export interface ContentTopicTitleAllowanceGateDependencies
  extends CommonGateDependencies,
    ContentTopicTitleTaskPreflightDependencies {}

export class ContentTopicTitleAllowanceGate {
  constructor(private readonly dependencies: ContentTopicTitleAllowanceGateDependencies) {
    validateGateDependencies(dependencies);
  }

  async admit(
    message: TranslationTaskMessage,
  ): Promise<ContentProviderAllowanceGateResult<ContentTopicTitleTaskStaleReason>> {
    const acquired = await this.dependencies.store.acquireContentProviderAllowance(
      message.translationTaskId,
      this.dependencies.admissionLeaseDurationMs,
    );
    if (acquired.outcome !== "acquired") return passAcquireResult(acquired);
    if (acquired.task.translationKind !== "content-topic-title") {
      throw new TypeError("topic-title allowance gate received a non-title task");
    }

    const task = acquired.task;
    const preflight = await contentTopicTitleTaskPreflight(task, this.dependencies);
    if (preflight.outcome === "stale") {
      return await staleResult(
        this.dependencies.store,
        acquired.task.id,
        acquired.admissionToken,
        preflight.reason,
      );
    }

    const provider = this.dependencies.providerRouter.selectProvider([
      publicForumTopicTitleProviderCapability({
        sourceLocale: task.resolvedSourceLocale,
        targetLocale: task.targetLocale,
        sourceCharacterCount: preflight.revision.originalContent.length,
      }),
    ]);
    if (!provider) {
      return persistUnconfiguredProvider(this.dependencies, acquired);
    }

    const request = await allowanceRequest(
      provider,
      PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION,
      task,
      acquired.occurrence,
      [preflight.revision.originalContent.length],
    );
    return resolveAdapterDecision<ContentTopicTitleTaskStaleReason>(
      this.dependencies,
      acquired,
      request,
      async () => contentTopicTitleTaskPreflight(task, this.dependencies),
    );
  }
}

export interface ContentPostBodyAllowanceGateDependencies
  extends CommonGateDependencies,
    ContentPostBodyTaskPreflightDependencies {
  readonly executionBounds: {
    readonly maxSegments: number;
    readonly maxTotalSegmentCharacters: number;
  };
}

export class ContentPostBodyAllowanceGate {
  constructor(private readonly dependencies: ContentPostBodyAllowanceGateDependencies) {
    validateGateDependencies(dependencies);
    if (
      !Number.isSafeInteger(dependencies.executionBounds.maxSegments)
      || dependencies.executionBounds.maxSegments <= 0
      || !Number.isSafeInteger(dependencies.executionBounds.maxTotalSegmentCharacters)
      || dependencies.executionBounds.maxTotalSegmentCharacters <= 0
    ) {
      throw new TypeError("post-body allowance execution bounds must be positive safe integers");
    }
  }

  async admit(
    message: TranslationTaskMessage,
  ): Promise<ContentProviderAllowanceGateResult<ContentPostBodyTaskStaleReason>> {
    const acquired = await this.dependencies.store.acquireContentProviderAllowance(
      message.translationTaskId,
      this.dependencies.admissionLeaseDurationMs,
    );
    if (acquired.outcome !== "acquired") return passAcquireResult(acquired);
    if (acquired.task.translationKind !== "content-post-body") {
      throw new TypeError("post-body allowance gate received a non-post task");
    }

    const task = acquired.task;
    const preflight = await contentPostBodyTaskPreflight(task, this.dependencies);
    if (preflight.outcome === "stale") {
      return await staleResult(
        this.dependencies.store,
        acquired.task.id,
        acquired.admissionToken,
        preflight.reason,
      );
    }

    const segmentCharacterCounts = preflight.protectedDocument.segments.map(
      (segment) => segment.text.length,
    );
    const totalCharacters = segmentCharacterCounts.reduce((total, count) => total + count, 0);
    const provider = this.dependencies.providerRouter.selectProvider(
      publicForumPostBodyProviderCapabilities({
        sourceLocale: task.resolvedSourceLocale,
        targetLocale: task.targetLocale,
        segmentCharacterCounts,
      }),
    );
    if (!provider) {
      return persistUnconfiguredProvider(this.dependencies, acquired);
    }

    if (
      segmentCharacterCounts.length > this.dependencies.executionBounds.maxSegments
      || totalCharacters > this.dependencies.executionBounds.maxTotalSegmentCharacters
    ) {
      // Existing JOB-04 semantics terminalize execution-bound violations after claim.
      // No provider work can occur, so bypass external allowance while still binding the claim
      // to the exact provider selection that would have executed this attempt.
      const persisted = await this.dependencies.store.persistContentProviderAllowanceAdmission(
        acquired.task.id,
        acquired.admissionToken,
        acquired.occurrence,
        provider,
      );
      return persisted
        ? { outcome: "admitted", provider }
        : { outcome: "claim-lost" };
    }

    const request = await allowanceRequest(
      provider,
      PUBLIC_FORUM_POST_BODY_CLASSIFICATION,
      task,
      acquired.occurrence,
      segmentCharacterCounts,
    );
    return resolveAdapterDecision<ContentPostBodyTaskStaleReason>(
      this.dependencies,
      acquired,
      request,
      async () => contentPostBodyTaskPreflight(task, this.dependencies),
    );
  }
}

export async function contentProviderAllowanceOccurrenceKey(
  taskId: string,
  occurrence: ContentProviderAllowanceOccurrence,
): Promise<string> {
  requireUuid(taskId, "task id");
  validateOccurrence(occurrence);
  return sha256Text(JSON.stringify([
    OCCURRENCE_KEY_FORMAT,
    taskId,
    occurrence.generation,
    occurrence.attempt,
  ]));
}

export function validateContentProviderAllowanceDecision(
  decision: ContentProviderAllowanceDecision,
): void {
  if (!decision || typeof decision !== "object") {
    throw new TypeError("provider allowance decision must be an object");
  }
  if (decision.outcome === "admitted") {
    if (
      decision.reservationReference !== undefined
      && !SAFE_RESERVATION_PATTERN.test(decision.reservationReference)
    ) {
      throw new TypeError("provider allowance reservation reference is invalid");
    }
    return;
  }
  if (decision.outcome !== "deferred" && decision.outcome !== "unavailable") {
    throw new TypeError("provider allowance decision outcome is invalid");
  }
  if (
    !(decision.retryNotBefore instanceof Date)
    || !Number.isFinite(decision.retryNotBefore.getTime())
  ) {
    throw new TypeError("provider allowance retryNotBefore must be a valid Date");
  }
  requireReason(decision.reason);
}

async function resolveAdapterDecision<StaleReason extends string>(
  dependencies: CommonGateDependencies,
  acquired: Extract<ContentProviderAllowanceAcquireResult, { outcome: "acquired" }>,
  request: ContentProviderAllowanceRequest,
  revalidate: () => Promise<
    | { readonly outcome: "eligible" }
    | { readonly outcome: "stale"; readonly reason: StaleReason }
  >,
): Promise<ContentProviderAllowanceGateResult<StaleReason>> {
  const decision: ContentProviderAllowanceDecision = dependencies.adapter
    ? await dependencies.adapter.admit(request)
    : {
        outcome: "unavailable",
        retryNotBefore: new Date(
          Date.now() + (dependencies.unconfiguredRetryMs ?? DEFAULT_UNCONFIGURED_RETRY_MS),
        ),
        reason: "allowance-unconfigured",
      };
  validateContentProviderAllowanceDecision(decision);

  // The allowance call is deliberately outside PostgreSQL locks. Re-run authoritative preflight
  // before persisting its result so revision/generation/translation changes during that call do not
  // turn a stale occurrence into an admitted/deferred durable state.
  const current = await revalidate();
  if (current.outcome === "stale") {
    return staleResult(
      dependencies.store,
      acquired.task.id,
      acquired.admissionToken,
      current.reason,
    );
  }

  if (decision.outcome === "admitted") {
    const persisted = await dependencies.store.persistContentProviderAllowanceAdmission(
      acquired.task.id,
      acquired.admissionToken,
      acquired.occurrence,
      request.provider,
      decision.reservationReference,
    );
    return persisted
      ? { outcome: "admitted", provider: request.provider }
      : { outcome: "claim-lost" };
  }

  const retryNotBefore = await dependencies.store.persistContentProviderAllowanceDeferral(
    acquired.task.id,
    acquired.admissionToken,
    acquired.occurrence,
    decision.retryNotBefore,
    decision.reason,
  );
  return retryNotBefore
    ? { outcome: "deferred", retryNotBefore, reason: decision.reason }
    : { outcome: "claim-lost" };
}

async function persistUnconfiguredProvider<StaleReason extends string>(
  dependencies: CommonGateDependencies,
  acquired: Extract<ContentProviderAllowanceAcquireResult, { outcome: "acquired" }>,
): Promise<ContentProviderAllowanceGateResult<StaleReason>> {
  const retryNotBefore = new Date(
    Date.now() + (dependencies.unconfiguredRetryMs ?? DEFAULT_UNCONFIGURED_RETRY_MS),
  );
  const persisted = await dependencies.store.persistContentProviderAllowanceDeferral(
    acquired.task.id,
    acquired.admissionToken,
    acquired.occurrence,
    retryNotBefore,
    "provider-unconfigured",
  );
  return persisted
    ? { outcome: "deferred", retryNotBefore: persisted, reason: "provider-unconfigured" }
    : { outcome: "claim-lost" };
}

async function allowanceRequest(
  provider: string,
  contentClassification:
    | typeof PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION
    | typeof PUBLIC_FORUM_POST_BODY_CLASSIFICATION,
  task: ContentProviderAllowanceTask,
  occurrence: ContentProviderAllowanceOccurrence,
  segmentCharacterCounts: readonly number[],
): Promise<ContentProviderAllowanceRequest> {
  const maxSourceCharacters = segmentCharacterCounts.reduce((total, count) => {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError("provider allowance segment character count is invalid");
    }
    const next = total + count;
    if (!Number.isSafeInteger(next)) {
      throw new TypeError("provider allowance source character total is invalid");
    }
    return next;
  }, 0);
  if (segmentCharacterCounts.length === 0 || maxSourceCharacters <= 0) {
    throw new TypeError("provider allowance envelope must describe provider work");
  }

  return {
    provider,
    contentClassification,
    sourceLocale: task.resolvedSourceLocale,
    targetLocale: task.targetLocale,
    occurrenceKey: await contentProviderAllowanceOccurrenceKey(task.id, occurrence),
    envelope: {
      maxCalls: segmentCharacterCounts.length,
      maxSourceCharacters,
      segmentCharacterCounts: [...segmentCharacterCounts],
    },
  };
}

function passAcquireResult<StaleReason extends string>(
  result: Exclude<ContentProviderAllowanceAcquireResult, { outcome: "acquired" }>,
): ContentProviderAllowanceGateResult<StaleReason> {
  switch (result.outcome) {
    case "admitted":
      return { outcome: "admitted", provider: result.provider };
    case "deferred":
      return {
        outcome: "deferred",
        retryNotBefore: result.retryNotBefore,
        reason: result.reason,
      };
    case "admission-in-progress":
    case "execution-in-progress":
    case "terminal":
    case "not-found":
    case "exhausted":
      return { outcome: result.outcome };
  }
}

async function staleResult<StaleReason extends string>(
  store: ContentProviderAllowanceStore,
  id: string,
  admissionToken: string,
  reason: StaleReason,
): Promise<ContentProviderAllowanceGateResult<StaleReason>> {
  return await store.markContentTaskStaleFromAllowance(id, admissionToken)
    ? { outcome: "stale", reason }
    : { outcome: "claim-lost" };
}

function validateGateDependencies(dependencies: CommonGateDependencies): void {
  if (
    !Number.isSafeInteger(dependencies.admissionLeaseDurationMs)
    || dependencies.admissionLeaseDurationMs <= 0
  ) {
    throw new TypeError("provider allowance admission lease duration must be a positive integer");
  }
  const retryMs = dependencies.unconfiguredRetryMs ?? DEFAULT_UNCONFIGURED_RETRY_MS;
  if (!Number.isSafeInteger(retryMs) || retryMs <= 0) {
    throw new TypeError("provider allowance unconfigured retry delay must be a positive integer");
  }
}

function validateOccurrence(occurrence: ContentProviderAllowanceOccurrence): void {
  if (
    !Number.isSafeInteger(occurrence.generation)
    || occurrence.generation <= 0
    || !Number.isSafeInteger(occurrence.attempt)
    || occurrence.attempt <= 0
  ) {
    throw new TypeError("provider allowance occurrence is invalid");
  }
}

function requireReason(value: string): void {
  if (!SAFE_CODE_PATTERN.test(value)) {
    throw new TypeError("provider allowance reason is invalid");
  }
}

function requireUuid(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(`${field} must be a UUID`);
  }
}
