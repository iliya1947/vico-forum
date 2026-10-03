import { useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter, useParams, useSearchParams } from "react-router";

import {
  HeaderAuthProvider,
  type HeaderAuthPresentationState,
  type HeaderAuthUser,
} from "../auth/auth-controls";
import { PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { AuthorizationAdminView } from "../authorization/admin-view";
import type { ForumPopularPage } from "../../db/forum-repository";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { UnderDevelopmentView } from "../forum/under-development-view";
import { ForumRouteError } from "../forum/ui";
import {
  CategoryView,
  HomeView,
  PopularView,
  SearchView,
  SectionView,
  TagsView,
  TagView,
  UnansweredView,
  TopicView,
} from "../forum/views";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import { isPreviewLocale, previewTranslationRuntime, type PreviewLocale } from "./preview-i18n";
import { LocaleNavigationProvider } from "../localization/locale-navigation";
import { localeRegistry } from "../localization/registry";

type Direction = "ltr" | "rtl";
type PreviewIdentity = "guest" | "user" | "manager";
type PreviewView = "home" | "search" | "popular" | "unanswered" | "tags" | "tag" | "category" | "section" | "topic" | "admin" | "empty" | "under-development" | "not-found";

type PreviewVariant =
  | "empty-category"
  | "section-form-error"
  | "topic-reply-error"
  | "topic-unsolved"
  | "topic-tools"
  | "admin-success"
  | "admin-conflict"
  | "route-401"
  | "route-403"
  | "route-503"
  | "route-500"
  | "search-no-results";

interface Scenario {
  id: string;
  label: string;
  locale: PreviewLocale;
  direction: Direction;
  identity: PreviewIdentity;
  path: string;
  view: PreviewView;
  variant?: PreviewVariant;
  authPresentationState?: HeaderAuthPresentationState;
}

export const scenarios: readonly Scenario[] = [
  { id: "home-guest", label: "Home · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home" },
  { id: "home-user", label: "Home · user", locale: "en", direction: "ltr", identity: "user", path: "/en", view: "home" },
  { id: "home-manager", label: "Home · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en", view: "home" },
  { id: "auth-pending", label: "Authentication · pending · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "pending" },
  { id: "auth-error", label: "Authentication · failed · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "error" },
  { id: "under-development-search", label: "Under development · search · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/under-development?feature=search", view: "under-development" },
  { id: "under-development-notifications", label: "Under development · notifications · user", locale: "en", direction: "ltr", identity: "user", path: "/en/under-development?feature=notifications", view: "under-development" },
  { id: "search-results-guest", label: "Search · results · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=TypeScript", view: "search" },
  { id: "search-no-results-guest", label: "Search · no results · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=WebAssembly", view: "search", variant: "search-no-results" },
  { id: "popular-guest", label: "Popular · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/popular", view: "popular" },
  { id: "unanswered-guest", label: "Unanswered · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/unanswered", view: "unanswered" },
  { id: "tags-guest", label: "Tags · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags", view: "tags" },
  { id: "tag-typescript-guest", label: "Tag · TypeScript · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags/typescript", view: "tag" },
  { id: "category-guest", label: "Category · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category" },
  { id: "category-user", label: "Category · user", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/development", view: "category" },
  { id: "category-empty", label: "Empty category · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/empty", view: "category", variant: "empty-category" },
  { id: "section-user", label: "Section · user", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "section-form-error", label: "Create topic error · user", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section", variant: "section-form-error" },
  { id: "topic-solved-user", label: "Solved topic · user", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "topic-solved-manager", label: "Solved topic · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/typed-api", view: "topic" },
  { id: "topic-reply-error", label: "Reply error · user", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic", variant: "topic-reply-error" },
  { id: "topic-unsolved", label: "Unsolved topic · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "topic", variant: "topic-unsolved" },
  { id: "topic-tools", label: "Topic tools · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/typed-api", view: "topic", variant: "topic-tools" },
  { id: "admin", label: "Authorization · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin" },
  { id: "admin-success", label: "Authorization · saved · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin", variant: "admin-success" },
  { id: "admin-conflict", label: "Authorization · conflict · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin", variant: "admin-conflict" },
  { id: "empty-section", label: "Empty section · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/empty", view: "empty" },
  { id: "route-401", label: "System · 401 · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/authorization", view: "not-found", variant: "route-401" },
  { id: "route-403", label: "System · 403 · user", locale: "en", direction: "ltr", identity: "user", path: "/en/admin/authorization", view: "not-found", variant: "route-403" },
  { id: "not-found", label: "System · 404 · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
  { id: "route-503", label: "System · 503 · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "not-found", variant: "route-503" },
  { id: "route-500", label: "System · unexpected · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "not-found", variant: "route-500" },
] as const;

const categoryId = "development";
const sectionId = "typescript";
const topicId = "typed-api";

const previewBuildKey =
  document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? "dev";

const PREVIEW_LOCALE_STORAGE_KEY = "vico-ui-preview-locale";

function initialPreviewLocale(): PreviewLocale {
  try {
    const stored = window.sessionStorage.getItem(PREVIEW_LOCALE_STORAGE_KEY);
    if (stored && isPreviewLocale(stored)) return stored;
  } catch {
    // Preview storage is optional; fall back to English when unavailable.
  }
  return "en";
}

const previewLocaleOptions = localeRegistry.activeLocales()
  .filter((locale) => isPreviewLocale(locale.tag))
  .map(({ tag, nativeName, direction }) => ({ tag, nativeName, direction }))
  .sort((left, right) => left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0);

function scenarioForLocale(scenario: Scenario, locale: PreviewLocale): Scenario {
  const definition = localeRegistry.find(locale)?.locale;
  if (!definition) return scenario;

  return {
    ...scenario,
    locale,
    direction: definition.direction,
    path: scenario.path.replace(/^\/[^/?#]+/, `/${locale}`),
  };
}

const category = {
  id: categoryId,
  name: "Development",
  sections: [
    { id: sectionId, name: "TypeScript & architecture", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Cloud & deployment", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Databases", topicCount: 2, postCount: 12 },
  ],
};

const categoryRu = {
  id: categoryId,
  name: "Разработка",
  sections: [
    { id: sectionId, name: "TypeScript и архитектура", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Облако и deploy", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Базы данных", topicCount: 2, postCount: 12 },
  ],
};

const categoryRtl = {
  id: categoryId,
  name: "פיתוח",
  sections: [
    { id: sectionId, name: "TypeScript וארכיטקטורה", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "ענן ופריסה", topicCount: 5, postCount: 41 },
    { id: "databases", name: "מסדי נתונים", topicCount: 2, postCount: 12 },
  ],
};

const emptyCategory = {
  id: "empty",
  name: "New category",
  sections: [],
};

const section = {
  id: sectionId,
  name: "TypeScript & architecture",
  category: { id: categoryId, name: "Development" },
  topics: [
    {
      id: topicId,
      authorName: "Alex Rivera",
      postCount: 3,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
      title: {
        id: "title-r1",
        originalContent: "How should I structure a typed API client?",
        sourceLocale: "en",
      },
    },
    {
      id: "rtl-markdown",
      authorName: "Noa Levi",
      postCount: 4,
      createdAt: new Date("2026-09-27T12:00:00Z"),
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
      title: {
        id: "title-r2",
        originalContent: "Mixed RTL content with code blocks",
        sourceLocale: "en",
      },
    },
    {
      id: "worker-auth",
      authorName: "Sam Chen",
      postCount: 12,
      createdAt: new Date("2026-09-28T08:00:00Z"),
      tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      title: {
        id: "title-r3",
        originalContent: "Worker auth: session boundary vs permissions",
        sourceLocale: "en",
      },
    },
  ],
};

const sectionRu = {
  id: sectionId,
  name: "TypeScript и архитектура",
  category: { id: categoryId, name: "Разработка" },
  topics: section.topics,
};

const sectionRtl = {
  id: sectionId,
  name: "TypeScript וארכיטקטורה",
  category: { id: categoryId, name: "פיתוח" },
  topics: [
    {
      id: topicId,
      authorName: "אלכס ריברה",
      postCount: 3,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
      title: {
        id: "title-r1",
        originalContent: "איך כדאי לבנות לקוח API עם טיפוסים?",
        sourceLocale: "he",
      },
    },
    {
      id: "rtl-markdown",
      authorName: "נועה לוי",
      postCount: 4,
      createdAt: new Date("2026-09-27T12:00:00Z"),
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
      title: {
        id: "title-r2",
        originalContent: "תוכן RTL מעורב עם בלוקי קוד",
        sourceLocale: "he",
      },
    },
    {
      id: "worker-auth",
      authorName: "סם צ'ן",
      postCount: 12,
      createdAt: new Date("2026-09-28T08:00:00Z"),
      tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      title: {
        id: "title-r3",
        originalContent: "Worker auth: session boundary מול permissions",
        sourceLocale: "he",
      },
    },
  ],
};

const topic = {
  id: topicId,
  sectionId,
  authorId: "alex",
  authorName: "Alex Rivera",
  createdAt: new Date("2026-09-27T10:00:00Z"),
  isSolved: true,
  bestAnswerPostId: "answer",
  title: section.topics[0]!.title,
  section: {
    id: sectionId,
    name: "TypeScript & architecture",
    category: { id: categoryId, name: "Development" },
  },
  tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
  posts: [
    {
      id: "question",
      topicId,
      authorId: "alex",
      authorName: "Alex Rivera",
      parentPostId: null,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      body: {
        id: "post-r1",
        originalContent: "I want strong typing without coupling the whole app to one HTTP library.",
        sourceLocale: "en",
      },
    },
    {
      id: "followup",
      topicId,
      authorId: "maya",
      authorName: "Maya Cohen",
      parentPostId: "question",
      createdAt: new Date("2026-09-27T11:00:00Z"),
      body: {
        id: "post-r3",
        originalContent: "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
        sourceLocale: "en",
      },
    },
    {
      id: "answer",
      topicId,
      authorId: "sam",
      authorName: "Sam Chen",
      parentPostId: "followup",
      createdAt: new Date("2026-09-27T12:00:00Z"),
      body: {
        id: "post-r2",
        originalContent: "Separate the HTTP layer from domain types so each boundary can be tested independently.",
        sourceLocale: "en",
      },
    },
  ],
};


const previewReferenceTime = "2026-09-30T16:00:00.000Z";

function homepageTopic(
  id: string,
  title: string,
  authorName: string,
  activityAt: string,
) {
  return { id, title, authorName, activityAt };
}

function homepageCategories(locale: PreviewLocale): HomepageCategoryOverview[] {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const names = rtl
    ? [
        "עזרה ופתרונות",
        "Vibe Coding וכלי AI",
        "פיתוח",
        "Deploy ותשתיות",
        "פרויקטים וביקורות",
        "קהילה",
      ]
    : russian
      ? [
          "Помощь и решения",
          "Vibe Coding и AI-инструменты",
          "Разработка",
          "Deploy и инфраструктура",
          "Проекты и разборы",
          "Сообщество",
        ]
      : [
          "Help & solutions",
          "Vibe Coding & AI tools",
          "Development",
          "Deploy & infrastructure",
          "Projects & reviews",
          "Community",
        ];
  const descriptions = rtl
    ? [
        "שאלות, תקלות ופתרונות טכניים בדוקים.",
        "תהליכי עבודה, סוכנים, מודלים וכלי פיתוח עם AI.",
        "Frontend, backend, ארכיטקטורה, שפות ובדיקות.",
        "Hosting, מסדי נתונים, CI/CD, ענן ותפעול.",
        "הצגת פרויקטים, ביקורות ודיון בהחלטות מימוש.",
        "דיונים כלליים וחיי הקהילה.",
      ]
    : russian
      ? [
          "Вопросы, диагностика и проверенные технические решения.",
          "AI-процессы разработки, агенты, модели и инструменты.",
          "Frontend, backend, архитектура, языки и тестирование.",
          "Hosting, базы данных, CI/CD, облако и эксплуатация.",
          "Показывайте проекты, просите разбор и обсуждайте решения.",
          "Общие обсуждения и жизнь сообщества.",
        ]
      : [
          "Questions, troubleshooting, and verified technical solutions.",
          "AI coding workflows, agents, models, and tools.",
          "Frontend, backend, architecture, languages, and testing.",
          "Hosting, databases, CI/CD, cloud, and operations.",
          "Show projects, request reviews, and discuss implementation choices.",
          "General discussion and community topics.",
        ];
  const icons = ["help", "ai", "code", "deploy", "projects", "community"];
  const ids = ["help-solutions", "vibe-ai-tools", "development", "deploy-infrastructure", "projects-reviews", "community"];

  return ids.map((id, index) => ({
    id,
    name: names[index]!,
    description: descriptions[index]!,
    icon: icons[index]!,
    sectionCount: [4, 5, 6, 4, 3, 3][index]!,
    topicCount: [38, 64, 91, 43, 27, 31][index]!,
    messageCount: [214, 387, 624, 296, 148, 203][index]!,
    pinnedTopics: [
      homepageTopic(`${id}-pinned-1`, rtl ? "כללי המדור ומשאבים שימושיים" : russian ? "Правила раздела и полезные материалы" : "Section guide and useful resources", "Vico Team", "2026-09-29T09:30:00.000Z"),
      homepageTopic(`${id}-pinned-2`, rtl ? "לפני שפותחים נושא חדש" : russian ? "Перед созданием новой темы" : "Before you open a new topic", "Maya Cohen", "2026-09-28T14:00:00.000Z"),
      homepageTopic(`${id}-pinned-3`, rtl ? "אוסף קישורים מומלץ" : russian ? "Рекомендуемая подборка материалов" : "Recommended reference collection", "Sam Chen", "2026-09-27T18:00:00.000Z"),
    ],
    latestTopics: [
      homepageTopic(`${id}-latest-1`, rtl ? "איך לבחור את הגבול הנכון לפתרון?" : russian ? "Как выбрать правильную границу решения?" : "How do I choose the right boundary for this?", "Alex Rivera", "2026-09-30T15:42:00.000Z"),
      homepageTopic(`${id}-latest-2`, rtl ? "מה הדרך הפשוטה לבדוק את זה?" : russian ? "Как проще всего это проверить?" : "What is the simplest way to test this?", "Noa Levi", "2026-09-30T13:15:00.000Z"),
      homepageTopic(`${id}-latest-3`, rtl ? "דוגמה מעשית מפרויקט אמיתי" : russian ? "Практический пример из реального проекта" : "A practical example from a real project", "Sam Chen", "2026-09-29T17:30:00.000Z"),
      homepageTopic(`${id}-latest-4`, rtl ? "האם כדאי לפשט את המבנה?" : russian ? "Стоит ли упростить эту структуру?" : "Should this structure be simplified?", "Maya Cohen", "2026-09-28T11:00:00.000Z"),
    ],
  }));
}

function popularPeriods(locale: PreviewLocale): ForumPopularPage {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const topics = [
    {
      id: "typed-api",
      title: rtl ? "איך כדאי לבנות לקוח API עם טיפוסים?" : russian ? "Как лучше построить типизированный API-клиент?" : "How should I structure a typed API client?",
      authorName: rtl ? "אלכס ריברה" : "Alex Rivera",
    },
    {
      id: "worker-auth",
      title: rtl ? "Worker auth: גבול session מול permissions" : russian ? "Worker auth: граница session и permissions" : "Worker auth: session boundary vs permissions",
      authorName: rtl ? "סם צ'ן" : "Sam Chen",
    },
    {
      id: "rtl-markdown",
      title: rtl ? "תוכן RTL מעורב עם בלוקי קוד" : russian ? "Смешанный RTL-контент с блоками кода" : "Mixed RTL content with code blocks",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
    },
    {
      id: "database-queues",
      title: rtl ? "איך לתכנן תור עבודות בלי להסתבך?" : russian ? "Как спроектировать очередь задач без лишней сложности?" : "How do I design a job queue without overcomplicating it?",
      authorName: "Maya Cohen",
    },
  ];

  const item = (index: number, activityCount: number, latestActivityAt: string) => ({
    ...topics[index]!,
    activityCount,
    latestActivityAt: new Date(latestActivityAt),
  });

  return {
    "24h": [
      item(0, 18, "2026-09-30T15:42:00.000Z"),
      item(1, 12, "2026-09-30T14:12:00.000Z"),
      item(2, 7, "2026-09-30T12:05:00.000Z"),
    ],
    "7d": [
      item(1, 49, "2026-09-30T14:12:00.000Z"),
      item(0, 41, "2026-09-30T15:42:00.000Z"),
      item(3, 28, "2026-09-29T18:20:00.000Z"),
      item(2, 22, "2026-09-30T12:05:00.000Z"),
    ],
    "30d": [
      item(3, 133, "2026-09-29T18:20:00.000Z"),
      item(1, 112, "2026-09-30T14:12:00.000Z"),
      item(0, 96, "2026-09-30T15:42:00.000Z"),
      item(2, 61, "2026-09-30T12:05:00.000Z"),
    ],
  };
}

function unansweredTopics(locale: PreviewLocale) {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const categoryName = rtl ? "פיתוח" : russian ? "Разработка" : "Development";
  const aiCategoryName = rtl ? "Vibe Coding וכלי AI" : russian ? "Vibe Coding и AI-инструменты" : "Vibe Coding & AI tools";

  return [
    {
      id: "worker-auth",
      title: rtl ? "איך להפריד session מ-permissions ב-Worker?" : russian ? "Как разделить session и permissions в Worker?" : "How should session and permissions be separated in a Worker?",
      authorName: rtl ? "סם צ'ן" : "Sam Chen",
      category: { id: "development", name: categoryName },
      section: { id: "backend", name: rtl ? "Backend ו-API" : russian ? "Backend и API" : "Backend & API" },
    },
    {
      id: "agent-context",
      title: rtl ? "איך להעביר הקשר בין כמה סוכני AI?" : russian ? "Как передавать контекст между несколькими AI-агентами?" : "How should context be passed between several AI agents?",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
      category: { id: "vibe-ai", name: aiCategoryName },
      section: { id: "agents", name: rtl ? "סוכנים ואוטומציה" : russian ? "Агенты и автоматизация" : "Agents & automation" },
    },
    {
      id: "database-timeouts",
      title: rtl ? "איזה timeout לבחור לשאילתות PostgreSQL?" : russian ? "Какой timeout выбрать для запросов PostgreSQL?" : "What timeout should I use for PostgreSQL queries?",
      authorName: "Maya Cohen",
      category: { id: "development", name: categoryName },
      section: { id: "databases", name: rtl ? "מסדי נתונים" : russian ? "Базы данных" : "Databases" },
    },
  ];
}

function previewSearchResults(locale: PreviewLocale) {
  const rtl = locale === "he";
  const russian = locale === "ru";
  return [
    {
      id: "typed-api",
      title: rtl ? "איך כדאי לבנות לקוח API עם טיפוסים?" : russian ? "Как лучше построить типизированный API-клиент?" : "How should I structure a typed API client?",
      authorName: rtl ? "אלכס ריברה" : "Alex Rivera",
      postCount: 3,
      activityAt: new Date("2026-09-30T15:42:00.000Z"),
      category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
      section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
    },
    {
      id: "rtl-markdown",
      title: rtl ? "תוכן RTL מעורב עם בלוקי קוד" : russian ? "Смешанный RTL-контент с блоками кода" : "Mixed RTL content with code blocks",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
      postCount: 4,
      activityAt: new Date("2026-09-30T12:05:00.000Z"),
      category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
      section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
    },
  ];
}

function previewTags() {
  return [
    { key: "typescript", name: "TypeScript", topicCount: 2 },
    { key: "cloudflare", name: "Cloudflare", topicCount: 1 },
    { key: "postgresql", name: "PostgreSQL", topicCount: 1 },
    { key: "rtl", name: "RTL", topicCount: 1 },
  ];
}

function previewTagPage(locale: PreviewLocale) {
  const rtl = locale === "he";
  const russian = locale === "ru";
  return {
    tag: { key: "typescript", name: "TypeScript" },
    topics: [
      {
        id: "typed-api",
        title: rtl ? "איך כדאי לבנות לקוח API עם טיפוסים?" : russian ? "Как лучше построить типизированный API-клиент?" : "How should I structure a typed API client?",
        authorName: rtl ? "אלכס ריברה" : "Alex Rivera",
        postCount: 3,
        createdAt: new Date("2026-09-27T10:00:00Z"),
        category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
        section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
        tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
      },
      {
        id: "rtl-markdown",
        title: rtl ? "תוכן RTL מעורב עם בלוקי קוד" : russian ? "Смешанный RTL-контент с блоками кода" : "Mixed RTL content with code blocks",
        authorName: rtl ? "נועה לוי" : "Noa Levi",
        postCount: 4,
        createdAt: new Date("2026-09-27T12:00:00Z"),
        category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
        section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
        tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
      },
    ],
  };
}

function previewUser(identity: PreviewIdentity): HeaderAuthUser | null {
  if (identity === "guest") return null;
  if (identity === "manager") return { name: "Maya Cohen", canManageAuthorization: true };
  return { name: "Alex Rivera" };
}

export function PreviewController() {
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const selected = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0]!;
  const src = `?embed=1&scenario=${encodeURIComponent(selected.id)}&build=${encodeURIComponent(previewBuildKey)}`;

  return (
    <main className="preview-controller">
      <header className="preview-toolbar">
        <div>
          <p className="preview-eyebrow">Vico Forum</p>
          <h1>UI progress preview</h1>
          <p>Static representative data only. Runtime behavior is verified separately.</p>
        </div>
        <div className="preview-controls">
          <label>
            State
            <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Viewport</legend>
            <button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Desktop</button>
            <button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Mobile</button>
          </fieldset>
        </div>
      </header>
      <section className="preview-frame-wrap" data-viewport={viewport}>
        <iframe
          key={`${scenarioId}-${viewport}`}
          className="preview-frame"
          title={selected.label}
          src={src}
        />
      </section>
    </main>
  );
}

export function EmbeddedPreview({ scenarioId }: { scenarioId: string }) {
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0]!;
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(initialPreviewLocale);
  const activeScenario = useMemo(
    () => scenarioForLocale(scenario, previewLocale),
    [scenario, previewLocale],
  );
  const runtime = useMemo(
    () => previewTranslationRuntime(activeScenario.locale, activeScenario.direction),
    [activeScenario.locale, activeScenario.direction],
  );
  const router = useMemo(() => previewRouter(activeScenario), [activeScenario]);

  useEffect(() => {
    document.documentElement.lang = activeScenario.locale;
    document.documentElement.dir = activeScenario.direction;

    const stopMutation = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const stopAuth = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest(".auth-controls button")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("submit", stopMutation, true);
    document.addEventListener("click", stopAuth, true);
    return () => {
      document.removeEventListener("submit", stopMutation, true);
      document.removeEventListener("click", stopAuth, true);
    };
  }, [activeScenario.locale, activeScenario.direction]);

  return (
    <LocaleNavigationProvider
      locales={previewLocaleOptions}
      onLocaleChange={(locale) => {
        if (!isPreviewLocale(locale)) return;
        setPreviewLocale(locale);
        try {
          window.sessionStorage.setItem(PREVIEW_LOCALE_STORAGE_KEY, locale);
        } catch {
          // Preview storage is optional; the active iframe still switches immediately.
        }
      }}
    >
      <HeaderAuthProvider
        initialUser={previewUser(activeScenario.identity)}
        initialPresentationState={activeScenario.authPresentationState}
      >
        <I18nextProvider i18n={runtime}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </HeaderAuthProvider>
    </LocaleNavigationProvider>
  );
}

function previewRouter(scenario: Scenario) {
  if (scenario.view === "not-found") {
    return createMemoryRouter([{
      path: "*",
      loader: () => {
        if (scenario.variant === "route-401") {
          throw new Response("Unauthenticated", { status: 401 });
        }
        if (scenario.variant === "route-403") {
          throw new Response("Forbidden", { status: 403 });
        }
        if (scenario.variant === "route-503") {
          throw new Response("Unavailable", { status: 503 });
        }
        if (scenario.variant === "route-500") {
          throw new Error("Representative unexpected route failure");
        }
        throw new Response("Not Found", { status: 404 });
      },
      ErrorBoundary: ForumRouteError,
    }], { initialEntries: [scenario.path] });
  }

  return createMemoryRouter([
    {
      path: "/:locale/categories/:categoryId",
      element: <PreviewCategoryRoute scenario={scenario} />,
    },
    {
      path: "/:locale/sections/:sectionId",
      element: <PreviewSectionRoute scenario={scenario} />,
    },
    {
      path: "/:locale/topics/:topicId",
      element: <PreviewTopicRoute scenario={scenario} />,
    },
    {
      path: "/:locale/under-development",
      element: <PreviewUnderDevelopment locale={scenario.locale} />,
    },
    {
      path: "/:locale/search",
      element: (
        <SearchView
          locale={scenario.locale}
          query={scenario.variant === "search-no-results" ? "WebAssembly" : "TypeScript"}
          results={scenario.variant === "search-no-results" ? [] : previewSearchResults(scenario.locale)}
        />
      ),
    },
    {
      path: "/:locale/popular",
      element: <PopularView locale={scenario.locale} periods={popularPeriods(scenario.locale)} />,
    },
    {
      path: "/:locale/unanswered",
      element: <UnansweredView locale={scenario.locale} topics={unansweredTopics(scenario.locale)} />,
    },
    {
      path: "/:locale/tags",
      element: <TagsView locale={scenario.locale} tags={previewTags()} />,
    },
    {
      path: "/:locale/tags/:tagKey",
      element: <TagView locale={scenario.locale} page={previewTagPage(scenario.locale)} />,
    },
    {
      path: "*",
      element: previewElement(scenario),
    },
  ], { initialEntries: [scenario.path] });
}

function previewCategory(locale: PreviewLocale, routeCategoryId: string | undefined) {
  const localizedCategory = locale === "ru"
    ? categoryRu
    : locale === "he"
      ? categoryRtl
      : category;
  if (!routeCategoryId || routeCategoryId === categoryId) return localizedCategory;

  const overview = homepageCategories(locale).find((item) => item.id === routeCategoryId);
  if (!overview) return localizedCategory;

  const sectionNames = locale === "ru"
    ? ["Основное", "Вопросы", "Практика"]
    : locale === "he"
      ? ["כללי", "שאלות", "פרקטיקה"]
      : ["General", "Questions", "Practice"];
  const visibleSectionCount = Math.min(overview.sectionCount, sectionNames.length);

  return {
    id: overview.id,
    name: overview.name,
    sections: Array.from({ length: visibleSectionCount }, (_, index) => ({
      id: `${overview.id}-preview-${index + 1}`,
      name: sectionNames[index]!,
      topicCount: Math.max(1, Math.round(overview.topicCount / visibleSectionCount)),
      postCount: Math.max(1, Math.round(overview.messageCount / visibleSectionCount)),
    })),
  };
}

function PreviewCategoryRoute({ scenario }: { scenario: Scenario }) {
  const { categoryId: routeCategoryId } = useParams();
  const categoryPage = scenario.view === "category"
    && scenario.variant === "empty-category"
    && routeCategoryId === "empty"
    ? emptyCategory
    : previewCategory(scenario.locale, routeCategoryId);

  return <CategoryView locale={scenario.locale} category={categoryPage} />;
}

function previewSection(locale: PreviewLocale, routeSectionId: string | undefined) {
  const localizedSection = locale === "ru" ? sectionRu : locale === "he" ? sectionRtl : section;
  if (!routeSectionId || routeSectionId === sectionId) return localizedSection;

  if (routeSectionId === "empty") {
    return {
      id: "empty",
      name: locale === "ru"
        ? "Новый раздел сообщества"
        : locale === "he"
          ? "מדור קהילה חדש"
          : "New community section",
      category: {
        id: categoryId,
        name: locale === "ru"
          ? "Разработка"
          : locale === "he"
            ? "פיתוח"
            : "Development",
      },
      topics: [],
    };
  }

  const matched = homepageCategories(locale)
    .map((overview) => previewCategory(locale, overview.id))
    .flatMap((candidateCategory) =>
      candidateCategory.sections.map((candidateSection) => ({
        category: candidateCategory,
        section: candidateSection,
      }))
    )
    .find(({ section: candidateSection }) => candidateSection.id === routeSectionId);

  if (!matched) return localizedSection;

  const topicTitles = locale === "ru"
    ? ["Первый вопрос раздела", "Практический пример", "Полезное обсуждение"]
    : locale === "he"
      ? ["השאלה הראשונה במדור", "דוגמה מעשית", "דיון שימושי"]
      : ["First section question", "Practical example", "Useful discussion"];

  return {
    id: matched.section.id,
    name: matched.section.name,
    category: { id: matched.category.id, name: matched.category.name },
    topics: topicTitles.map((title, index) => ({
      id: `${matched.section.id}-topic-${index + 1}`,
      authorName: ["Alex Rivera", "Maya Cohen", "Sam Chen"][index]!,
      postCount: [3, 5, 8][index]!,
      createdAt: new Date(`2026-09-${27 + index}T10:00:00Z`),
      tags: [],
      title: {
        id: `${matched.section.id}-title-${index + 1}`,
        originalContent: title,
        sourceLocale: locale,
      },
    })),
  };
}

function PreviewSectionRoute({ scenario }: { scenario: Scenario }) {
  const { sectionId: routeSectionId } = useParams();
  return (
    <SectionView
      locale={scenario.locale}
      section={previewSection(scenario.locale, routeSectionId)}
      canCreateTopic={scenario.identity !== "guest"}
      actionData={scenario.view === "section" && scenario.variant === "section-form-error"
        ? { error: "rateLimited" }
        : undefined}
    />
  );
}

function PreviewTopicRoute({ scenario }: { scenario: Scenario }) {
  const { topicId: routeTopicId } = useParams();

  if (!routeTopicId || routeTopicId === topicId) {
    const solved = scenario.view === "topic"
      ? scenario.variant !== "topic-unsolved"
        && scenario.variant !== "topic-reply-error"
        && scenario.variant !== "topic-tools"
      : true;
    const data = topicData(
      scenario.locale,
      scenario.direction,
      scenario.identity,
      solved,
      scenario.view === "topic" && scenario.identity === "manager",
    );
    return (
      <TopicView
        {...data}
        actionData={scenario.view === "topic" && scenario.variant === "topic-reply-error"
          ? { error: "rateLimited" }
          : undefined}
      />
    );
  }

  const candidateSections = homepageCategories(scenario.locale)
    .flatMap((overview) =>
      previewCategory(scenario.locale, overview.id).sections.map((candidateSection) =>
        previewSection(scenario.locale, candidateSection.id)
      )
    );
  const matched = candidateSections
    .flatMap((candidateSection) =>
      candidateSection.topics.map((candidateTopic) => ({
        section: candidateSection,
        topic: candidateTopic,
      }))
    )
    .find(({ topic: candidateTopic }) => candidateTopic.id === routeTopicId);

  if (!matched) {
    return (
      <TopicView
        {...topicData(
          scenario.locale,
          scenario.direction,
          scenario.identity,
          true,
          false,
        )}
      />
    );
  }

  const replyAuthors = ["Maya Cohen", "Sam Chen", "Noa Levi"];
  const messageCount = Math.max(1, matched.topic.postCount);
  const posts = Array.from({ length: messageCount }, (_, index) => ({
    id: `${matched.topic.id}-post-${index + 1}`,
    topicId: matched.topic.id,
    authorId: index === 0 ? "alex" : `preview-reply-${index}`,
    authorName: index === 0
      ? matched.topic.authorName
      : replyAuthors[(index - 1) % replyAuthors.length]!,
    parentPostId: index === 0 ? null : `${matched.topic.id}-post-1`,
    createdAt: new Date(`2026-09-${27 + Math.min(index, 3)}T${10 + (index % 8)}:00:00Z`),
    body: {
      id: `${matched.topic.id}-body-${index + 1}`,
      originalContent: index === 0
        ? scenario.locale === "ru"
          ? "Представительный вопрос для проверки страницы темы в Pages-preview."
          : scenario.locale === "he"
            ? "שאלה מייצגת לבדיקת עמוד הנושא בתצוגה המקדימה."
            : "Representative question for checking the topic page in Pages preview."
        : scenario.locale === "ru"
          ? `Представительный ответ №${index}.`
          : scenario.locale === "he"
            ? `תגובה מייצגת מספר ${index}.`
            : `Representative reply #${index}.`,
      sourceLocale: scenario.locale,
    },
  }));

  const previewTopic = {
    id: matched.topic.id,
    sectionId: matched.section.id,
    authorId: "alex",
    authorName: matched.topic.authorName,
    createdAt: matched.topic.createdAt,
    isSolved: false,
    bestAnswerPostId: null,
    title: matched.topic.title,
    section: {
      id: matched.section.id,
      name: matched.section.name,
      category: matched.section.category,
    },
    tags: matched.topic.tags,
    posts,
  };

  return (
    <TopicView
      locale={scenario.locale}
      topic={previewTopic}
      titlePresentation={originalPresentation(
        "topic-title",
        previewTopic.id,
        previewTopic.title.id,
        previewTopic.title.originalContent,
        scenario.locale,
        scenario.direction,
      )}
      postPresentations={posts.map((post) =>
        originalPresentation(
          "post-body",
          post.id,
          post.body.id,
          post.body.originalContent,
          scenario.locale,
          scenario.direction,
        )
      )}
      generationUnits={[]}
      canReply={scenario.identity !== "guest"}
      canManageSolution={false}
      canCorrectTitleSourceLocale={false}
      correctablePostIds={[]}
    />
  );
}

function PreviewUnderDevelopment({ locale }: { locale: PreviewLocale }) {
  const [searchParams] = useSearchParams();
  return (
    <UnderDevelopmentView
      locale={locale}
      requestedFeature={searchParams.get("feature")}
    />
  );
}

function previewElement(scenario: Scenario) {
  switch (scenario.view) {
    case "home":
      return (
        <HomeView
          locale={scenario.locale}
          categories={homepageCategories(scenario.locale)}
          referenceTime={previewReferenceTime}
        />
      );
    case "search":
      return (
        <SearchView
          locale={scenario.locale}
          query={scenario.variant === "search-no-results" ? "WebAssembly" : "TypeScript"}
          results={scenario.variant === "search-no-results" ? [] : previewSearchResults(scenario.locale)}
        />
      );
    case "popular":
      return <PopularView locale={scenario.locale} periods={popularPeriods(scenario.locale)} />;
    case "unanswered":
      return <UnansweredView locale={scenario.locale} topics={unansweredTopics(scenario.locale)} />;
    case "tags":
      return <TagsView locale={scenario.locale} tags={previewTags()} />;
    case "tag":
      return <TagView locale={scenario.locale} page={previewTagPage(scenario.locale)} />;
    case "under-development":
      return <PreviewUnderDevelopment locale={scenario.locale} />;
    case "category":
      return (
        <CategoryView
          locale={scenario.locale}
          category={
            scenario.variant === "empty-category"
              ? emptyCategory
              : scenario.locale === "ru"
                ? categoryRu
                : scenario.direction === "rtl"
                  ? categoryRtl
                  : category
          }
        />
      );
    case "section":
      return (
        <SectionView
          locale={scenario.locale}
          section={scenario.locale === "ru" ? sectionRu : scenario.direction === "rtl" ? sectionRtl : section}
          canCreateTopic
          actionData={scenario.variant === "section-form-error" ? { error: "rateLimited" } : undefined}
        />
      );
    case "empty":
      return (
        <SectionView
          locale={scenario.locale}
          section={{
            id: "empty",
            name: scenario.locale === "ru"
              ? "Новый раздел сообщества"
              : scenario.locale === "he"
                ? "מדור קהילה חדש"
                : "New community section",
            category: {
              id: categoryId,
              name: scenario.locale === "ru"
                ? "Разработка"
                : scenario.locale === "he"
                  ? "פיתוח"
                  : "Development",
            },
            topics: [],
          }}
          canCreateTopic={false}
        />
      );
    case "topic": {
      const solved = scenario.variant !== "topic-unsolved"
        && scenario.variant !== "topic-reply-error"
        && scenario.variant !== "topic-tools";
      const data = topicData(
        scenario.locale,
        scenario.direction,
        scenario.identity,
        solved,
        scenario.identity === "manager",
      );
      return (
        <TopicView
          {...data}
          actionData={scenario.variant === "topic-reply-error" ? { error: "rateLimited" } : undefined}
        />
      );
    }
    case "admin": {
      const data = authorizationData(scenario.locale);
      const result = scenario.variant === "admin-success"
        ? { ok: true as const }
        : scenario.variant === "admin-conflict"
          ? { error: "conflict" as const }
          : undefined;
      return <AuthorizationAdminView {...data} result={result} />;
    }
    case "not-found":
      throw new Error("not-found is handled by previewRouter");
  }
}

function topicData(
  locale: PreviewLocale,
  direction: Direction,
  identity: PreviewIdentity,
  solved: boolean,
  showSecondaryControls: boolean,
) {
  const rtl = direction === "rtl";
  const russian = locale === "ru";
  const baseTopic = {
    ...topic,
    isSolved: solved,
    bestAnswerPostId: solved ? topic.bestAnswerPostId : null,
  };
  const translatedTopic = rtl ? {
    ...baseTopic,
    authorName: "נועה לוי",
    section: {
      ...baseTopic.section,
      name: "TypeScript וארכיטקטורה",
      category: { id: categoryId, name: "פיתוח" },
    },
    posts: baseTopic.posts.map((post, index) => ({
      ...post,
      authorName: ["נועה לוי", "יואב כהן", "מאיה כהן"][index]!,
    })),
  } : russian ? {
    ...baseTopic,
    section: {
      ...baseTopic.section,
      name: "TypeScript и архитектура",
      category: { id: categoryId, name: "Разработка" },
    },
  } : baseTopic;

  return {
    locale,
    topic: translatedTopic,
    titlePresentation: topicTitlePresentation(rtl),
    postPresentations: postPresentations(rtl),
    generationUnits: showSecondaryControls && locale !== "en"
      ? topicToolsGenerationUnits(locale)
      : [],
    canReply: identity !== "guest",
    canManageSolution: showSecondaryControls,
    canCorrectTitleSourceLocale: showSecondaryControls,
    correctablePostIds: showSecondaryControls
      ? translatedTopic.posts.map((post) => post.id)
      : [],
  };
}

function topicToolsGenerationUnits(
  targetLocale: PreviewLocale,
): ContentGenerationUnitView[] {
  return [
    {
      key: JSON.stringify(["topic-title", topicId, "title-r1", targetLocale]),
      contentType: "topic-title",
      contentId: topicId,
      revisionId: "title-r1",
      targetLocale,
      state: "current",
      automatic: false,
      explicitRequired: false,
    },
    {
      key: JSON.stringify(["post-body", "answer", "post-r2", targetLocale]),
      contentType: "post-body",
      contentId: "answer",
      revisionId: "post-r2",
      targetLocale,
      state: "current",
      automatic: false,
      explicitRequired: false,
    },
    {
      key: JSON.stringify(["post-body", "followup", "post-r3", targetLocale]),
      contentType: "post-body",
      contentId: "followup",
      revisionId: "post-r3",
      targetLocale,
      state: "failed",
      automatic: false,
      explicitRequired: false,
    },
  ];
}

function authorizationData(locale: string) {
  const roleUser = {
    id: "role-user",
    slug: "user",
    displayName: "User",
    isSystem: true,
  };
  const roleModerator = {
    id: "role-moderator",
    slug: "moderator",
    displayName: "Moderator",
    isSystem: true,
  };
  const roleAdmin = {
    id: "role-admin",
    slug: "admin",
    displayName: "Admin",
    isSystem: true,
  };
  const roleReviewer = {
    id: "role-reviewer",
    slug: "reviewer",
    displayName: "Reviewer",
    isSystem: false,
  };
  const userGrants: PermissionKey[] = ["forum.topic.create", "forum.reply.create"];
  const moderatorGrants: PermissionKey[] = [
    ...userGrants,
    "forum.solution.manageAny",
    "forum.sourceLocale.correctAny",
  ];
  const adminGrants: PermissionKey[] = [...PERMISSION_CATALOG];
  const reviewerGrants: PermissionKey[] = [
    "forum.reply.create",
    "forum.translation.generate",
  ];
  const userEffectivePermissions: PermissionKey[] = [
    ...userGrants,
    "forum.translation.generate",
  ];

  return {
    locale,
    permissions: PERMISSION_CATALOG,
    roles: [
      { ...roleUser, grants: userGrants },
      { ...roleModerator, grants: moderatorGrants },
      { ...roleAdmin, grants: adminGrants },
      { ...roleReviewer, grants: reviewerGrants },
    ],
    users: [
      {
        id: "maya",
        name: "Maya Cohen",
        email: "maya@example.test",
        role: roleAdmin,
        explicitAssignment: true,
        authorization: {
          role: roleAdmin,
          explicitAssignment: true,
          grants: adminGrants,
          overrides: {},
          effectivePermissions: adminGrants,
        },
      },
      {
        id: "alex",
        name: "Alex Rivera",
        email: "alex@example.test",
        role: roleUser,
        explicitAssignment: false,
        authorization: {
          role: roleUser,
          explicitAssignment: false,
          grants: userGrants,
          overrides: { "forum.translation.generate": "allow" as const },
          effectivePermissions: userEffectivePermissions,
        },
      },
      {
        id: "noa",
        name: "Noa Levi",
        email: "noa@example.test",
        role: roleReviewer,
        explicitAssignment: true,
        authorization: {
          role: roleReviewer,
          explicitAssignment: true,
          grants: reviewerGrants,
          overrides: { "forum.reply.create": "deny" as const },
          effectivePermissions: ["forum.translation.generate"] as PermissionKey[],
        },
      },
    ],
  };
}

function topicTitlePresentation(rtl: boolean): ContentTranslationPresentation {
  if (rtl) {
    return {
      contentType: "topic-title",
      contentId: topicId,
      revisionId: "title-r1",
      selected: "translation",
      content: "איך כדאי לבנות לקוח API עם טיפוסים?",
      contentLocale: "he",
      contentDirection: "rtl",
      originalContent: "How should I structure a typed API client?",
      originalLocale: "en",
      originalDirection: "ltr",
      provenance: {
        origin: "machine",
        provider: "preview",
        model: "representative",
      },
    };
  }
  return originalPresentation(
    "topic-title",
    topicId,
    "title-r1",
    "How should I structure a typed API client?",
    "en",
    "ltr",
  );
}

function postPresentations(rtl: boolean): ContentTranslationPresentation[] {
  return [
    originalPresentation(
      "post-body",
      "question",
      "post-r1",
      rtl
        ? "אני רוצה טיפוסים חזקים בלי לקשור את כל האפליקציה לספריית HTTP אחת."
        : "I want strong typing without coupling the whole app to one HTTP library.",
      rtl ? "he" : "en",
      rtl ? "rtl" : "ltr",
    ),
    rtl
      ? translatedPresentation(
          "answer",
          "post-r2",
          "הפרד בין שכבת ה-HTTP לבין הטיפוסים של הדומיין. כך אפשר לבדוק כל גבול בנפרד.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
          "he",
          "rtl",
          "Separate the HTTP layer from domain types so each boundary can be tested independently.",
          "en",
          "ltr",
        )
      : translatedPresentation(
          "answer",
          "post-r2",
          "Separate the HTTP layer from domain types so each boundary can be tested independently.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
          "en",
          "ltr",
          "הפרידו בין שכבת ה-HTTP לבין הטיפוסים של הדומיין.",
          "he",
          "rtl",
        ),
    originalPresentation(
      "post-body",
      "followup",
      "post-r3",
      rtl
        ? "כדאי גם לבדוק overflow עם מזהה ארוך מאוד: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout"
        : "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
      rtl ? "he" : "en",
      rtl ? "rtl" : "ltr",
    ),
  ];
}

function originalPresentation(
  contentType: "topic-title" | "post-body",
  contentId: string,
  revisionId: string,
  content: string,
  locale: string,
  direction: Direction,
): ContentTranslationPresentation {
  return {
    contentType,
    contentId,
    revisionId,
    selected: "original",
    content,
    contentLocale: locale,
    contentDirection: direction,
    originalContent: content,
    originalLocale: locale,
    originalDirection: direction,
    fallbackReason: "same-locale",
  };
}

function translatedPresentation(
  contentId: string,
  revisionId: string,
  content: string,
  contentLocale: string,
  contentDirection: Direction,
  originalContent: string,
  originalLocale: string,
  originalDirection: Direction,
): ContentTranslationPresentation {
  return {
    contentType: "post-body",
    contentId,
    revisionId,
    selected: "translation",
    content,
    contentLocale,
    contentDirection,
    originalContent,
    originalLocale,
    originalDirection,
    provenance: {
      origin: "machine",
      provider: "preview",
      model: "representative",
    },
  };
}
