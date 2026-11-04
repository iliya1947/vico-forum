import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { adminAccess } from "./access";
import { AdminTopicView } from "./topic";
import type { AdminTopic } from "./topic-model";
import { adminSectionPath } from "./forum-paths";
import { forumTopicPath } from "../forum/paths";

const access = adminAccess(new Set(["forum.post.history.read"]));
const topic: AdminTopic = {
  id: "t/עברית", title: { id: "tr", originalContent: "Original", sourceLocale: "he" },
  section: { id: "s/help", name: "Internal", category: { id: "help-solutions", name: "Help" } },
  authorName: "Author", isPinned: false, isSolved: true, bestAnswerPostId: "p3",
  needsDetails: false, duplicateOf: null, duplicateRelationshipId: null,
  posts: ["p1", "p2", "p3"].map((id, index) => ({
    id, authorId: index === 0 ? "author" : "other", authorName: index === 0 ? "Author" : "Other",
    authorImage: null, parentPostId: index === 0 ? null : "p1",
    createdAt: `2026-01-0${index+1}T00:00:00.000Z`, editedAt: null,
    body: { id: `rev-${id}`, originalContent: index === 0 ? "Safe **bold**" : "Reply", sourceLocale: index === 0 ? "en" : "he" },
    solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
    attachments: index === 0 ? [{
      id: "123e4567-e89b-12d3-a456-426614174000", fileName: "image.png", byteSize: 16, detectedType: "png",
    }] : [],
  })),
};
const presentation = (contentId: string, content: string, dir: "ltr" | "rtl") => ({
  contentType: contentId === topic.id ? "topic-title" as const : "post-body" as const,
  contentId, revisionId: "revision",
  selected: "original" as const, content, contentLocale: dir === "rtl" ? "he" : "en",
  contentDirection: dir, originalContent: content, originalLocale: dir === "rtl" ? "he" : "en", originalDirection: dir,
});
let dispose = () => {};
afterEach(() => { cleanup(); dispose(); });

function mount() {
  const values = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, v]) => [key, v.source]));
  const common = Object.fromEntries(Object.entries(values).flatMap(([key, v]) =>
    typeof v === "string" ? [[key, v]] : Object.entries(v as Record<string, string>).map(([kind, text]) => [`${key}_${kind}`, text])));
  const i18n = createTranslationRuntime({
    locale: { translationLocale: "en", direction: "ltr", formatting: { locale: "en", timeZone: "UTC" },
      fallbackLocales: [], nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
  const element = <AdminTopicView locale="en" access={access} topic={topic}
    titlePresentation={presentation(topic.id, "נושא", "rtl")}
    postPresentations={[
      presentation("p1", "Safe **bold**", "ltr"),
      presentation("p2", "Reply", "rtl"), presentation("p3", "Best", "rtl"),
    ]}
    canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
    canCorrectAnySourceLocale={false} canModerateHelpSolution={false} pendingDuplicateAppeal={null}/>;
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: ["/en/admin/forum/topics/t"] });
  dispose = () => router.dispose();
  return render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>).container;
}
describe("AP-07 admin topic presentation", () => {
  it("uses one admin shell, translated title and bounded breadcrumb hierarchy", () => {
    const node = mount();
    expect(node.querySelectorAll("main")).toHaveLength(1);
    expect(node.querySelectorAll("h1")).toHaveLength(1);
    expect(node.querySelector(".admin-topic h2")?.textContent).toBe("נושא");
    expect(node.querySelector(".admin-topic h2")?.getAttribute("dir")).toBe("rtl");
    expect(node.querySelectorAll(".admin-forum-trail a")).toHaveLength(3);
    expect(node.querySelector('.admin-forum-trail a[href*="/sections/"]')?.getAttribute("href"))
      .toBe(adminSectionPath("en", "s/help"));
    expect(node.querySelector('form[action*="/admin/"]')).toBeNull();
  });

  it("keeps canonical post identity and permanent numbering after best-answer promotion", () => {
    const node = mount();
    const posts = [...node.querySelectorAll(".admin-topic .topic-message")];
    expect(posts.map((post) => post.id)).toEqual(["post-p1", "post-p3", "post-p2"]);
    expect(posts.map((post) => post.querySelector(".topic-message-anchor")?.textContent))
      .toEqual(["Message #1", "Message #3", "Message #2"]);
    expect(posts[1]?.querySelector("a.topic-message-parent-link")?.getAttribute("href")).toBe("#post-p1");
    expect(posts[1]?.querySelector("a.topic-message-anchor")?.getAttribute("href"))
      .toBe(forumTopicPath("en", topic.id) + "#post-p3");
    expect(node.querySelector("strong")).not.toBeNull();
  });

  it("reuses safe markdown and canonical attachment membership URLs", () => {
    const node = mount();
    expect(node.querySelector(".topic-message .content-translation-body strong")?.textContent).toBe("bold");
    const href = node.querySelector(".topic-message-attachments a")?.getAttribute("href");
    expect(href).toBe("/api/attachments/file/123e4567-e89b-12d3-a456-426614174000?post=p1&view=inline");
    expect(node.querySelectorAll("script")).toHaveLength(0);
  });
});
