import { useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter, useParams, useSearchParams } from "react-router";

import {
  HeaderAuthProvider,
  type HeaderAuthPresentationState,
  type HeaderAuthUser,
} from "../auth/auth-controls";
import { PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { CredentialView } from "../auth/credential-view";
import type { EmailAuthActions, AuthClientActions } from "../auth/auth-client";
import { AuthorizationAdminView } from "../authorization/admin-view";
import type { ForumHelpSolutionsFilters, ForumPopularPage } from "../../db/forum-repository";
import {
  HELP_SOLUTIONS_CATEGORY_ID,
  HELP_SOLUTIONS_SERVICE_SECTION_ID,
} from "../../db/forum-identifiers";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { UnderDevelopmentView } from "../forum/under-development-view";
import { ProfileView } from "../forum/profile-view";
import { ForumRouteError } from "../forum/ui";
import {
  CategoryView,
  HelpSolutionsView,
  HomeView,
  NotificationsView,
  PopularView,
  SearchView,
  SectionView,
  TagsView,
  TagView,
  UnansweredView,
  UnreadView,
  TopicView,
} from "../forum/views";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import { isPreviewLocale, previewTranslationRuntime, type PreviewLocale } from "./preview-i18n";
import { LocaleNavigationProvider } from "../localization/locale-navigation";
import { localeRegistry } from "../localization/registry";

type Direction = "ltr" | "rtl";
export const previewIdentities = ["guest", "user", "manager"] as const;
export type PreviewIdentity = typeof previewIdentities[number];
type PreviewView = "credentials" | "profile" | "home" | "search" | "popular" | "unanswered" | "unread" | "notifications" | "tags" | "tag" | "category" | "section" | "topic" | "admin" | "empty" | "under-development" | "not-found";

type PreviewVariant =
  | "section-form-error"
  | "topic-reply-error"
  | "topic-unsolved"
  | "topic-best-answer-unsolved"
  | "admin-success"
  | "admin-conflict"
  | "route-401"
  | "route-403"
  | "route-503"
  | "route-500"
  | "search-no-results"
  | "notifications-empty"
  | "help-solutions-open-empty"
  | "help-solutions-active-empty"
  | "help-solutions-want-empty"
  | "help-solutions-for-me-empty"
  | "help-solutions-attention-empty"
  | "help-solutions-mine-empty"
  | "help-solutions-similar-results"
  | "help-solutions-similar-empty"
  | "help-solutions-similar-invalid"
  | "help-solutions-similar-unavailable"
  | "help-solution-outdated"
  | "category-no-pins"
  | "profile-empty"
  | "profile-error"
  | "profile-long";

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
  allowedIdentities?: readonly PreviewIdentity[];
}

