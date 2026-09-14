import "@testing-library/jest-dom/vitest";
import type { ComponentType } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterContextProvider, RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ForumReader } from "../../db/forum-repository";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import CategoryRoute, { loader as categoryLoader } from "../routes/category";
import Home, { loader as homeLoader } from "../routes/home";
import SectionRoute, { loader as sectionLoader } from "../routes/section";
import TopicRoute, { loader as topicLoader } from "../routes/topic";
import { forumReaderContext } from "./request-context";

const category = { id: "development", name: "Development", sections: [{ id: "typescript", name: "TypeScript", topicCount: 1, postCount: 1 }] };
const section = {
  id: "typescript", name: "TypeScript", category: { id: "development", name: "Development" },
  topics: [{
    id: "typed-api", authorName: "Ada", postCount: 1, createdAt: new Date("2026-01-01"),
    title: { id: "title-r1", originalContent: "How do I type an API?", sourceLocale: "en" },
  }],
};
const topic = {
  id: "typed-api", sectionId: "typescript", authorId: "ada", authorName: "Ada", createdAt: new Date("2026-01-01"),
  title: section.topics[0]!.title,
  section: { id: "typescript", name: "TypeScript", category: { id: "development", name: "Development" } },
  posts: [{
    id: "answer", topicId: "typed-api", authorId: "lin", authorName: "Lin", createdAt: new Date("2026-01-02"),
    body: { id: "post-r1", originalContent: "Start with an explicit response type.", sourceLocale: "en" },
  }],
};

const reader: ForumReader = {
  listCategories: async () => [{ id: "development", name: "Development", sectionCount: 1 }],
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
    const categoryData = await categoryLoader({ params: { locale, categoryId: "development" }, context: requestContext });
    const sectionData = await sectionLoader({ params: { locale, sectionId: "typescript" }, context: requestContext });
    const topicData = await topicLoader({ params: { locale, topicId: "typed-api" }, context: requestContext });

    expect(home.categories).toHaveLength(1);
    expect(categoryData.category.sections).toHaveLength(1);
    expect(sectionData.section.topics).toHaveLength(1);
    expect(topicData.topic.posts[0]?.body.originalContent).toBe("Start with an explicit response type.");

    const homeView = renderRoute(Home, home, `/${locale}`, locale, direction);
    expect(await screen.findByRole("link", { name: /Development/ })).toHaveAttribute("href", `/${locale}/categories/development`);
    expect(document.querySelector(`[dir="${direction}"]`)).toBeInTheDocument();
    homeView.unmount();

    const categoryView = renderRoute(CategoryRoute, categoryData, `/${locale}/categories/development`, locale, direction);
    expect(await screen.findByRole("link", { name: /TypeScript/ })).toHaveAttribute("href", `/${locale}/sections/typescript`);
    categoryView.unmount();

    const sectionView = renderRoute(SectionRoute, sectionData, `/${locale}/sections/typescript`, locale, direction);
    expect(await screen.findByRole("link", { name: "How do I type an API?" })).toHaveAttribute("href", `/${locale}/topics/typed-api`);
    sectionView.unmount();

    renderRoute(TopicRoute, topicData, `/${locale}/topics/typed-api`, locale, direction);
    expect(await screen.findByText("Start with an explicit response type.")).toBeInTheDocument();
  });
});

describe("forum read states", () => {
  it("returns route-level 404 responses for missing entities", async () => {
    await expect(categoryLoader({ params: { locale: "en", categoryId: "missing" }, context: context() })).rejects.toMatchObject({ status: 404 });
  });
});
