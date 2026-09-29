import { useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { Link, RouterProvider, createMemoryRouter } from "react-router";

import { HeaderAuthProvider, type HeaderAuthUser } from "../auth/auth-controls";
import {
  Breadcrumbs,
  EmptyState,
  ForumShell,
} from "../forum/ui";
import {
  PostBodyPresentation,
  TopicTitlePresentation,
} from "../forum/content-translation-view";
import {
  forumCategoryPath,
  forumSectionPath,
  forumTopicPath,
} from "../forum/paths";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { previewTranslationRuntime } from "./preview-i18n";

type Direction = "ltr" | "rtl";
type PreviewIdentity = "guest" | "user" | "manager";

interface Scenario {
  id: string;
  label: string;
  locale: "en" | "he";
  direction: Direction;
  identity: PreviewIdentity;
  path: string;
  view: "home" | "section" | "topic" | "admin" | "states";
}

export const scenarios: readonly Scenario[] = [
  { id: "home-ltr", label: "Home · LTR · guest", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home" },
  { id: "section-ltr", label: "Section · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "topic-ltr", label: "Solved topic · LTR · user", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "topic-rtl", label: "Translated topic · RTL · manager", locale: "he", direction: "rtl", identity: "manager", path: "/he/topics/typed-api", view: "topic" },
  { id: "admin-ltr", label: "Authorization · LTR · manager", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "admin" },
  { id: "states-ltr", label: "Empty + error states · LTR", locale: "en", direction: "ltr", identity: "guest", path: "/en/states", view: "states" },
] as const;

const categoryId = "development";
const sectionId = "typescript";
const topicId = "typed-api";

function previewUser(identity: PreviewIdentity): HeaderAuthUser | null {
  if (identity === "guest") return null;
  if (identity === "manager") {
    return { name: "Maya Cohen", canManageAuthorization: true };
  }
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
  const router = useMemo(
    () => createMemoryRouter([{
      path: "*",
      element: <ScenarioView scenario={scenario} />,
    }], { initialEntries: [scenario.path] }),
    [scenario],
  );

  document.documentElement.lang = scenario.locale;
  document.documentElement.dir = scenario.direction;

  return (
    <HeaderAuthProvider initialUser={previewUser(scenario.identity)}>
      <I18nextProvider i18n={runtime}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </HeaderAuthProvider>
  );
}

function ScenarioView({ scenario }: { scenario: Scenario }) {
  switch (scenario.view) {
    case "home":
      return <HomePreview locale={scenario.locale} />;
    case "section":
      return <SectionPreview locale={scenario.locale} />;
    case "topic":
      return <TopicPreview locale={scenario.locale} direction={scenario.direction} />;
    case "admin":
      return <AdminPreview locale={scenario.locale} />;
    case "states":
      return <StatesPreview locale={scenario.locale} />;
  }
}

function HomePreview({ locale }: { locale: string }) {
  const { t } = useTranslation("common");
  const categories = [
    { id: categoryId, name: "Development", count: 4 },
    { id: "tools", name: "AI coding tools", count: 3 },
    { id: "showcase", name: "Projects & showcase", count: 2 },
  ];

  return (
    <ForumShell locale={locale}>
      <section className="page-heading">
        <p className="eyebrow">{t("forumIndex")}</p>
        <h1>{t("categoriesHeading")}</h1>
        <p>{t("categoriesIntro")}</p>
      </section>
      <ul className="forum-list">
        {categories.map((category) => (
          <li key={category.id}>
            <Link className="forum-list-link" to={forumCategoryPath(locale, category.id)}>
              <strong>{category.name}</strong>
              <span>{t("sectionCount", { count: category.count })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ForumShell>
  );
}

function SectionPreview({ locale }: { locale: string }) {
  const { t } = useTranslation("common");
  const topics = [
    { id: topicId, title: "How should I structure a typed API client?", author: "Alex Rivera", posts: 7 },
    { id: "rtl-markdown", title: "Mixed RTL content with code blocks", author: "Noa Levi", posts: 4 },
    { id: "worker-auth", title: "Worker auth: session boundary vs permissions", author: "Sam Chen", posts: 12 },
  ];

  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: "Development", to: forumCategoryPath(locale, categoryId) },
        { label: "TypeScript & architecture" },
      ]} />
      <section className="page-heading">
        <p className="eyebrow">{t("sectionLabel")}</p>
        <h1>TypeScript & architecture</h1>
      </section>
      <div className="topic-table" role="table" aria-label={t("topicsHeading")}>
        <div className="topic-row topic-table-header" role="row">
          <span role="columnheader">{t("topicColumn")}</span>
          <span role="columnheader">{t("postsColumn")}</span>
        </div>
        {topics.map((topic) => (
          <div className="topic-row" role="row" key={topic.id}>
            <span role="cell">
              <Link to={forumTopicPath(locale, topic.id)}>{topic.title}</Link>
              <small>{t("startedBy", { author: topic.author })}</small>
            </span>
            <span role="cell" className="count-cell">{topic.posts}</span>
          </div>
        ))}
      </div>
      <form className="forum-write-form" onSubmit={(event) => event.preventDefault()}>
        <h2>{t("createTopicHeading")}</h2>
        <label>{t("topicTitleLabel")}<input name="title" defaultValue="" /></label>
        <label>{t("initialPostLabel")}<textarea name="body" rows={7} defaultValue="" /></label>
        <button type="submit">{t("createTopicSubmit")}</button>
      </form>
    </ForumShell>
  );
}

function TopicPreview({ locale, direction }: { locale: "en" | "he"; direction: Direction }) {
  const { t } = useTranslation("common");
  const rtl = direction === "rtl";
  const title = topicTitlePresentation(rtl);
  const posts = postPresentations(rtl);

  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: rtl ? "פיתוח" : "Development", to: forumCategoryPath(locale, categoryId) },
        { label: rtl ? "TypeScript וארכיטקטורה" : "TypeScript & architecture", to: forumSectionPath(locale, sectionId) },
        { label: title.content },
      ]} />
      <section className="page-heading">
        <p className="eyebrow">{t("topicLabel")}</p>
        <TopicTitlePresentation presentation={title} />
        <p>{t("startedBy", { author: rtl ? "נועה לוי" : "Alex Rivera" })}</p>
        <strong className="solved-badge">{t("solved")}</strong>
        <p><a href="#post-answer">{t("goToSolution")}</a></p>
      </section>
      <ol className="post-list">
        {posts.map((post, index) => (
          <li
            id={post.id === "answer" ? "post-answer" : `post-${post.id}`}
            className={`forum-post${post.id === "answer" ? " best-answer" : ""}`}
            key={post.id}
          >
            <header>
              <strong>{post.author}</strong>
              <span>{t("postNumber", { number: index + 1 })}</span>
            </header>
            <div className="forum-post-content">
              {post.id === "answer" && <strong className="best-answer-label">{t("bestAnswer")}</strong>}
              <PostBodyPresentation presentation={post.presentation} />
            </div>
          </li>
        ))}
      </ol>
      <form className="forum-write-form" onSubmit={(event) => event.preventDefault()}>
        <h2>{t("replyHeading")}</h2>
        <label>{t("replyBodyLabel")}<textarea name="body" rows={7} defaultValue="" /></label>
        <button type="submit">{t("replySubmit")}</button>
      </form>
    </ForumShell>
  );
}

