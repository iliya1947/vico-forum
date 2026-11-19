import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, data, useLoaderData, useParams } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { PersonalFilterControl, type PersonalFilterState } from "./personal-filter-control";

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
  const { kind, targetId, viewerId } = useParams();
  const { state } = useLoaderData() as { state: PersonalFilterState };
  return <PersonalFilterControl key={JSON.stringify([kind, targetId, viewerId ?? "actor-a"])}
    kind={kind as "topic" | "user"} targetId={targetId!}
    actorId={viewerId ?? "actor-a"} locale="en" state={state} />;
}
function setup(kind: "topic" | "user", action: ({ request }: { request: Request }) => Promise<unknown>,
  snapshot: () => PersonalFilterState = () => "off") {
  const router = createMemoryRouter([{
    path: "/en/test/:kind/:targetId/:viewerId?", Component: Page, loader: () => ({ state: snapshot() }),
  }, {
    path: "/en/topics/:topicId", action,
  }, {
    path: "/en/users/:userId", action,
  }], { initialEntries: ["/en/test/"+kind+"/item-1"] });
  render(<I18nextProvider i18n={runtime()}><RouterProvider router={router} /></I18nextProvider>);
  return router;
}
describe("Personal Mute/Block controls", () => {
  it.each([
    ["topic", "setTopicMute", "muted", "Mute topic", "Unmute topic"],
    ["user", "setUserBlock", "blocked", "Block user", "Unblock user"],
  ] as const)("confirms %s only after matching actor/target with no optimistic change", async (
    kind, intent, field, startLabel, confirmedLabel,
  ) => {
    let finish!: (response: unknown) => void;
    const response = new Promise<unknown>(resolve => { finish = resolve; });
    let current: PersonalFilterState = "off";
    const submits: Record<string, FormDataEntryValue>[] = [];
    const action = vi.fn(async ({ request }: { request: Request }) => {
      submits.push(Object.fromEntries((await request.formData()).entries()));
      const result = await response;
      current = "on"; // the real server commits before Router revalidates the loader
      return result;
    });
    setup(kind, action, () => current);
    const button = await screen.findByRole("button", { name: startLabel });
    fireEvent.click(button);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);
    expect(submits[0]).toEqual({ intent, editorActorId: "actor-a", [field]: "true" });
    await act(async () => finish(kind === "topic"
      ? { operation: "topicMute", ok: true, actorId: "actor-a", topicId: "item-1", muted: true }
      : { operation: "userBlock", ok: true, actorId: "actor-a", targetId: "item-1", blocked: true }));
    expect(await screen.findByRole("button", { name: confirmedLabel }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("holds an unconfirmed action as unknown, refreshes GET only and never retries the POST", async () => {
    let current: PersonalFilterState = "off";
    const action = vi.fn(async () => data({ operation: "topicMute", error: "unavailable" }, { status: 503 }));
    setup("topic", action, () => current);
    fireEvent.click(await screen.findByRole("button", { name: "Mute topic" }));
    expect(await screen.findByText("Mute status is unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mute topic" })).not.toBeInTheDocument();
    current = "on";
    fireEvent.click(screen.getByRole("button", { name: "Refresh filter status" }));
    expect(await screen.findByRole("button", { name: "Unmute topic" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not transfer a late success to another target", async () => {
    let finish!: (response: unknown) => void;
    const response = new Promise<unknown>(resolve => { finish = resolve; });
    const action = vi.fn(async () => response);
    const router = setup("topic", action);
    fireEvent.click(await screen.findByRole("button", { name: "Mute topic" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await act(async () => { await router.navigate("/en/test/topic/item-2"); });
    expect(await screen.findByRole("button", { name: "Mute topic" }))
      .toHaveAttribute("aria-pressed", "false");
    await act(async () => finish({
      operation: "topicMute", ok: true, actorId: "actor-a", topicId: "item-1", muted: true,
    }));
    expect(screen.getByRole("button", { name: "Mute topic" })).toHaveAttribute("aria-pressed", "false");
  });

  it.each(["topic", "user"] as const)("isolates a late %s success from a different signed-in actor", async kind => {
    let finish!: (response: unknown) => void;
    const delayed = new Promise<unknown>(resolve => { finish = resolve; });
    const action = vi.fn(async () => delayed);
    const router = setup(kind, action);
    fireEvent.click(await screen.findByRole("button", { name: kind === "topic" ? "Mute topic" : "Block user" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await act(async () => { await router.navigate("/en/test/" + kind + "/item-1/actor-b"); });
    const next = await screen.findByRole("button", { name: kind === "topic" ? "Mute topic" : "Block user" });
    expect(next).toHaveAttribute("aria-pressed", "false");
    await act(async () => finish(kind === "topic"
      ? { operation: "topicMute", ok: true, actorId: "actor-a", topicId: "item-1", muted: true }
      : { operation: "userBlock", ok: true, actorId: "actor-a", targetId: "item-1", blocked: true }));
    expect(next).toHaveAttribute("aria-pressed", "false");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("treats a typed Block 503 as unknown, never OFF, and refreshes without replaying POST", async () => {
    let value: PersonalFilterState = "off";
    const action = vi.fn(async () => data({ operation: "userBlock", error: "unavailable" }, { status: 503 }));
    setup("user", action, () => value);
    fireEvent.click(await screen.findByRole("button", { name: "Block user" }));
    expect(await screen.findByText("Block status is unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Block user" })).not.toBeInTheDocument();
    value = "on";
    fireEvent.click(screen.getByRole("button", { name: "Refresh filter status" }));
    expect(await screen.findByRole("button", { name: "Unblock user" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(action).toHaveBeenCalledTimes(1);
  });


  it.each([
    ["topic", "off", "Mute topic", true],
    ["topic", "on", "Unmute topic", false],
    ["user", "off", "Block user", true],
    ["user", "on", "Unblock user", false],
  ] as const)("keeps newer loader authoritative over delayed %s ACK (%s)", async (
    kind, initial, label, desired,
  ) => {
    let current: PersonalFilterState = initial;
    let release!: () => void;
    const delayedAck = new Promise<void>(resolve => { release = resolve; });
    const loader = vi.fn(() => current);
    const action = vi.fn(async () => {
      // First writer commits the requested state; its HTTP ACK is held.
      current = desired ? "on" : "off";
      await delayedAck;
      return kind === "topic"
        ? { operation: "topicMute", ok: true, actorId: "actor-a", topicId: "item-1", muted: desired }
        : { operation: "userBlock", ok: true, actorId: "actor-a", targetId: "item-1", blocked: desired };
    });
    const router = setup(kind, action, loader);
    fireEvent.click(await screen.findByRole("button", { name: label }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Updating filter…" })).toBeDisabled();

    // Another legitimate same-pair writer restores the initial state,
    // then this route sees the newer authoritative GET while old ACK is pending.
    current = initial;
    const before = loader.mock.calls.length;
    await act(async () => { await router.revalidate(); });
    expect(loader.mock.calls.length).toBeGreaterThan(before);
    expect(screen.getByRole("button", { name: "Updating filter…" }))
      .toHaveAttribute("aria-pressed", String(initial === "on"));

    await act(async () => { release(); });
    expect(await screen.findByRole("button", { name: label }))
      .toHaveAttribute("aria-pressed", String(initial === "on"));
    expect(action).toHaveBeenCalledTimes(1); // no implicit retry
  });

});