export const scenarios: readonly Scenario[] = [
  { id: "credentials-sign-in", label: "Email sign-in", locale: "en", direction: "ltr", identity: "guest", path: "/en/sign-in", view: "credentials", allowedIdentities: ["guest"] },
  { id: "credentials-register", label: "Registration", locale: "en", direction: "ltr", identity: "guest", path: "/en/sign-up", view: "credentials", allowedIdentities: ["guest"] },
  { id: "profile-public", label: "Profile", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/maya", view: "profile" },
  { id: "profile-own", label: "Profile · own", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex", view: "profile", allowedIdentities: ["user", "manager"] },
  { id: "profile-edit", label: "Profile · edit", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex?edit=1", view: "profile", allowedIdentities: ["user", "manager"] },
  { id: "profile-error", label: "Profile · validation error", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex?edit=1", view: "profile", variant: "profile-error", allowedIdentities: ["user", "manager"] },
  { id: "profile-long", label: "Profile · long text", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/maya", view: "profile", variant: "profile-long" },
  { id: "profile-empty", label: "Profile · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/sam", view: "profile", variant: "profile-empty" },
  { id: "home-guest", label: "Home", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home" },
  { id: "auth-pending", label: "Authentication · pending", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "pending", allowedIdentities: ["guest"] },
  { id: "auth-error", label: "Authentication · failed", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "error", allowedIdentities: ["guest"] },
  { id: "under-development-search", label: "Under development · search", locale: "en", direction: "ltr", identity: "guest", path: "/en/under-development?feature=search", view: "under-development" },
  { id: "notifications-user", label: "Notifications · mixed", locale: "en", direction: "ltr", identity: "user", path: "/en/notifications", view: "notifications", allowedIdentities: ["user", "manager"] },
  { id: "notifications-empty", label: "Notifications · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/notifications", view: "notifications", variant: "notifications-empty", allowedIdentities: ["user", "manager"] },
  { id: "search-results-guest", label: "Search · results", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=TypeScript", view: "search" },
  { id: "search-no-results-guest", label: "Search · no results", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=WebAssembly", view: "search", variant: "search-no-results" },
  { id: "popular-guest", label: "Popular", locale: "en", direction: "ltr", identity: "guest", path: "/en/popular", view: "popular" },
  { id: "unanswered-guest", label: "Unanswered", locale: "en", direction: "ltr", identity: "guest", path: "/en/unanswered", view: "unanswered" },
  { id: "unread-user", label: "Unread", locale: "en", direction: "ltr", identity: "user", path: "/en/unread", view: "unread", allowedIdentities: ["user", "manager"] },
  { id: "tags-guest", label: "Tags", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags", view: "tags" },
  { id: "tag-typescript-guest", label: "Tag · TypeScript", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags/typescript", view: "tag" },
  { id: "help-solutions-all", label: "Help & solutions · All", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions", view: "category" },
  { id: "help-solutions-ask", label: "Help & solutions · Ask", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "editor-help-draft", label: "Editor · Help question draft", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-results", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-results", label: "Help & solutions · Similar questions", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-results", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-empty", label: "Help & solutions · Similar · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-invalid", label: "Help & solutions · Similar · invalid", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-invalid", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-unavailable", label: "Help & solutions · Similar · unavailable", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-unavailable", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-needs-help", label: "Help & solutions · Needs help", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=open", view: "category" },
  { id: "help-solutions-needs-help-empty", label: "Help & solutions · Needs help · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=open", view: "category", variant: "help-solutions-open-empty" },
  { id: "help-solutions-want", label: "Help & solutions · Want to help", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=help", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-want-empty", label: "Help & solutions · Want to help · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=help", view: "category", variant: "help-solutions-want-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-want-guest", label: "Help & solutions · Want to help · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=help", view: "not-found", variant: "route-401", allowedIdentities: ["guest"] },
  { id: "help-solutions-for-me", label: "Help & solutions · For me", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=for-me", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-for-me-empty", label: "Help & solutions · For me · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=for-me", view: "category", variant: "help-solutions-for-me-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-for-me-guest", label: "Help & solutions · For me · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=for-me", view: "not-found", variant: "route-401", allowedIdentities: ["guest"] },
  { id: "help-solutions-active", label: "Help & solutions · Active", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active", view: "category" },
  { id: "help-solutions-active-empty", label: "Help & solutions · Active · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active", view: "category", variant: "help-solutions-active-empty" },
  { id: "help-solutions-attention", label: "Help & solutions · Needs attention", locale: "en", direction: "ltr", identity: "manager", path: "/en/categories/help-solutions?mode=attention", view: "category", allowedIdentities: ["manager"] },
  { id: "help-solutions-attention-empty", label: "Help & solutions · Needs attention · empty", locale: "en", direction: "ltr", identity: "manager", path: "/en/categories/help-solutions?mode=attention", view: "category", variant: "help-solutions-attention-empty", allowedIdentities: ["manager"] },
  { id: "help-solutions-solutions", label: "Help & solutions · Solutions", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=solutions", view: "category" },
  { id: "help-solutions-filters", label: "Help & solutions · Combined filters", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active&solution=outdated&answers=has&quality=normal&relation=standalone", view: "category" },
  { id: "help-solutions-filters-needs-details", label: "Help & solutions · Needs details filter", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?answers=has&quality=needs-details&relation=standalone", view: "category" },
  { id: "help-solutions-filters-manager", label: "Help & solutions · Needs review filter", locale: "en", direction: "ltr", identity: "manager", path: "/en/categories/help-solutions?solution=needs-review&answers=has&quality=normal&relation=standalone", view: "category", allowedIdentities: ["manager"] },
  { id: "help-solution-current", label: "Help solution · current", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-cloudflare-cache", view: "topic", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solution-needs-review", label: "Help solution · needs review", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-neon-pooling", view: "topic", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solution-outdated", label: "Help solution · outdated", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-postgres-timeout", view: "topic", variant: "help-solution-outdated", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solutions-mine", label: "Help & solutions · My questions", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=mine", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-mine-empty", label: "Help & solutions · My questions · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=mine", view: "category", variant: "help-solutions-mine-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-mine-guest", label: "Help & solutions · My questions · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=mine", view: "not-found", variant: "route-401", allowedIdentities: ["guest"] },
  { id: "category-guest", label: "Category", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category" },
  { id: "category-no-pins", label: "Category · no pins", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category", variant: "category-no-pins" },
  { id: "section-user", label: "Section", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "editor-create-topic", label: "Editor · Create topic", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section", allowedIdentities: ["user", "manager"] },
  { id: "section-form-error", label: "Create topic error", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section", variant: "section-form-error", allowedIdentities: ["user", "manager"] },
  { id: "topic-solved-user", label: "Solved topic", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "editor-reply", label: "Editor · Reply", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic", variant: "topic-unsolved", allowedIdentities: ["user", "manager"] },
  { id: "topic-best-answer-unsolved", label: "Best answer · confirmation", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api?solutionPrompt=answer#solution-confirmation", view: "topic", variant: "topic-best-answer-unsolved", allowedIdentities: ["user"] },
  { id: "topic-reply-error", label: "Reply error", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic", variant: "topic-reply-error", allowedIdentities: ["user", "manager"] },
  { id: "topic-unsolved", label: "Unsolved topic", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "topic", variant: "topic-unsolved" },
  { id: "admin", label: "Authorization", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin", allowedIdentities: ["manager"] },
  { id: "admin-success", label: "Authorization · saved", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin", variant: "admin-success", allowedIdentities: ["manager"] },
  { id: "admin-conflict", label: "Authorization · conflict", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin", variant: "admin-conflict", allowedIdentities: ["manager"] },
  { id: "empty-section", label: "Empty section", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/empty", view: "empty" },
  { id: "route-401", label: "System · 401", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/authorization", view: "not-found", variant: "route-401", allowedIdentities: ["guest"] },
  { id: "route-403", label: "System · 403", locale: "en", direction: "ltr", identity: "user", path: "/en/admin/authorization", view: "not-found", variant: "route-403", allowedIdentities: ["user"] },
  { id: "not-found", label: "System · 404", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
  { id: "route-503", label: "System · 503", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "not-found", variant: "route-503", allowedIdentities: ["manager"] },
  { id: "route-500", label: "System · unexpected", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "not-found", variant: "route-500" },
] as const;

function supportsPreviewIdentity(scenario: Scenario, identity: PreviewIdentity): boolean {
  return scenario.allowedIdentities?.includes(identity) ?? true;
}

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
      isPinned: true,
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
      isPinned: false,
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
      isPinned: true,
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
      isPinned: true,
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
      isPinned: false,
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
      isPinned: true,
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
  isPinned: true,
  isSolved: true,
  bestAnswerPostId: "answer",
  needsDetails: false,
  duplicateOf: null,
  duplicateDisputed: false,
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
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
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
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
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
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
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

function previewCategoryTopics(
  locale: PreviewLocale,
  sectionIdValue: string,
  sectionName: string,
) {
  const russian = locale === "ru";
  const rtl = locale === "he";
  const pinnedTitles = rtl
    ? ["כללי המדור ומשאבים שימושיים", "לפני שפותחים נושא חדש", "אוסף קישורים מומלץ"]
    : russian
      ? ["Правила раздела и полезные материалы", "Перед созданием новой темы", "Рекомендуемая подборка материалов"]
      : ["Section guide and useful resources", "Before you open a new topic", "Recommended reference collection"];
  const latestTitles = sectionIdValue === sectionId
    ? (rtl
        ? ["איך כדאי לבנות לקוח API עם טיפוסים?", "תוכן RTL מעורב עם בלוקי קוד", "Worker auth: session boundary מול permissions", "דוגמה מעשית מהמדור"]
        : russian
          ? ["Как лучше построить типизированный API-клиент?", "Смешанный RTL-контент с блоками кода", "Worker auth: граница сессии и permissions", "Практический пример из раздела"]
          : ["How should I structure a typed API client?", "Mixed RTL content with code blocks", "Worker auth: session boundary vs permissions", "A practical example from this section"])
    : (rtl
        ? [`השאלה האחרונה ב-${sectionName}`, "דוגמה מעשית", "דיון שימושי", "שאלה נוספת"]
        : russian
          ? [`Последний вопрос: ${sectionName}`, "Практический пример", "Полезное обсуждение", "Ещё один вопрос"]
          : [`Latest question in ${sectionName}`, "A practical example", "Useful discussion", "Another question"]);

  const latestIds = sectionIdValue === sectionId
    ? [topicId, "rtl-markdown", "worker-auth", `${sectionIdValue}-latest-4`]
    : latestTitles.map((_, index) => `${sectionIdValue}-latest-${index + 1}`);

  return {
    pinnedTopics: pinnedTitles.map((title, index) => ({
      id: `${sectionIdValue}-pinned-${index + 1}`,
      title,
      authorName: ["Vico Team", "Maya Cohen", "Sam Chen"][index]!,
      activityAt: new Date(Date.UTC(2026, 8, 29 - index, 9 + index, 30)).toISOString(),
    })),
    latestTopics: latestTitles.map((title, index) => ({
      id: latestIds[index]!,
      title,
      authorName: ["Alex Rivera", "Noa Levi", "Sam Chen", "Maya Cohen"][index]!,
      activityAt: new Date(Date.UTC(2026, 8, 30 - Math.min(index, 2), 15 - index * 2, 42)).toISOString(),
    })),
  };
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
  const topicTotals = [8, 64, 10, 43, 27, 31];
  const messageTotals = [27, 387, 76, 296, 148, 203];
  const genericSectionNames = rtl
    ? ["כללי", "שאלות", "פרקטיקה", "כלים", "דיונים"]
    : russian
      ? ["Основное", "Вопросы", "Практика", "Инструменты", "Обсуждения"]
      : ["General", "Questions", "Practice", "Tools", "Discussions"];

  function distribute(total: number, count: number, index: number) {
    return Math.floor(total / count) + (index < total % count ? 1 : 0);
  }

  return ids.map((id, index) => {
    const sections = id === "help-solutions"
      ? []
      : id === "development"
        ? (rtl ? categoryRtl : russian ? categoryRu : category).sections.map((section) => ({
            id: section.id,
            name: section.name,
            topicCount: section.topicCount,
            messageCount: section.postCount,
          }))
        : genericSectionNames.map((name, sectionIndex) => ({
            id: `${id}-preview-${sectionIndex + 1}`,
            name,
            topicCount: distribute(topicTotals[index]!, genericSectionNames.length, sectionIndex),
            messageCount: distribute(messageTotals[index]!, genericSectionNames.length, sectionIndex),
          }));

    return {
      id,
      name: names[index]!,
      description: descriptions[index]!,
      icon: icons[index]!,
      sectionCount: sections.length,
      topicCount: id === HELP_SOLUTIONS_CATEGORY_ID
        ? topicTotals[index]!
        : sections.reduce((sum, section) => sum + section.topicCount, 0),
      messageCount: id === HELP_SOLUTIONS_CATEGORY_ID
        ? messageTotals[index]!
        : sections.reduce((sum, section) => sum + section.messageCount, 0),
      sections,
    };
  });
}

function previewHelpSolutions(locale: PreviewLocale) {
  const russian = locale === "ru";
  const hebrew = locale === "he";
  const titles = hebrew
    ? [
        "למה ה-Worker מאבד את ה-session אחרי redirect?",
        "נבחרה תשובה מיטבית, אבל האימות עדיין לא יציב",
        "איך מתקנים statement timeout ב-PostgreSQL?",
        "איך מגדירים Cache-Control נכון ב-Cloudflare?",
        "האם צריך לבדוק מחדש את הגדרות החיבור של Neon?",
      ]
    : russian
      ? [
          "Почему Worker теряет сессию после redirect?",
          "Лучший ответ выбран, но авторизация всё ещё нестабильна",
          "Как исправить statement timeout в PostgreSQL?",
          "Как правильно настроить Cache-Control в Cloudflare?",
          "Нужно ли перепроверить настройки подключения Neon?",
        ]
      : [
          "Why does my Worker lose the session after redirect?",
          "Best answer selected, but auth is still intermittent",
          "How do I fix PostgreSQL statement timeouts?",
          "How should Cache-Control be configured on Cloudflare?",
          "Should the Neon connection settings be reviewed again?",
        ];

  return {
    id: HELP_SOLUTIONS_CATEGORY_ID,
    name: hebrew ? "עזרה ופתרונות" : russian ? "Помощь и решения" : "Help & solutions",
    questions: [
      {
        id: "help-worker-session", title: titles[0]!, authorName: "Alex Rivera", replyCount: 0,
        isSolved: false, hasBestAnswer: false, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
        needsDetails: false,
        duplicateOf: { id: "help-auth-best-answer", title: titles[1]! },
        duplicateDisputed: true,
        createdAt: "2026-09-30T11:30:00.000Z",
        activityAt: "2026-09-30T15:40:00.000Z",
        tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      },
      {
        id: "help-auth-best-answer", title: titles[1]!, authorName: "Noa Levi", replyCount: 3,
        isSolved: false, hasBestAnswer: true, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: true, duplicateOf: null, duplicateDisputed: false, createdAt: "2026-09-29T09:00:00.000Z",
        activityAt: "2026-09-30T14:20:00.000Z",
        tags: [{ key: "better-auth", name: "Better Auth" }, { key: "workers", name: "Workers" }],
      },
      {
        id: "help-postgres-timeout", title: titles[2]!, authorName: "Maya Cohen", replyCount: 5,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: "outdated" as const,
        solutionOutdatedReason: hebrew
          ? "גרסת PostgreSQL החדשה שינתה את ההתנהגות של ההגדרה הזו."
          : russian
            ? "В новой версии PostgreSQL поведение этой настройки изменилось."
            : "A newer PostgreSQL version changed the behavior of this setting.",
        solutionOutdatedReasonKind: null,
        needsDetails: false,
        duplicateOf: null,
        duplicateDisputed: false,
        createdAt: "2026-09-27T08:00:00.000Z",
        activityAt: "2026-09-29T18:10:00.000Z",
        tags: [{ key: "postgresql", name: "PostgreSQL" }, { key: "neon", name: "Neon" }],
      },
      {
        id: "help-cloudflare-cache", title: titles[3]!, authorName: "Sam Chen", replyCount: 4,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: false, duplicateOf: null, duplicateDisputed: false,
        createdAt: "2026-09-26T09:15:00.000Z",
        activityAt: "2026-09-29T15:30:00.000Z",
        tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "cache", name: "Cache" }],
      },
      {
        id: "help-neon-pooling", title: titles[4]!, authorName: "Alex Rivera", replyCount: 2,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: "needs-review" as const, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: false, duplicateOf: null, duplicateDisputed: false,
        createdAt: "2026-09-25T12:20:00.000Z",
        activityAt: "2026-09-28T17:45:00.000Z",
        tags: [{ key: "neon", name: "Neon" }, { key: "postgresql", name: "PostgreSQL" }],
      },
    ],
  };
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

function unreadTopics(locale: PreviewLocale) {
  const base = unansweredTopics(locale);
  return base.slice(0, 2).map((topic, index) => ({
    ...topic,
    state: index === 0 ? "new" as const : "unread" as const,
    firstUnreadPostId: `${topic.id}-post-${index + 1}`,
    latestPostId: `${topic.id}-post-3`,
    unreadCount: index === 0 ? 3 : 2,
    activityAt: new Date(index === 0 ? "2026-09-30T16:00:00.000Z" : "2026-09-30T14:00:00.000Z"),
  }));
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

function previewUser(scenario: Scenario): HeaderAuthUser | null {
  if (scenario.identity === "guest") return null;
  const unreadNotificationCount = scenario.variant === "notifications-empty" ? 0 : 3;
  if (scenario.identity === "manager") {
    return { id: "maya", name: "Maya Cohen", canManageAuthorization: true, unreadNotificationCount };
  }
  return { id: "alex", name: "Alex Rivera", unreadNotificationCount };
}

function previewNotifications(locale: PreviewLocale) {
  const russian = locale === "ru";
  const hebrew = locale === "he";
  return [
    {
      id: "notification-1",
      actorName: hebrew ? "מאיה כהן" : "Maya Cohen",
      topicId: "typed-api",
      topicTitle: hebrew
        ? "איך כדאי לבנות לקוח API עם טיפוסים?"
        : russian
          ? "Как лучше построить типизированный API-клиент?"
          : "How should I structure a typed API client?",
      postId: "followup",
      createdAt: "2026-10-03T18:42:00.000Z",
      readAt: null,
    },
    {
      id: "notification-2",
      actorName: hebrew ? "סם צ'ן" : "Sam Chen",
      topicId: "worker-auth",
      topicTitle: hebrew
        ? "Worker auth: session boundary מול permissions"
        : russian
          ? "Worker auth: граница сессии и permissions"
          : "Worker auth: session boundary vs permissions",
      postId: "worker-auth-post-3",
      createdAt: "2026-10-03T16:15:00.000Z",
      readAt: null,
    },
    {
      id: "notification-3",
      actorName: hebrew ? "נועה לוי" : "Noa Levi",
      topicId: "rtl-markdown",
      topicTitle: hebrew
        ? "תוכן RTL מעורב עם בלוקי קוד"
        : russian
          ? "Смешанный RTL-контент с блоками кода"
          : "Mixed RTL content with code blocks",
      postId: "rtl-markdown-post-2",
      createdAt: "2026-10-02T12:30:00.000Z",
      readAt: "2026-10-02T13:10:00.000Z",
    },
  ];
}

export function PreviewController() {
  const [identity, setIdentity] = useState<PreviewIdentity>("guest");
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const availableScenarios = scenarios.filter((scenario) => supportsPreviewIdentity(scenario, identity));
  const selected = availableScenarios.find((scenario) => scenario.id === scenarioId) ?? availableScenarios[0]!;

  const selectIdentity = (nextIdentity: PreviewIdentity) => {
    const nextScenarios = scenarios.filter((scenario) => supportsPreviewIdentity(scenario, nextIdentity));
    setIdentity(nextIdentity);
    if (!nextScenarios.some((scenario) => scenario.id === scenarioId)) {
      setScenarioId(nextScenarios[0]!.id);
    }
  };

  const src = `?embed=1&scenario=${encodeURIComponent(selected.id)}&identity=${encodeURIComponent(identity)}&build=${encodeURIComponent(previewBuildKey)}`;

  return (
    <main className="preview-controller">
      <header className="preview-toolbar">
        <div>
          <p className="preview-eyebrow">Vico Forum</p>
          <h1>UI progress preview</h1>
          <p>Static representative data only. Runtime behavior is verified separately.</p>
        </div>
        <div className="preview-controls">
          <div className="preview-state-controls">
            <fieldset className="preview-role-controls">
              <legend>Role</legend>
              {previewIdentities.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={identity === candidate}
                  onClick={() => selectIdentity(candidate)}
                >
                  {candidate === "guest" ? "Guest" : candidate === "user" ? "User" : "Manager"}
                </button>
              ))}
            </fieldset>
            <label>
              State
              <select value={selected.id} onChange={(event) => setScenarioId(event.target.value)}>
                {availableScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="preview-viewport-controls">
            <legend>Viewport</legend>
            <button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Desktop</button>
            <button type="button" aria-pressed={viewport === "tablet"} onClick={() => setViewport("tablet")}>Tablet</button>
            <button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Mobile</button>
          </fieldset>
        </div>
      </header>
      <section className="preview-frame-wrap" data-viewport={viewport}>
        <iframe
          key={`${selected.id}-${identity}-${viewport}`}
          className="preview-frame"
          title={`${selected.label} · ${identity}`}
          src={src}
        />
      </section>
    </main>
  );
}

export function EmbeddedPreview({ scenarioId, identity }: { scenarioId: string; identity?: PreviewIdentity }) {
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0]!;
  const activeIdentity = identity && supportsPreviewIdentity(scenario, identity) ? identity : scenario.identity;
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(initialPreviewLocale);
  const activeScenario = useMemo(
    () => scenarioForLocale({ ...scenario, identity: activeIdentity }, previewLocale),
    [scenario, activeIdentity, previewLocale],
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
        initialUser={previewUser(activeScenario)}
        initialPresentationState={activeScenario.authPresentationState}
      >
        <I18nextProvider i18n={runtime}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </HeaderAuthProvider>
    </LocaleNavigationProvider>
  );
}

const previewEmailActions: EmailAuthActions = {
  signInWithEmail: async () => false,
  signUpWithEmail: async () => false,
};
const previewGoogleActions: AuthClientActions = {
  signInWithGoogle: async () => undefined,
  signOut: async () => undefined,
};

function previewCredential(locale: PreviewLocale, mode: "sign-in" | "sign-up") {
  return <CredentialView locale={locale} mode={mode} returnTo={`/${locale}`}
    emailActions={previewEmailActions} googleActions={previewGoogleActions} />;
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
    { path: "/:locale/sign-in", element: previewCredential(scenario.locale, "sign-in") },
    { path: "/:locale/sign-up", element: previewCredential(scenario.locale, "sign-up") },
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
      path: "/:locale/unread",
      element: <UnreadView locale={scenario.locale} topics={unreadTopics(scenario.locale)} />,
    },
    {
      path: "/:locale/users/:userId",
      element: <PreviewProfileRoute scenario={scenario} />,
    },
    {
      path: "/:locale/notifications",
      element: (
        <NotificationsView
          locale={scenario.locale}
          notifications={scenario.variant === "notifications-empty" ? [] : previewNotifications(scenario.locale)}
        />
      ),
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

  const source = !routeCategoryId || routeCategoryId === categoryId
    ? localizedCategory
    : (() => {
        const overview = homepageCategories(locale).find((item) => item.id === routeCategoryId);
        if (!overview) return localizedCategory;
        return {
          id: overview.id,
          name: overview.name,
          sections: overview.sections.map((section) => ({
            id: section.id,
            name: section.name,
            topicCount: section.topicCount,
            postCount: section.messageCount,
          })),
        };
      })();

  return {
    ...source,
    sections: source.sections.map((section) => ({
      ...section,
      ...previewCategoryTopics(locale, section.id, section.name),
    })),
  };
}

function PreviewCategoryRoute({ scenario }: { scenario: Scenario }) {
  const { categoryId: routeCategoryId } = useParams();
  const [searchParams] = useSearchParams();
  if (routeCategoryId === HELP_SOLUTIONS_CATEGORY_ID) {
    const requestedMode = searchParams.get("mode");
    const mode = requestedMode === "open"
      ? "open"
      : requestedMode === "help"
        ? "help"
        : requestedMode === "for-me"
          ? "for-me"
          : requestedMode === "active"
            ? "active"
            : requestedMode === "attention"
          ? "attention"
          : requestedMode === "solutions"
            ? "solutions"
            : requestedMode === "mine"
              ? "mine"
              : "all";
    const filters: ForumHelpSolutionsFilters = {
      ...(searchParams.get("solution") === "open"
        || searchParams.get("solution") === "solved"
        || searchParams.get("solution") === "needs-review"
        || searchParams.get("solution") === "outdated"
        ? { solution: searchParams.get("solution") as NonNullable<ForumHelpSolutionsFilters["solution"]> }
        : {}),
      ...(searchParams.get("answers") === "none" || searchParams.get("answers") === "has"
        ? { answers: searchParams.get("answers") as NonNullable<ForumHelpSolutionsFilters["answers"]> }
        : {}),
      ...(searchParams.get("quality") === "normal" || searchParams.get("quality") === "needs-details"
        ? { quality: searchParams.get("quality") as NonNullable<ForumHelpSolutionsFilters["quality"]> }
        : {}),
      ...(searchParams.get("relation") === "standalone" || searchParams.get("relation") === "duplicate"
        ? { relation: searchParams.get("relation") as NonNullable<ForumHelpSolutionsFilters["relation"]> }
        : {}),
    };
    const page = previewHelpSolutions(scenario.locale);
    const previewIdentity = previewUser(scenario);
    const filteredPage = scenario.variant === "help-solutions-open-empty" && mode === "open"
      ? { ...page, questions: [] }
      : scenario.variant === "help-solutions-want-empty" && mode === "help"
        ? { ...page, questions: [] }
        : scenario.variant === "help-solutions-for-me-empty" && mode === "for-me"
          ? { ...page, questions: [] }
          : scenario.variant === "help-solutions-active-empty" && mode === "active"
            ? { ...page, questions: [] }
            : scenario.variant === "help-solutions-attention-empty" && mode === "attention"
              ? { ...page, questions: [] }
          : scenario.variant === "help-solutions-mine-empty" && mode === "mine"
            ? { ...page, questions: [] }
            : mode === "open"
              ? { ...page, questions: page.questions.filter((question) => !question.isSolved) }
              : mode === "help"
                ? { ...page, questions: page.questions.filter((question) => !question.isSolved && question.authorName !== previewIdentity?.name) }
                : mode === "for-me"
                  ? {
                      ...page,
                      questions: page.questions.filter((question) =>
                        !question.isSolved
                        && question.authorName !== previewIdentity?.name
                        && question.tags.some(({ key }) => key === "better-auth" || key === "workers")
                      ),
                    }
                  : mode === "active"
                    ? { ...page, questions: page.questions.filter((question) => question.replyCount > 0) }
                    : mode === "attention"
                      ? {
                          ...page,
                          questions: page.questions.map((question, index) => ({
                            ...question,
                            attention: index === 0
                              ? { signals: { "needs-details": 1, duplicate: 2 }, totalSignals: 3, appeal: true }
                              : index === 1
                                ? { signals: { "needs-review": 1 }, totalSignals: 1, appeal: false }
                                : index === 2
                                  ? { signals: { "solution-outdated": 1 }, totalSignals: 1, appeal: false }
                                  : index === 3
                                    ? { signals: { duplicate: 1 }, totalSignals: 1, appeal: false }
                                    : { signals: { "needs-details": 1 }, totalSignals: 1, appeal: false },
                          })),
                        }
                : mode === "solutions"
                  ? { ...page, questions: page.questions.filter((question) => question.isSolved) }
                  : mode === "mine"
                    ? { ...page, questions: page.questions.filter((question) => question.authorName === previewIdentity?.name) }
                    : page;
    const filterQuestion = (question: typeof page.questions[number]) =>
      (!filters.solution
        || (filters.solution === "open" && !question.isSolved)
        || (filters.solution === "solved" && question.isSolved)
        || (filters.solution === "needs-review" && question.solutionModerationStatus === "needs-review")
        || (filters.solution === "outdated" && question.solutionModerationStatus === "outdated"))
      && (!filters.answers
        || (filters.answers === "none" && question.replyCount === 0)
        || (filters.answers === "has" && question.replyCount > 0))
      && (!filters.quality
        || (filters.quality === "normal" && !question.needsDetails)
        || (filters.quality === "needs-details" && question.needsDetails))
      && (!filters.relation
        || (filters.relation === "standalone" && !question.duplicateOf)
        || (filters.relation === "duplicate" && Boolean(question.duplicateOf)));
    const combinedFilteredPage = {
      ...filteredPage,
      questions: filteredPage.questions.filter(filterQuestion),
    };

    const similarVariant = scenario.variant?.startsWith("help-solutions-similar-")
      ? scenario.variant
      : undefined;
    const similarDraft = {
      title: similarVariant === "help-solutions-similar-invalid" ? "" : page.questions[0]?.title ?? "Worker authentication issue",
      body: scenario.locale === "ru"
        ? "Сессия пропадает после redirect. Проверяю, обсуждалась ли уже такая проблема.\n\n```ts\nconst session = await getSession(request);\n```"
        : scenario.locale === "he"
          ? "ה-session נעלם אחרי redirect. בודק אם הבעיה כבר נדונה.\n\n```ts\nconst session = await getSession(request);\n```"
          : "The session disappears after redirect. Checking whether this issue already exists.\n\n```ts\nconst session = await getSession(request);\n```",
      tags: "Cloudflare, Auth",
    };
    const actionData = similarVariant
      ? {
          operation: "helpSimilarQuestions" as const,
          outcome: similarVariant === "help-solutions-similar-results"
            ? "results" as const
            : similarVariant === "help-solutions-similar-empty"
              ? "empty" as const
              : similarVariant === "help-solutions-similar-invalid"
                ? "invalid" as const
                : "unavailable" as const,
          draft: similarDraft,
          results: similarVariant === "help-solutions-similar-results"
            ? page.questions.slice(0, 2).map((question, index) => ({
                id: question.id,
                title: question.title,
                replyCount: question.replyCount,
                isSolved: question.isSolved,
                tags: question.tags,
                matchSource: index === 0 ? "title" as const : "tags" as const,
              }))
            : [],
        }
      : undefined;
    return (
      <HelpSolutionsView
        locale={scenario.locale}
        mode={mode}
        filters={filters}
        page={combinedFilteredPage}
        referenceTime={previewReferenceTime}
        isAuthenticated={scenario.identity !== "guest"}
        canAskQuestion={scenario.identity !== "guest"}
        canViewAttention={scenario.identity === "manager"}
        canViewSolutionModeration={scenario.identity === "manager"}
        canViewDuplicateDispute={scenario.identity === "manager"}
        actionData={actionData}
      />
    );
  }

  const baseCategoryPage = previewCategory(scenario.locale, routeCategoryId);
  const categoryPage = scenario.variant === "category-no-pins"
    ? {
        ...baseCategoryPage,
        sections: baseCategoryPage.sections.map((section) => ({ ...section, pinnedTopics: [] })),
      }
    : baseCategoryPage;

  return (
    <CategoryView
      locale={scenario.locale}
      category={categoryPage}
      referenceTime={previewReferenceTime}
    />
  );
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
      isPinned: index === 0,
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
      topicReadStates={scenario.identity === "guest" ? null : Object.fromEntries(
        previewSection(scenario.locale, routeSectionId).topics.map((topic, index) => [
          topic.id,
          (["new", "unread", "read"] as const)[index % 3],
        ]),
      )}
      actionData={scenario.view === "section" && scenario.variant === "section-form-error"
        ? { error: "rateLimited" }
        : undefined}
    />
  );
}

function PreviewTopicRoute({ scenario }: { scenario: Scenario }) {
  const { topicId: routeTopicId } = useParams();


  const helpQuestion = previewHelpSolutions(scenario.locale).questions
    .find((question) => question.id === routeTopicId);
  if (helpQuestion) {
    const postCount = helpQuestion.replyCount + 1;
    const bestAnswerPostId = helpQuestion.hasBestAnswer && postCount > 1
      ? `${helpQuestion.id}-post-${Math.min(5, postCount)}`
      : null;
    const posts = Array.from({ length: postCount }, (_, index) => {
      const id = `${helpQuestion.id}-post-${index + 1}`;
      const isBestAnswer = id === bestAnswerPostId;
      return {
        id,
        topicId: helpQuestion.id,
        authorId: index === 0 ? "help-author" : `help-replier-${index}`,
        authorName: index === 0 ? helpQuestion.authorName : ["Sam Chen", "Maya Cohen", "Noa Levi"][index % 3]!,
        parentPostId: index === 0 ? null : `${helpQuestion.id}-post-1`,
        solutionModerationStatus: isBestAnswer ? helpQuestion.solutionModerationStatus : null,
        solutionOutdatedReason: isBestAnswer ? helpQuestion.solutionOutdatedReason : null,
        solutionOutdatedReasonKind: isBestAnswer ? helpQuestion.solutionOutdatedReasonKind : null,
        createdAt: new Date(`2026-09-${28 + Math.min(index, 2)}T${10 + index}:00:00Z`),
        body: {
          id: `${helpQuestion.id}-body-${index + 1}`,
          originalContent: index === 0
            ? scenario.locale === "ru"
              ? "Представительный технический вопрос из категории «Помощь и решения»."
              : scenario.locale === "he"
                ? "שאלה טכנית מייצגת מקטגוריית עזרה ופתרונות."
                : "Representative technical question from Help & solutions."
            : scenario.locale === "ru"
              ? `Представительный ответ №${index}.`
              : scenario.locale === "he"
                ? `תשובה מייצגת מספר ${index}.`
                : `Representative answer #${index}.`,
          sourceLocale: scenario.locale,
        },
      };
    });
    const helpTopic = {
      id: helpQuestion.id,
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId: scenario.identity === "user" ? "preview-user" : "help-author",
      authorName: scenario.identity === "user" ? "Alex Rivera" : helpQuestion.authorName,
      createdAt: new Date(helpQuestion.createdAt),
      isPinned: false,
      isSolved: helpQuestion.isSolved,
      bestAnswerPostId,
      needsDetails: helpQuestion.needsDetails,
      duplicateOf: helpQuestion.duplicateOf,
      duplicateDisputed: helpQuestion.duplicateDisputed,
      title: {
        id: `${helpQuestion.id}-title`,
        originalContent: helpQuestion.title,
        sourceLocale: scenario.locale,
      },
      section: {
        id: HELP_SOLUTIONS_SERVICE_SECTION_ID,
        name: "Questions",
        category: { id: HELP_SOLUTIONS_CATEGORY_ID, name: previewHelpSolutions(scenario.locale).name },
      },
      tags: helpQuestion.tags,
      posts,
    };
    return (
      <TopicView
        locale={scenario.locale}
        topic={helpTopic}
        titlePresentation={originalPresentation(
          "topic-title", helpTopic.id, helpTopic.title.id, helpTopic.title.originalContent,
          scenario.locale, scenario.direction,
        )}
        postPresentations={posts.map((post) => originalPresentation(
          "post-body", post.id, post.body.id, post.body.originalContent, scenario.locale, scenario.direction,
        ))}
        generationUnits={[]}
        canReply={scenario.identity !== "guest"}
        canManageSolution={scenario.identity !== "guest"}
        canManageAnySolution={scenario.identity === "manager"}
        canModerateHelpSolution={scenario.identity === "manager"}
        canManageHelpDuplicate={scenario.identity === "manager"}
        pendingDuplicateAppeal={helpQuestion.duplicateDisputed && scenario.identity !== "guest"
          ? {
              id: `${helpQuestion.id}-appeal`,
              relationshipId: `${helpQuestion.id}-duplicate`,
              explanation: scenario.locale === "ru"
                ? "Проблема похожа, но причина и решение отличаются."
                : scenario.locale === "he"
                  ? "הבעיה דומה, אבל הסיבה והפתרון שונים."
                  : "The problem is similar, but the cause and solution are different.",
              createdAt: "2026-10-08T18:00:00.000Z",
            }
          : null}
        isTopicAuthor={scenario.identity === "user"}
        canCorrectTitleSourceLocale={scenario.identity === "manager"}
        canCorrectAnySourceLocale={scenario.identity === "manager"}
        canManagePin={scenario.identity === "manager"}
        canUseAdminPanel={scenario.identity === "manager"}
        topicReadState={null}
      />
    );
  }
  if (!routeTopicId || routeTopicId === topicId) {
    const solved = scenario.view === "topic"
      ? scenario.variant !== "topic-unsolved"
        && scenario.variant !== "topic-reply-error"
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
    solutionModerationStatus: null,
    solutionOutdatedReason: null,
    solutionOutdatedReasonKind: null,
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
    isPinned: matched.topic.isPinned,
    isSolved: false,
    bestAnswerPostId: null,
    needsDetails: false,
    duplicateOf: null,
    duplicateDisputed: false,
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
      canManageSolution={scenario.identity === "manager"}
      canManageAnySolution={scenario.identity === "manager"}
      canModerateHelpSolution={false}
      canCorrectTitleSourceLocale={scenario.identity === "manager"}
      canCorrectAnySourceLocale={scenario.identity === "manager"}
      canManagePin={scenario.identity === "manager"}
      canUseAdminPanel={scenario.identity === "manager"}
      topicReadState={null}
    />
  );
}

function PreviewProfileRoute({ scenario }: { scenario: Scenario }) {
  const { userId = "alex" } = useParams();
  const [query] = useSearchParams();
  const identity = previewUser(scenario);
  // The own-profile fixture follows the separately selected preview identity.
  const id = scenario.id.startsWith("profile-") && scenario.allowedIdentities && userId === "alex"
    ? identity?.id ?? userId : userId;
  const empty = scenario.variant === "profile-empty" || id === "sam";
  const name = scenario.variant === "profile-long" ? "Maya Cohen · מפתחת קהילה · DeveloperWithALongUnbrokenDisplayNameForReflowVerification" : id === "maya" ? "Maya Cohen" : id === "alex" ? "Alex Rivera" : id === "sam" ? "Sam Chen" : "Forum member";
  const bio = scenario.locale === "ru" ? "Создаю веб-приложения с AI-инструментами. Помогаю разбирать TypeScript и API.\nУчусь вместе с форумом." : scenario.locale === "he" ? "בונה יישומי אינטרנט בעזרת כלי AI. משתף ידע על TypeScript ו־API.\nלומד יחד עם חברי הפורום." : "Building web apps with AI tools. Sharing practical TypeScript and API answers.\nLearning with the forum.";
  return <ProfileView locale={scenario.locale} isOwner={identity?.id === id} editing={query.get("edit") === "1"}
    profile={{ id, name, image: null, joinedAt: "2026-09-01T00:00:00.000Z", bio: empty ? "" : scenario.variant === "profile-long" ? `${bio}\n${"TypeScript_שלום_".repeat(16)}` : bio,
      githubUrl: empty ? null : "https://github.com/octocat", websiteUrl: empty ? null : "https://example.com/",
      role: { slug: id === "maya" ? "admin" : "user", displayName: id === "maya" ? "Administrator" : "User", isSystem: true },
      messageCount: empty ? 0 : 128, bestAnswerCount: empty ? 0 : 17 }}
    feedback={scenario.variant === "profile-error" ? { error: "invalid", draft: { bio, githubUrl: "https://github.com/octocat/repo", websiteUrl: "https://example.com/" } } : undefined} />;
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
    case "credentials":
      return previewCredential(scenario.locale, scenario.path.includes("sign-up") ? "sign-up" : "sign-in");
    case "profile":
      return <PreviewProfileRoute scenario={scenario} />;
    case "home":
      return (
        <HomeView
          locale={scenario.locale}
          categories={homepageCategories(scenario.locale)}
          onlinePresence={{ count: 2, members: [
            { id: "alex", name: "Alex", image: null },
            { id: "maya", name: "Maya Cohen", image: null },
          ] }}
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
    case "unread":
      return <UnreadView locale={scenario.locale} topics={unreadTopics(scenario.locale)} />;
    case "notifications":
      return (
        <NotificationsView
          locale={scenario.locale}
          notifications={scenario.variant === "notifications-empty" ? [] : previewNotifications(scenario.locale)}
        />
      );
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
          category={previewCategory(scenario.locale, categoryId)}
          referenceTime={previewReferenceTime}
        />
      );
    case "section":
      return (
        <SectionView
          locale={scenario.locale}
          section={scenario.locale === "ru" ? sectionRu : scenario.direction === "rtl" ? sectionRtl : section}
          canCreateTopic
          topicReadStates={Object.fromEntries(
            (scenario.locale === "ru" ? sectionRu : scenario.direction === "rtl" ? sectionRtl : section).topics.map((topic, index) => [
              topic.id,
              (["new", "unread", "read"] as const)[index % 3],
            ]),
          )}
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
          topicReadStates={null}
        />
      );
    case "topic": {
      const solutionConfirmation = scenario.variant === "topic-best-answer-unsolved";
      const solved = scenario.variant !== "topic-unsolved"
        && scenario.variant !== "topic-reply-error"
        && !solutionConfirmation;
      const data = topicData(
        scenario.locale,
        scenario.direction,
        scenario.identity,
        solved,
        scenario.identity === "manager",
        solutionConfirmation,
      );
      return (
        <TopicView
          {...data}
          topic={solutionConfirmation ? { ...data.topic, bestAnswerPostId: "answer" } : data.topic}
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
  solutionAuthor = false,
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
    section: {
      ...baseTopic.section,
      name: "TypeScript וארכיטקטורה",
      category: { id: categoryId, name: "פיתוח" },
    },
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
    canManageSolution: showSecondaryControls || solutionAuthor,
    canManageAnySolution: identity === "manager",
    canModerateHelpSolution: false,
    isTopicAuthor: solutionAuthor,
    canCorrectTitleSourceLocale: showSecondaryControls,
    canCorrectAnySourceLocale: identity === "manager",
    canManagePin: identity === "manager",
    canUseAdminPanel: identity === "manager",
    correctablePostIds: showSecondaryControls
      ? translatedTopic.posts.map((post) => post.id)
      : [],
    topicReadState: null,
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
    "forum.topic.pin",
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