function AdminPreview({ locale }: { locale: string }) {
  const { t } = useTranslation("common");
  const permissions = [
    "forum.topic.create",
    "forum.reply.create",
    "forum.solution.manageOwn",
    "forum.translation.generate",
    "access.authorization.manage",
  ];

  return (
    <ForumShell locale={locale}>
      <section className="page-heading"><h1>{t("authorizationHeading")}</h1></section>
      <section>
        <h2>{t("rolesHeading")}</h2>
        <article className="admin-card">
          <h3>Moderator <code>moderator</code> <small>{t("builtInRole")}</small></h3>
          <fieldset>
            <legend>{t("permissionsHeading")}</legend>
            {permissions.map((permission, index) => (
              <label className="permission-row" key={permission}>
                <input type="checkbox" defaultChecked={index < 4} />
                <code>{permission}</code>
              </label>
            ))}
          </fieldset>
          <button type="button">{t("save")}</button>
        </article>
      </section>
      <section>
        <h2>{t("usersHeading")}</h2>
        <article className="admin-card">
          <h3>Maya Cohen <small>maya@example.test</small></h3>
          <div className="admin-inline">
            <label>{t("assignedRole")}<select defaultValue="admin"><option value="user">User</option><option value="admin">Admin</option></select></label>
            <button type="button">{t("save")}</button>
          </div>
          <h4>{t("effectivePermissions")}</h4>
          <ul>{permissions.map((permission) => <li key={permission}><code>{permission}</code></li>)}</ul>
        </article>
      </section>
    </ForumShell>
  );
}

