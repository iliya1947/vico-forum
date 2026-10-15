import { describe, expect, it, vi } from "vitest";
import type { ContentTranslationRevision } from "./content-translation";
import {
  ContentSourceLocaleDetectorUnavailableError,
  ContentSourceLocaleResolver,
  InvalidContentSourceLocaleInputError,
  ThresholdContentSourceLocalePolicy,
  proposeContentSourceLocaleCorrection,
  type ContentSourceLocaleDetectionAdapter,
} from "./content-source-locale";

const knownRevision: ContentTranslationRevision = {
  contentType: "post-body",
  contentId: "post-1",
  revisionId: "post-r2",
  originalContent: "Привет, мир",
  sourceLocale: "ru",
};

const unknownRevision: ContentTranslationRevision = {
  ...knownRevision,
  sourceLocale: "und",
};

function detector(result: unknown): ContentSourceLocaleDetectionAdapter & {
  detect: ReturnType<typeof vi.fn<ContentSourceLocaleDetectionAdapter["detect"]>>;
} {
  return {
    detect: vi.fn<ContentSourceLocaleDetectionAdapter["detect"]>(async () => result),
  };
}

function acceptingPolicy(
  supported: readonly string[] = ["ru", "en", "fr"],
  minimumConfidence = 0.8,
) {
  const supportedSet = new Set(supported);
  return new ThresholdContentSourceLocalePolicy(
    minimumConfidence,
    (locale) => supportedSet.has(locale),
  );
}

function acceptedDetection(overrides: Record<string, unknown> = {}) {
  return {
    locale: "ru",
    confidence: 0.97,
    evidence: {
      origin: "detector",
      detector: "fake-language-detector",
      model: "fake-v1",
    },
    ...overrides,
  };
}

