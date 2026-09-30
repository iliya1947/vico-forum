import { useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter } from "react-router";

import { HeaderAuthProvider, type HeaderAuthUser } from "../auth/auth-controls";
import { PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { AuthorizationAdminView } from "../authorization/admin-view";
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
type PreviewView = "home" | "category" | "section" | "topic" | "admin" | "empty" | "not-found";

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
  { id: "category-ltr", label: "Category · LTR · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category" },
  { id: "section-ltr", label: "Section · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "topic-ltr", label: "Solved topic · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "topic-rtl", label: "Translated topic · RTL · manager", locale: "he", direction: "rtl", identity: "manager", path: "/he/topics/typed-api", view: "topic" },
  { id: "admin-ltr", label: "Authorization · LTR · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin" },
  { id: "empty-ltr", label: "Empty section · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/empty", view: "empty" },
  { id: "not-found-ltr", label: "404 state · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
] as const;

const categoryId = "development";
const sectionId = "typescript";
const topicId = "typed-api";

const category = {
  id: categoryId,
  name: "Development",
  sections: [
    { id: sectionId, name: "TypeScript & architecture", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Cloud & deployment", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Databases", topicCount: 2, postCount: 12 },
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

function previewUser(identity: PreviewIdentity): HeaderAuthUser | null {
  if (identity === "guest") return null;
  if (identity === "manager") return { name: "Maya Cohen", canManageAuthorization: true };
  return { name: "Alex Rivera" };
}

export function PreviewController() {
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const selected = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0]!;
  const src = `?embed=1&scenario=${encodeURIComponent(selected.id)}`;

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

  return createMemoryRouter([{
    path: "*",
    element: previewElement(scenario),
  }], { initialEntries: [scenario.path] });
}

function previewElement(scenario: Scenario) {
  switch (scenario.view) {
    case "home":
      return (
        <HomeView
          locale={scenario.locale}
          categories={[
            { id: categoryId, name: "Development", sectionCount: 3 },
            { id: "tools", name: "AI coding tools", sectionCount: 3 },
            { id: "showcase", name: "Projects & showcase", sectionCount: 2 },
          ]}
        />
      );
    case "category":
      return <CategoryView locale={scenario.locale} category={category} />;
    case "section":
      return (
        <SectionView
          locale={scenario.locale}
          section={section}
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
