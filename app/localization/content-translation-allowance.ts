import { sha256Text } from "./fingerprint";
import {
  contentPostBodyTaskPreflight,
  type ContentPostBodyTaskPreflightDependencies,
} from "./content-post-body-task-consumer";
import {
  contentTopicTitleTaskPreflight,
  type ContentTopicTitleTaskPreflightDependencies,
} from "./content-translation-task-consumer";
import { ContentTranslationStorageUnavailableError } from "./content-translation";
import { TranslationExecutionFailure } from "./translation-failures";
import type {
  ContentPostBodyTranslationTask,
  ContentTopicTitleTranslationTask,
  TranslationTaskKind,
} from "./translation-tasks";

const CONTENT_ALLOWANCE_OCCURRENCE_FORMAT = "vico-content-provider-allowance-v1";
const REASON_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_RESERVATION_REFERENCE_LENGTH = 256;

export type ContentTranslationKind =
  | "content-topic-title"
  | "content-post-body";

export interface ContentTranslationAllowanceEnvelope {
  readonly callCount: number;
  readonly totalSourceCharacters: number;
  readonly maxSourceCharactersPerCall: number;
}

export interface ContentTranslationAllowanceRequest {
  readonly providerCapability: {
    readonly domain: "content";
    readonly contentClassification:
      | "public-forum-topic-title"
      | "public-forum-post-body";
    readonly messageKind: "plain";
  };
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly occurrenceKey: string;
  readonly envelope: ContentTranslationAllowanceEnvelope;
}

