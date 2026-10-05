import "@testing-library/jest-dom/vitest";
import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterContextProvider, RouterProvider, createMemoryRouter, matchRoutes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ForumReader, ForumTopicPage } from "../../db/forum-repository";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ContentTranslationPresentationService, type ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { StoredContentTranslation } from "../localization/content-translation";
import { localeRegistry } from "../localization/registry";
import {
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";
import CategoryRoute, { loader as categoryLoader } from "../routes/category";
import Home, { loader as homeLoader } from "../routes/home";
import PopularRoute, { loader as popularLoader } from "../routes/popular";
import SearchRoute, { loader as searchLoader } from "../routes/search";
import TagsRoute, { loader as tagsLoader } from "../routes/tags";
import TagRoute, { loader as tagLoader } from "../routes/tag";
import UnansweredRoute, { loader as unansweredLoader } from "../routes/unanswered";
import { ErrorBoundary as NotFoundErrorBoundary, loader as notFoundLoader } from "../routes/not-found";
import SectionRoute, { loader as sectionLoader } from "../routes/section";
import TopicRoute, { loader as topicLoader } from "../routes/topic";
import { forumCategoryPath, forumPopularPath, forumSearchPath, forumSectionPath, forumTagPath, forumTagsPath, forumTopicPath, forumUnansweredPath } from "./paths";
import { forumReaderContext } from "./request-context";

const category = {
  id: "development/core",
  name: "Development",
  sections: [{
    id: "typescript/basics",
    name: "TypeScript",
    topicCount: 1,
    postCount: 1,
    latestTopics: [{
      id: "typed/api",
      title: "How do I type an API?",
      authorName: "Ada",
      activityAt: new Date("2026-01-02"),
    }],
  }],
};
const section = {
  id: "typescript/basics", name: "TypeScript", category: { id: "development/core", name: "Development" },
  topics: [{
    id: "typed/api", authorName: "Ada", postCount: 1, createdAt: new Date("2026-01-01"),
    tags: [{ key: "typescript", name: "TypeScript" }],
    title: { id: "title-r1", originalContent: "How do I type an API?", sourceLocale: "en" },
  }],
};
const topic = {
  id: "typed/api", sectionId: "typescript/basics", authorId: "ada", authorName: "Ada", createdAt: new Date("2026-01-01"),
  isSolved: false, bestAnswerPostId: null,
  title: section.topics[0]!.title,
  section: { id: "typescript/basics", name: "TypeScript", category: { id: "development/core", name: "Development" } },
  tags: [{ key: "typescript", name: "TypeScript" }],
  posts: [{
    id: "answer", topicId: "typed/api", authorId: "lin", authorName: "Lin", parentPostId: null, createdAt: new Date("2026-01-02"),
    body: { id: "post-r1", originalContent: "Start with an explicit response type.", sourceLocale: "en" },
  }],
};

const reader: ForumReader = {
  listCategories: async () => [{ id: category.id, name: category.name, sectionCount: 1 }],
  readHomepage: async () => [{
    id: category.id,
    name: category.name,
    sectionCount: 1,
    topicCount: 1,
    messageCount: 1,
    sections: [{
      id: section.id,
      name: section.name,
      topicCount: 1,
      messageCount: 1,
    }],
  }],
  readPopular: async () => ({
    "24h": [{
      id: topic.id,
      title: topic.title.originalContent,
      authorName: topic.authorName,
      activityCount: 3,
      latestActivityAt: topic.posts[0]!.createdAt,
    }],
    "7d": [{
      id: topic.id,
      title: topic.title.originalContent,
      authorName: topic.authorName,
      activityCount: 5,
      latestActivityAt: topic.posts[0]!.createdAt,
    }],
    "30d": [{
      id: topic.id,
      title: topic.title.originalContent,
      authorName: topic.authorName,
      activityCount: 8,
      latestActivityAt: topic.posts[0]!.createdAt,
    }],
  }),
  readUnanswered: async () => [{
    id: topic.id,
    title: topic.title.originalContent,
    authorName: topic.authorName,
    createdAt: topic.createdAt,
    section: topic.section,
    category: topic.section.category,
  }],
  readTags: async () => [{ key: "typescript", name: "TypeScript", topicCount: 1 }],
  readTag: async (key) => key === "typescript" ? {
    tag: { key: "typescript", name: "TypeScript" },
    topics: [{
      id: topic.id,
      title: topic.title.originalContent,
      authorName: topic.authorName,
      postCount: topic.posts.length,
      createdAt: topic.createdAt,
      section: { id: topic.section.id, name: topic.section.name },
      category: topic.section.category,
      tags: topic.tags,
    }],
  } : undefined,
  readUnreadForUser: async () => [{
    id: topic.id,
    title: topic.title.originalContent,
    authorName: topic.authorName,
    state: "new" as const,
    firstUnreadPostId: topic.posts[0]!.id,
    latestPostId: topic.posts.at(-1)!.id,
    unreadCount: topic.posts.length,
    activityAt: topic.posts.at(-1)!.createdAt,
    section: { id: topic.section.id, name: topic.section.name },
    category: topic.section.category,
  }],
  readTopicReadState: async (_userId, id) => id === topic.id ? {
    topicId: topic.id,
    state: "new" as const,
    lastReadPostId: null,
    firstUnreadPostId: topic.posts[0]!.id,
    latestPostId: topic.posts.at(-1)!.id,
  } : undefined,
  readReplyNotifications: async () => [],
  countUnreadReplyNotifications: async () => 0,
  search: async (query) => query.toLowerCase().includes("type") ? [{
    id: topic.id,
    title: topic.title.originalContent,
    authorName: topic.authorName,
    postCount: topic.posts.length,
    activityAt: topic.posts[0]!.createdAt,
    section: { id: topic.section.id, name: topic.section.name },
    category: topic.section.category,
    tags: topic.tags,
  }] : [],
  readCategory: async (id) => id === category.id ? category : undefined,
  readSection: async (id) => id === section.id ? section : undefined,
  readTopicPage: async (id) => id === topic.id ? topic : undefined,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function context(
  locale = "en",
  direction: "ltr" | "rtl" = locale === "he" ? "rtl" : "ltr",
  translations: readonly StoredContentTranslation[] = [],
) {
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
    semanticIdentity: "test",
    health: { status: "healthy" as const },
  }));
  value.set(
    contentTranslationPresentationContext,
    new ContentTranslationPresentationService({
      readBatch: async () => ({ translations }),
    }),
  );
  return value;
}

