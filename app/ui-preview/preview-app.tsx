import { useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter, useSearchParams } from "react-router";

import {
  HeaderAuthProvider,
  type HeaderAuthPresentationState,
  type HeaderAuthUser,
} from "../auth/auth-controls";
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
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import { isPreviewLocale, previewTranslationRuntime, type PreviewLocale } from "./preview-i18n";
import { LocaleNavigationProvider } from "../localization/locale-navigation";
import { localeRegistry } from "../localization/registry";

type Direction = "ltr" | "rtl";
type PreviewIdentity = "guest" | "user" | "manager";
type PreviewView = "home" | "category" | "section" | "topic" | "admin" | "empty" | "under-development" | "not-found";

type PreviewVariant =
  | "empty-category"
  | "section-form-error"
  | "topic-reply-error"
  | "topic-unsolved"
  | "topic-tools"
  | "admin-success"
  | "admin-conflict";

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
  { id: "auth-pending", label: "Authentication · pending · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "pending" },
  { id: "auth-error", label: "Authentication · failed · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "error" },
  { id: "under-development-search", label: "Under development · search · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/under-development?feature=search", view: "under-development" },
  { id: "under-development-notifications", label: "Under development · notifications · user", locale: "en", direction: "ltr", identity: "user", path: "/en/under-development?feature=notifications", view: "under-development" },
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
  { id: "not-found", label: "404 state · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
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
      id: "followup",
      topicId,
      authorId: "maya",
      authorName: "Maya Cohen",
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
