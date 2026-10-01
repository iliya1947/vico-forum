import { useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter, useSearchParams } from "react-router";

import { HeaderAuthProvider, type HeaderAuthUser } from "../auth/auth-controls";
import { PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { AuthorizationAdminView } from "../authorization/admin-view";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { UnderDevelopmentView } from "../forum/under-development-view";
import { ForumRouteError } from "../forum/ui";
import {
  CategoryView,
  HomeView,
  SectionView,
  TopicView,
} from "../forum/views";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { previewTranslationRuntime } from "./preview-i18n";

type Direction = "ltr" | "rtl";
type PreviewIdentity = "guest" | "user" | "manager";
type PreviewView = "home" | "category" | "section" | "topic" | "admin" | "empty" | "under-development" | "not-found";

interface Scenario {
  id: string;
  label: string;
  locale: "en" | "he";
  direction: Direction;
  identity: PreviewIdentity;
  path: string;
  view: PreviewView;
}

export const scenarios: readonly Scenario[] = [
  { id: "home-ltr", label: "Home · LTR · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home" },
  { id: "home-rtl", label: "Home · RTL · user", locale: "he", direction: "rtl", identity: "user", path: "/he", view: "home" },
  { id: "under-development-ltr", label: "Under development · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/under-development?feature=search", view: "under-development" },
  { id: "under-development-rtl", label: "Under development · RTL", locale: "he", direction: "rtl", identity: "user", path: "/he/under-development?feature=notifications", view: "under-development" },
  { id: "category-ltr", label: "Category · LTR · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category" },
  { id: "category-rtl", label: "Category · RTL · user", locale: "he", direction: "rtl", identity: "user", path: "/he/categories/development", view: "category" },
  { id: "category-empty-ltr", label: "Empty category · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/empty", view: "category" },
  { id: "section-ltr", label: "Section · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "section-rtl", label: "Section · RTL · user", locale: "he", direction: "rtl", identity: "user", path: "/he/sections/typescript", view: "section" },
  { id: "topic-ltr", label: "Solved topic · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "topic-rtl", label: "Translated topic · RTL · manager", locale: "he", direction: "rtl", identity: "manager", path: "/he/topics/typed-api", view: "topic" },
  { id: "admin-ltr", label: "Authorization · LTR · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin" },
  { id: "empty-ltr", label: "Empty section · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/empty", view: "empty" },
  { id: "not-found-ltr", label: "404 state · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
] as const;

const categoryId = "development";
const sectionId = "typescript";
const topicId = "typed-api";

const previewBuildKey =
  document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? "dev";

const category = {
  id: categoryId,
  name: "Development",
  sections: [
    { id: sectionId, name: "TypeScript & architecture", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Cloud & deployment", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Databases", topicCount: 2, postCount: 12 },
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
      title: {
        id: "title-r3",
        originalContent: "Worker auth: session boundary vs permissions",
        sourceLocale: "en",
      },
    },
  ],
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
  posts: [
    {
      id: "question",
      topicId,
      authorId: "alex",
      authorName: "Alex Rivera",
      createdAt: new Date("2026-09-27T10:00:00Z"),
      body: {
        id: "post-r1",
        originalContent: "I want strong typing without coupling the whole app to one HTTP library.",
        sourceLocale: "en",
      },
    },
    {
      id: "answer",
      topicId,
      authorId: "sam",
      authorName: "Sam Chen",
      createdAt: new Date("2026-09-27T11:00:00Z"),
      body: {
        id: "post-r2",
        originalContent: "Separate the HTTP layer from domain types so each boundary can be tested independently.",
        sourceLocale: "en",
      },
    },
    {
      id: "followup",
      topicId,
      authorId: "maya",
      authorName: "Maya Cohen",
      createdAt: new Date("2026-09-27T12:00:00Z"),
      body: {
        id: "post-r3",
        originalContent: "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
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

function homepageCategories(locale: "en" | "he"): HomepageCategoryOverview[] {
  const rtl = locale === "he";
  const names = rtl
    ? [
        "עזרה ופתרונות",
        "Vibe Coding וכלי AI",
        "פיתוח",
        "Deploy ותשתיות",
        "פרויקטים וביקורות",
        "קהילה",
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
      homepageTopic(`${id}-pinned-1`, rtl ? "כללי המדור ומשאבים שימושיים" : "Section guide and useful resources", "Vico Team", "2026-09-29T09:30:00.000Z"),
      homepageTopic(`${id}-pinned-2`, rtl ? "לפני שפותחים נושא חדש" : "Before you open a new topic", "Maya Cohen", "2026-09-28T14:00:00.000Z"),
      homepageTopic(`${id}-pinned-3`, rtl ? "אוסף קישורים מומלץ" : "Recommended reference collection", "Sam Chen", "2026-09-27T18:00:00.000Z"),
    ],
    latestTopics: [
      homepageTopic(`${id}-latest-1`, rtl ? "איך לבחור את הגבול הנכון לפתרון?" : "How do I choose the right boundary for this?", "Alex Rivera", "2026-09-30T15:42:00.000Z"),
      homepageTopic(`${id}-latest-2`, rtl ? "מה הדרך הפשוטה לבדוק את זה?" : "What is the simplest way to test this?", "Noa Levi", "2026-09-30T13:15:00.000Z"),
      homepageTopic(`${id}-latest-3`, rtl ? "דוגמה מעשית מפרויקט אמיתי" : "A practical example from a real project", "Sam Chen", "2026-09-29T17:30:00.000Z"),
      homepageTopic(`${id}-latest-4`, rtl ? "האם כדאי לפשט את המבנה?" : "Should this structure be simplified?", "Maya Cohen", "2026-09-28T11:00:00.000Z"),
    ],
  }));
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
  const runtime = useMemo(
    () => previewTranslationRuntime(scenario.locale, scenario.direction),
    [scenario.locale, scenario.direction],
  );
  const router = useMemo(() => previewRouter(scenario), [scenario]);

  useEffect(() => {
    document.documentElement.lang = scenario.locale;
    document.documentElement.dir = scenario.direction;

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
  }, [scenario.locale, scenario.direction]);

  return (
    <HeaderAuthProvider initialUser={previewUser(scenario.identity)}>
      <I18nextProvider i18n={runtime}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </HeaderAuthProvider>
  );
}

function previewRouter(scenario: Scenario) {
  if (scenario.view === "not-found") {
    return createMemoryRouter([{
      path: "*",
      loader: () => {
        throw new Response("Not Found", { status: 404 });
      },
      ErrorBoundary: ForumRouteError,
    }], { initialEntries: [scenario.path] });
  }

  return createMemoryRouter([
    {
      path: "/:locale/under-development",
      element: <PreviewUnderDevelopment locale={scenario.locale} />,
    },
    {
      path: "*",
      element: previewElement(scenario),
    },
  ], { initialEntries: [scenario.path] });
}

function PreviewUnderDevelopment({ locale }: { locale: "en" | "he" }) {
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
    case "under-development":
      return <PreviewUnderDevelopment locale={scenario.locale} />;
    case "category":
      return (
        <CategoryView
          locale={scenario.locale}
          category={
            scenario.id === "category-empty-ltr"
              ? emptyCategory
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
          section={scenario.direction === "rtl" ? sectionRtl : section}
          canCreateTopic
        />
      );
    case "empty":
      return (
        <SectionView
          locale={scenario.locale}
          section={{
            id: "empty",
            name: "New community section",
            category: { id: categoryId, name: "Development" },
            topics: [],
          }}
          canCreateTopic={false}
        />
      );
    case "topic": {
      const data = topicData(scenario.locale, scenario.direction);
      return <TopicView {...data} />;
    }
    case "admin": {
      const data = authorizationData(scenario.locale);
      return <AuthorizationAdminView {...data} />;
    }
    case "not-found":
      throw new Error("not-found is handled by previewRouter");
  }
}

function topicData(locale: "en" | "he", direction: Direction) {
  const rtl = direction === "rtl";
  const translatedTopic = rtl ? {
    ...topic,
    authorName: "נועה לוי",
    section: {
      ...topic.section,
      name: "TypeScript וארכיטקטורה",
      category: { id: categoryId, name: "פיתוח" },
    },
    posts: topic.posts.map((post, index) => ({
      ...post,
      authorName: ["נועה לוי", "יואב כהן", "מאיה כהן"][index]!,
    })),
  } : topic;

  return {
    locale,
    topic: translatedTopic,
    titlePresentation: topicTitlePresentation(rtl),
    postPresentations: postPresentations(rtl),
    generationUnits: [],
    canReply: true,
    canManageSolution: false,
    canCorrectTitleSourceLocale: false,
    correctablePostIds: [],
  };
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
  const userGrants: PermissionKey[] = ["forum.topic.create", "forum.reply.create"];
  const moderatorGrants: PermissionKey[] = [
    ...userGrants,
    "forum.solution.manageAny",
    "forum.sourceLocale.correctAny",
  ];
  const adminGrants: PermissionKey[] = [...PERMISSION_CATALOG];
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
        attribution: "Representative preview data",
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
      attribution: "Representative preview data",
    },
  };
}
