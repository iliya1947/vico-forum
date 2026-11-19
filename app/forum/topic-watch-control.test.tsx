import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, data, useLoaderData, useParams } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { TopicWatchControl, type TopicWatchState } from "./topic-watch-control";

afterEach(cleanup);

function englishRuntime() {
  const common = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, typeof descriptor.source === "string" ? descriptor.source : ""]));
  return createTranslationRuntime({
    locale: {
      translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {},
    },
    fallbackLocales: [], resourcesByLocale: { en: { common } },
    bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function WatchPage() {
  const { topicId } = useParams();
  const { state } = useLoaderData() as { state: TopicWatchState };
  return <TopicWatchControl key={topicId} topicId={topicId!}
    actorId="watcher-1" locale="en" state={state} />;
}

function setup(action: ({ request }: { request: Request }) => Promise<unknown>,
  snapshot: () => TopicWatchState = () => "off") {
  const router = createMemoryRouter([{
    path: "/en/topics/:topicId", Component: WatchPage,
    loader: () => ({ state: snapshot() }), action,
  }], { initialEntries: ["/en/topics/topic-1"] });
  render(<I18nextProvider i18n={englishRuntime()}><RouterProvider router={router} /></I18nextProvider>);
  return router;
}

describe("personal Watch fetcher control", () => {
  it.each([
    ["off", "true", "Watch topic", "Stop watching"],
    ["on", "false", "Stop watching", "Watch topic"],
  ] as const)("submits the exact desired state from %s and waits for server confirmation", async (
    initial, desired, startLabel, completedLabel,
  ) => {
    let finish!: (value: unknown) => void;
    const deferred = new Promise<unknown>(resolve => { finish = resolve; });
    let current: TopicWatchState = initial;
    const submits: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const form = await request.formData();
      submits.push(Object.fromEntries(form.entries()));
      const response = await deferred;
      current = desired === "true" ? "on" : "off"; // committed state reaches the loader
      return response;
    });
    setup(action, () => current);
    const button = await screen.findByRole("button", { name: startLabel });
    fireEvent.click(button);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);
    expect(submits[0]).toEqual({
      intent: "setTopicWatch", editorActorId: "watcher-1", watching: desired,
    });
    await act(async () => finish({
      operation: "topicWatch", ok: true, actorId: "watcher-1",
      topicId: "topic-1", watching: desired === "true",
    }));
    expect(await screen.findByRole("button", { name: completedLabel }))
      .toHaveAttribute("aria-pressed", desired);
  });

  it.each([
    ["off", "Watch topic", true],
    ["on", "Stop watching", false],
  ] as const)("keeps a newer loader snapshot after an old successful Watch ACK (%s)", async (
    initial, startLabel, desired,
  ) => {
    let current: TopicWatchState = initial;
    let release!: () => void;
    const delayedAck = new Promise<void>(resolve => { release = resolve; });
    const loader = vi.fn(() => current);
    const action = vi.fn(async () => {
      // Writer 1 commits, but its HTTP acknowledgement is delayed.
      current = desired ? "on" : "off";
      await delayedAck;
      return {
        operation: "topicWatch", ok: true, actorId: "watcher-1",
        topicId: "topic-1", watching: desired,
      };
    });
    const router = setup(action, loader);
    fireEvent.click(await screen.findByRole("button", { name: startLabel }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const pendingButton = document.querySelector<HTMLButtonElement>(
      ".topic-watch-control button[type='submit']",
    );
    expect(pendingButton).toBeDisabled();

    // Another legitimate writer restores the pair, and Router reads that
    // authoritative value before the older acknowledgement reaches the UI.
    current = initial;
    const readsBefore = loader.mock.calls.length;
    await act(async () => { await router.revalidate(); });
    expect(loader.mock.calls.length).toBeGreaterThan(readsBefore);
    expect(pendingButton).toHaveAttribute("aria-pressed", String(initial === "on"));

    await act(async () => { release(); });
    expect(await screen.findByRole("button", { name: startLabel }))
      .toHaveAttribute("aria-pressed", String(initial === "on"));
    expect(action).toHaveBeenCalledTimes(1); // No implicit mutation replay.
  });

  it("withholds success after an uncertain failure and recovers only from a fresh loader read", async () => {
    let actual: TopicWatchState = "off";
    const action = vi.fn(async () => data({ operation: "topicWatch", error: "unavailable" },
      { status: 503 }));
    setup(action, () => actual);
    fireEvent.click(await screen.findByRole("button", { name: "Watch topic" }));
    expect(await screen.findByText("Watch status is unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop watching" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Watch topic" })).not.toBeInTheDocument();
    actual = "on"; // The server may have committed despite the lost acknowledgement.
    fireEvent.click(screen.getByRole("button", { name: "Refresh watch status" }));
    expect(await screen.findByRole("button", { name: "Stop watching" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(action).toHaveBeenCalledTimes(1); // Refresh never resubmits a write.
  });

  it("does not apply a late topic-1 response to a remounted topic-2 control", async () => {
    let finish!: (value: unknown) => void;
    const deferred = new Promise<unknown>(resolve => { finish = resolve; });
    const action = vi.fn(async () => deferred);
    const router = setup(action);
    fireEvent.click(await screen.findByRole("button", { name: "Watch topic" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await act(async () => { await router.navigate("/en/topics/topic-2"); });
    expect(await screen.findByRole("button", { name: "Watch topic" }))
      .toHaveAttribute("aria-pressed", "false");
    await act(async () => finish({
      operation: "topicWatch", ok: true, actorId: "watcher-1", topicId: "topic-1", watching: true,
    }));
    expect(screen.getByRole("button", { name: "Watch topic" }))
      .toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Stop watching" })).not.toBeInTheDocument();
  });
});
