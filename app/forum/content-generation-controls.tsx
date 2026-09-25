import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFetcher, useLocation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";

const POLL_DELAY_MS = 2_000;
const MAX_POLLS_PER_HYDRATION = 15;

export type ContentGenerationAutomaticFeedback =
  | { readonly state: "requesting" }
  | {
      readonly state: "result";
      readonly response: ContentGenerationActionResponse;
    };

const EMPTY_AUTOMATIC_FEEDBACK = new Map<string, ContentGenerationAutomaticFeedback>();
const automaticFeedbackContext = createContext<
  ReadonlyMap<string, ContentGenerationAutomaticFeedback>
>(EMPTY_AUTOMATIC_FEEDBACK);

export function ContentGenerationNavigationBoundary({
  pageIdentity,
  units,
  children,
}: {
  pageIdentity: string;
  units: readonly ContentGenerationUnitView[];
  children: ReactNode;
}) {
  const location = useLocation();
  const lifecycleKey = contentGenerationNavigationLifecycleKey(location.key, pageIdentity);
  return (
    <ContentGenerationManager
      key={lifecycleKey}
      lifecycleKey={lifecycleKey}
      units={units}
    >
      {children}
    </ContentGenerationManager>
  );
}

export function contentGenerationNavigationLifecycleKey(
  locationKey: string,
  pageIdentity: string,
): string {
  return JSON.stringify([locationKey, pageIdentity]);
}