function originalPresentation(
  contentType: "topic-title" | "post-body",
  contentId: string,
  revision: { id: string; originalContent: string; sourceLocale: string },
): ContentTranslationPresentation {
  const originalLocale = revision.sourceLocale === "und" ? undefined : revision.sourceLocale;
  return {
    contentType,
    contentId,
    revisionId: revision.id,
    selected: "original",
    content: revision.originalContent,
    contentLocale: originalLocale,
    contentDirection: originalLocale === "he" ? "rtl" : originalLocale ? "ltr" : "auto",
    originalContent: revision.originalContent,
    originalLocale,
    originalDirection: originalLocale === "he" ? "rtl" : originalLocale ? "ltr" : "auto",
    fallbackReason: "missing",
  };
}

function topicRenderData(
  value: ForumTopicPage = topic,
  overrides: Record<string, unknown> = {},
) {
  return {
    locale: "en",
    topic: value,
    titlePresentation: originalPresentation("topic-title", value.id, value.title),
    postPresentations: value.posts.map((post) =>
      originalPresentation("post-body", post.id, post.body)
    ),
    generationUnits: [],
    canReply: false,
    canManageSolution: false,
    canCorrectTitleSourceLocale: false,
    correctablePostIds: [],
    topicReadState: null,
    ...overrides,
  };
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
    expect(topicData.generationUnits).toEqual([]);

    const homeView = renderRoute(Home, home, `/${locale}`, locale, direction);
    expect(await screen.findByRole("link", { name: "Development" }))
      .toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    expect(screen.getByRole("link", { name: /TypeScript/ }))
      .toHaveAttribute("href", `/${locale}/sections/typescript%2Fbasics`);
    expect(document.querySelector(`[dir="${direction}"]`)).toBeInTheDocument();
    homeView.unmount();

    const categoryView = renderRoute(CategoryRoute, categoryData, forumCategoryPath(locale, category.id), locale, direction);
    const categorySectionLink = await screen.findByRole("link", { name: "TypeScript" });
    expect(categorySectionLink).toHaveAttribute("href", `/${locale}/sections/typescript%2Fbasics`);
    expect(categorySectionLink.closest("article")).toHaveClass("home-section-card");
    expect(screen.getByRole("heading", { name: "Latest topics" })).toBeVisible();
    categoryView.unmount();

    const sectionView = renderRoute(SectionRoute, sectionData, forumSectionPath(locale, section.id), locale, direction);
    expect(await screen.findByRole("link", { name: "Development" })).toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    const sectionTopicLink = await screen.findByRole("link", { name: /How do I type an API\?/ });
    expect(sectionTopicLink).toHaveAttribute("href", `/${locale}/topics/typed%2Fapi`);
    expect(sectionTopicLink).toHaveClass("section-topic-card");
    sectionView.unmount();

    renderRoute(TopicRoute, topicData, forumTopicPath(locale, topic.id), locale, direction);
    expect(await screen.findByRole("link", { name: "Development" })).toHaveAttribute("href", `/${locale}/categories/development%2Fcore`);
    expect(await screen.findByRole("link", { name: "TypeScript" })).toHaveAttribute("href", `/${locale}/sections/typescript%2Fbasics`);
    expect(await screen.findByText("Start with an explicit response type.")).toBeInTheDocument();
  });
});

