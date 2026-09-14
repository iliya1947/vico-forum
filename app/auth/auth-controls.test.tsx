import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { AuthClientActions } from "./auth-client";
import { AuthControls, HeaderAuthProvider, safeForumReturnPath } from "./auth-controls";

afterEach(cleanup);

function i18n(direction: "ltr" | "rtl") {
  const locale = direction === "ltr" ? "en" : "he";
  const common = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source]));
  return createTranslationRuntime({
    locale: { translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"], direction, formatting: { locale, timeZone: "UTC" }, nativeName: "Test", presentationMetadata: {} },
    fallbackLocales: locale === "en" ? [] : ["en"], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function renderControls(initialUser: { name: string } | null, actions: AuthClientActions, path = "/en/topics/one?from=list", direction: "ltr" | "rtl" = "ltr") {
  const router = createMemoryRouter([{
    path: "*",
    loader: () => null,
    Component: () => <HeaderAuthProvider initialUser={initialUser}><AuthControls locale={direction === "ltr" ? "en" : "he"} actions={actions} /></HeaderAuthProvider>,
  }], { initialEntries: [path] });
  return render(<div dir={direction}><I18nextProvider i18n={i18n(direction)}><RouterProvider router={router} /></I18nextProvider></div>);
}

function actions(): AuthClientActions {
  return {
    signInWithGoogle: vi.fn(async (_callback, handlers) => handlers.onSuccess()),
    signOut: vi.fn(async (handlers) => handlers.onSuccess()),
  };
}

describe("forum header auth controls", () => {
  it.each(["ltr", "rtl"] as const)("renders guest Google sign-in in %s", async (direction) => {
    renderControls(null, actions(), direction === "ltr" ? "/en" : "/he", direction);
    expect(await screen.findByRole("button", { name: "Sign in with Google" })).toBeVisible();
    expect(document.querySelector(`[dir="${direction}"]`)).toBeInTheDocument();
  });

  it("uses Google social sign-in with a local locale-aware callback", async () => {
    const client = actions();
    renderControls(null, client);
    await userEvent.click(await screen.findByRole("button", { name: "Sign in with Google" }));
    expect(client.signInWithGoogle).toHaveBeenCalledWith("/en/topics/one?from=list", expect.any(Object));
  });

  it("shows the SSR user and clears authenticated controls after sign-out", async () => {
    const client = actions();
    renderControls({ name: "Ada Lovelace" }, client);
    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("button", { name: "Sign in with Google" })).toBeVisible();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("disables the control while a request is pending and shows only a safe error", async () => {
    let reject!: () => void;
    const client = actions();
    client.signInWithGoogle = vi.fn(() => new Promise((_resolve, rejectPromise) => { reject = () => rejectPromise(new Error("raw provider secret")); }));
    renderControls(null, client);
    const button = await screen.findByRole("button", { name: "Sign in with Google" });
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Please wait…" }));
    expect(client.signInWithGoogle).toHaveBeenCalledTimes(1);
    reject();
    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication failed. Please try again.");
    expect(screen.queryByText(/raw provider secret/)).not.toBeInTheDocument();
  });
});

describe("safeForumReturnPath", () => {
  it("keeps only local paths inside the canonical locale", () => {
    expect(safeForumReturnPath("en", "/en/sections/one", "?page=2")).toBe("/en/sections/one?page=2");
    expect(safeForumReturnPath("en", "//evil.example/en")).toBe("/en");
    expect(safeForumReturnPath("en", "/fr/topics/one")).toBe("/en");
  });
});
