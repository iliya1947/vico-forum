import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../../../app/auth/auth-controls";
import { TopicView } from "../../../app/forum/views";
import { canonicalEnglishCatalog } from "../../../app/localization/catalog";
import { createTranslationRuntime } from "../../../app/localization/runtime";
import { EmbeddedPreview, type PreviewIdentity } from "../../../app/ui-preview/preview-app";
import "../../../app/styles.css";

// Real shared presentation; only revision retrieval is a fixed in-memory action.
// No session, database, external auth, uploads or production services are exercised.
const params = new URLSearchParams(location.search);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
const identity: PreviewIdentity = params.get("identity") === "manager" ? "manager"
  : params.get("identity") === "guest" ? "guest" : "user";
document.body.classList.add("ui-preview-embedded");

if (!params.has("history")) {
  createRoot(root).render(<EmbeddedPreview
    scenarioId={params.get("scenario") ?? "home-guest"} identity={identity} />);
} else {
  const locale = params.get("locale") ?? "en";
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  const common: Record<string, string> = {};
  for (const [key, definition] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof definition.source === "string") common[key] = definition.source;
    else for (const [branch, value] of Object.entries(definition.source)) common[`${key}_${branch}`] = value;
  }
  // English labels deliberately stay constant in the history fixture; locale/dir
  // exercise layout and date formatting. Preview exercises actual EN/RU/HE labels.
  const i18n = createTranslationRuntime({
    locale: { translationLocale: "en", direction: document.documentElement.dir === "rtl" ? "rtl" : "ltr",
      fallbackLocales: [], formatting: { locale, timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } },
    bundleVersions: { en: { common: "responsive-fixture" } }, staleKeys: {},
  });
  type Props = ComponentProps<typeof TopicView>;
  const topic: Props["topic"] = {
    id: "responsive-topic", sectionId: "test", authorId: "test-user", authorName: "Test user",
    createdAt: new Date("2026-01-01"), isPinned: false, isSolved: false, bestAnswerPostId: null,
    needsDetails: false, duplicateOf: null, duplicateDisputed: false,
    title: { id: "title-r1", originalContent: "Responsive history", sourceLocale: "en" },
    section: { id: "test", name: "Test section", category: { id: "test-category", name: "Test category" } },
    tags: [], posts: [{ id: "p1", topicId: "responsive-topic", authorId: "test-user", authorName: "Test user",
      createdAt: new Date("2026-01-01"), parentPostId: null,
      solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
      body: { id: "body-r1", originalContent: "Published text", sourceLocale: "en" } }],
  };
  function presentation(contentType: "topic-title" | "post-body", contentId: string,
    revision: { id: string; originalContent: string }): Props["titlePresentation"] {
    return { contentType, contentId, revisionId: revision.id, selected: "original",
      content: revision.originalContent, contentLocale: "en", contentDirection: "ltr",
      originalContent: revision.originalContent, originalLocale: "en", originalDirection: "ltr", fallbackReason: "missing" };
  }
  const raw = "export const identifier = '" + "long_identifier_".repeat(30) + "';\nשלום mixed RTL/LTR\n  exact spacing\n";
  const router = createMemoryRouter([{
    path: `/${locale}/topics/responsive-topic`,
    Component: () => <TopicView locale={locale} topic={topic}
      titlePresentation={presentation("topic-title", topic.id, topic.title)}
      postPresentations={topic.posts.map((post) => presentation("post-body", post.id, post.body))}
      generationUnits={[]} canReply={false} canReadPostHistory canManageSolution={false}
      canCorrectTitleSourceLocale={false} canManagePin={false} topicReadState={null} />,
    action: async ({ request }) => {
      const form = await request.formData();
      if (form.get("intent") !== "readPostHistory") throw new Error("Unexpected fixture action");
      return { operation: "postHistory", postId: "p1", revisions: [0, 1].map((index) => ({
        id: `history-${index}`, authorId: "test-user", authorName: "Test user",
        createdAt: "2026-01-01T00:00:00Z", sourceLocale: "en", originalContent: raw,
      })) };
    },
  }], { initialEntries: [`/${locale}/topics/responsive-topic`] });
  createRoot(root).render(<I18nextProvider i18n={i18n}>
    <HeaderAuthProvider initialUser={{ id: "test-user", name: "Test user" }}>
      <RouterProvider router={router} />
    </HeaderAuthProvider>
  </I18nextProvider>);
}
