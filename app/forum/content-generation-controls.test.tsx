import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import {
  RouterProvider,
  createMemoryRouter,
  useLoaderData,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import type { ContentGenerationActionResponse } from "../localization/content-generation-contract";
import type { ContentGenerationViewModel } from "../localization/content-generation-status";
import { createTranslationRuntime } from "../localization/runtime";
import {
  CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION,
  CONTENT_GENERATION_POLL_DELAY_MS,
  ContentGenerationClientBoundary,
  ContentGenerationUnitControl,
} from "./content-generation-controls";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function unit(overrides: Partial<ContentGenerationViewModel> = {}): ContentGenerationViewModel {
  return {
    contentType: "topic-title",
    contentId: "topic-1",
    revisionId: "title-r1",
    targetLocale: "he",
    status: "idle",
    automaticEligible: true,
    explicitRequired: false,
    ...overrides,
  };
}

function Page() {
  const { units } = useLoaderData() as {
    units: readonly ContentGenerationViewModel[];
  };
  return (
    <ContentGenerationClientBoundary units={units}>
      {units.map((value) => (
        <ContentGenerationUnitControl
          key={[
            value.contentType,
            value.contentId,
            value.revisionId,
            value.targetLocale,
          ].join(":")}
          unit={value}
        />
      ))}
    </ContentGenerationClientBoundary>
  );
}

function runtime() {
  const common: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      common[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      common[`${key}_${branch}`] = value;
    }
  }
  return createTranslationRuntime({
    locale: {
      translationLocale: "he",
      fallbackLocales: ["en"],
      direction: "rtl",
      formatting: { locale: "he", timeZone: "UTC" },
      nativeName: "עברית",
      presentationMetadata: {},
    },
    fallbackLocales: ["en"],
    resourcesByLocale: { en: { common } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function renderHarness(options: {
  loader: () => readonly ContentGenerationViewModel[] | Promise<readonly ContentGenerationViewModel[]>;
  action?: (formData: FormData) => ContentGenerationActionResponse | Promise<ContentGenerationActionResponse>;
  strict?: boolean;
}) {
  let loaderCalls = 0;
  const actionCalls: Array<Record<string, string>> = [];
  const router = createMemoryRouter([{
    path: "/:locale/topics/:topicId",
    Component: Page,
    loader: async () => {
      loaderCalls++;
      return { units: await options.loader() };
    },
    action: async ({ request }) => {
      const formData = await request.formData();
      actionCalls.push(Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, String(value)]),
      ));
      return options.action?.(formData)
        ?? { operation: "contentGeneration", outcome: "queued" };
    },
  }], {
    initialEntries: ["/he/topics/topic-1"],
  });

  const tree = (
    <I18nextProvider i18n={runtime()}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
  render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return {
    router,
    actionCalls,
    loaderCalls: () => loaderCalls,
  };
}

describe("content generation hydration coordination", () => {
  it("submits each snapshotted exact unit once under Strict Mode and revalidates once after the sequential queue", async () => {
    let load = 0;
    const title = unit();
    const post = unit({
      contentType: "post-body",
      contentId: "post-1",
      revisionId: "post-r1",
    });
    const harness = renderHarness({
      strict: true,
      loader: () => {
        load++;
        if (load === 1) return [title, post];
        return [
          { ...title, status: "current", automaticEligible: false },
          { ...post, status: "current", automaticEligible: false },
        ];
      },
    });

    await waitFor(() => expect(harness.actionCalls).toHaveLength(2));
    await waitFor(() => expect(harness.loaderCalls()).toBe(2));

    expect(harness.actionCalls).toEqual([
      { intent: "generateTopicTitleTranslation" },
      { intent: "generatePostBodyTranslation", postId: "post-1" },
    ]);
  });

  it("does not auto-submit a replacement revision discovered during final revalidation", async () => {
    let load = 0;
    const initial = unit();
    const replacement = unit({
      revisionId: "title-r2",
    });
    const harness = renderHarness({
      loader: () => {
        load++;
        return load === 1
          ? [initial]
          : [{ ...replacement, automaticEligible: true }];
      },
    });

    await waitFor(() => expect(harness.actionCalls).toHaveLength(1));
    await waitFor(() => expect(harness.loaderCalls()).toBe(2));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(harness.actionCalls).toEqual([
      { intent: "generateTopicTitleTranslation" },
    ]);
  });

  it("polls active status only through read-only revalidation and stops at the finite hydration cap", async () => {
    vi.useFakeTimers();
    const pending = unit({
      status: "pending",
      automaticEligible: false,
    });
    const harness = renderHarness({
      loader: () => [pending],
    });

    await act(async () => {
      await Promise.resolve();
    });

    for (let index = 0; index < CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION + 3; index++) {
      await act(async () => {
        vi.advanceTimersByTime(CONTENT_GENERATION_POLL_DELAY_MS);
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    expect(harness.actionCalls).toHaveLength(0);
    expect(harness.loaderCalls()).toBeLessThanOrEqual(
      1 + CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION,
    );
  });

  it("renders and submits the explicit long-body action only for the explicit unit", async () => {
    const explicit = unit({
      contentType: "post-body",
      contentId: "post-long",
      revisionId: "post-long-r1",
      automaticEligible: false,
      explicitRequired: true,
    });
    const harness = renderHarness({
      loader: () => [explicit],
    });

    const button = await screen.findByRole("button", {
      name: "Translate this message",
    });
    fireEvent.click(button);

    await waitFor(() => expect(harness.actionCalls).toHaveLength(1));
    expect(harness.actionCalls[0]).toEqual({
      intent: "generateExplicitPostBodyTranslation",
      postId: "post-long",
    });
  });
});
