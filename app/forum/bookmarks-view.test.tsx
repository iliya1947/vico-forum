import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { BookmarksView } from "./bookmarks-view";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function runtime() {
  const common = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, typeof descriptor.source === "string" ? descriptor.source : ""]));
  return createTranslationRuntime({
    locale: { translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } },
    bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

const items = [{
  id: "topic-1", title: "<script>literal title</script>", authorName: "RETAINED_PRIVATE_NAME",
  authorIdentityKind: "deleted" as const, category: { name: "Help" },
  section: null, savedAt: "2026-11-18T09:10:11.123Z",
}];

function setup(action: ({ request }: { request: Request }) => Promise<unknown>,
  initialPath = "/en/bookmarks", next: { beforeSavedAt: string; beforeTopicId: string } | null = null,
  authenticated = true) {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: false, addEventListener() {}, removeEventListener() {},
  })) });
  const router = createMemoryRouter([{
    path: "/en/bookmarks",
    element: <BookmarksView locale="en" actorId="actor-a" items={items} next={next} />,
  }, {
    path: "/en/topics/:topicId", element: <div>Opened topic</div>, action,
  }], { initialEntries: [initialPath] });
  const result = render(<I18nextProvider i18n={runtime()}>
    <HeaderAuthProvider initialUser={authenticated ? { id: "actor-a", name: "Ada" } : null}>
      <RouterProvider router={router} />
    </HeaderAuthProvider>
  </I18nextProvider>);
  return { router, ...result };
}

describe("private Bookmarks presentation", () => {
  it("renders private links, neutral deleted author, current title as text, and keyset navigation", async () => {
    const { container } = setup(async () => null, "/en/bookmarks", {
      beforeSavedAt: "2026-11-17T01:02:03.456Z", beforeTopicId: "topic-0",
    });
    expect(await screen.findByRole("heading", { name: "Saved topics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /literal title/i })).toHaveAttribute("href", "/en/topics/topic-1");
    expect(container.innerHTML).not.toContain("<script>");
    expect(container).toHaveTextContent("Deleted user");
    expect(container.innerHTML).not.toContain("RETAINED_PRIVATE_NAME");
    expect(screen.getByRole("link", { name: "Older bookmarks" }).getAttribute("href"))
      .toContain("beforeTopicId=topic-0");
    expect(screen.getByRole("link", { name: "Bookmarks" })).toHaveAttribute("href", "/en/bookmarks");
  });

  it("keeps the row on an unconfirmed failure and does not retry the write on refresh", async () => {
    const action = vi.fn(async () => data({ operation: "topicBookmark", error: "unavailable" }, { status: 503 }));
    setup(action);
    fireEvent.click(await screen.findByRole("button", { name: "Remove bookmark" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Bookmark removal was not confirmed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /literal title/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh bookmarks" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("removes the row only after the exact actor, topic and desired OFF are confirmed", async () => {
    const submissions: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      submissions.push(Object.fromEntries((await request.formData()).entries()));
      return { operation: "topicBookmark", ok: true, topicId: "topic-1",
        actorId: "actor-a", bookmarked: false };
    });
    setup(action);
    fireEvent.click(await screen.findByRole("button", { name: "Remove bookmark" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(submissions[0]).toEqual({
      intent: "setTopicBookmark", editorActorId: "actor-a", bookmarked: "false",
    });
    await waitFor(() => expect(screen.queryByRole("link", { name: /literal title/i })).not.toBeInTheDocument());
  });

  it("shows no personal Bookmarks navigation for a guest", async () => {
    setup(async () => null, "/en/bookmarks", null, false);
    await screen.findByRole("heading", { name: "Saved topics" });
    expect(screen.queryByRole("link", { name: "Bookmarks" })).not.toBeInTheDocument();
  });
});
