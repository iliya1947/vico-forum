import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { verificationClientActions } from "../auth/auth-client";
import VerifyEmailPage, { loader } from "./verify-email";
import { loader as resendLoader } from "./resend-verification";

const bearer = "private.test.proof";
const path = "/en/verify-email?token=" + bearer + "&returnTo=%2Fen%2Ftopics%2Fone";
function show(url: string) {
  window.history.replaceState(null, "", url);
  const common: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") common[key] = descriptor.source;
  }
  const i18n = createTranslationRuntime({
    locale: { translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
  const router = createMemoryRouter([{ path: "/:locale/verify-email", loader, Component: VerifyEmailPage }],
    { initialEntries: [url] });
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
}
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, "", "/");
});

describe("email verification presentation", () => {
  it("never includes the proof or arbitrary diagnostics in loader data; controls are private", () => {
    const result = loader({ request: new Request("https://forum.test" + path + "&error=PRIVATE"), params: { locale: "en" } });
    expect(result.data).toEqual({ locale: "en", returnTo: "/en/topics/one" });
    expect(JSON.stringify(result.data)).not.toContain(bearer);
    expect(result.init?.headers).toEqual({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" });
    const resend = resendLoader({ request: new Request("https://forum.test/he/resend-verification?returnTo=https://evil.test"),
      params: { locale: "he" } });
    expect(resend.data).toEqual({ locale: "he", returnTo: "/he" });
  });
  it("scrubs the token before inspection and requires an explicit click to confirm", async () => {
    const inspect = vi.spyOn(verificationClientActions, "inspect").mockImplementation(async () => {
      expect(window.location.href).not.toContain(bearer);
      return "ok";
    });
    const confirm = vi.spyOn(verificationClientActions, "confirm").mockResolvedValue("ok");
    show(path);
    const button = await screen.findByRole("button", { name: "Confirm email" });
    expect(inspect).toHaveBeenCalledWith(bearer);
    expect(confirm).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(bearer);
    await userEvent.click(button);
    expect(confirm).toHaveBeenCalledExactlyOnceWith(bearer);
    expect(await screen.findByText("Email confirmed. Sign in to continue.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to sign in" }))
      .toHaveAttribute("href", "/en/sign-in?returnTo=%2Fen%2Ftopics%2Fone");
    expect(window.location.href).not.toContain(bearer);
  });
  it("rejects duplicate tokens without sending any request or exposing either token", async () => {
    const inspect = vi.spyOn(verificationClientActions, "inspect");
    const confirm = vi.spyOn(verificationClientActions, "confirm");
    show(path + "&token=another.private.proof");
    expect(await screen.findByRole("alert")).toHaveTextContent("This confirmation link is invalid or has expired.");
    expect(inspect).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(window.location.search).not.toContain("token");
  });
});
