import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import type { ContentGenerationViewUnit } from "../localization/content-generation-view.server";
import { createTranslationRuntime } from "../localization/runtime";
import { ContentGenerationUnitUi } from "./content-generation-controls";

afterEach(cleanup);

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

function i18n() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: canonicalCommonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function unit(overrides: Partial<ContentGenerationViewUnit> = {}): ContentGenerationViewUnit {
  return {
    key: '["post-body","post-1","post-r1","he"]',
    contentType: "post-body",
    contentId: "post-1",
    revisionId: "post-r1",
    targetLocale: "he",
    state: "idle",
    autoEligible: false,
    explicitRequired: true,
    ...overrides,
  };
}

function renderControl(
  generationUnit: ContentGenerationViewUnit,
  action = vi.fn(async ({ request }: { request: Request }) => {
    const form = await request.formData();
    return {
      operation: "contentGeneration" as const,
      outcome: "queued" as const,
      received: Object.fromEntries(form.entries()),
    };
  }),
) {
  const router = createMemoryRouter([{
    path: "*",
    loader: () => null,
    action,
    Component: () => <ContentGenerationUnitUi unit={generationUnit} />,
  }], {
    initialEntries: ["/en/topics/topic-1"],
  });

  render(
    <I18nextProvider i18n={i18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  return { router, action };
}

describe("content generation controls", () => {
  it("submits only the explicit long-body intent and post id", async () => {
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const form = await request.formData();
      return {
        operation: "contentGeneration" as const,
        outcome: "queued" as const,
        received: Object.fromEntries(form.entries()),
      };
    });
    renderControl(unit(), action);

    await userEvent.click(await screen.findByRole("button", {
      name: "Translate this message",
    }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const result = await action.mock.results[0]!.value;
    expect(result.received).toEqual({
      intent: "generatePostBodyTranslationExplicit",
      postId: "post-1",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Translation is queued.");
  });

  it("renders bounded deferred retry feedback without backend details", async () => {
    renderControl(unit({
      state: "deferred",
      explicitRequired: false,
      retryAfterSeconds: 9,
    }));

    expect(await screen.findByRole("status"))
      .toHaveTextContent("Translation can retry in 9 seconds.");
    expect(screen.queryByRole("button", { name: "Translate this message" }))
      .not.toBeInTheDocument();
  });
});
