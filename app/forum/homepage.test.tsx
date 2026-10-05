import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { createTranslationRuntime } from "../localization/runtime";
import { UnderDevelopmentView } from "./under-development-view";
import { HomeView } from "./views";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

const referenceTime = "2026-09-30T16:00:00.000Z";

function renderView(element: React.ReactNode, path = "/en") {
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [path] });
  return render(
    <I18nextProvider i18n={runtime()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

describe("homepage category map", () => {
  it("shows Help & solutions first and links directly to category sections", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime={referenceTime}
        categories={[
          {
            id: "help-solutions",
            name: "Help & solutions",
            description: "Questions, troubleshooting, and verified solutions.",
            icon: "help",
            sectionCount: 0,
            topicCount: 0,
            messageCount: 0,
            sections: [],
          },
          {
            id: "development",
            name: "Development",
            description: "Frontend, backend, architecture, languages, and testing.",
            icon: "code",
            sectionCount: 2,
            topicCount: 12,
            messageCount: 48,
            sections: [
              {
                id: "typescript",
                name: "TypeScript & architecture",
                topicCount: 7,
                messageCount: 31,
                pinnedTopics: [{
                  id: "typescript-pinned",
                  title: "Section guide",
                  authorName: "Vico Team",
                  activityAt: "2026-09-29T10:00:00.000Z",
                }],
                latestTopics: [{
                  id: "typed-api",
                  title: "How should I structure a typed API client?",
                  authorName: "Alex Rivera",
                  activityAt: "2026-09-30T15:42:00.000Z",
                }],
              },
              {
                id: "databases",
                name: "Databases",
                topicCount: 5,
                messageCount: 17,
                pinnedTopics: [],
                latestTopics: [],
              },
            ],
          },
        ]}
      />,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
    const categoryLinks = [...document.querySelectorAll<HTMLAnchorElement>(".home-category-identity h2 a")];
    expect(categoryLinks.map((link) => link.textContent)).toEqual(["Help & solutions", "Development"]);
    expect(categoryLinks[0]).toHaveAttribute("href", "/en/categories/help-solutions");
    const developmentToggle = screen.getByRole("button", { name: "Development" });
    expect(developmentToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "TypeScript & architecture" })).not.toBeInTheDocument();

    fireEvent.click(developmentToggle);

    expect(developmentToggle).toHaveAttribute("aria-expanded", "true");
    const typescriptLink = screen.getByRole("link", { name: "TypeScript & architecture" });
    expect(typescriptLink).toHaveAttribute("href", "/en/sections/typescript");
    expect(typescriptLink.closest("article")).toHaveClass("home-section-card");
    expect(screen.getByRole("link", { name: "Databases" }))
      .toHaveAttribute("href", "/en/sections/databases");
    expect(screen.getAllByRole("heading", { name: "Pinned" })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { name: "Latest topics" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Section guide" })).toHaveAttribute("href", "/en/topics/typescript-pinned");
    expect(screen.getByRole("link", { name: "How should I structure a typed API client?" }))
      .toHaveAttribute("href", "/en/topics/typed-api");

    fireEvent.click(developmentToggle);

    expect(developmentToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "TypeScript & architecture" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pinned" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Latest topics" })).not.toBeInTheDocument();
  });

  it("keeps a category visible when its internal structure is not defined yet", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime={referenceTime}
        categories={[{
          id: "help-solutions",
          name: "Help & solutions",
          sectionCount: 0,
          topicCount: 0,
          messageCount: 0,
          sections: [],
        }]}
      />,
    );

    expect(await screen.findByRole("link", { name: "Help & solutions" }))
      .toHaveAttribute("href", "/en/categories/help-solutions");
    expect(screen.queryByText("There are no sections in this category yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Help & solutions" }));

    expect(screen.getByText("There are no sections in this category yet.")).toBeVisible();
  });

  it("routes unfinished shell destinations to development and implemented discovery destinations to real pages", async () => {
    renderView(
      <HomeView
        locale="en"
        referenceTime={referenceTime}
        categories={[]}
      />,
    );

    expect(await screen.findByRole("link", { name: "Search the forum" }))
      .toHaveAttribute("href", "/en/search");
    expect(screen.getByRole("link", { name: "Unanswered" }))
      .toHaveAttribute("href", "/en/unanswered");
    expect(screen.getByRole("link", { name: "Tags" }))
      .toHaveAttribute("href", "/en/tags");
    expect(screen.getByRole("link", { name: "Popular" }))
      .toHaveAttribute("href", "/en/popular");
    expect(screen.queryByRole("link", { name: "Unread" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rules" }))
      .toHaveAttribute("href", "/en/under-development?feature=rules");
  });

  it("shows Unread in homepage navigation only for an authenticated user", async () => {
    renderView(
      <HeaderAuthProvider initialUser={{ name: "Ada Lovelace" }}>
        <HomeView
          locale="en"
          referenceTime={referenceTime}
          categories={[]}
        />
      </HeaderAuthProvider>,
    );

    expect(await screen.findByRole("link", { name: "Unread" }))
      .toHaveAttribute("href", "/en/unread");
  });
});

describe("under development page", () => {
  it("identifies the requested unfinished function and lists remaining approved work", async () => {
    renderView(
      <UnderDevelopmentView locale="en" requestedFeature="pinned-topics" />,
      "/en/under-development?feature=pinned-topics",
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Under development" })).toBeVisible();
    expect(screen.getByText("Pinned-topic management is not finished yet.")).toBeVisible();
    expect(screen.getAllByText("Pinned-topic management").length).toBeGreaterThan(0);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    expect(screen.getByText("Drafts and autosave")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the forum" })).toHaveAttribute("href", "/en");
  });
});
