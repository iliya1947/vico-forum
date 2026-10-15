import type { ContentTranslationRevision } from "./content-translation";
import { canonicalizeTranslationLocale, parseLocaleCandidate } from "./locale";

export interface ContentSourceLocaleDetectionInput {
  readonly contentType: ContentTranslationRevision["contentType"];
  readonly contentId: string;
  readonly revisionId: string;
  readonly originalContent: string;
}

export interface ContentSourceLocaleDetectionEvidence {
  readonly origin: "detector";
  readonly detector: string;
  readonly model?: string;
}

export interface ValidatedContentSourceLocaleDetection {
  readonly locale: string;
  readonly confidence: number;
  readonly evidence: ContentSourceLocaleDetectionEvidence;
}

export interface ContentSourceLocaleDetectionAdapter {
  detect(input: ContentSourceLocaleDetectionInput): Promise<unknown>;
}

export type ContentSourceLocalePolicyRejection =
  | "detection-low-confidence"
  | "locale-unsupported";

export type ContentSourceLocalePolicyDecision =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly reason: ContentSourceLocalePolicyRejection };

export interface ContentSourceLocaleAcceptancePolicy {
  evaluate(candidate: ValidatedContentSourceLocaleDetection): ContentSourceLocalePolicyDecision;
}

export class ThresholdContentSourceLocalePolicy implements ContentSourceLocaleAcceptancePolicy {
  constructor(
    private readonly minimumConfidence: number,
    private readonly isSupportedLocale: (locale: string) => boolean,
  ) {
    if (
      !Number.isFinite(minimumConfidence)
      || minimumConfidence < 0
      || minimumConfidence > 1
    ) {
      throw new InvalidContentSourceLocaleInputError(
        "minimum detection confidence must be finite and between 0 and 1",
      );
    }
  }

  evaluate(candidate: ValidatedContentSourceLocaleDetection): ContentSourceLocalePolicyDecision {
    if (candidate.confidence < this.minimumConfidence) {
      return { accepted: false, reason: "detection-low-confidence" };
    }
    if (!this.isSupportedLocale(candidate.locale)) {
      return { accepted: false, reason: "locale-unsupported" };
    }
    return { accepted: true };
  }
}

export type ContentSourceLocaleUnresolvedReason =
  | "detection-absent"
  | "detection-invalid"
  | "detection-low-confidence"
  | "locale-unsupported"
  | "detector-unavailable";

export type ContentSourceLocaleResolution =
  | {
      readonly kind: "revision";
      readonly mayProceed: true;
      readonly sourceLocale: string;
      readonly resolutionOrigin: "revision-metadata";
    }
  | {
      readonly kind: "detected";
      readonly mayProceed: true;
      readonly sourceLocale: string;
      readonly resolutionOrigin: "detector";
      readonly confidence: number;
      readonly evidence: ContentSourceLocaleDetectionEvidence;
    }
  | {
      readonly kind: "unresolved";
      readonly mayProceed: false;
      readonly sourceLocale: null;
      readonly resolutionOrigin: "unresolved";
      readonly reason: ContentSourceLocaleUnresolvedReason;
    };

export type ContentSourceLocalePlan =
  | {
      readonly kind: "translate";
      readonly mayCreateProviderJob: true;
      readonly sourceLocale: string;
      readonly targetLocale: string;
      readonly resolution: Exclude<ContentSourceLocaleResolution, { kind: "unresolved" }>;
    }
  | {
      readonly kind: "original";
      readonly mayCreateProviderJob: false;
      readonly sourceLocale: string | null;
      readonly targetLocale: string;
      readonly reason: "same-locale" | "source-unresolved";
      readonly resolution: ContentSourceLocaleResolution;
    };

export type ContentSourceLocaleCorrectionHandoff =
  | {
      readonly kind: "unchanged";
      readonly requiresNewRevision: false;
      readonly sourceLocale: string;
    }
  | {
      readonly kind: "new-revision-required";
      readonly requiresNewRevision: true;
      readonly contentType: ContentTranslationRevision["contentType"];
      readonly contentId: string;
      readonly currentRevisionId: string;
      readonly currentSourceLocale: string;
      readonly proposedSourceLocale: string;
    };

export class InvalidContentSourceLocaleInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContentSourceLocaleInputError";
  }
}

export class ContentSourceLocaleDetectorUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content source-locale detector unavailable", options);
    this.name = "ContentSourceLocaleDetectorUnavailableError";
  }
}

export class ContentSourceLocaleResolver {
  constructor(
    private readonly detector: ContentSourceLocaleDetectionAdapter,
    private readonly acceptancePolicy: ContentSourceLocaleAcceptancePolicy,
  ) {}

  async resolve(revisionInput: ContentTranslationRevision): Promise<ContentSourceLocaleResolution> {
    const revision = normalizeRevision(revisionInput);

    if (revision.sourceLocale !== "und") {
      return {
        kind: "revision",
        mayProceed: true,
        sourceLocale: revision.sourceLocale,
        resolutionOrigin: "revision-metadata",
      };
    }

    let rawDetection: unknown;
    try {
      rawDetection = await this.detector.detect({
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        originalContent: revision.originalContent,
      });
    } catch (error) {
      if (error instanceof ContentSourceLocaleDetectorUnavailableError) {
        return unresolved("detector-unavailable");
      }
      throw error;
    }

    if (rawDetection === undefined || rawDetection === null) {
      return unresolved("detection-absent");
    }

    const detection = validateDetection(rawDetection);
    if (!detection) {
      return unresolved("detection-invalid");
    }

    const decision = this.acceptancePolicy.evaluate(detection);
    if (!decision.accepted) {
      return unresolved(decision.reason);
    }

    return {
      kind: "detected",
      mayProceed: true,
      sourceLocale: detection.locale,
      resolutionOrigin: "detector",
      confidence: detection.confidence,
      evidence: detection.evidence,
    };
  }

