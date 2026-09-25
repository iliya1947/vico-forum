import type { ContentGenerationViewUnit } from "./content-generation-view.server";

export const CONTENT_GENERATION_POLL_DELAY_MS = 1_500;
export const CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION = 8;

export interface AutomaticGenerationRequest {
  readonly key: string;
  readonly intent: "generateTopicTitleTranslation" | "generatePostBodyTranslation";
  readonly postId?: string;
}

export function initialAutomaticGenerationQueue(
  units: readonly ContentGenerationViewUnit[],
): readonly AutomaticGenerationRequest[] {
  const seen = new Set<string>();
  return units.flatMap((unit) => {
    if (!unit.autoEligible || seen.has(unit.key)) return [];
    seen.add(unit.key);
    if (unit.contentType === "topic-title") {
      return [{ key: unit.key, intent: "generateTopicTitleTranslation" as const }];
    }
    return [{
      key: unit.key,
      intent: "generatePostBodyTranslation" as const,
      postId: unit.contentId,
    }];
  });
}

export function hasActiveTrackedGeneration(
  units: readonly ContentGenerationViewUnit[],
  trackedKeys: ReadonlySet<string>,
): boolean {
  return units.some((unit) =>
    trackedKeys.has(unit.key)
    && (unit.state === "pending" || unit.state === "processing" || unit.state === "deferred")
  );
}
