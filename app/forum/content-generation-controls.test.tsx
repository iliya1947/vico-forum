import { StrictMode, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(async (_data: FormData, _options: { method: string; defaultShouldRevalidate?: boolean }) => undefined),
  revalidate: vi.fn(),
  revalidator: { state: "idle" as "idle" | "loading" },
}));

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mocks.submit,
    state: "idle",
    data: undefined,
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  }),
  useRevalidator: () => ({
    state: mocks.revalidator.state,
    revalidate: mocks.revalidate,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import {
  ContentGenerationManager,
  runAutomaticQueue,
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

describe("content generation client orchestration", () => {
  beforeEach(() => {
    mocks.submit.mockClear();
    mocks.revalidate.mockClear();
    mocks.revalidator.state = "idle";
    vi.useRealTimers();
  });

  it("deduplicates exact unit keys in the sequential automatic queue", async () => {
    const seen: string[] = [];
    await runAutomaticQueue(
      [unit("post-1"), unit("post-1"), unit("post-2")],
      () => true,
      async (current) => {
        seen.push(current.key);
      },
    );

    expect(seen).toEqual(["post-1", "post-2"]);
  });

  it("submits each hydration snapshot unit once under Strict Mode replay", async () => {
    render(
      <StrictMode>
        <ContentGenerationManager units={[unit("post-1"), unit("post-2")]} />
      </StrictMode>,
    );

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
    expect(mocks.submit.mock.calls.map((call) => {
      const data = call[0] as FormData;
      return [data.get("intent"), data.get("postId")];
    })).toEqual([
      ["generatePostBodyTranslation", "post-1"],
      ["generatePostBodyTranslation", "post-2"],
    ]);
    expect(mocks.submit.mock.calls.every((call) => call[1]?.defaultShouldRevalidate === false)).toBe(true);
    await waitFor(() => expect(mocks.revalidate).toHaveBeenCalledTimes(1));
  });

  it("polls active states only through read-only revalidation and stops at the finite cap", async () => {
    vi.useFakeTimers();
    const units = [unit("post-1", { state: "pending", automatic: false })];
    const rendered = render(<ContentGenerationManager units={units} />);

    for (let index = 0; index < 15; index++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      mocks.revalidator.state = "loading";
      rendered.rerender(<ContentGenerationManager units={units} />);
      mocks.revalidator.state = "idle";
      rendered.rerender(<ContentGenerationManager units={units} />);
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mocks.revalidate).toHaveBeenCalledTimes(15);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("does not poll replacement revisions introduced after hydration", async () => {
    vi.useFakeTimers();
    const initial = [unit("post-1", { state: "idle", automatic: false })];
    const rendered = render(<ContentGenerationManager units={initial} />);

    rendered.rerender(
      <ContentGenerationManager
        units={[unit("post-1-r2", { state: "pending", automatic: false })]}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
