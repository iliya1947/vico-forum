import { StrictMode, type ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentGenerationActionResponse } from "../localization/content-generation-response";

type SubmitMock = (
  data: FormData,
  options: { method: string; defaultShouldRevalidate?: boolean },
) => Promise<void>;

type FetcherState = "idle" | "submitting" | "loading";

const mocks = vi.hoisted(() => ({
  autoSubmit: vi.fn<SubmitMock>(() => Promise.resolve()),
  explicitSubmit: vi.fn<SubmitMock>(() => Promise.resolve()),
  auto: {
    state: "idle" as FetcherState,
    data: undefined as ContentGenerationActionResponse | undefined,
  },
  explicit: {
    state: "idle" as FetcherState,
    data: undefined as ContentGenerationActionResponse | undefined,
  },
  revalidate: vi.fn(),
  revalidator: { state: "idle" as "idle" | "loading" },
}));

vi.mock("react-router", () => ({
  useFetcher: (options?: { key?: string }) => {
    const automatic = options?.key === "content-generation-auto";
    const current = automatic ? mocks.auto : mocks.explicit;
    return {
      submit: automatic ? mocks.autoSubmit : mocks.explicitSubmit,
      state: current.state,
      data: current.data,
      Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    };
  },
  useRevalidator: () => ({
    state: mocks.revalidator.state,
    revalidate: mocks.revalidate,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { seconds?: number }) =>
      options?.seconds === undefined ? key : `${key}:${options.seconds}`,
  }),
}));

import {
  ContentGenerationManager,
  ContentGenerationUnitStatus,
} from "./content-generation-controls";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";

function unit(
  key: string,
  overrides: Partial<ContentGenerationUnitView> = {},
): ContentGenerationUnitView {
  return {
    key,
    contentType: "post-body",
    contentId: key,
    revisionId: `${key}-r1`,
    targetLocale: "he",
    state: "idle",
    automatic: true,
    explicitRequired: false,
    ...overrides,
  };
}

function managed(units: readonly ContentGenerationUnitView[]) {
  return (
    <ContentGenerationManager units={units}>
      {units.map((current) => (
        <ContentGenerationUnitStatus key={current.key} unit={current} />
      ))}
    </ContentGenerationManager>
  );
}

async function completeAutomaticSubmission(
  rendered: ReturnType<typeof render>,
  units: readonly ContentGenerationUnitView[],
  response: ContentGenerationActionResponse,
) {
  mocks.auto.state = "submitting";
  rendered.rerender(managed(units));
  await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));

  mocks.auto.data = response;
  mocks.auto.state = "idle";
  rendered.rerender(managed(units));
}

