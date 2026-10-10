import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { HeaderAuthProvider } from "./auth-controls";
import { credentialReturnPath } from "./credential-path";
import { CredentialView } from "./credential-view";
import type { AuthClientActions, EmailAuthActions } from "./auth-client";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function runtime() {
  const common: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") common[key] = descriptor.source;
    else for (const [branch, value] of Object.entries(descriptor.source)) common[`${key}_${branch}`] = value;
  }
  return createTranslationRuntime({
    locale: { translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } },
    bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

function show(mode: "sign-up" | "sign-in", emailActions: EmailAuthActions, googleActions: AuthClientActions) {
  const target = "/en/topics/welcome?from=home";
  const element = <CredentialView locale="en" mode={mode} returnTo={target}
    emailActions={emailActions} googleActions={googleActions} />;
  const router = createMemoryRouter([
    { path: "/en/:mode", element },
    { path: "/en/topics/:id", element: <p>Returned to the topic</p> },
  ], { initialEntries: [`/en/${mode}`] });
  return render(
    <I18nextProvider i18n={runtime()}>
      <HeaderAuthProvider initialUser={null}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>,
  );
}

function actions() {
  const emailActions: EmailAuthActions = {
    signInWithEmail: vi.fn(async () => true),
    signUpWithEmail: vi.fn(async () => true),
  };
  const googleActions: AuthClientActions = {
    signInWithGoogle: vi.fn(async (_returnTo, handlers) => handlers.onSuccess()),
    signOut: vi.fn(async (handlers) => handlers.onSuccess()),
  };
  return { emailActions, googleActions };
}

describe("credential registration and sign-in", () => {
  it("registers name/email/password and returns to the intended forum topic", async () => {
    const a = actions();
    show("sign-up", a.emailActions, a.googleActions);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Display name" }), "  Alice  ");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "alice@example.org");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    expect(screen.getByText("Email verification and password recovery are not available yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(a.emailActions.signUpWithEmail).toHaveBeenCalledWith("Alice", "alice@example.org", "correct horse"));
    expect(await screen.findByText("Returned to the topic")).toBeInTheDocument();
  });

  it("signs in using email, retaining a Google alternative and sign-up navigation", async () => {
    const a = actions();
    show("sign-in", a.emailActions, a.googleActions);
    const user = userEvent.setup();
    expect(screen.getByRole("link", { name: "Need an account? Sign up" }))
      .toHaveAttribute("href", "/en/sign-up?returnTo=%2Fen%2Ftopics%2Fwelcome%3Ffrom%3Dhome");
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(a.googleActions.signInWithGoogle).toHaveBeenCalledWith("/en/topics/welcome?from=home", expect.any(Object));
    await user.type(screen.getByRole("textbox", { name: "Email" }), "alice@example.org");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    await user.click(screen.getByRole("button", { name: "Sign in with email" }));
    await waitFor(() => expect(a.emailActions.signInWithEmail).toHaveBeenCalledWith("alice@example.org", "correct horse"));
    expect(await screen.findByText("Returned to the topic")).toBeInTheDocument();
  });

  it("shows a generic failure without leaking provider errors or navigating", async () => {
    const a = actions();
    a.emailActions.signInWithEmail = vi.fn(async () => { throw new Error("secret from provider"); });
    show("sign-in", a.emailActions, a.googleActions);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Email" }), "wrong@example.org");
    await user.type(screen.getByLabelText("Password"), "incorrect");
    await user.click(screen.getByRole("button", { name: "Sign in with email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign in.");
    expect(screen.queryByText(/secret from provider/)).not.toBeInTheDocument();
    expect(screen.queryByText("Returned to the topic")).not.toBeInTheDocument();
  });
});

describe("credential callback safety", () => {
  it("accepts only relative return paths within the active locale", () => {
    expect(credentialReturnPath("en", "/en/topics/t?from=search")).toBe("/en/topics/t?from=search");
    expect(credentialReturnPath("en", "//evil.example/en")).toBe("/en");
    expect(credentialReturnPath("en", "https://evil.example")).toBe("/en");
    expect(credentialReturnPath("en", "/he/topics/t")).toBe("/en");
    expect(credentialReturnPath("he", "/he/sections/start")).toBe("/he/sections/start");
  });
});
