import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";

import type { ContentGenerationActionResponse } from "./actions.server";
import {
  CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION,
  CONTENT_GENERATION_POLL_DELAY_MS,
  hasActiveTrackedGeneration,
  initialAutomaticGenerationQueue,
} from "../localization/content-generation-client";
import type { ContentGenerationViewUnit } from "../localization/content-generation-view.server";

type GenerationTransientFeedback =
  | "requesting"
  | "queued"
  | "retry-later"
  | "unavailable"
  | "failed"
  | "explicit-required";

export function useContentGenerationOrchestrator(
  units: readonly ContentGenerationViewUnit[],
) {
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  const revalidator = useRevalidator();
  const initial = useRef<{
    queue: ReturnType<typeof initialAutomaticGenerationQueue>;
    trackedKeys: ReadonlySet<string>;
  } | null>(null);
  if (!initial.current) {
    initial.current = {
      queue: initialAutomaticGenerationQueue(units),
      trackedKeys: new Set(units.map((unit) => unit.key)),
    };
  }

  const queueIndex = useRef(0);
  const inFlightKey = useRef<string | null>(null);
  const observedBusy = useRef(false);
  const queueStarted = useRef(false);
  const queueRevalidated = useRef(false);
  const pollCount = useRef(0);
  const [feedback, setFeedback] = useState<Record<string, GenerationTransientFeedback>>({});

  useEffect(() => {
    if (fetcher.state !== "idle") {
      observedBusy.current = true;
      return;
    }

    if (inFlightKey.current) {
      if (!observedBusy.current) return;
      const key = inFlightKey.current;
      observedBusy.current = false;
      inFlightKey.current = null;
      const result = fetcher.data;
      const nextFeedback: GenerationTransientFeedback | undefined = result?.outcome === "queued"
        ? "queued"
        : result?.outcome === "explicit-required"
          ? "explicit-required"
          : result?.outcome === "unavailable"
            ? "unavailable"
            : result?.outcome === "no-op" && result.reason === "request-budget-denied"
              ? "retry-later"
              : result?.outcome === "no-op"
                ? undefined
                : "failed";
      setFeedback((current) => {
        if (nextFeedback) return { ...current, [key]: nextFeedback };
        const { [key]: _removed, ...rest } = current;
        return rest;
      });
    }

    const next = initial.current?.queue[queueIndex.current];
    if (next) {
      queueIndex.current += 1;
      queueStarted.current = true;
      inFlightKey.current = next.key;
      setFeedback((current) => ({ ...current, [next.key]: "requesting" }));
      fetcher.submit(
        {
          intent: next.intent,
          ...(next.postId ? { postId: next.postId } : {}),
        },
        {
          method: "post",
          defaultShouldRevalidate: false,
        },
      );
      return;
    }

    if (queueStarted.current && !queueRevalidated.current) {
      queueRevalidated.current = true;
      void revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, fetcher, revalidator]);

  const trackedKeys = initial.current!.trackedKeys;
  const active = hasActiveTrackedGeneration(units, trackedKeys);
  useEffect(() => {
    if (
      !active
      || revalidator.state !== "idle"
      || pollCount.current >= CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION
    ) return;

    const retrySeconds = units.reduce((maximum, unit) => (
      trackedKeys.has(unit.key) && unit.state === "deferred" && unit.retryAfterSeconds !== undefined
        ? Math.max(maximum, unit.retryAfterSeconds)
        : maximum
    ), 0);
    const delay = Math.max(
      CONTENT_GENERATION_POLL_DELAY_MS,
      Math.min(30_000, retrySeconds * 1_000),
    );
    const timer = window.setTimeout(() => {
      pollCount.current += 1;
      void revalidator.revalidate();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [active, revalidator, revalidator.state, trackedKeys, units]);

  return { feedback };
}

export function ContentGenerationUnitUi({
  unit,
  transient,
}: {
  unit: ContentGenerationViewUnit | undefined;
  transient?: GenerationTransientFeedback;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  if (!unit) return null;

  const explicitBusy = fetcher.state !== "idle";
  const explicitResult = fetcher.data;
  const feedback = explicitBusy
    ? "requesting"
    : explicitResult?.outcome === "queued"
      ? "queued"
      : explicitResult?.outcome === "unavailable"
        ? "unavailable"
        : explicitResult?.outcome === "no-op" && explicitResult.reason === "request-budget-denied"
          ? "retry-later"
          : explicitResult?.outcome === "no-op"
            ? undefined
            : transient;

  const retryAfterSeconds = explicitResult?.outcome === "no-op"
    ? explicitResult.retryAfterSeconds
    : unit.retryAfterSeconds;
  const stateKey = feedback === "requesting"
    ? "translationGenerationRequesting"
    : feedback === "queued"
      ? "translationGenerationPending"
      : feedback === "retry-later"
        ? "translationGenerationDeferred"
        : feedback === "unavailable"
          ? "translationGenerationUnavailable"
          : feedback === "failed"
            ? "translationGenerationFailed"
            : feedback === "explicit-required"
              ? "translationGenerationExplicitRequired"
              : unit.state === "pending"
                ? "translationGenerationPending"
                : unit.state === "processing"
                  ? "translationGenerationProcessing"
                  : unit.state === "deferred"
                    ? "translationGenerationDeferred"
                    : unit.state === "failed"
                      ? "translationGenerationFailed"
                      : unit.state === "unavailable"
                        ? "translationGenerationUnavailable"
                        : unit.state === "current"
                          ? "translationGenerationCurrent"
                          : unit.explicitRequired
                            ? "translationGenerationExplicitRequired"
                            : null;

  return (
    <div className="translation-generation-ui">
      {stateKey && (
        <p role="status" aria-live="polite">
          {stateKey === "translationGenerationDeferred"
            ? t(stateKey, { seconds: retryAfterSeconds ?? 1 })
            : t(stateKey)}
        </p>
      )}
      {unit.explicitRequired && unit.state === "idle" && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="generatePostBodyTranslationExplicit" />
          <input type="hidden" name="postId" value={unit.contentId} />
          <button type="submit" disabled={explicitBusy}>
            {t("translationGenerationExplicitAction")}
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}
