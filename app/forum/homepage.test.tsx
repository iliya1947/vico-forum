import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { createTranslationRuntime } from "../localization/runtime";
import { UnderDevelopmentView } from "./under-development-view";
import { HomeView } from "./views";

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

function runtime() {
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

function renderView(element: React.ReactNode, path = "/en") {
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [path] });
  return render(
    <I18nextProvider i18n={runtime()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

describe("homepage target presentation", () => {
  it("renders the four-part forum block and expands additional topics in place", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime="2026-09-30T16:00:00.000Z"
        categories={[{
          id: "development",
          name: "Development",
          description: "Frontend, backend, architecture, languages, and testing.",
          icon: "</>",
          sectionCount: 3,
          topicCount: 12,
          messageCount: 48,
          pinnedTopics: [
            { id: "p1", title: "Pinned one", authorName: "Ada", activityAt: "2026-09-30T12:00:00.000Z" },
            { id: "p2", title: "Pinned two", authorName: "Lin", activityAt: "2026-09-30T11:00:00.000Z" },
            { id: "p3", title: "Pinned three", authorName: "Sam", activityAt: "2026-09-30T10:00:00.000Z" },
          ],
          latestTopics: [
            { id: "l1", title: "Latest one", authorName: "Ada", activityAt: "2026-09-30T15:42:00.000Z" },
            { id: "l2", title: "Latest two", authorName: "Lin", activityAt: "2026-09-30T14:00:00.000Z" },
            { id: "l3", title: "Latest three", authorName: "Sam", activityAt: "2026-09-29T16:00:00.000Z" },
          ],
        }]}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Development" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pinned" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Latest topics" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Development" }))
      .toHaveAttribute("href", "/en/categories/development");
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(screen.getAllByText("48").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Pinned three" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Latest three" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show more topics" }));

    expect(screen.getByRole("link", { name: "Latest three" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Show fewer topics" })).toHaveAttribute("aria-expanded", "true");
  });

  it("routes unfinished shell destinations to the shared development page", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime="2026-09-30T16:00:00.000Z"
        categories={[]}
      />,
    );

    expect(await screen.findByRole("link", { name: "Search the forum" }))
      .toHaveAttribute("href", "/en/under-development?feature=search");
    expect(screen.getByRole("link", { name: "Unanswered" }))
      .toHaveAttribute("href", "/en/under-development?feature=unanswered-filter");
    expect(screen.getByRole("link", { name: "Tags" }))
      .toHaveAttribute("href", "/en/under-development?feature=technology-tags");
    expect(screen.getByRole("link", { name: "Popular" }))
      .toHaveAttribute("href", "/en/under-development?feature=popular");
    expect(screen.queryByRole("link", { name: "Unread" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rules" }))
      .toHaveAttribute("href", "/en/under-development?feature=rules");
  });

  it("shows Unread in homepage navigation only for an authenticated user", async () => {
    renderView(
      <HeaderAuthProvider initialUser={{ name: "Ada Lovelace" }}>
        <HomeView
          locale="en"
          referenceTime="2026-09-30T16:00:00.000Z"
          categories={[]}
        />
      </HeaderAuthProvider>,
    );

    expect(await screen.findByRole("link", { name: "Unread" }))
      .toHaveAttribute("href", "/en/under-development?feature=unread");
  });

  it("does not pretend pinned-topic data exists when runtime pinning is unavailable", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime="2026-09-30T16:00:00.000Z"
        categories={[{
          id: "development",
          name: "Development",
          sectionCount: 1,
          topicCount: 1,
          messageCount: 1,
          pinnedTopics: [],
          latestTopics: [],
        }]}
      />,
    );

    expect(await screen.findByRole("link", { name: "Pinned topics are under development." }))
      .toHaveAttribute("href", "/en/under-development?feature=pinned-topics");
  });
});

describe("under development page", () => {
  it("identifies the requested unfinished function and lists remaining approved work", async () => {
    renderView(<UnderDevelopmentView locale="en" requestedFeature="search" />, "/en/under-development?feature=search");

    expect(await screen.findByRole("heading", { level: 1, name: "Under development" })).toBeVisible();
    expect(screen.getByText("Global forum search is not finished yet.")).toBeVisible();
    expect(screen.getAllByText("Global forum search").length).toBeGreaterThan(0);
    expect(screen.getByText("Drafts and autosave")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the forum" })).toHaveAttribute("href", "/en");
  });
});