describe("Popular topics", () => {
  it("loads all three activity periods and keeps topic links locale-aware", async () => {
    const data = await popularLoader({
      params: { locale: "en" },
      context: context("en", "ltr"),
    });

    expect(data.periods["24h"][0]).toMatchObject({ id: topic.id, activityCount: 3 });
    expect(data.periods["7d"][0]).toMatchObject({ id: topic.id, activityCount: 5 });
    expect(data.periods["30d"][0]).toMatchObject({ id: topic.id, activityCount: 8 });

    renderRoute(PopularRoute, data, forumPopularPath("en"), "en", "ltr");

    expect(await screen.findByRole("heading", { level: 1, name: "Popular topics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "24 hours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "7 days" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "30 days" })).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /How do I type an API\?/ });
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute("href", forumTopicPath("en", topic.id));
    }
    expect(screen.getByText("3 messages")).toBeInTheDocument();
    expect(screen.getByText("5 messages")).toBeInTheDocument();
    expect(screen.getByText("8 messages")).toBeInTheDocument();
  });
});

describe("Forum search", () => {
  it("loads a query through the public reader and keeps result links locale-aware", async () => {
    const request = new Request("https://forum.example/en/search?q=TypeScript");
    const data = await searchLoader({
      request,
      params: { locale: "en" },
      context: context("en", "ltr"),
    });

    expect(data.query).toBe("TypeScript");
    expect(data.results).toHaveLength(1);

    renderRoute(SearchRoute, data, forumSearchPath("en") + "?q=TypeScript", "en", "ltr");

    expect(await screen.findByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("TypeScript");
    expect(screen.getByRole("link", { name: /How do I type an API\?/ }))
      .toHaveAttribute("href", forumTopicPath("en", topic.id));
    expect(screen.getByText("#TypeScript")).toBeInTheDocument();
  });

  it("renders a truthful no-results state", async () => {
    const data = await searchLoader({
      request: new Request("https://forum.example/en/search?q=WebAssembly"),
      params: { locale: "en" },
      context: context("en", "ltr"),
    });

    renderRoute(SearchRoute, data, forumSearchPath("en") + "?q=WebAssembly", "en", "ltr");
    expect(await screen.findByText("No topics found for “WebAssembly”.")).toBeInTheDocument();
  });
});

describe("Technology tags", () => {
  it("loads the tag index and a filtered tag page with locale-aware topic links", async () => {
    const indexData = await tagsLoader({ params: { locale: "en" }, context: context("en", "ltr") });
    renderRoute(TagsRoute, indexData, forumTagsPath("en"), "en", "ltr");
    expect(await screen.findByRole("heading", { level: 1, name: "Technology tags" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#TypeScript/ })).toHaveAttribute("href", forumTagPath("en", "typescript"));

    cleanup();
    const pageData = await tagLoader({ params: { locale: "en", tagKey: "typescript" }, context: context("en", "ltr") });
    renderRoute(TagRoute, pageData, forumTagPath("en", "typescript"), "en", "ltr");
    expect(await screen.findByRole("heading", { level: 1, name: "#TypeScript" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /How do I type an API\?/ })).toHaveAttribute("href", forumTopicPath("en", topic.id));
  });
});

describe("Unanswered topics", () => {
  it("loads unanswered topics and keeps topic links locale-aware", async () => {
    const data = await unansweredLoader({
      params: { locale: "en" },
      context: context("en", "ltr"),
    });

    expect(data.topics).toEqual([{
      id: topic.id,
      title: topic.title.originalContent,
      authorName: topic.authorName,
      section: topic.section,
      category: topic.section.category,
    }]);

    renderRoute(UnansweredRoute, data, forumUnansweredPath("en"), "en", "ltr");

    expect(await screen.findByRole("heading", { level: 1, name: "Unanswered topics" })).toBeInTheDocument();
    expect(screen.getByText("No replies yet")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /How do I type an API\?/ }))
      .toHaveAttribute("href", forumTopicPath("en", topic.id));
  });
});

describe("content translation presentation", () => {
  it("shows persisted current translations to a guest with provenance, original toggle, metadata and safe Markdown", async () => {
    const translations: StoredContentTranslation[] = [
      {
        contentType: "topic-title",
        contentId: topic.id,
        revisionId: topic.title.id,
        targetLocale: "he",
        sourceLocale: "en",
        translatedContent: "כותרת מתורגמת",
        provenance: {
          origin: "machine",
          provider: "provider",
          model: "model",
          attribution: "Provider attribution",
        },
      },
      {
        contentType: "post-body",
        contentId: topic.posts[0]!.id,
        revisionId: topic.posts[0]!.body.id,
        targetLocale: "he",
        sourceLocale: "en",
        translatedContent: "**טקסט מתורגם** <script>alert('x')</script> [Example](https://example.com)",
        provenance: {
          origin: "machine",
          provider: "provider",
          model: "model",
        },
      },
    ];

    const data = await topicLoader({
      params: { locale: "he", topicId: topic.id },
      context: context("he", "rtl", translations),
    });

    expect(data.titlePresentation).toMatchObject({
      selected: "translation",
      content: "כותרת מתורגמת",
      contentLocale: "he",
      contentDirection: "rtl",
    });
    expect(data.postPresentations[0]).toMatchObject({
      selected: "translation",
      contentLocale: "he",
      contentDirection: "rtl",
    });

    renderRoute(TopicRoute, data, "/he/topics/typed-api", "he", "rtl");

    const heading = await screen.findByRole("heading", { level: 1, name: "כותרת מתורגמת" });
    expect(heading).toHaveAttribute("lang", "he");
    expect(heading).toHaveAttribute("dir", "rtl");
    const topicHeading = document.querySelector(".topic-heading");
    const translatedPost = document.querySelector("#post-answer");
    expect(topicHeading).not.toBeNull();
    expect(translatedPost).not.toBeNull();
    expect(within(topicHeading as HTMLElement).getByText("Automatic translation")).toBeInTheDocument();
    expect(within(translatedPost as HTMLElement).getByText("Automatic translation")).toBeInTheDocument();
    expect(screen.getByText("Provider attribution")).toBeInTheDocument();
    expect(within(topicHeading as HTMLElement).getByText("Show original")).toBeInTheDocument();
    expect(within(topicHeading as HTMLElement).getByText("Show translation")).toBeInTheDocument();
    expect(within(translatedPost as HTMLElement).getByText("Show original")).toBeInTheDocument();
    expect(within(translatedPost as HTMLElement).getByText("Hide original")).toBeInTheDocument();
    expect(screen.getByText("How do I type an API?").closest("[lang]")).toHaveAttribute("lang", "en");
    expect(screen.getByText("How do I type an API?").closest("[dir]")).toHaveAttribute("dir", "ltr");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute("rel", "nofollow noopener noreferrer ugc");
    expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute("target", "_blank");
  });
});

describe("section topic count presentation", () => {
  it("keeps localized message count semantics inside compact topic rows", async () => {
    const data = {
      locale: "en",
      section: {
        id: "typescript",
        name: "TypeScript",
        category: { id: "development", name: "Development" },
        topics: [
          {
            id: "one",
            authorName: "Alex",
            postCount: 1,
            createdAt: new Date("2026-09-27T10:00:00Z"),
            tags: [],
            title: { id: "title-one", originalContent: "One message topic", sourceLocale: "en" },
          },
          {
            id: "two",
            authorName: "Sam",
            postCount: 2,
            createdAt: new Date("2026-09-27T11:00:00Z"),
            tags: [],
            title: { id: "title-two", originalContent: "Two message topic", sourceLocale: "en" },
          },
        ],
      },
      canCreateTopic: false,
    };

    renderRoute(SectionRoute, data, "/en/sections/typescript", "en", "ltr");

    expect(await screen.findByRole("group", { name: "1 message" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 messages" })).toBeInTheDocument();
  });
});

describe("category count presentation", () => {
  it("composes topic and message totals through independent plural lookups", async () => {
    const data = {
      locale: "en",
      referenceTime: "2026-01-03T00:00:00.000Z",
      category: {
        ...category,
        sections: [
          {
            id: "mixed-one",
            name: "Mixed one",
            topicCount: 1,
            postCount: 2,
            pinnedTopics: [],
            latestTopics: [],
          },
          {
            id: "mixed-two",
            name: "Mixed two",
            topicCount: 2,
            postCount: 1,
            pinnedTopics: [],
            latestTopics: [],
          },
        ],
      },
    };

    renderRoute(CategoryRoute, data, "/en/categories/development", "en", "ltr");

    expect(await screen.findByRole("group", { name: "1 topic · 2 messages" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 topics · 1 message" })).toBeInTheDocument();
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
  it("targets direct replies, exposes parent/child anchors, and quotes only selected message text", async () => {
    const seed = topic.posts[0]!;
    const question = {
      ...seed,
      id: "question",
      authorName: "Ada",
      parentPostId: null,
      body: { id: "post-q", originalContent: "Selected words from the question.", sourceLocale: "en" },
    };
    const reply = {
      ...seed,
      id: "reply",
      authorName: "Lin",
      parentPostId: "question",
      body: { id: "post-r", originalContent: "Direct reply.", sourceLocale: "en" },
    };
    const replyTopic = { ...topic, posts: [question, reply] };

    renderRoute(
      TopicRoute,
      topicRenderData(replyTopic, { canReply: true }),
      "/en/topics/typed-api",
      "en",
      "ltr",
    );

    await screen.findByText("Selected words from the question.");
    const questionCard = document.querySelector("#post-question");
    const replyCard = document.querySelector("#post-reply");
    expect(questionCard).not.toBeNull();
    expect(replyCard).not.toBeNull();

    const parentLinks = within(replyCard as HTMLElement).getAllByRole("link", { name: "Reply to #1" });
    expect(parentLinks).toHaveLength(2);
    for (const parentLink of parentLinks) {
      expect(parentLink).toHaveAttribute("href", "#post-question");
    }
    expect(within(questionCard as HTMLElement).getByRole("navigation", { name: "Direct replies" })
      .querySelector('a[href="#post-reply"]')).not.toBeNull();

    fireEvent.click(within(questionCard as HTMLElement).getByRole("button", { name: "Reply" }));
    const replyForm = screen.getByRole("form", { name: "Add a reply" });
    expect(await screen.findByText("Replying to Message #1")).toBeInTheDocument();
    expect(replyForm.querySelector('input[name="parentPostId"]')).toHaveValue("question");

    const bodyElement = questionCard!.querySelector("[data-message-body]");
    if (!bodyElement) throw new Error("message body selection target missing");
    vi.spyOn(window, "getSelection").mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => "Selected words",
      getRangeAt: () => ({
        startContainer: bodyElement,
        endContainer: bodyElement,
      }),
    } as unknown as Selection);

    fireEvent.click(within(questionCard as HTMLElement).getByRole("button", { name: "Quote" }));
    expect(screen.getByLabelText("Reply")).toHaveValue("> Selected words\n\n");

    vi.spyOn(window, "getSelection").mockReturnValue({
      rangeCount: 0,
      isCollapsed: true,
      toString: () => "",
    } as unknown as Selection);
    fireEvent.click(within(replyCard as HTMLElement).getByRole("button", { name: "Quote" }));
    expect(screen.getByText("Select text in this message to quote it.")).toBeInTheDocument();
  });

  it("copies a clean permanent locale-aware message link, keeps one active status, and reports clipboard failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    const secondPost = {
      ...topic.posts[0]!,
      id: "follow-up",
      authorName: "Maya",
      body: { id: "post-r2", originalContent: "Follow-up.", sourceLocale: "en" },
    };
    const multiPostTopic = { ...topic, posts: [topic.posts[0]!, secondPost] };

    renderRoute(TopicRoute, topicRenderData(multiPostTopic), "/en/topics/typed-api?temporary=1", "en", "ltr");

    const firstCopyButton = await screen.findByRole("button", { name: "Copy link to Message #1" });
    fireEvent.click(firstCopyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/en\/topics\/typed%2Fapi#post-answer$/));
    });
    expect(screen.getAllByText("Copied")).toHaveLength(1);

    const secondCopyButton = screen.getByRole("button", { name: "Copy link to Message #2" });
    fireEvent.click(secondCopyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/en\/topics\/typed%2Fapi#post-follow-up$/));
      expect(screen.getAllByText("Copied")).toHaveLength(1);
    });

    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(firstCopyButton);
    expect(await screen.findByText("Could not copy link.")).toBeInTheDocument();
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("shows public solved state, highlights the answer, and links to its stable post anchor", async () => {
    const solvedTopic = { ...topic, isSolved: true, bestAnswerPostId: "answer" };
    renderRoute(TopicRoute, topicRenderData(solvedTopic), "/en/topics/typed-api", "en", "ltr");
    expect(await screen.findByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("Best answer").closest("li")).toHaveAttribute("id", "post-answer");
    expect(screen.getByText("Best answer").closest("li")).toHaveClass("best-answer");
    expect(screen.getByRole("link", { name: "Go to solution" })).toHaveAttribute("href", "#post-answer");
    expect(screen.queryByRole("button", { name: "Select as best answer" })).not.toBeInTheDocument();
  });

  it("promotes the selected best answer after the original question without renumbering anchors", async () => {
    const seed = topic.posts[0]!;
    const question = {
      ...seed,
      id: "question",
      authorName: "Ada",
      body: { id: "post-q", originalContent: "Question.", sourceLocale: "en" },
    };
    const reply = {
      ...seed,
      id: "reply",
      authorName: "Lin",
      body: { id: "post-r2", originalContent: "First reply.", sourceLocale: "en" },
    };
    const best = {
      ...seed,
      id: "best",
      authorName: "Sam",
      body: { id: "post-r3", originalContent: "Selected answer.", sourceLocale: "en" },
    };
    const later = {
      ...seed,
      id: "later",
      authorName: "Maya",
      body: { id: "post-r4", originalContent: "Later reply.", sourceLocale: "en" },
    };
    const solvedTopic = {
      ...topic,
      isSolved: true,
      bestAnswerPostId: "best",
      posts: [question, reply, best, later],
    };

    renderRoute(
      TopicRoute,
      topicRenderData(solvedTopic),
      "/en/topics/typed-api",
      "en",
      "ltr",
    );

    expect(await screen.findByText("Best answer")).toBeInTheDocument();

    const cards = Array.from(document.querySelectorAll(".topic-message"));
    expect(cards.map((card) => card.id)).toEqual([
      "post-question",
      "post-best",
      "post-reply",
      "post-later",
    ]);
    expect(cards.map((card) => card.querySelector(".topic-message-anchor")?.textContent)).toEqual([
      "Message #1",
      "Message #3",
      "Message #2",
      "Message #4",
    ]);
  });

  it("keeps message metadata in the author column while body and solution controls stay in post content", async () => {
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
      topicRenderData(solvedTopic, { canManageSolution: true }),
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
    expect(bestHeader).toContainElement(bestPost!.querySelector(".best-answer-label"));
    expect(bestHeader).toContainElement(bestPost!.querySelector(".topic-message-anchor"));
    expect(bestContent).toContainElement(bestPost!.querySelector(".post-body"));
    expect(bestHeader).not.toContainElement(bestContent as HTMLElement);

    const followupHeader = followupPost!.children.item(0);
    const followupContent = followupPost!.children.item(1);
    expect(followupPost!.children).toHaveLength(2);
    expect(followupHeader?.tagName).toBe("HEADER");
    expect(followupContent).toHaveClass("forum-post-content");
    expect(followupHeader).toContainElement(followupPost!.querySelector(".topic-message-anchor"));
    expect(followupContent).toContainElement(followupPost!.querySelector(".post-body"));
    expect(followupContent).toContainElement(followupPost!.querySelector(".solution-form"));
    const followupTools = followupPost!.querySelector("details.message-secondary-tools");
    expect(followupTools).not.toBeNull();
    expect(followupTools).not.toHaveAttribute("open");
    expect(followupTools!.querySelector("summary")).toHaveTextContent("Message tools");
    expect(screen.getByRole("button", { name: "Select as best answer" }).closest("details")).toBe(followupTools);
  });

  it("shows solution controls only to the topic author behind progressive disclosure", async () => {
    const unsolved = topicRenderData(topic, { canReply: true, canManageSolution: true });
    const authorView = renderRoute(TopicRoute, unsolved, "/en/topics/typed-api", "en", "ltr");
    const topicTools = await screen.findByText("Topic tools");
    const topicToolsDetails = topicTools.closest("details");
    expect(topicToolsDetails).not.toBeNull();
    expect(topicToolsDetails).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Mark as solved" }).closest("details")).toBe(topicToolsDetails);
    authorView.unmount();

    renderRoute(TopicRoute, { ...unsolved, canManageSolution: false }, "/en/topics/typed-api", "en", "ltr");
    expect(screen.queryByText("Topic tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as solved" })).not.toBeInTheDocument();
  });

  it("renders source-locale correction only for authorized resources behind secondary disclosures", async () => {
    renderRoute(
      TopicRoute,
      topicRenderData(topic, {
        canCorrectTitleSourceLocale: true,
        correctablePostIds: ["answer"],
      }),
      "/en/topics/typed-api",
      "en",
      "ltr",
    );

    const topicTools = await screen.findByText("Topic tools");
    const messageTools = screen.getByText("Message tools");
    const topicToolsDetails = topicTools.closest("details");
    const messageToolsDetails = messageTools.closest("details");
    expect(topicToolsDetails).not.toHaveAttribute("open");
    expect(messageToolsDetails).not.toHaveAttribute("open");

    const correctionButtons = screen.getAllByRole("button", { name: "Correct language" });
    expect(correctionButtons).toHaveLength(2);
    expect(correctionButtons.map((button) => button.closest("details"))).toEqual([
      topicToolsDetails,
      messageToolsDetails,
    ]);
    expect(screen.getAllByText("Source language: en")).toHaveLength(2);
    expect(document.querySelector('input[name="expectedRevisionId"][value="title-r1"]')).not.toBeNull();
    expect(document.querySelector('input[name="postId"][value="answer"]')).not.toBeNull();
  });

  it("shows accessible forum write forms only for an authenticated loader result", async () => {
    const guestView = renderRoute(SectionRoute, { locale: "en", section, canCreateTopic: false, topicReadStates: null }, "/en/sections/typescript", "en", "ltr");
    expect(screen.queryByRole("form", { name: "Create a new topic" })).not.toBeInTheDocument();
    guestView.unmount();

    const authenticatedView = renderRoute(SectionRoute, { locale: "en", section, canCreateTopic: true, topicReadStates: { [topic.id]: "read" } }, "/en/sections/typescript", "en", "ltr");
    const createTopicForm = await screen.findByRole("form", { name: "Create a new topic" });
    expect(createTopicForm).toHaveClass("section-create-form");
    expect(createTopicForm.querySelector('input[name="intent"]')).toHaveValue("createTopic");
    expect(screen.getByLabelText("Topic title")).toHaveAttribute("aria-describedby", "create-topic-title-help");
    expect(screen.getByText("Markdown and fenced code blocks are supported.")).toBeInTheDocument();
    authenticatedView.unmount();

    renderRoute(TopicRoute, topicRenderData(topic, { canReply: true }), "/en/topics/typed-api", "en", "ltr");
    const replyForm = await screen.findByRole("form", { name: "Add a reply" });
    expect(replyForm).toHaveClass("topic-reply-form");
    expect(replyForm.querySelector('input[name="intent"]')).toHaveValue("reply");
    expect(screen.getByLabelText("Reply")).toHaveAttribute("aria-describedby", "reply-body-help");
    expect(screen.getByRole("button", { name: "Post reply" })).toBeEnabled();
  });

  it("shows a pending state while create-topic submission is in flight", async () => {
    let resolveAction!: () => void;
    const actionPromise = new Promise<null>((resolve) => {
      resolveAction = () => resolve(null);
    });
    const router = createMemoryRouter([{
      id: "page",
      path: "*",
      Component: SectionRoute,
      loader: () => ({ locale: "en", section, canCreateTopic: true }),
      action: () => actionPromise,
    }], { initialEntries: ["/en/sections/typescript"] });

    render(
      <div lang="en" dir="ltr">
        <I18nextProvider i18n={runtime("en", "ltr")}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </div>,
    );

    const form = await screen.findByRole("form", { name: "Create a new topic" });
    fireEvent.submit(form);

    expect(await screen.findByRole("button", { name: "Creating topic…" })).toBeDisabled();
    expect(screen.getByLabelText("Topic title")).toBeDisabled();
    expect(form).toHaveAttribute("aria-busy", "true");

    resolveAction();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create topic" })).toBeEnabled();
    });
  });

  it("shows a pending state only for the reply submission", async () => {
    let resolveAction!: () => void;
    const actionPromise = new Promise<null>((resolve) => {
      resolveAction = () => resolve(null);
    });
    const router = createMemoryRouter([{
      id: "page",
      path: "*",
      Component: TopicRoute,
      loader: () => topicRenderData(topic, { canReply: true }),
      action: () => actionPromise,
    }], { initialEntries: ["/en/topics/typed-api"] });

    render(
      <div lang="en" dir="ltr">
        <I18nextProvider i18n={runtime("en", "ltr")}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </div>,
    );

    const form = await screen.findByRole("form", { name: "Add a reply" });
    fireEvent.submit(form);

    expect(await screen.findByRole("button", { name: "Posting reply…" })).toBeDisabled();
    expect(screen.getByLabelText("Reply")).toBeDisabled();
    expect(form).toHaveAttribute("aria-busy", "true");

    resolveAction();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Post reply" })).toBeEnabled();
    });
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
