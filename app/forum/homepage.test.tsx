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
            sectionCount: 4,
            topicCount: 22,
            messageCount: 78,
            sections: [
              { id: "typescript", name: "TypeScript & architecture", topicCount: 7, messageCount: 31 },
              { id: "databases", name: "Databases", topicCount: 5, messageCount: 17 },
              { id: "testing", name: "Testing", topicCount: 6, messageCount: 18 },
              { id: "frontend", name: "Frontend", topicCount: 4, messageCount: 12 },
            ],
          },
        ]}
      />,
    );

    expect(await screen.findByRole("region", { name: "Categories" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: "Categories" })).not.toBeInTheDocument();
    const categoryLinks = [...document.querySelectorAll<HTMLAnchorElement>(".home-category-identity h2 a")];
    expect(categoryLinks.map((link) => link.textContent)).toEqual(["Help & solutions", "Development"]);
    expect(categoryLinks[0]).toHaveAttribute("href", "/en/categories/help-solutions");
    const developmentCopy = categoryLinks[1]!.closest(".home-category-copy");
    expect(developmentCopy).not.toBeNull();
    expect(developmentCopy).toHaveTextContent("Development");
    expect(developmentCopy).toHaveTextContent("Frontend, backend, architecture, languages, and testing.");
    const developmentToggle = screen.getByRole("button", { name: "Show 1 more section" });
    expect(developmentToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: /TypeScript & architecture/ }))
      .toHaveAttribute("href", "/en/sections/typescript");
    expect(screen.getByRole("link", { name: /Databases/ }))
      .toHaveAttribute("href", "/en/sections/databases");
    expect(screen.getByRole("link", { name: /Testing/ }))
      .toHaveAttribute("href", "/en/sections/testing");
    expect(document.querySelectorAll(".home-category-section-row")).toHaveLength(3);
    expect(document.querySelector(".home-category-sections .category-section-card")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".home-category-section-description")).toHaveLength(3);
    expect(document.querySelector(".home-category-section-description"))
      .toHaveTextContent("Sections, discussions, and practical answers in this area.");
    expect(screen.queryByRole("link", { name: /Frontend/ })).not.toBeInTheDocument();

    fireEvent.click(developmentToggle);

    expect(developmentToggle).toHaveAttribute("aria-expanded", "true");
    expect(developmentToggle).toHaveAttribute("aria-label", "Show fewer sections");
    expect(developmentToggle).toHaveTextContent("");
    expect(screen.getByRole("link", { name: /Frontend/ }))
      .toHaveAttribute("href", "/en/sections/frontend");

    fireEvent.click(developmentToggle);

    expect(developmentToggle).toHaveAttribute("aria-expanded", "false");
    expect(developmentToggle).toHaveAttribute("aria-label", "Show 1 more section");
    expect(developmentToggle).toHaveTextContent("");
    expect(screen.getByRole("link", { name: /TypeScript & architecture/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Frontend/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pinned" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Latest topics" })).not.toBeInTheDocument();
  });

  it("keeps a category visible when its internal structure is not defined yet", async () => {
    renderView(
      <HomeView
        locale="en"
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
    expect(screen.queryByRole("button", { name: "Help & solutions" })).not.toBeInTheDocument();
    expect(screen.queryByText("There are no sections in this category yet.")).not.toBeInTheDocument();
  });

  it("routes unfinished shell destinations to development and implemented discovery destinations to real pages", async () => {
    renderView(
      <HomeView
        locale="en"
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
      <UnderDevelopmentView locale="en" requestedFeature="drafts" />,
      "/en/under-development?feature=drafts",
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Under development" })).toBeVisible();
    expect(screen.getByText("Drafts and autosave is not finished yet.")).toBeVisible();
    expect(screen.queryByText("Pinned-topic management")).not.toBeInTheDocument();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    expect(screen.getAllByText("Drafts and autosave").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Back to the forum" })).toHaveAttribute("href", "/en");
  });
});
