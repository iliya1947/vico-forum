import "@testing-library/jest-dom/vitest";
import type { ComponentType } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterContextProvider, RouterProvider, createMemoryRouter, matchRoutes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ForumReader } from "../../db/forum-repository";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import CategoryRoute, { loader as categoryLoader } from "../routes/category";
import Home, { loader as homeLoader } from "../routes/home";
import { ErrorBoundary as NotFoundErrorBoundary, loader as notFoundLoader } from "../routes/not-found";
import SectionRoute, { loader as sectionLoader } from "../routes/section";
import TopicRoute, { loader as topicLoader } from "../routes/topic";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "./paths";
import { forumReaderContext } from "./request-context";

const category = { id: "development/core", name: "Development", sections: [{ id: "typescript/basics", name: "TypeScript", topicCount: 1, postCount: 1 }] };
const section = {
  id: "typescript/basics", name: "TypeScript", category: { id: "development/core", name: "Development" },
  topics: [{
    id: "typed/api", authorName: "Ada", postCount: 1, createdAt: new Date("2026-01-01"),
    title: { id: "title-r1", originalContent: "How do I type an API?", sourceLocale: "en" },
  }],
};
const topic = {
  id: "typed/api", sectionId: "typescript/basics", authorId: "ada", authorName: "Ada", createdAt: new Date("2026-01-01"),
  title: section.topics[0]!.title,
  section: { id: "typescript/basics", name: "TypeScript", category: { id: "development/core", name: "Development" } },
  posts: [{
    id: "answer", topicId: "typed/api", authorId: "lin", authorName: "Lin", createdAt: new Date("2026-01-02"),
    body: { id: "post-r1", originalContent: "Start with an explicit response type.", sourceLocale: "en" },
  }],
};

const reader: ForumReader = {
  listCategories: async () => [{ id: category.id, name: category.name, sectionCount: 1 }],
  readCategory: async (id) => id === category.id ? category : undefined,
  readSection: async (id) => id === section.id ? section : undefined,
  readTopicPage: async (id) => id === topic.id ? topic : undefined,
};

afterEach(cleanup);

function context() {
  const value = new RouterContextProvider();
  value.set(forumReaderContext, reader);
  return value;
}

function runtime(locale: string, direction: "ltr" | "rtl") {
  const common = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, descriptor]) => [key, descriptor.source]));
  return createTranslationRuntime({
    locale: { translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"], direction, formatting: { locale, timeZone: "UTC" }, nativeName: locale, presentationMetadata: {} },
    fallbackLocales: locale === "en" ? [] : ["en"], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function renderRoute(Component: ComponentType, data: unknown, path: string, locale: string, direction: "ltr" | "rtl") {
  const router = createMemoryRouter([{ id: "page", path: "*", Component, loader: () => data }], {
    initialEntries: [path],
  });
  return render(<div lang={locale} dir={direction}><I18nextProvider i18n={runtime(locale, direction)}><RouterProvider router={router} /></I18nextProvider></div>);
}

describe.each([
  { locale: "en", direction: "ltr" as const },
  { locale: "he", direction: "rtl" as const },
])("public forum read flow ($locale)", ({ locale, direction }) => {
  it("loads and links category → section → topic → posts with the canonical locale", async () => {
    const requestContext = context();
    const home = await homeLoader({ params: { locale }, context: requestContext });
    const categoryData = await categoryLoader({ params: { locale, categoryId: category.id }, context: requestContext });
    const sectionData = await sectionLoader({ params: { locale, sectionId: section.id }, context: requestContext });
    const topicData = await topicLoader({ params: { locale, topicId: topic.id }, context: requestContext });

    expect(home.categories).toHaveLength(1);
    expect(categoryData.category.sections).toHaveLength(1);
    expect(sectionData.section.topics).toHaveLength(1);
    expect(topicData.topic.posts[0]?.body.originalContent).toBe("Start with an explicit response type.");

    const homeView = renderRoute(Home, home, `/${locale}`, locale, direction);
    expect(await screen.findByRole("link", { name: /Development/ })).toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    expect(document.querySelector(`[dir="${direction}"]`)).toBeInTheDocument();
    homeView.unmount();

    const categoryView = renderRoute(CategoryRoute, categoryData, forumCategoryPath(locale, category.id), locale, direction);
    expect(await screen.findByRole("link", { name: /TypeScript/ })).toHaveAttribute("href", `/${locale}/sections/typescript%2Fbasics`);
    categoryView.unmount();

    const sectionView = renderRoute(SectionRoute, sectionData, forumSectionPath(locale, section.id), locale, direction);
    expect(await screen.findByRole("link", { name: "Development" })).toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    expect(await screen.findByRole("link", { name: "How do I type an API?" })).toHaveAttribute("href", `/${locale}/topics/typed%2Fapi`);
    sectionView.unmount();

    renderRoute(TopicRoute, topicData, forumTopicPath(locale, topic.id), locale, direction);
    expect(await screen.findByRole("link", { name: "Development" })).toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    expect(await screen.findByRole("link", { name: "TypeScript" })).toHaveAttribute("href", `/${locale}/sections/typescript%2Fbasics`);
    expect(await screen.findByText("Start with an explicit response type.")).toBeInTheDocument();
  });
});

describe("forum path encoding", () => {
  it("encodes an opaque forum id as one path segment and round-trips the route param", () => {
    const categoryId = "a/b?c#d%e тема";
    const path = forumCategoryPath("en", categoryId);
    expect(path).toBe("/en/categories/a%2Fb%3Fc%23d%25e%20%D1%82%D0%B5%D0%BC%D0%B0");
    const matches = matchRoutes([{ path: "/:locale/categories/:categoryId" }], path);
    expect(matches?.[0]?.params).toMatchObject({ locale: "en", categoryId });
  });
});

describe("forum read states", () => {
  it("returns route-level 404 responses for missing entities", async () => {
    await expect(categoryLoader({ params: { locale: "en", categoryId: "missing" }, context: context() })).rejects.toMatchObject({ status: 404 });
  });

  it("renders the localized forum not-found state for an unknown locale-scoped URL", async () => {
    const router = createMemoryRouter([{
      path: "*",
      loader: notFoundLoader,
      ErrorBoundary: NotFoundErrorBoundary,
    }], {
      initialEntries: ["/en/does-not-exist"],
    });

    render(<I18nextProvider i18n={runtime("en", "ltr")}><RouterProvider router={router} /></I18nextProvider>);

    expect(await screen.findByRole("heading", { name: "Forum page not found" })).toBeInTheDocument();
    expect(screen.getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(screen.queryByText("Unexpected Application Error!")).not.toBeInTheDocument();
  });
});