  async plan(
    revision: ContentTranslationRevision,
    targetLocaleInput: string,
  ): Promise<ContentSourceLocalePlan> {
    const targetLocale = normalizeTargetLocale(targetLocaleInput);
    const resolution = await this.resolve(revision);

    if (resolution.kind === "unresolved") {
      return {
        kind: "original",
        mayCreateProviderJob: false,
        sourceLocale: null,
        targetLocale,
        reason: "source-unresolved",
        resolution,
      };
    }

    if (resolution.sourceLocale === targetLocale) {
      return {
        kind: "original",
        mayCreateProviderJob: false,
        sourceLocale: resolution.sourceLocale,
        targetLocale,
        reason: "same-locale",
        resolution,
      };
    }

    return {
      kind: "translate",
      mayCreateProviderJob: true,
      sourceLocale: resolution.sourceLocale,
      targetLocale,
      resolution,
    };
  }
}

export function proposeContentSourceLocaleCorrection(
  revisionInput: ContentTranslationRevision,
  proposedSourceLocaleInput: string,
): ContentSourceLocaleCorrectionHandoff {
  const revision = normalizeRevision(revisionInput);
  const proposedSourceLocale = strictCanonicalSourceLocale(proposedSourceLocaleInput);
  if (!proposedSourceLocale || proposedSourceLocale === "und") {
    throw new InvalidContentSourceLocaleInputError(
      "manual source-locale correction must use a canonical non-und translation locale",
    );
  }

  if (revision.sourceLocale === proposedSourceLocale) {
    return {
      kind: "unchanged",
      requiresNewRevision: false,
      sourceLocale: proposedSourceLocale,
    };
  }

  return {
    kind: "new-revision-required",
    requiresNewRevision: true,
    contentType: revision.contentType,
    contentId: revision.contentId,
    currentRevisionId: revision.revisionId,
    currentSourceLocale: revision.sourceLocale,
    proposedSourceLocale,
  };
}

function validateDetection(value: unknown): ValidatedContentSourceLocaleDetection | undefined {
  if (!isRecord(value)) return undefined;
  if (!hasOnlyKeys(value, ["locale", "confidence", "evidence"])) return undefined;

  const locale = strictCanonicalSourceLocale(value.locale);
  if (!locale || locale === "und") return undefined;

  if (
    typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1
  ) {
    return undefined;
  }

  const evidence = validateEvidence(value.evidence);
  if (!evidence) return undefined;

  return {
    locale,
    confidence: value.confidence,
    evidence,
  };
}

function validateEvidence(value: unknown): ContentSourceLocaleDetectionEvidence | undefined {
  if (!isRecord(value)) return undefined;
  if (!hasOnlyKeys(value, ["origin", "detector", "model"])) return undefined;
  if (value.origin !== "detector") return undefined;

  const detector = boundedMetadataText(value.detector);
  if (!detector) return undefined;

  if (value.model !== undefined) {
    const model = boundedMetadataText(value.model);
    if (!model) return undefined;
    return { origin: "detector", detector, model };
  }

  return { origin: "detector", detector };
}

function normalizeRevision(revision: ContentTranslationRevision): ContentTranslationRevision {
  if (!revision || typeof revision !== "object") {
    throw new InvalidContentSourceLocaleInputError("content revision must be an object");
  }
  if (revision.contentType !== "topic-title" && revision.contentType !== "post-body") {
    throw new InvalidContentSourceLocaleInputError("content type is invalid");
  }

  const contentId = requiredText(revision.contentId, "content id");
  const revisionId = requiredText(revision.revisionId, "revision id");
  const originalContent = requiredText(revision.originalContent, "original content");

  if (revision.sourceLocale === "und") {
    return { ...revision, contentId, revisionId, originalContent, sourceLocale: "und" };
  }

  const sourceLocale = strictCanonicalSourceLocale(revision.sourceLocale);
  if (!sourceLocale) {
    throw new InvalidContentSourceLocaleInputError(
      "revision source locale must be und or an already-canonical translation locale",
    );
  }

  return { ...revision, contentId, revisionId, originalContent, sourceLocale };
}

function normalizeTargetLocale(value: string): string {
  const canonical = canonicalizeTranslationLocale(value);
  if (!canonical || canonical === "und") {
    throw new InvalidContentSourceLocaleInputError(
      "target locale must be a canonicalizable non-und translation locale without formatting extensions",
    );
  }
  return canonical;
}

function strictCanonicalSourceLocale(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const parsed = parseLocaleCandidate(value);
  const canonical = canonicalizeTranslationLocale(value);
  if (!parsed || !canonical) return undefined;

  if (
    parsed.canonicalInput !== value
    || parsed.translationTag !== value
    || canonical !== value
  ) {
    return undefined;
  }

  return canonical;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidContentSourceLocaleInputError(`${field} must be a non-blank string`);
  }
  return value;
}

function boundedMetadataText(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || value.length > 128) return undefined;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function unresolved(reason: ContentSourceLocaleUnresolvedReason): ContentSourceLocaleResolution {
  return {
    kind: "unresolved",
    mayProceed: false,
    sourceLocale: null,
    resolutionOrigin: "unresolved",
    reason,
  };
}