export function ContentGenerationManager({
  lifecycleKey,
  units,
  children,
}: {
  lifecycleKey: string;
  units: readonly ContentGenerationUnitView[];
  children: ReactNode;
}) {
  const fetcher = useFetcher<ContentGenerationActionResponse>({
    key: `content-generation-auto:${lifecycleKey}`,
  });
  const revalidator = useRevalidator();
  const submitRef = useRef(fetcher.submit);
  const revalidateRef = useRef(revalidator.revalidate);
  const fetcherDataRef = useRef(fetcher.data);
  submitRef.current = fetcher.submit;
  revalidateRef.current = revalidator.revalidate;
  fetcherDataRef.current = fetcher.data;

  const automaticSnapshot = useRef<readonly ContentGenerationUnitView[] | null>(null);
  const initialUnitKeys = useRef<ReadonlySet<string> | null>(null);
  if (automaticSnapshot.current === null) {
    automaticSnapshot.current = units.filter((unit) => unit.automatic);
    initialUnitKeys.current = new Set(units.map((unit) => unit.key));
  }

  const started = useRef(false);
  const active = useRef(false);
  const pollCount = useRef(0);
  const queueIndex = useRef(0);
  const attemptedKeys = useRef(new Set<string>());
  const inFlightKey = useRef<string | null>(null);
  const inFlightSawBusyState = useRef(false);
  const queueFinished = useRef(false);
  const submitNextRef = useRef<() => void>(() => undefined);
  const [automaticFeedback, setAutomaticFeedback] = useState(
    () => new Map<string, ContentGenerationAutomaticFeedback>(),
  );

  submitNextRef.current = () => {
    if (!active.current || inFlightKey.current !== null) return;

    const queue = automaticSnapshot.current ?? [];
    while (queueIndex.current < queue.length) {
      const unit = queue[queueIndex.current++]!;
      if (attemptedKeys.current.has(unit.key)) continue;

      attemptedKeys.current.add(unit.key);
      inFlightKey.current = unit.key;
      inFlightSawBusyState.current = false;
      setAutomaticFeedback((current) => withAutomaticFeedback(
        current,
        unit.key,
        { state: "requesting" },
      ));
      void submitRef.current(
        automaticSubmission(unit),
        { method: "post", defaultShouldRevalidate: false },
      );
      return;
    }

    if (!queueFinished.current) {
      queueFinished.current = true;
      if (queue.length > 0) revalidateRef.current();
    }
  };

  useEffect(() => {
    active.current = true;
    if (!started.current) {
      started.current = true;
      submitNextRef.current();
    }
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    const key = inFlightKey.current;
    if (!key) return;

    if (fetcher.state !== "idle") {
      inFlightSawBusyState.current = true;
      return;
    }
    if (!inFlightSawBusyState.current || !fetcher.data) return;

    setAutomaticFeedback((current) => withAutomaticFeedback(
      current,
      key,
      { state: "result", response: fetcher.data! },
    ));
    inFlightKey.current = null;
    inFlightSawBusyState.current = false;
    submitNextRef.current();
  }, [fetcher.state, fetcher.data]);

  const currentUnitKeySignature = useMemo(
    () => units.map((unit) => unit.key).join("\u0000"),
    [units],
  );
  useEffect(() => {
    const currentKeys = new Set(units.map((unit) => unit.key));
    setAutomaticFeedback((current) => {
      let changed = false;
      const next = new Map<string, ContentGenerationAutomaticFeedback>();
      for (const [key, feedback] of current) {
        if (currentKeys.has(key)) next.set(key, feedback);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [currentUnitKeySignature, units]);

  const activePollingKey = useMemo(() => units
    .filter((unit) =>
      initialUnitKeys.current?.has(unit.key)
      && (
        unit.state === "pending"
        || unit.state === "processing"
        || unit.state === "deferred"
        || unit.state === "converging"
      )
    )
    .map((unit) => unit.key)
    .join("|"), [units]);

  useEffect(() => {
    if (
      !activePollingKey
      || revalidator.state !== "idle"
      || pollCount.current >= MAX_POLLS_PER_HYDRATION
    ) return;

    const timer = window.setTimeout(() => {
      pollCount.current += 1;
      revalidateRef.current();
    }, POLL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activePollingKey, revalidator.state]);

  return (
    <automaticFeedbackContext.Provider value={automaticFeedback}>
      {children}
    </automaticFeedbackContext.Provider>
  );
}

export function ContentGenerationUnitStatus({
  unit,
  automaticFeedback: automaticFeedbackOverride,
}: {
  unit: ContentGenerationUnitView | undefined;
  automaticFeedback?: ContentGenerationAutomaticFeedback;
}) {
  const { t } = useTranslation("common");
  const explicitFetcher = useFetcher<ContentGenerationActionResponse>();
  const automaticFeedbackByKey = useContext(automaticFeedbackContext);
  if (!unit) return null;

  const automaticFeedback = automaticFeedbackOverride ?? automaticFeedbackByKey.get(unit.key);
  const busy = explicitFetcher.state !== "idle";
  const explicitActionFeedback = generationActionFeedback(explicitFetcher.data, t);
  const automaticActionFeedback = automaticFeedbackText(automaticFeedback, t);
  const stateFeedback = generationStateFeedback(unit, t);
  const feedback = unit.state !== "idle"
    ? stateFeedback
    : busy
      ? t("translationRequesting")
      : explicitActionFeedback ?? automaticActionFeedback ?? stateFeedback;

  return (
    <div className="content-generation-status">
      {feedback && <p aria-live="polite">{feedback}</p>}
      {unit.explicitRequired && unit.contentType === "post-body" && (
        <explicitFetcher.Form method="post">
          <input type="hidden" name="intent" value="generateExplicitPostBodyTranslation" />
          <input type="hidden" name="postId" value={unit.contentId} />
          <button
            type="submit"
            disabled={busy || explicitFetcher.data?.outcome === "queued"}
          >
            {t("translationExplicitAction")}
          </button>
        </explicitFetcher.Form>
      )}
    </div>
  );
}

function withAutomaticFeedback(
  current: ReadonlyMap<string, ContentGenerationAutomaticFeedback>,
  key: string,
  feedback: ContentGenerationAutomaticFeedback,
): Map<string, ContentGenerationAutomaticFeedback> {
  const next = new Map(current);
  next.set(key, feedback);
  return next;
}

function automaticSubmission(unit: ContentGenerationUnitView): FormData {
  const formData = new FormData();
  if (unit.contentType === "topic-title") {
    formData.set("intent", "generateTopicTitleTranslation");
  } else {
    formData.set("intent", "generatePostBodyTranslation");
    formData.set("postId", unit.contentId);
  }
  return formData;
}

function automaticFeedbackText(
  feedback: ContentGenerationAutomaticFeedback | undefined,
  t: TFunction,
): string | null {
  if (!feedback) return null;
  if (feedback.state === "requesting") return t("translationRequesting");
  return generationActionFeedback(feedback.response, t);
}

function generationStateFeedback(
  unit: ContentGenerationUnitView,
  t: TFunction,
): string | null {
  switch (unit.state) {
    case "idle":
      return unit.explicitRequired ? t("translationExplicitRequired") : null;
    case "pending":
      return t("translationPending");
    case "processing":
      return t("translationProcessing");
    case "converging":
      return t("translationConverging");
    case "deferred":
      return unit.retryAfterSeconds === undefined
        ? t("translationDeferred")
        : t("translationDeferredFor", { seconds: unit.retryAfterSeconds });
    case "failed":
      return t("translationFailed");
    case "current":
      return t("translationCurrent");
    case "unavailable":
      return t("translationUnavailable");
  }
}

function generationActionFeedback(
  data: ContentGenerationActionResponse | undefined,
  t: TFunction,
): string | null {
  if (!data || data.operation !== "contentGeneration") return null;
  if (data.outcome === "queued") return t("translationPending");
  if (data.outcome === "explicit-required") return t("translationExplicitRequired");
  if (data.outcome === "unavailable") return t("translationUnavailable");
  if (data.outcome === "invalid" || data.outcome === "not-found") {
    return t("translationRequestChanged");
  }
  if (
    data.outcome === "no-op"
    && data.reason === "request-budget-denied"
    && data.retryAfterSeconds !== undefined
  ) {
    return t("translationRetryAfter", { seconds: data.retryAfterSeconds });
  }
  return data.outcome === "no-op" ? t("translationRequestChanged") : null;
}
