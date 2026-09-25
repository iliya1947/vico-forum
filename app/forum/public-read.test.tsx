import "@testing-library/jest-dom/vitest";
import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterContextProvider, RouterProvider, createMemoryRouter, matchRoutes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ForumReader } from "../../db/forum-repository";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { localeRegistry } from "../localization/registry";
import { ContentTranslationPresentationService } from "../localization/content-translation-presentation";
import {
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";
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
  isSolved: false, bestAnswerPostId: null,
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

function originalTopicPresentation(topicValue: typeof topic | {
  title: typeof topic.title;
  posts: Array<{ body: { originalContent: string; sourceLocale: string } }>;
}) {
  const original = (content: string, locale: string) => ({
    selected: "original" as const,
    displayed: { content, locale, direction: locale === "en" ? "ltr" as const : "auto" as const },
    original: { content, locale, direction: locale === "en" ? "ltr" as const : "auto" as const },
    translation: null,
    fallbackReason: "missing" as const,
  });
  return {
    title: original(topicValue.title.originalContent, topicValue.title.sourceLocale),
    posts: topicValue.posts.map((post) => original(post.body.originalContent, post.body.sourceLocale)),
  };
}

afterEach(cleanup);

function context(locale = "en", direction: "ltr" | "rtl" = "ltr") {
  const value = new RouterContextProvider();
  value.set(forumReaderContext, reader);
  value.set(localeContext, {
    translationLocale: locale,
    fallbackLocales: locale === "en" ? [] : ["en"],
    direction,
    formatting: { locale, timeZone: "UTC" },
    nativeName: locale,
    presentationMetadata: {},
  });
  value.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test-registry",
    health: { status: "healthy" as const },
  }));
  value.set(
    contentTranslationPresentationContext,
    new ContentTranslationPresentationService({
      readTopic: async () => ({ posts: [] }),
    }),
  );
  return value;
}

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

