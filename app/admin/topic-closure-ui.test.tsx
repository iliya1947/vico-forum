import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { manualTranslationPacks } from "../localization/manual-packs";
import { sourceFingerprint } from "../localization/fingerprint";
import type { ForumTopicPage } from "../../db/forum-repository";
import { TopicQuickActions, topicQuickActionDescriptors } from "./quick-actions";

const topic: ForumTopicPage = {
  id: "topic/1", sectionId: "section", authorId: "author", authorName: "Author",
  createdAt: new Date("2026-01-01"), isPinned: false, isSolved: true,
  isClosed: false, closureVersion: 0, bestAnswerPostId: null,
  needsDetails: false, duplicateOf: null, duplicateDisputed: false,
  title: { id: "title-r1", originalContent: "Sample", sourceLocale: "en" },
  section: { id: "section", name: "Section", category: { id: "category", name: "Category" } },
  tags: [], posts: [],
};

const grant = {
  canManagePin: false, canManageClosure: true, canManageAnySolution: false,
  canManageHelpDuplicate: false, canCorrectAnySourceLocale: false,
  canModerateHelpSolution: false,
};
const actor = { id: "closure-actor", name: "Reviewer" };

function i18n() {
  const common: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") common[key] = descriptor.source;
    else for (const [branch, value] of Object.entries(descriptor.source)) common[`${key}_${branch}`] = value;
  }
  return createTranslationRuntime({
    locale: { translationLocale: "en", direction: "ltr", formatting: { locale: "en", timeZone: "UTC" },
      fallbackLocales: [], nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function Page({ expectedActor }: { expectedActor?: string }) {
  const loaded = useLoaderData() as ForumTopicPage;
  return <TopicQuickActions locale="en" inline topic={loaded} actorId={expectedActor}
    {...grant}/>;
}

afterEach(cleanup);

describe("AP-08 shared topic closure Quick actions", () => {
  it("offers exactly the opposite state change only for a closure grant and known actor", () => {
    const open = topicQuickActionDescriptors({ topic, ...grant, actorId: actor.id });
    expect(open).toEqual([{
      key: "closeTopic", intent: "closeTopic", label: "topicClose",
      fields: { expectedClosureVersion: "0", editorActorId: actor.id },
    }]);
    const closed = topicQuickActionDescriptors({
      topic: { ...topic, isClosed: true, closureVersion: 7 }, ...grant, actorId: actor.id,
    });
    expect(closed).toEqual([{
      key: "reopenTopic", intent: "reopenTopic", label: "topicReopen",
      fields: { expectedClosureVersion: "7", editorActorId: actor.id },
    }]);
    expect(topicQuickActionDescriptors({ topic, ...grant, canManageClosure: false, actorId: actor.id })).toEqual([]);
    expect(topicQuickActionDescriptors({ topic, ...grant, actorId: null })).toEqual([]);
    expect(topicQuickActionDescriptors({ topic: { ...topic, isClosed: true, closureVersion: 9, duplicateOf: { id: "original" } },
      ...grant, actorId: actor.id }).map(action => action.intent)).toEqual(["reopenTopic"]);
    // Other consumers may have only a bounded topic projection; that is never closure authority.
    expect(topicQuickActionDescriptors({ topic: { ...topic, isClosed: undefined, closureVersion: undefined },
      ...grant, actorId: actor.id })).toEqual([]);
  });

  it("keeps the canonical inline POST pending and displays the opposite action after success", async () => {
    let snapshot = topic;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const submitted: FormData[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const body = await request.formData();
      submitted.push(body);
      await pending;
      snapshot = { ...snapshot, isClosed: true, closureVersion: 1 };
      return data({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
    });
    const router = createMemoryRouter([{
      path: "/en/topics/:topicId", element: <Page />, loader: () => snapshot, action,
    }], { initialEntries: ["/en/topics/topic%2F1"] });
    try {
      render(<I18nextProvider i18n={i18n()}>
        <HeaderAuthProvider initialUser={actor}><RouterProvider router={router}/></HeaderAuthProvider>
      </I18nextProvider>);
      const close = await screen.findByRole("button", { name: "Close topic" });
      const form = close.closest("form")!;
      expect(form.getAttribute("action")).toBe("/en/topics/topic%2F1");
      expect(form.querySelector<HTMLInputElement>('[name="expectedClosureVersion"]')).toHaveValue("0");
      expect(form.querySelector<HTMLInputElement>('[name="editorActorId"]')).toHaveValue(actor.id);
      expect(form.querySelector<HTMLInputElement>('[name="inlineQuickAction"]')).toHaveValue("1");
      fireEvent.click(close);
      await waitFor(() => expect(close).toBeDisabled());
      fireEvent.click(close);
      expect(action).toHaveBeenCalledTimes(1);
      await act(async () => { release(); });
      expect(await screen.findByRole("button", { name: "Reopen topic" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Close topic" })).not.toBeInTheDocument();
      expect(action).toHaveBeenCalledTimes(1);
      expect(submitted[0]?.get("intent")).toBe("closeTopic");
      expect(submitted[0]?.get("expectedClosureVersion")).toBe("0");
      expect(submitted[0]?.get("editorActorId")).toBe(actor.id);
      expect(router.state.location.pathname).toBe("/en/topics/topic%2F1");
    } finally { router.dispose(); }
  });

  it("refreshes on stale 409 without replay, and discards previous fetcher response after version change", async () => {
    let snapshot = topic;
    const loader = vi.fn(() => snapshot);
    const action = vi.fn(async () => {
      snapshot = { ...snapshot, isClosed: true, closureVersion: 2 };
      return data({ error: "conflict" }, { status: 409 });
    });
    const router = createMemoryRouter([{
      path: "/en/topics/:topicId", element: <Page />, loader, action,
    }], { initialEntries: ["/en/topics/topic%2F1"] });
    try {
      render(<I18nextProvider i18n={i18n()}>
        <HeaderAuthProvider initialUser={actor}><RouterProvider router={router}/></HeaderAuthProvider>
      </I18nextProvider>);
      fireEvent.click(await screen.findByRole("button", { name: "Close topic" }));
      expect(await screen.findByRole("button", { name: "Reopen topic" })).toBeEnabled();
      expect(loader.mock.calls.length).toBeGreaterThan(1);
      expect(action).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("The topic's status changed. Review the latest state before trying again.")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reopen topic" }).closest("form")
        ?.querySelector<HTMLInputElement>('[name="expectedClosureVersion"]')).toHaveValue("2");
    } finally { router.dispose(); }
  });

  it("isolates closure controls from an old admin actor expectation", async () => {
    const router = createMemoryRouter([{
      path: "*", element: <Page expectedActor="stale-actor" />, loader: () => topic,
    }], { initialEntries: ["/en/admin/forum/topics/id"] });
    try {
      render(<I18nextProvider i18n={i18n()}>
        <HeaderAuthProvider initialUser={actor}><RouterProvider router={router}/></HeaderAuthProvider>
      </I18nextProvider>);
      expect(screen.queryByRole("button", { name: "Close topic" })).not.toBeInTheDocument();
    } finally { router.dispose(); }
  });

  it("keeps all new EN/RU/HE values aligned with reviewed source fingerprints", async () => {
    const keys = [
      "topicClosedStatus", "topicClosedNotice", "topicClose", "topicReopen",
      "topicClosureConflict", "topicClosureDenied", "topicClosureFailed", "topicClosureSaved",
      "topicReplyPaused", "topicReplyUnavailable",
    ] as const;
    for (const key of keys) {
      const descriptor = canonicalEnglishCatalog.common[key];
      const hash = await sourceFingerprint(descriptor);
      for (const locale of ["ru", "he"] as const) {
        expect(manualTranslationPacks[locale]?.common?.[key]?.sourceFingerprint).toBe(hash);
        expect(manualTranslationPacks[locale]?.common?.[key]?.value).toEqual(expect.any(String));
      }
    }
  });
});