function StatesPreview({ locale }: { locale: string }) {
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <section className="page-heading">
        <p className="eyebrow">Representative states</p>
        <h1>Empty and error presentation</h1>
      </section>
      <EmptyState>{t("topicsEmpty")}</EmptyState>
      <section className="route-state" role="alert">
        <h1>{t("forumNotFoundHeading")}</h1>
        <p>{t("forumNotFoundBody")}</p>
      </section>
    </ForumShell>
  );
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

  return {
    contentType: "topic-title",
    contentId: topicId,
    revisionId: "title-r1",
    selected: "original",
    content: "How should I structure a typed API client?",
    contentLocale: "en",
    contentDirection: "ltr",
    originalContent: "How should I structure a typed API client?",
    originalLocale: "en",
    originalDirection: "ltr",
    fallbackReason: "same-locale",
  };
}

function postPresentations(rtl: boolean): Array<{
  id: string;
  author: string;
  presentation: ContentTranslationPresentation;
}> {
  const answer: ContentTranslationPresentation = rtl
    ? {
        contentType: "post-body",
        contentId: "answer",
        revisionId: "post-r2",
        selected: "translation",
        content: "הפרד בין שכבת ה-HTTP לבין הטיפוסים של הדומיין. כך אפשר לבדוק כל גבול בנפרד.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
        contentLocale: "he",
        contentDirection: "rtl",
        originalContent: "Separate the HTTP layer from domain types so each boundary can be tested independently.",
        originalLocale: "en",
        originalDirection: "ltr",
        provenance: {
          origin: "machine",
          provider: "preview",
          model: "representative",
          attribution: "Representative preview data",
        },
      }
    : {
        contentType: "post-body",
        contentId: "answer",
        revisionId: "post-r2",
        selected: "translation",
        content: "Separate the HTTP layer from domain types so each boundary can be tested independently.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
        contentLocale: "en",
        contentDirection: "ltr",
        originalContent: "הפרידו בין שכבת ה-HTTP לבין הטיפוסים של הדומיין.",
        originalLocale: "he",
        originalDirection: "rtl",
        provenance: {
          origin: "persistent_manual",
          attribution: "Representative preview data",
        },
      };

  const followup: ContentTranslationPresentation = {
    contentType: "post-body",
    contentId: "followup",
    revisionId: "post-r3",
    selected: "original",
    content: rtl
      ? "כדאי גם לבדוק overflow עם מזהה ארוך מאוד: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout"
      : "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
    contentLocale: rtl ? "he" : "en",
    contentDirection: rtl ? "rtl" : "ltr",
    originalContent: rtl
      ? "כדאי גם לבדוק overflow עם מזהה ארוך מאוד: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout"
      : "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
    originalLocale: rtl ? "he" : "en",
    originalDirection: rtl ? "rtl" : "ltr",
    fallbackReason: "same-locale",
  };

  return [
    { id: "question", author: rtl ? "נועה לוי" : "Alex Rivera", presentation: {
      contentType: "post-body",
      contentId: "question",
      revisionId: "post-r1",
      selected: "original",
      content: rtl
        ? "אני רוצה טיפוסים חזקים בלי לקשור את כל האפליקציה לספריית HTTP אחת."
        : "I want strong typing without coupling the whole app to one HTTP library.",
      contentLocale: rtl ? "he" : "en",
      contentDirection: rtl ? "rtl" : "ltr",
      originalContent: rtl
        ? "אני רוצה טיפוסים חזקים בלי לקשור את כל האפליקציה לספריית HTTP אחת."
        : "I want strong typing without coupling the whole app to one HTTP library.",
      originalLocale: rtl ? "he" : "en",
      originalDirection: rtl ? "rtl" : "ltr",
      fallbackReason: "same-locale",
    } },
    { id: "answer", author: rtl ? "יואב כהן" : "Sam Chen", presentation: answer },
    { id: "followup", author: rtl ? "מאיה כהן" : "Maya Cohen", presentation: followup },
  ];
}
