import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ForumRouteError } from "./ui";

afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

function commonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") resources[key] = descriptor.source;
    else {
      for (const [branch, value] of Object.entries(descriptor.source)) {
        resources[`${key}_${branch}`] = value;
      }
    }
  }
  return resources;
}

function i18n() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: commonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function renderError(error: Response | Error, initialUser: { name: string } | null = null, path = "/en/admin/authorization") {
  const router = createMemoryRouter([{
    path: "/:locale/*",
    loader: () => { throw error; },
    ErrorBoundary: ForumRouteError,
  }], { initialEntries: [path] });

  return render(
    <I18nextProvider i18n={i18n()}>
      <HeaderAuthProvider initialUser={initialUser ? { id: "fixture-user", ...initialUser } : null}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>,
  );
}

describe("ForumRouteError", () => {
  it.each([401, 503, 500])("F02 discards email proof on an HTTP %s landing before auth navigation", async status => {
    const path = "/en/settings/account#token=private-proof&purpose=email-change";
    window.history.replaceState(null, "", path);
    renderError(new Response("Private", { status }), null, path);
    await screen.findByText(String(status));
    await waitFor(() => expect(window.location.hash).toBe(""));
    for (const link of document.querySelectorAll("a")) expect(link.href).not.toContain("private-proof");
    expect(document.body.textContent).not.toContain("private-proof");
  });
  it.each([
    [401, "Sign in required", "Sign in to access this page."],
    [403, "Access denied", "You do not have permission to open this page."],
    [404, "Forum page not found", "The category, section, or topic does not exist."],
    [503, "Temporarily unavailable", "This part of Vico Forum is temporarily unavailable. Please try again later."],
  ])("presents HTTP %s with safe status-specific copy and a forum recovery action", async (status, heading, body) => {
    renderError(new Response("internal detail must stay hidden", { status }));

    expect(await screen.findByText(String(status))).toBeVisible();
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByText(body)).toBeVisible();
    expect(screen.queryByText("internal detail must stay hidden")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to forum" })).toHaveAttribute("href", "/en");
  });

  it("keeps unexpected error details hidden behind the generic 500 presentation", async () => {
    renderError(new Error("sensitive implementation detail"));

    expect(await screen.findByText("500")).toBeVisible();
    expect(screen.getByRole("heading", { name: "The forum could not be loaded" })).toBeVisible();
    expect(screen.getByText("Please try again later.")).toBeVisible();
    expect(screen.queryByText("sensitive implementation detail")).not.toBeInTheDocument();
  });
});