describe("content generation client orchestration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.autoSubmit.mockClear();
    mocks.explicitSubmit.mockClear();
    mocks.revalidate.mockClear();
    mocks.auto.state = "idle";
    mocks.auto.data = undefined;
    mocks.explicit.state = "idle";
    mocks.explicit.data = undefined;
    mocks.revalidator.state = "idle";
    vi.useRealTimers();
  });

  it("associates automatic requesting and queued feedback with the exact unit", async () => {
    const units = [unit("post-1")];
    const rendered = render(managed(units));

    await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByText("translationRequesting").getAttribute("aria-live")).toBe("polite");

    await completeAutomaticSubmission(rendered, units, {
      operation: "contentGeneration",
      outcome: "queued",
    });

    await waitFor(() => expect(screen.queryByText("translationPending")).not.toBeNull());
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "bounded no-op",
      { operation: "contentGeneration", outcome: "no-op", reason: "already-current" } as const,
      "translationRequestChanged",
    ],
    [
      "request budget denial",
      {
        operation: "contentGeneration",
        outcome: "no-op",
        reason: "request-budget-denied",
        retryAfterSeconds: 17,
      } as const,
      "translationRetryAfter:17",
    ],
    [
      "temporary unavailable",
      { operation: "contentGeneration", outcome: "unavailable" } as const,
      "translationUnavailable",
    ],
  ])("keeps %s feedback on the submitted exact unit", async (_label, response, expected) => {
    const units = [unit("post-1")];
    const rendered = render(managed(units));

    await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));
    await completeAutomaticSubmission(rendered, units, response);

    await waitFor(() => expect(screen.getByText(expected).getAttribute("aria-live")).toBe("polite"));
  });

  it("lets refreshed loader state override stale automatic action feedback", async () => {
    const initial = [unit("post-1")];
    const rendered = render(managed(initial));

    await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));
    await completeAutomaticSubmission(rendered, initial, {
      operation: "contentGeneration",
      outcome: "no-op",
      reason: "request-budget-denied",
      retryAfterSeconds: 17,
    });
    await waitFor(() => expect(screen.queryByText("translationRetryAfter:17")).not.toBeNull());

    const refreshed = [unit("post-1", { state: "processing", automatic: false })];
    rendered.rerender(managed(refreshed));

    expect(screen.queryByText("translationProcessing")).not.toBeNull();
    expect(screen.queryByText("translationRetryAfter:17")).toBeNull();
  });

  it("drops old automatic feedback when the exact revision key is replaced", async () => {
    const initial = [unit("post-1")];
    const rendered = render(managed(initial));

    await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));
    await completeAutomaticSubmission(rendered, initial, {
      operation: "contentGeneration",
      outcome: "unavailable",
    });
    await waitFor(() => expect(screen.queryByText("translationUnavailable")).not.toBeNull());

    const replacement = [unit("post-1-r2", { automatic: false })];
    rendered.rerender(managed(replacement));

    expect(screen.queryByText("translationUnavailable")).toBeNull();
  });

  it("marks exact keys before submit so Strict Mode replay and duplicates do not resubmit", async () => {
    const duplicate = unit("post-1");
    const units = [duplicate, duplicate];
    const rendered = render(
      <StrictMode>
        <ContentGenerationManager units={units}>
          <div>content</div>
        </ContentGenerationManager>
      </StrictMode>,
    );

    await waitFor(() => expect(mocks.autoSubmit).toHaveBeenCalledTimes(1));

    mocks.auto.state = "submitting";
    rendered.rerender(
      <StrictMode>
        <ContentGenerationManager units={units}>
          <div>content</div>
        </ContentGenerationManager>
      </StrictMode>,
    );
    mocks.auto.data = { operation: "contentGeneration", outcome: "queued" };
    mocks.auto.state = "idle";
    rendered.rerender(
      <StrictMode>
        <ContentGenerationManager units={units}>
          <div>content</div>
        </ContentGenerationManager>
      </StrictMode>,
    );

    await waitFor(() => expect(mocks.revalidate).toHaveBeenCalledTimes(1));
    expect(mocks.autoSubmit).toHaveBeenCalledTimes(1);
    const submitted = mocks.autoSubmit.mock.calls[0]![0];
    expect(submitted.get("postId")).toBe("post-1");
    expect(mocks.autoSubmit.mock.calls[0]![1]?.defaultShouldRevalidate).toBe(false);
  });

  it("polls pending and convergence states only through finite read-only revalidation", async () => {
    vi.useFakeTimers();
    const units = [
      unit("post-1", { state: "pending", automatic: false }),
      unit("post-2", { state: "converging", automatic: false }),
    ];
    const rendered = render(managed(units));

    for (let index = 0; index < 15; index++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      mocks.revalidator.state = "loading";
      rendered.rerender(managed(units));
      mocks.revalidator.state = "idle";
      rendered.rerender(managed(units));
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mocks.revalidate).toHaveBeenCalledTimes(15);
    expect(mocks.autoSubmit).not.toHaveBeenCalled();
  });

  it("does not poll replacement revisions introduced after hydration", async () => {
    vi.useFakeTimers();
    const initial = [unit("post-1", { state: "idle", automatic: false })];
    const rendered = render(managed(initial));

    const replacement = [unit("post-1-r2", { state: "pending", automatic: false })];
    rendered.rerender(managed(replacement));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.autoSubmit).not.toHaveBeenCalled();
  });
});
