import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, data, useLoaderData, useParams } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { TopicBookmarkControl, type TopicBookmarkState } from "./topic-bookmark-control";

afterEach(cleanup);

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

function Page() {
  const { topicId } = useParams();
  const { state } = useLoaderData() as { state: TopicBookmarkState };
  return <TopicBookmarkControl key={topicId} topicId={topicId!}
    actorId="actor-a" locale="en" state={state} />;
}

function setup(action: ({ request }: { request: Request }) => Promise<unknown>,
  snapshot: () => TopicBookmarkState = () => "off") {
  const router = createMemoryRouter([{
    path: "/en/topics/:topicId", Component: Page,
    loader: () => ({ state: snapshot() }), action,
  }], { initialEntries: ["/en/topics/topic-1"] });
  render(<I18nextProvider i18n={runtime()}><RouterProvider router={router} /></I18nextProvider>);
  return router;
}

describe("personal Bookmark topic fetcher", () => {
  it.each([
    ["off", "true", "Save topic", "Remove bookmark"],
    ["on", "false", "Remove bookmark", "Save topic"],
  ] as const)("submits exact desired state from %s, without optimistic success or duplicate submission", async (
    initial, desired, startLabel, completedLabel,
  ) => {
    let finish!: (value: unknown) => void;
    const response = new Promise<unknown>(resolve => { finish = resolve; });
    let current: TopicBookmarkState = initial;
    const inputs: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      inputs.push(Object.fromEntries((await request.formData()).entries()));
      const result = await response;
      current = desired === "true" ? "on" : "off"; // committed state reaches the loader
      return result;
    });
    setup(action, () => current);
    const button = await screen.findByRole("button", { name: startLabel });
    fireEvent.click(button);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);
    expect(inputs[0]).toEqual({
      intent: "setTopicBookmark", editorActorId: "actor-a", bookmarked: desired,
    });
    await act(async () => finish({
      operation: "topicBookmark", ok: true, topicId: "topic-1",
      actorId: "actor-a", bookmarked: desired === "true",
    }));
    expect(await screen.findByRole("button", { name: completedLabel }))
      .toHaveAttribute("aria-pressed", desired);
  });

  it.each([
    ["off", "Save topic", true],
    ["on", "Remove bookmark", false],
  ] as const)("keeps newer Bookmark loader state over delayed old successful ACK (%s)", async (
    initial, startLabel, desired,
  ) => {
    let current: TopicBookmarkState = initial;
    let release!: () => void;
    const delayedAck = new Promise<void>(resolve => { release = resolve; });
    const loader = vi.fn(() => current);
    const action = vi.fn(async () => {
      // First writer commits, but its HTTP ACK is held until after a newer own read.
      current = desired ? "on" : "off";
      await delayedAck;
      return {
        operation: "topicBookmark", ok: true, actorId: "actor-a",
        topicId: "topic-1", bookmarked: desired,
      };
    });
    const router = setup(action, loader);
    fireEvent.click(await screen.findByRole("button", { name: startLabel }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const pendingButton = document.querySelector<HTMLButtonElement>(
      ".topic-bookmark-control button[type='submit']",
    );
    expect(pendingButton).toBeDisabled();

    // A second legitimate writer restores the initial pair state.
    // The newer loader GET completes while the first writer's ACK is still pending.
    current = initial;
    const readsBefore = loader.mock.calls.length;
    await act(async () => { await router.revalidate(); });
    expect(loader.mock.calls.length).toBeGreaterThan(readsBefore);
    expect(pendingButton).toHaveAttribute("aria-pressed", String(initial === "on"));

    await act(async () => { release(); });
    expect(await screen.findByRole("button", { name: startLabel }))
      .toHaveAttribute("aria-pressed", String(initial === "on"));
    expect(action).toHaveBeenCalledTimes(1); // No implicit write replay.
  });

  it("does not interpret an uncertain 503 as unsaved; refresh only rereads state", async () => {
    let actual: TopicBookmarkState = "off";
    const action = vi.fn(async () => data({ operation: "topicBookmark", error: "unavailable" },
      { status: 503 }));
    setup(action, () => actual);
    fireEvent.click(await screen.findByRole("button", { name: "Save topic" }));
    expect(await screen.findByText("Bookmark status is unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save topic" })).not.toBeInTheDocument();
    actual = "on";
    fireEvent.click(screen.getByRole("button", { name: "Refresh bookmark status" }));
    expect(await screen.findByRole("button", { name: "Remove bookmark" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not carry a late response into the next topic's control", async () => {
    let finish!: (value: unknown) => void;
    const response = new Promise<unknown>(resolve => { finish = resolve; });
    const action = vi.fn(async () => response);
    const router = setup(action);
    fireEvent.click(await screen.findByRole("button", { name: "Save topic" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await act(async () => { await router.navigate("/en/topics/topic-2"); });
    expect(await screen.findByRole("button", { name: "Save topic" }))
      .toHaveAttribute("aria-pressed", "false");
    await act(async () => finish({
      operation: "topicBookmark", ok: true, topicId: "topic-1", actorId: "actor-a", bookmarked: true,
    }));
    expect(screen.getByRole("button", { name: "Save topic" })).toHaveAttribute("aria-pressed", "false");
  });
});
