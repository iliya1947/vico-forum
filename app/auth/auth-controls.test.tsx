import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { AuthClientActions } from "./auth-client";
import {
  AuthControls,
  HeaderAuthProvider,
  safeForumReturnPath,
  type HeaderAuthPresentationState,
} from "./auth-controls";

afterEach(cleanup);

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

function i18n(direction: "ltr" | "rtl") {
  const locale = direction === "ltr" ? "en" : "he";
  const common = canonicalCommonResources();
  return createTranslationRuntime({
    locale: { translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"], direction, formatting: { locale, timeZone: "UTC" }, nativeName: "Test", presentationMetadata: {} },
    fallbackLocales: locale === "en" ? [] : ["en"], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function renderControls(
  initialUser: { name: string } | null,
  actions: AuthClientActions,
  path = "/en/topics/one?from=list",
  direction: "ltr" | "rtl" = "ltr",
  initialPresentationState: HeaderAuthPresentationState = "idle",
) {
  const router = createMemoryRouter([{
    path: "*",
    loader: () => null,
    Component: () => (
      <HeaderAuthProvider
        initialUser={initialUser ? { id: "ada", ...initialUser } : null}
        initialPresentationState={initialPresentationState}
      >
        <AuthControls locale={direction === "ltr" ? "en" : "he"} actions={actions} />
      </HeaderAuthProvider>
    ),
  }], { initialEntries: [path] });
  return render(<div dir={direction}><I18nextProvider i18n={i18n(direction)}><RouterProvider router={router} /></I18nextProvider></div>);
}

function renderServerSnapshotControls(actions: AuthClientActions) {
  let authUser: { name: string } | null = { name: "Ada Lovelace" };
  const router = createMemoryRouter([{
    path: "*",
    loader: () => ({ authUser }),
    Component: () => {
      const data = useLoaderData() as { authUser: { name: string } | null };
      return <HeaderAuthProvider initialUser={data.authUser ? { id: "ada", ...data.authUser } : null}><AuthControls locale="en" actions={actions} /></HeaderAuthProvider>;
    },
  }], { initialEntries: ["/en"] });
  render(<I18nextProvider i18n={i18n("ltr")}><RouterProvider router={router} /></I18nextProvider>);
  return {
    router,
    setAuthUser(value: { name: string } | null) { authUser = value; },
  };
}

function actions(): AuthClientActions {
  return {
    signInWithGoogle: vi.fn(async (_callback, handlers) => handlers.onSuccess()),
    signOut: vi.fn(async (handlers) => handlers.onSuccess()),
  };
}

describe("forum header auth controls", () => {
  it.each(["ltr", "rtl"] as const)("renders guest credential sign-in and registration links in %s", async (direction) => {
    const locale = direction === "ltr" ? "en" : "he";
    renderControls(null, actions(), `/${locale}`, direction);
    expect(await screen.findByRole("link", { name: "Sign in" }))
      .toHaveAttribute("href", `/${locale}/sign-in?returnTo=%2F${locale}`);
    expect(screen.getByRole("link", { name: "Sign up" }))
      .toHaveAttribute("href", `/${locale}/sign-up?returnTo=%2F${locale}`);
    expect(document.querySelector(`[dir="${direction}"]`)).toBeInTheDocument();
  });

  it("exposes compact guest and signed-in presentation states", async () => {
    const guest = renderControls(null, actions());
    expect(await screen.findByRole("link", { name: "Sign in" }))
      .toHaveClass("auth-sign-in");
    expect(document.querySelector(".auth-controls")).toHaveAttribute("data-state", "guest");
    guest.unmount();

    renderControls({ name: "Ada Lovelace" }, actions());
    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toHaveClass("auth-user");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass("auth-sign-out");
    expect(document.querySelector(".auth-controls")).toHaveAttribute("data-state", "signed-in");
  });

  it("supports deterministic pending and failed presentation fixtures", async () => {
    const pending = renderControls(null, actions(), "/en", "ltr", "pending");
    expect(await screen.findByRole("button", { name: "Please wait…" })).toBeDisabled();
    expect(document.querySelector(".auth-controls")).toHaveAttribute("data-state", "pending");
    expect(document.querySelector(".auth-controls")).toHaveAttribute("aria-busy", "true");
    pending.unmount();

    renderControls(null, actions(), "/en", "ltr", "error");
    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication failed. Please try again.");
    expect(document.querySelector(".auth-controls")).toHaveAttribute("data-state", "error");
  });

  it("keeps a safe locale-scoped return destination in credential links", async () => {
    const client = actions();
    renderControls(null, client);
    expect(await screen.findByRole("link", { name: "Sign in" }))
      .toHaveAttribute("href", "/en/sign-in?returnTo=%2Fen%2Ftopics%2Fone%3Ffrom%3Dlist");
    expect(client.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("shows the SSR user and clears authenticated controls after sign-out", async () => {
    const client = actions();
    renderControls({ name: "Ada Lovelace" }, client);
    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ada Lovelace" }))
      .toHaveAttribute("href", "/en/users/ada");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeVisible();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("reconciles the header when revalidation changes the server auth snapshot to guest", async () => {
    const client = actions();
    const { router, setAuthUser } = renderServerSnapshotControls(client);
    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();

    setAuthUser(null);
    await act(async () => { await router.revalidate(); });

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeVisible();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it("disables the control while a request is pending and shows only a safe error", async () => {
    let reject!: () => void;
    const client = actions();
    client.signOut = vi.fn(() => new Promise((_resolve, rejectPromise) => { reject = () => rejectPromise(new Error("raw provider secret")); }));
    renderControls({ name: "Ada Lovelace" }, client);
    const button = await screen.findByRole("button", { name: "Sign out" });
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    expect(document.querySelector(".auth-controls")).toHaveAttribute("data-state", "pending");
    expect(document.querySelector(".auth-controls")).toHaveAttribute("aria-busy", "true");
    await userEvent.click(screen.getByRole("button", { name: "Please wait…" }));
    expect(client.signOut).toHaveBeenCalledTimes(1);
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