describe("ContentSourceLocaleResolver", () => {
  it("uses an already-canonical immutable revision locale without invoking detection", async () => {
    const detection = detector(acceptedDetection());
    const resolver = new ContentSourceLocaleResolver(detection, acceptingPolicy());

    await expect(resolver.resolve(knownRevision)).resolves.toEqual({
      kind: "revision",
      mayProceed: true,
      sourceLocale: "ru",
      resolutionOrigin: "revision-metadata",
    });
    expect(detection.detect).not.toHaveBeenCalled();
  });

  it("rejects aliases, formatting extensions, and noncanonical revision source metadata", async () => {
    const detection = detector(acceptedDetection());
    const resolver = new ContentSourceLocaleResolver(detection, acceptingPolicy());

    for (const sourceLocale of ["RU", "iw", "ru-u-nu-latn", "not_a_locale"]) {
      await expect(
        resolver.resolve({ ...knownRevision, sourceLocale }),
      ).rejects.toBeInstanceOf(InvalidContentSourceLocaleInputError);
    }
    expect(detection.detect).not.toHaveBeenCalled();
  });

  it("accepts a validated policy-approved detection for und and exposes no UI-locale input", async () => {
    const detection = detector(acceptedDetection());
    const resolver = new ContentSourceLocaleResolver(detection, acceptingPolicy());

    await expect(resolver.resolve(unknownRevision)).resolves.toEqual({
      kind: "detected",
      mayProceed: true,
      sourceLocale: "ru",
      resolutionOrigin: "detector",
      confidence: 0.97,
      evidence: {
        origin: "detector",
        detector: "fake-language-detector",
        model: "fake-v1",
      },
    });
    expect(detection.detect).toHaveBeenCalledWith({
      contentType: "post-body",
      contentId: "post-1",
      revisionId: "post-r2",
      originalContent: "Привет, мир",
    });
    expect(Object.keys(detection.detect.mock.calls[0]![0])).not.toContain("uiLocale");
    expect(Object.keys(detection.detect.mock.calls[0]![0])).not.toContain("requestLocale");
  });

  it("keeps low-confidence and unsupported detections unresolved by explicit policy", async () => {
    const lowConfidence = new ContentSourceLocaleResolver(
      detector(acceptedDetection({ confidence: 0.79 })),
      acceptingPolicy(),
    );
    await expect(lowConfidence.resolve(unknownRevision)).resolves.toMatchObject({
      kind: "unresolved",
      mayProceed: false,
      sourceLocale: null,
      reason: "detection-low-confidence",
    });

    const unsupported = new ContentSourceLocaleResolver(
      detector(acceptedDetection({ locale: "de" })),
      acceptingPolicy(),
    );
    await expect(unsupported.resolve(unknownRevision)).resolves.toMatchObject({
      kind: "unresolved",
      mayProceed: false,
      sourceLocale: null,
      reason: "locale-unsupported",
    });
  });

  it("treats absent, malformed, noncanonical, and over-rich detector output as unresolved", async () => {
    const invalidResults: readonly [unknown, string][] = [
      [undefined, "detection-absent"],
      [{ locale: "RU", confidence: 0.9, evidence: { origin: "detector", detector: "fake" } }, "detection-invalid"],
      [{ locale: "iw", confidence: 0.9, evidence: { origin: "detector", detector: "fake" } }, "detection-invalid"],
      [{ locale: "ru-u-nu-latn", confidence: 0.9, evidence: { origin: "detector", detector: "fake" } }, "detection-invalid"],
      [{ locale: "ru", confidence: Number.NaN, evidence: { origin: "detector", detector: "fake" } }, "detection-invalid"],
      [{ locale: "ru", confidence: 1.1, evidence: { origin: "detector", detector: "fake" } }, "detection-invalid"],
      [{ locale: "ru", confidence: 0.9, evidence: { origin: "detector", detector: "fake", rawPayload: "secret" } }, "detection-invalid"],
      [{ locale: "ru", confidence: 0.9, evidence: { origin: "detector", detector: "fake" }, rawPayload: "secret" }, "detection-invalid"],
    ];

    for (const [result, reason] of invalidResults) {
      const resolver = new ContentSourceLocaleResolver(detector(result), acceptingPolicy());
      await expect(resolver.resolve(unknownRevision)).resolves.toMatchObject({
        kind: "unresolved",
        reason,
      });
    }
  });

  it("degrades only the classified detector-availability failure to unresolved", async () => {
    const detection = {
      detect: vi.fn<ContentSourceLocaleDetectionAdapter["detect"]>(async () => {
        throw new ContentSourceLocaleDetectorUnavailableError();
      }),
    };
    const resolver = new ContentSourceLocaleResolver(detection, acceptingPolicy());

    await expect(resolver.resolve(unknownRevision)).resolves.toMatchObject({
      kind: "unresolved",
      mayProceed: false,
      reason: "detector-unavailable",
    });
  });

  it("does not hide unexpected detector programming or configuration errors", async () => {
    const unexpected = new Error("detector configuration bug");
    const detection = {
      detect: vi.fn<ContentSourceLocaleDetectionAdapter["detect"]>(async () => {
        throw unexpected;
      }),
    };
    const resolver = new ContentSourceLocaleResolver(detection, acceptingPolicy());

    await expect(resolver.resolve(unknownRevision)).rejects.toBe(unexpected);
  });

  it("blocks future provider jobs for unresolved source and same-locale work", async () => {
    const unresolvedResolver = new ContentSourceLocaleResolver(
      detector(undefined),
      acceptingPolicy(),
    );
    await expect(unresolvedResolver.plan(unknownRevision, "FR")).resolves.toMatchObject({
      kind: "original",
      mayCreateProviderJob: false,
      sourceLocale: null,
      targetLocale: "fr",
      reason: "source-unresolved",
    });

    const sameLocaleResolver = new ContentSourceLocaleResolver(
      detector(acceptedDetection()),
      acceptingPolicy(),
    );
    await expect(sameLocaleResolver.plan(unknownRevision, "RU")).resolves.toMatchObject({
      kind: "original",
      mayCreateProviderJob: false,
      sourceLocale: "ru",
      targetLocale: "ru",
      reason: "same-locale",
    });
  });

  it("allows future provider-job planning only after accepted source resolution", async () => {
    const resolver = new ContentSourceLocaleResolver(
      detector(acceptedDetection()),
      acceptingPolicy(),
    );

    await expect(resolver.plan(unknownRevision, "FR")).resolves.toMatchObject({
      kind: "translate",
      mayCreateProviderJob: true,
      sourceLocale: "ru",
      targetLocale: "fr",
      resolution: {
        kind: "detected",
        resolutionOrigin: "detector",
      },
    });
  });

  it("makes manual source-locale correction an explicit new-revision handoff", () => {
    expect(proposeContentSourceLocaleCorrection(unknownRevision, "ru")).toEqual({
      kind: "new-revision-required",
      requiresNewRevision: true,
      contentType: "post-body",
      contentId: "post-1",
      currentRevisionId: "post-r2",
      currentSourceLocale: "und",
      proposedSourceLocale: "ru",
    });

    expect(proposeContentSourceLocaleCorrection(knownRevision, "ru")).toEqual({
      kind: "unchanged",
      requiresNewRevision: false,
      sourceLocale: "ru",
    });

    expect(() => proposeContentSourceLocaleCorrection(knownRevision, "RU"))
      .toThrow(InvalidContentSourceLocaleInputError);
    expect(knownRevision).toEqual({
      contentType: "post-body",
      contentId: "post-1",
      revisionId: "post-r2",
      originalContent: "Привет, мир",
      sourceLocale: "ru",
    });
  });
});
