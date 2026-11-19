import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { FiltersView, type FilterListItem } from "./filters-view";

afterEach(() => { cleanup(); window.sessionStorage.clear(); vi.restoreAllMocks(); });
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
const topic: FilterListItem = {
  kind: "topic", id: "topic-1", name: "<script>literal title</script>",
  authorName: "RETAINED_PRIVATE_NAME", authorIdentityKind: "deleted",
  category: { name: "Help" }, section: null, createdAt: "2026-11-18T09:10:11.123Z",
};
const blocked: FilterListItem = {
  kind: "user", id: "user-1", name: "Deleted user", identityKind: "deleted",
  createdAt: "2026-11-18T09:10:11.123Z",
};
function setup(tab: "topics" | "users", action: ({ request }: { request: Request }) => Promise<unknown>,
  actor = "actor-a", viewer: string | null = "actor-a",
  next: { beforeCreatedAt: string; beforeTargetId: string } | null = null,
  readItems: () => FilterListItem[] = () => tab === "topics" ? [topic] : [blocked]) {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: false, addEventListener() {}, removeEventListener() {},
  })) });
  function ListRoute() {
    const snapshot = useLoaderData() as { items: FilterListItem[] };
    return <FiltersView locale="en" actorId={actor} tab={tab} items={snapshot.items} next={next} />;
  }
  const router = createMemoryRouter([{
    path: "/en/filters", loader: () => ({ items: readItems() }), Component: ListRoute,
  }, {
    path: "/en/topics/:topicId", action, element: <div>Public topic</div>,
  }, {
    path: "/en/users/:userId", action, element: <div>Public profile</div>,
  }], { initialEntries: [tab === "users" ? "/en/filters?tab=users" : "/en/filters"] });
  const result = render(<I18nextProvider i18n={runtime()}>
    <HeaderAuthProvider initialUser={viewer ? { id: viewer, name: "Viewer" } : null}>
      <RouterProvider router={router} />
    </HeaderAuthProvider>
  </I18nextProvider>);
  return { router, ...result };
}

describe("personal Filters list presentation", () => {
  it("shows current muted topic titles as text, not retained private author or HTML", async () => {
    const { container } = setup("topics", async () => null, "actor-a", "actor-a", {
      beforeCreatedAt: "2026-11-17T01:02:03.456Z", beforeTargetId: "topic-0",
    });
    expect(await screen.findByRole("heading", { name: "Personal filters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /literal title/i }))
      .toHaveAttribute("href", "/en/topics/topic-1");
    expect(container.innerHTML).not.toContain("<script>");
    expect(container).toHaveTextContent("Deleted user");
    expect(container.innerHTML).not.toContain("RETAINED_PRIVATE_NAME");
    expect(screen.getByRole("link", { name: "Older filters" }).getAttribute("href"))
      .toContain("beforeTargetId=topic-0");
  });

  it("requires a confirmed Block undo and authoritative list absence before hiding the row", async () => {
    let blockedInStore = true;
    const submissions: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      submissions.push(Object.fromEntries((await request.formData()).entries()));
      blockedInStore = false;
      return { operation: "userBlock", ok: true, targetId: "user-1", actorId: "actor-a", blocked: false };
    });
    setup("users", action, "actor-a", "actor-a", null, () => blockedInStore ? [blocked] : []);
    fireEvent.click(await screen.findByRole("button", { name: "Unblock user" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(submissions[0]).toEqual({
      intent: "setUserBlock", editorActorId: "actor-a", blocked: "false",
    });
    await waitFor(() => expect(screen.queryByRole("link", { name: "Deleted user" })).not.toBeInTheDocument());
  });

  it("keeps row after uncertain response and never resends POST on refresh", async () => {
    const action = vi.fn(async () => data({ operation: "topicMute", error: "unavailable" }, { status: 503 }));
    setup("topics", action);
    fireEvent.click(await screen.findByRole("button", { name: "Unmute topic" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Removal not confirmed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /literal title/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh filters" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("does not expose actor A's private rows to a different HeaderAuth identity", async () => {
    setup("users", async () => null, "actor-a", "actor-b");
    expect(await screen.findByText("Personal filters are refreshing.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deleted user" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unblock user" })).not.toBeInTheDocument();
  });

  it.each(["topics", "users"] as const)(
    "shows a freshly re-added %s row when an older Undo ACK arrives after a fresh loader snapshot",
    async tab => {
      const original: FilterListItem = tab === "topics" ? topic : blocked;
      const newCreatedAt = "2026-11-19T17:45:13.327Z";
      const linkName = tab === "topics" ? /literal title/i : "Deleted user";
      const undoName = tab === "topics" ? "Unmute topic" : "Unblock user";
      let stored: FilterListItem | null = original;
      let release!: (value: unknown) => void;
      const ack = new Promise<unknown>(resolve => { release = resolve; });
      const action = vi.fn(async () => {
        stored = null; // the old canonical Remove has committed on the server
        return ack; // its network response is delayed
      });
      const { router } = setup(tab, action, "actor-a", "actor-a", null,
        () => stored ? [stored] : []);
      fireEvent.click(await screen.findByRole("button", { name: undoName }));
      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("button", { name: "Removing filter…" })).toBeDisabled();

      // Another session re-adds the same actor + target before old ACK settles.
      // The row's React key stays identical; only its authoritative creation changes.
      stored = { ...original, createdAt: newCreatedAt };
      await act(async () => { await router.revalidate(); });
      expect(screen.getByRole("link", { name: linkName })).toBeInTheDocument();
      expect(document.querySelector('time[datetime="' + newCreatedAt + '"]')).not.toBeNull();

      await act(async () => release(tab === "topics"
        ? { operation: "topicMute", ok: true, actorId: "actor-a", topicId: original.id, muted: false }
        : { operation: "userBlock", ok: true, actorId: "actor-a", targetId: original.id, blocked: false }));
      await waitFor(() => expect(screen.getByRole("button", { name: undoName })).toBeEnabled());
      expect(screen.getByRole("link", { name: linkName })).toBeInTheDocument();
      expect(document.querySelector('time[datetime="' + newCreatedAt + '"]')).not.toBeNull();
      expect(action).toHaveBeenCalledTimes(1);
    },
  );

});