export type ContentTranslationAllowanceAdapterResult =
  | {
      readonly outcome: "admitted";
      readonly reservationReference?: string;
    }
  | {
      readonly outcome: "deferred";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | {
      readonly outcome: "unavailable";
      readonly retryNotBefore: Date;
      readonly reason: string;
    };

export interface ContentTranslationAllowanceAdapter {
  admit(
    request: ContentTranslationAllowanceRequest,
  ): Promise<ContentTranslationAllowanceAdapterResult>;
}

export interface ContentTranslationAllowanceLease {
  readonly taskId: string;
  readonly translationKind: ContentTranslationKind;
  readonly generation: number;
  readonly attemptNumber: number;
  readonly claimToken: string;
}

export type ContentTranslationAllowanceAcquireResult =
  | {
      readonly outcome: "leased";
      readonly lease: ContentTranslationAllowanceLease;
    }
  | { readonly outcome: "admitted" }
  | {
      readonly outcome: "deferred";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | { readonly outcome: "admission-in-progress" }
  | { readonly outcome: "exhausted" }
  | { readonly outcome: "not-found" | "terminal" };

export interface ContentTranslationAllowanceStore {
  acquire(
    taskId: string,
    translationKind: ContentTranslationKind,
    leaseDurationMs: number,
  ): Promise<ContentTranslationAllowanceAcquireResult>;

  admit(
    lease: ContentTranslationAllowanceLease,
    reservationReference?: string,
  ): Promise<boolean>;

  defer(
    lease: ContentTranslationAllowanceLease,
    retryNotBefore: Date,
    reason: string,
  ): Promise<Date | undefined>;
}

export interface ContentTranslationAllowanceTaskReader {
  findContentTopicTitleById(
    id: string,
  ): Promise<ContentTopicTitleTranslationTask | undefined>;

  findContentPostBodyById(
    id: string,
  ): Promise<ContentPostBodyTranslationTask | undefined>;
}

export interface ContentTranslationAllowanceAdmissionDependencies {
  readonly tasks: ContentTranslationAllowanceTaskReader;
  readonly store: ContentTranslationAllowanceStore;
  readonly adapter?: ContentTranslationAllowanceAdapter;
  readonly titlePreflight?: ContentTopicTitleTaskPreflightDependencies;
  readonly postBodyPreflight?: ContentPostBodyTaskPreflightDependencies;
  readonly admissionLeaseDurationMs: number;
  readonly postBodyExecutionBounds: {
    readonly maxSegments: number;
    readonly maxTotalSegmentCharacters: number;
  };
  /** Policy-owned retry timestamp used only when no real adapter is configured. */
  readonly unconfiguredRetryNotBefore: () => Date;
}

export type ContentTranslationAllowanceAdmissionResult =
  | {
      readonly outcome: "admitted";
      readonly occurrenceKey?: string;
    }
  | {
      readonly outcome: "deferred";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | { readonly outcome: "admission-in-progress" }
  | { readonly outcome: "not-found" | "terminal" };

export class ContentTranslationAllowanceAdmissionService {
  constructor(
    private readonly dependencies: ContentTranslationAllowanceAdmissionDependencies,
  ) {
    if (
      !Number.isSafeInteger(dependencies.admissionLeaseDurationMs)
      || dependencies.admissionLeaseDurationMs <= 0
    ) {
      throw new TypeError("allowance admission lease duration must be a positive integer");
    }
    validatePostBodyBounds(dependencies.postBodyExecutionBounds);
  }

  async admitTopicTitle(
    taskId: string,
  ): Promise<ContentTranslationAllowanceAdmissionResult> {
    const task = await this.dependencies.tasks.findContentTopicTitleById(taskId);
    if (!task) return { outcome: "not-found" };
    if (isTerminalTaskStatus(task.status)) return { outcome: "terminal" };

    const acquired = await this.dependencies.store.acquire(
      task.id,
      "content-topic-title",
      this.dependencies.admissionLeaseDurationMs,
    );
    if (acquired.outcome !== "leased") return normalizeAcquire(acquired);
    const occurrenceKey = await contentTranslationAllowanceOccurrenceKey(acquired.lease);

    const preflightDependencies = this.dependencies.titlePreflight;
    if (!preflightDependencies) {
      throw new TypeError("topic-title allowance preflight is not configured");
    }

    let preflight;
    try {
      preflight = await contentTopicTitleTaskPreflight(
        task,
        preflightDependencies,
      );
    } catch (error) {
      if (isTemporaryDependencyFailure(error)) {
        return this.persistDeferred(
          acquired.lease,
          this.dependencies.unconfiguredRetryNotBefore(),
          "dependency-unavailable",
        );
      }
      throw error;
    }

    if (preflight.outcome !== "eligible") {
      const persisted = await this.dependencies.store.admit(acquired.lease);
      return persisted
        ? { outcome: "admitted", occurrenceKey }
        : { outcome: "admission-in-progress" };
    }

    const envelope = {
      callCount: 1,
      totalSourceCharacters: preflight.revision.originalContent.length,
      maxSourceCharactersPerCall: preflight.revision.originalContent.length,
    };
    validateEnvelope(envelope);
    return this.callAdapter(
      acquired.lease,
      occurrenceKey,
      {
        providerCapability: {
          domain: "content",
          contentClassification: "public-forum-topic-title",
          messageKind: "plain",
        },
        sourceLocale: task.resolvedSourceLocale,
        targetLocale: task.targetLocale,
        occurrenceKey,
        envelope,
      },
    );
  }

  async admitPostBody(
    taskId: string,
  ): Promise<ContentTranslationAllowanceAdmissionResult> {
    const task = await this.dependencies.tasks.findContentPostBodyById(taskId);
    if (!task) return { outcome: "not-found" };
    if (isTerminalTaskStatus(task.status)) return { outcome: "terminal" };

    const acquired = await this.dependencies.store.acquire(
      task.id,
      "content-post-body",
      this.dependencies.admissionLeaseDurationMs,
    );
    if (acquired.outcome !== "leased") return normalizeAcquire(acquired);
    const occurrenceKey = await contentTranslationAllowanceOccurrenceKey(acquired.lease);

    const preflightDependencies = this.dependencies.postBodyPreflight;
    if (!preflightDependencies) {
      throw new TypeError("post-body allowance preflight is not configured");
    }

    let preflight;
    try {
      preflight = await contentPostBodyTaskPreflight(
        task,
        preflightDependencies,
      );
    } catch (error) {
      if (isTemporaryDependencyFailure(error)) {
        return this.persistDeferred(
          acquired.lease,
          this.dependencies.unconfiguredRetryNotBefore(),
          "dependency-unavailable",
        );
      }
      throw error;
    }

    if (preflight.outcome !== "eligible") {
      const persisted = await this.dependencies.store.admit(acquired.lease);
      return persisted
        ? { outcome: "admitted", occurrenceKey }
        : { outcome: "admission-in-progress" };
    }

    const segmentLengths = preflight.protectedDocument.segments.map(
      (segment) => segment.text.length,
    );
    const totalSourceCharacters = segmentLengths.reduce((sum, length) => sum + length, 0);
    const envelope = {
      callCount: segmentLengths.length,
      totalSourceCharacters,
      maxSourceCharactersPerCall: Math.max(...segmentLengths),
    };
    validateEnvelope(envelope);

    if (
      envelope.callCount > this.dependencies.postBodyExecutionBounds.maxSegments
      || envelope.totalSourceCharacters
        > this.dependencies.postBodyExecutionBounds.maxTotalSegmentCharacters
    ) {
      const persisted = await this.dependencies.store.admit(acquired.lease);
      return persisted
        ? { outcome: "admitted", occurrenceKey }
        : { outcome: "admission-in-progress" };
    }

    return this.callAdapter(
      acquired.lease,
      occurrenceKey,
      {
        providerCapability: {
          domain: "content",
          contentClassification: "public-forum-post-body",
          messageKind: "plain",
        },
        sourceLocale: task.resolvedSourceLocale,
        targetLocale: task.targetLocale,
        occurrenceKey,
        envelope,
      },
    );
  }

  private async callAdapter(
    lease: ContentTranslationAllowanceLease,
    occurrenceKey: string,
    request: ContentTranslationAllowanceRequest,
  ): Promise<ContentTranslationAllowanceAdmissionResult> {
    const adapter = this.dependencies.adapter;
    if (!adapter) {
      return this.persistDeferred(
        lease,
        this.dependencies.unconfiguredRetryNotBefore(),
        "allowance-unconfigured",
      );
    }

    const decision = await adapter.admit(request);
    validateAdapterResult(decision);
    if (decision.outcome === "admitted") {
      const persisted = await this.dependencies.store.admit(
        lease,
        decision.reservationReference,
      );
      return persisted
        ? { outcome: "admitted", occurrenceKey }
        : { outcome: "admission-in-progress" };
    }

    return this.persistDeferred(
      lease,
      decision.retryNotBefore,
      decision.reason,
    );
  }

  private async persistDeferred(
    lease: ContentTranslationAllowanceLease,
    retryNotBefore: Date,
    reason: string,
  ): Promise<ContentTranslationAllowanceAdmissionResult> {
    validateRetryNotBefore(retryNotBefore);
    requireReason(reason);
    const persistedRetry = await this.dependencies.store.defer(
      lease,
      retryNotBefore,
      reason,
    );
    return persistedRetry
      ? { outcome: "deferred", retryNotBefore: persistedRetry, reason }
      : { outcome: "admission-in-progress" };
  }
}

export async function contentTranslationAllowanceOccurrenceKey(
  occurrence: Pick<
    ContentTranslationAllowanceLease,
    "taskId" | "translationKind" | "generation" | "attemptNumber"
  >,
): Promise<string> {
  if (!isUuid(occurrence.taskId)) {
    throw new TypeError("allowance occurrence taskId must be a UUID");
  }
  if (
    occurrence.translationKind !== "content-topic-title"
    && occurrence.translationKind !== "content-post-body"
  ) {
    throw new TypeError("allowance occurrence requires a content translation kind");
  }
  requirePositiveInteger(occurrence.generation, "allowance occurrence generation");
  requirePositiveInteger(occurrence.attemptNumber, "allowance occurrence attempt number");
  return sha256Text(JSON.stringify([
    CONTENT_ALLOWANCE_OCCURRENCE_FORMAT,
    occurrence.taskId,
    occurrence.translationKind,
    occurrence.generation,
    occurrence.attemptNumber,
  ]));
}

function normalizeAcquire(
  result: Exclude<ContentTranslationAllowanceAcquireResult, { readonly outcome: "leased" }>,
): ContentTranslationAllowanceAdmissionResult {
  if (result.outcome === "exhausted") return { outcome: "admitted" };
  return result;
}

function validateAdapterResult(
  result: ContentTranslationAllowanceAdapterResult,
): void {
  if (!result || typeof result !== "object") {
    throw new TypeError("allowance adapter result must be an object");
  }

  if (result.outcome === "admitted") {
    if (result.reservationReference !== undefined) {
      requireReservationReference(result.reservationReference);
    }
    return;
  }

  if (result.outcome === "deferred" || result.outcome === "unavailable") {
    validateRetryNotBefore(result.retryNotBefore);
    requireReason(result.reason);
    return;
  }

  throw new TypeError("allowance adapter returned an invalid outcome");
}

function validateEnvelope(envelope: ContentTranslationAllowanceEnvelope): void {
  requirePositiveInteger(envelope.callCount, "allowance envelope callCount");
  requirePositiveInteger(
    envelope.totalSourceCharacters,
    "allowance envelope totalSourceCharacters",
  );
  requirePositiveInteger(
    envelope.maxSourceCharactersPerCall,
    "allowance envelope maxSourceCharactersPerCall",
  );
  if (envelope.maxSourceCharactersPerCall > envelope.totalSourceCharacters) {
    throw new TypeError("allowance envelope maximum call size exceeds total size");
  }
}

function validatePostBodyBounds(
  bounds: ContentTranslationAllowanceAdmissionDependencies["postBodyExecutionBounds"],
): void {
  requirePositiveInteger(bounds.maxSegments, "post-body allowance maxSegments");
  requirePositiveInteger(
    bounds.maxTotalSegmentCharacters,
    "post-body allowance maxTotalSegmentCharacters",
  );
}

function validateRetryNotBefore(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError("allowance retryNotBefore must be a valid Date");
  }
}

function requireReservationReference(value: string): void {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > MAX_RESERVATION_REFERENCE_LENGTH
  ) {
    throw new TypeError("allowance reservation reference is invalid");
  }
}

function requireReason(value: string): void {
  if (typeof value !== "string" || !REASON_PATTERN.test(value)) {
    throw new TypeError("allowance reason is invalid");
  }
}

function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function isTerminalTaskStatus(status: string): boolean {
  return status === "stale" || status === "completed" || status === "failed";
}

function isTemporaryDependencyFailure(error: unknown): boolean {
  return error instanceof ContentTranslationStorageUnavailableError
    || (
      error instanceof TranslationExecutionFailure
      && error.disposition === "retryable"
      && error.code === "dependency-temporary"
    );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isContentTranslationKind(
  value: TranslationTaskKind,
): value is ContentTranslationKind {
  return value === "content-topic-title" || value === "content-post-body";
}
