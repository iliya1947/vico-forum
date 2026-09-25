import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";

import type { ContentGenerationActionResponse } from "./actions.server";
import type { ContentGenerationViewModel } from "../localization/content-generation-status";

export const CONTENT_GENERATION_POLL_DELAY_MS = 2_000;
export const CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION = 12;

interface AutomaticFeedback {
  readonly requestingKey: string | null;
  readonly results: Readonly<Record<string, ContentGenerationActionResponse>>;
}

const ContentGenerationClientContext = createContext<AutomaticFeedback>({
  requestingKey: null,
  results: {},
});

export function ContentGenerationClientBoundary({
  units,
  children,
}: {
  readonly units: readonly ContentGenerationViewModel[] | null;
  readonly children: ReactNode;
}) {
  const feedback = useContentGenerationCoordinator(units);
  return (
    <ContentGenerationClientContext.Provider value={feedback}>
      {children}
    </ContentGenerationClientContext.Provider>
  );
}

export function ContentGenerationUnitControl({
  unit,
}: {
  readonly unit: ContentGenerationViewModel;
}) {
  const automatic = useContext(ContentGenerationClientContext);
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  const { t } = useTranslation("common");
  const key = contentGenerationUnitKey(unit);
  const automaticResult = automatic.results[key];
  const requesting = automatic.requestingKey === key || fetcher.state !== "idle";
  const actionResult = fetcher.data ?? automaticResult;
  const statusText = generationStatusText(t, unit, requesting, actionResult);

  return (
    <div className="content-generation-controls" data-content-generation-key={key}>
      {statusText && <p role="status" aria-live="polite">{statusText}</p>}
      {unit.contentType === "post-body"
        && unit.explicitRequired
        && unit.status !== "unavailable"
        && unit.status !== "current"
        && (
          <fetcher.Form method="post" className="content-generation-explicit-form">
            <input type="hidden" name="intent" value="generateExplicitPostBodyTranslation" />
            <input type="hidden" name="postId" value={unit.contentId} />
            <button type="submit" disabled={fetcher.state !== "idle"}>
              {t("translationGenerateExplicit")}
            </button>
          </fetcher.Form>
        )}
    </div>
  );
}

export function contentGenerationUnitKey(
  unit: Pick<
    ContentGenerationViewModel,
    "contentType" | "contentId" | "revisionId" | "targetLocale"
  >,
): string {
  return JSON.stringify([
    unit.contentType,
    unit.contentId,
    unit.revisionId,
    unit.targetLocale,
  ]);
}

function contentGenerationUnitBaseKey(
  unit: Pick<
    ContentGenerationViewModel,
    "contentType" | "contentId" | "targetLocale"
  >,
): string {
  return JSON.stringify([unit.contentType, unit.contentId, unit.targetLocale]);
}