function runtime(locale: string, direction: "ltr" | "rtl") {
  const common = canonicalCommonResources();
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
    const requestContext = context(locale, direction);
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

describe("category count presentation", () => {
  it("composes topic and message totals through independent plural lookups", async () => {
    const data = {
      locale: "en",
      category: {
        ...category,
        sections: [
          { id: "mixed-one", name: "Mixed one", topicCount: 1, postCount: 2 },
          { id: "mixed-two", name: "Mixed two", topicCount: 2, postCount: 1 },
        ],
      },
    };

    renderRoute(CategoryRoute, data, "/en/categories/development", "en", "ltr");

    expect(await screen.findByText("1 topic · 2 messages")).toBeInTheDocument();
    expect(screen.getByText("2 topics · 1 message")).toBeInTheDocument();
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
  it("shows public solved state, highlights the answer, and links to its stable post anchor", async () => {
    const solvedTopic = { ...topic, isSolved: true, bestAnswerPostId: "answer" };
    renderRoute(TopicRoute, { locale: "en", topic: solvedTopic, translationPresentation: originalTopicPresentation(solvedTopic), authenticated: false, canManageSolution: false }, "/en/topics/typed-api", "en", "ltr");
    expect(await screen.findByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("Best answer").closest("li")).toHaveAttribute("id", "post-answer");
    expect(screen.getByText("Best answer").closest("li")).toHaveClass("best-answer");
    expect(screen.getByRole("link", { name: "Go to solution" })).toHaveAttribute("href", "#post-answer");
    expect(screen.queryByRole("button", { name: "Select as best answer" })).not.toBeInTheDocument();
  });

  it("keeps best-answer, body, and solution controls inside one post content region", async () => {
    const followup = {
      ...topic.posts[0]!,
      id: "followup",
      authorId: "sam",
      authorName: "Sam",
      body: { id: "post-r2", originalContent: "Follow-up explanation.", sourceLocale: "en" },
    };
    const solvedTopic = {
      ...topic,
      isSolved: true,
      bestAnswerPostId: "answer",
      posts: [topic.posts[0]!, followup],
    };

    renderRoute(
      TopicRoute,
      { locale: "en", topic: solvedTopic, translationPresentation: originalTopicPresentation(solvedTopic), canReply: false, canManageSolution: true },
      "/en/topics/typed-api",
      "en",
      "ltr",
    );

    expect(await screen.findByText("Best answer")).toBeInTheDocument();

    const bestPost = document.querySelector("#post-answer");
    const followupPost = document.querySelector("#post-followup");
    expect(bestPost).not.toBeNull();
    expect(followupPost).not.toBeNull();

    const bestHeader = bestPost!.children.item(0);
    const bestContent = bestPost!.children.item(1);
    expect(bestPost!.children).toHaveLength(2);
    expect(bestHeader?.tagName).toBe("HEADER");
    expect(bestContent).toHaveClass("forum-post-content");
    expect(bestContent).toContainElement(bestPost!.querySelector(".best-answer-label"));
    expect(bestContent).toContainElement(bestPost!.querySelector(".post-body"));
    expect(bestHeader).not.toContainElement(bestContent as HTMLElement);

    const followupHeader = followupPost!.children.item(0);
    const followupContent = followupPost!.children.item(1);
    expect(followupPost!.children).toHaveLength(2);
    expect(followupHeader?.tagName).toBe("HEADER");
    expect(followupContent).toHaveClass("forum-post-content");
    expect(followupContent).toContainElement(followupPost!.querySelector(".post-body"));
    expect(followupContent).toContainElement(followupPost!.querySelector(".solution-form"));
    expect(screen.getByRole("button", { name: "Select as best answer" })).toBeInTheDocument();
  });

  it("shows solution controls only to the topic author", async () => {
    const unsolved = { locale: "en", topic, translationPresentation: originalTopicPresentation(topic), canReply: true, canManageSolution: true };
    const authorView = renderRoute(TopicRoute, unsolved, "/en/topics/typed-api", "en", "ltr");
    expect(await screen.findByRole("button", { name: "Mark as solved" })).toBeInTheDocument();
    authorView.unmount();
    renderRoute(TopicRoute, { ...unsolved, canManageSolution: false }, "/en/topics/typed-api", "en", "ltr");
    expect(screen.queryByRole("button", { name: "Mark as solved" })).not.toBeInTheDocument();
  });

  it("renders explicit source-locale correction controls only for authorized resources", async () => {
    renderRoute(
      TopicRoute,
      {
        locale: "en",
        topic,
        translationPresentation: originalTopicPresentation(topic),
        canReply: false,
        canManageSolution: false,
        canCorrectTitleSourceLocale: true,
        correctablePostIds: ["answer"],
      },
      "/en/topics/typed-api",
      "en",
      "ltr",
    );
    expect(await screen.findAllByRole("button", { name: "Correct language" })).toHaveLength(2);
    expect(screen.getAllByText("Source language: en")).toHaveLength(2);
    expect(document.querySelector('input[name="expectedRevisionId"][value="title-r1"]')).not.toBeNull();
    expect(document.querySelector('input[name="postId"][value="answer"]')).not.toBeNull();
  });

  it("auto-presents persisted translations with provenance, original controls, language metadata, and safe Markdown", async () => {
    const translatedBody = "Translated **body** ![blocked](https://example.test/image.png) [safe link](https://example.test/docs)";
    const translationPresentation = {
      title: {
        selected: "translation" as const,
        displayed: { content: "כותרת מתורגמת", locale: "he", direction: "rtl" as const },
        original: { content: topic.title.originalContent, locale: "en", direction: "ltr" as const },
        translation: {
          content: "כותרת מתורגמת",
          locale: "he",
          direction: "rtl" as const,
          provenance: {
            origin: "machine" as const,
            provider: "provider-a",
            model: "model-a",
            attribution: "Provider attribution",
          },
        },
      },
      posts: [{
        selected: "translation" as const,
        displayed: { content: translatedBody, locale: "he", direction: "rtl" as const },
        original: { content: topic.posts[0]!.body.originalContent, locale: "en", direction: "ltr" as const },
        translation: {
          content: translatedBody,
          locale: "he",
          direction: "rtl" as const,
          provenance: { origin: "persistent_manual" as const },
        },
      }],
    };

    renderRoute(
      TopicRoute,
      {
        locale: "he",
        topic,
        translationPresentation,
        canReply: false,
        canManageSolution: false,
        canCorrectTitleSourceLocale: false,
        correctablePostIds: [],
      },
      "/he/topics/typed-api",
      "he",
      "rtl",
    );

    expect(await screen.findByRole("heading", { name: "כותרת מתורגמת" })).toHaveAttribute("lang", "he");
    expect(screen.getByRole("heading", { name: "כותרת מתורגמת" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("Provider attribution")).toBeInTheDocument();
    expect(screen.getByText("Automatic translation")).toBeInTheDocument();
    expect(screen.getByText("Manual translation")).toBeInTheDocument();
    expect(screen.getAllByText("Show original")).toHaveLength(2);
    expect(screen.getAllByText("Show translation")).toHaveLength(2);
    const titleToggle = document.querySelector(".topic-title-toggle");
    expect(titleToggle).toBeInstanceOf(HTMLDetailsElement);
    fireEvent.click(titleToggle!.querySelector("summary")!);
    expect(titleToggle).toHaveAttribute("open");
    const originalTitles = screen.getAllByText(topic.title.originalContent);
    expect(originalTitles).toHaveLength(2);
    for (const originalTitle of originalTitles) expect(originalTitle).toHaveAttribute("lang", "en");
    expect(screen.getByText(topic.posts[0]!.body.originalContent)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "safe link" })).toHaveAttribute("rel", "nofollow noopener noreferrer ugc");
    expect(screen.getByRole("link", { name: "safe link" })).toHaveAttribute("target", "_blank");
  });

  it("shows forum write forms only for an authenticated loader result", async () => {
    const guestView = renderRoute(SectionRoute, { locale: "en", section, canCreateTopic: false }, "/en/sections/typescript", "en", "ltr");
    expect(screen.queryByRole("heading", { name: "Create a new topic" })).not.toBeInTheDocument();
    guestView.unmount();

    const authenticatedView = renderRoute(SectionRoute, { locale: "en", section, canCreateTopic: true }, "/en/sections/typescript", "en", "ltr");
    expect(await screen.findByRole("heading", { name: "Create a new topic" })).toBeInTheDocument();
    authenticatedView.unmount();

    renderRoute(TopicRoute, { locale: "en", topic, translationPresentation: originalTopicPresentation(topic), canReply: true, canManageSolution: false }, "/en/topics/typed-api", "en", "ltr");
    expect(await screen.findByRole("heading", { name: "Add a reply" })).toBeInTheDocument();
  });

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
