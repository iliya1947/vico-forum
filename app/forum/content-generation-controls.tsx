import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";

import type { ContentGenerationActionResponse } from "./actions.server";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";

const POLL_DELAY_MS = 2_000;
const MAX_POLLS_PER_HYDRATION = 15;

export function ContentGenerationManager({
  units,
}: {
  units: readonly ContentGenerationUnitView[];
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<ContentGenerationActionResponse>({ key: "content-generation-auto" });
  const revalidator = useRevalidator();
  const submitRef = useRef(fetcher.submit);
  const revalidateRef = useRef(revalidator.revalidate);
  submitRef.current = fetcher.submit;
  revalidateRef.current = revalidator.revalidate;

  const automaticSnapshot = useRef<readonly ContentGenerationUnitView[] | null>(null);
  const initialUnitKeys = useRef<ReadonlySet<string> | null>(null);
  if (automaticSnapshot.current === null) {
    automaticSnapshot.current = units.filter((unit) => unit.automatic);
    initialUnitKeys.current = new Set(units.map((unit) => unit.key));
  }

  const started = useRef(false);
  const active = useRef(false);
  const pollCount = useRef(0);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);

  useEffect(() => {
    active.current = true;
    if (!started.current) {
      started.current = true;
      void runAutomaticQueue(
        automaticSnapshot.current ?? [],
        () => active.current,
        async (unit) => {
          setRequestingKey(unit.key);
          await submitRef.current(
            automaticSubmission(unit),
            { method: "post", defaultShouldRevalidate: false },
          );
        },
      ).finally(() => {
        if (!active.current) return;
        setRequestingKey(null);
        if ((automaticSnapshot.current?.length ?? 0) > 0) {
          revalidateRef.current();
        }
      });
    }
    return () => {
      active.current = false;
    };
  }, []);

  const activePollingKey = useMemo(() => units
    .filter((unit) =>
      initialUnitKeys.current?.has(unit.key)
      && (unit.state === "pending" || unit.state === "processing" || unit.state === "deferred")
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

  if (!requestingKey) return null;
  return (
    <p className="content-generation-live" aria-live="polite">
      {t("translationRequesting")}
    </p>
  );
}

export function ContentGenerationUnitStatus({
  unit,
}: {
  unit: ContentGenerationUnitView | undefined;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  if (!unit) return null;

  const busy = fetcher.state !== "idle";
  const actionFeedback = generationActionFeedback(fetcher.data, t);
  const stateFeedback = generationStateFeedback(unit, t);
  const feedback = busy
    ? t("translationRequesting")
    : unit.state === "idle"
      ? actionFeedback ?? stateFeedback
      : stateFeedback;

  return (
    <div className="content-generation-status">
      {feedback && <p aria-live="polite">{feedback}</p>}
      {unit.explicitRequired && unit.contentType === "post-body" && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="generateExplicitPostBodyTranslation" />
          <input type="hidden" name="postId" value={unit.contentId} />
          <button type="submit" disabled={busy || fetcher.data?.outcome === "queued"}>
            {t("translationExplicitAction")}
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

export async function runAutomaticQueue(
  units: readonly ContentGenerationUnitView[],
  isActive: () => boolean,
  submit: (unit: ContentGenerationUnitView) => Promise<void>,
): Promise<void> {
  const attempted = new Set<string>();
  for (const unit of units) {
    if (!isActive()) return;
    if (attempted.has(unit.key)) continue;
    attempted.add(unit.key);
    await submit(unit);
  }
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

function generationStateFeedback(
  unit: ContentGenerationUnitView,
  t: ReturnType<typeof useTranslation>["t"],
): string | null {
  switch (unit.state) {
    case "idle":
      return unit.explicitRequired ? t("translationExplicitRequired") : null;
    case "pending":
      return t("translationPending");
    case "processing":
      return t("translationProcessing");
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
  t: ReturnType<typeof useTranslation>["t"],
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