function useContentGenerationCoordinator(
  units: readonly ContentGenerationViewModel[] | null,
): AutomaticFeedback {
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  const revalidator = useRevalidator();
  const initialUnitsRef = useRef<readonly ContentGenerationViewModel[] | null>(null);
  const queueRef = useRef<readonly ContentGenerationViewModel[] | null>(null);
  const initialRevisionByUnitRef = useRef<ReadonlyMap<string, string> | null>(null);
  const attemptedRef = useRef(new Set<string>());
  const nextIndexRef = useRef(0);
  const activeRequestKeyRef = useRef<string | null>(null);
  const sawBusyRef = useRef(false);
  const finalRevalidationStartedRef = useRef(false);
  const pollCountRef = useRef(0);
  const [queueTick, setQueueTick] = useState(0);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);
  const [results, setResults] = useState<
    Readonly<Record<string, ContentGenerationActionResponse>>
  >({});

  if (initialUnitsRef.current === null) {
    const initialUnits = units ? [...units] : [];
    initialUnitsRef.current = initialUnits;
    queueRef.current = initialUnits.filter((unit) => unit.automaticEligible);
    initialRevisionByUnitRef.current = new Map(
      initialUnits.map((unit) => [
        contentGenerationUnitBaseKey(unit),
        unit.revisionId,
      ]),
    );
  }

  const revisionReplaced = useMemo(() => {
    if (!units) return false;
    const initial = initialRevisionByUnitRef.current ?? new Map<string, string>();
    for (const unit of units) {
      const expected = initial.get(contentGenerationUnitBaseKey(unit));
      if (expected === undefined || expected !== unit.revisionId) return true;
    }
    return false;
  }, [units]);

  const activeStatusSignature = useMemo(() => {
    if (!units) return "";
    return units
      .map((unit) => [
        contentGenerationUnitKey(unit),
        unit.status,
        unit.retryAfterSeconds ?? null,
      ].join(":"))
      .join("|");
  }, [units]);

  useEffect(() => {
    const queue = queueRef.current ?? [];
    if (fetcher.state !== "idle") {
      if (activeRequestKeyRef.current) sawBusyRef.current = true;
      return;
    }

    if (activeRequestKeyRef.current && sawBusyRef.current) {
      const completedKey = activeRequestKeyRef.current;
      activeRequestKeyRef.current = null;
      sawBusyRef.current = false;
      setRequestingKey(null);
      if (fetcher.data) {
        setResults((current) => ({
          ...current,
          [completedKey]: fetcher.data!,
        }));
      }
      setQueueTick((value) => value + 1);
      return;
    }

    while (nextIndexRef.current < queue.length) {
      const unit = queue[nextIndexRef.current]!;
      nextIndexRef.current += 1;
      const key = contentGenerationUnitKey(unit);
      if (attemptedRef.current.has(key)) continue;

      attemptedRef.current.add(key);
      activeRequestKeyRef.current = key;
      sawBusyRef.current = false;
      setRequestingKey(key);
      const formData = new FormData();
      formData.set(
        "intent",
        unit.contentType === "topic-title"
          ? "generateTopicTitleTranslation"
          : "generatePostBodyTranslation",
      );
      if (unit.contentType === "post-body") {
        formData.set("postId", unit.contentId);
      }
      fetcher.submit(formData, {
        method: "post",
        defaultShouldRevalidate: false,
      });
      return;
    }

    if (queue.length > 0 && !finalRevalidationStartedRef.current) {
      finalRevalidationStartedRef.current = true;
      revalidator.revalidate();
    }
  }, [fetcher, fetcher.data, fetcher.state, queueTick, revalidator]);

  const automaticQueueSettled = (queueRef.current?.length ?? 0) === 0
    || (
      nextIndexRef.current >= (queueRef.current?.length ?? 0)
      && activeRequestKeyRef.current === null
      && finalRevalidationStartedRef.current
    );

  useEffect(() => {
    if (
      !units
      || !automaticQueueSettled
      || revisionReplaced
      || revalidator.state !== "idle"
      || pollCountRef.current >= CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION
    ) {
      return;
    }

    const active = units.some((unit) =>
      unit.status === "pending"
      || unit.status === "processing"
      || unit.status === "deferred"
    );
    if (!active) return;

    const timer = window.setTimeout(() => {
      if (pollCountRef.current >= CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION) return;
      pollCountRef.current += 1;
      revalidator.revalidate();
    }, CONTENT_GENERATION_POLL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeStatusSignature,
    automaticQueueSettled,
    revalidator,
    revalidator.state,
    revisionReplaced,
    units,
  ]);

  return { requestingKey, results };
}

function generationStatusText(
  t: (key: string, options?: Record<string, unknown>) => string,
  unit: ContentGenerationViewModel,
  requesting: boolean,
  actionResult?: ContentGenerationActionResponse,
): string | null {
  if (requesting) return t("translationRequesting");

  if (actionResult?.outcome === "queued") return t("translationQueued");
  if (actionResult?.outcome === "unavailable") return t("translationUnavailable");
  if (actionResult?.outcome === "explicit-required") {
    return t("translationExplicitRequired");
  }
  if (
    actionResult?.outcome === "no-op"
    && actionResult.reason === "request-budget-denied"
  ) {
    return actionResult.retryAfterSeconds !== undefined
      ? t("translationDeferredWithRetry", {
          seconds: actionResult.retryAfterSeconds,
        })
      : t("translationDeferred");
  }

  switch (unit.status) {
    case "pending":
      return t("translationQueued");
    case "processing":
      return t("translationProcessing");
    case "deferred":
      return unit.retryAfterSeconds !== undefined
        ? t("translationDeferredWithRetry", {
            seconds: unit.retryAfterSeconds,
          })
        : t("translationDeferred");
    case "failed":
      return t("translationFailed");
    case "unavailable":
      return t("translationUnavailable");
    case "current":
      return t("translationCurrent");
    case "idle":
      return unit.explicitRequired ? t("translationExplicitRequired") : null;
  }
}
