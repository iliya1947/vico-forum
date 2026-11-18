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
    const inputs: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      inputs.push(Object.fromEntries((await request.formData()).entries()));
      return response;
    });
    setup(action, () => initial);
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
