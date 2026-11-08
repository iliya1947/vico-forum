import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { hebrewCommonValues, russianCommonValues } from "../localization/manual-values";
import { createTranslationRuntime } from "../localization/runtime";
import SettingsAdministratorRoute, { headers, loader } from "./settings-administrator";

afterEach(() => { cleanup(); window.localStorage.clear(); vi.restoreAllMocks(); });

function environment(accountId: string | null, permissions: readonly string[], owner = "different-owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, accountId ? {
    user: { id: accountId, email: accountId + "@test.invalid", name: accountId },
  } as AuthSession : null);
  context.set(authorizationOwnerContext, owner);
  const has = vi.fn(async (key: string) => permissions.includes(key));
  const forUser = vi.fn(() => ({ has }));
  context.set(authorizationContext, { forUser } as never);
  return { context, has, forUser };
}
const requestLoader = (context: RouterContextProvider, locale = "en") =>
  loader({ context, params: { locale } });

describe("SET-04 Administrator preferences authoritative access", () => {
  it("denies guest and account lacking all current Admin/Attention capabilities, private/no-store", async () => {
    await expect(requestLoader(environment(null, []).context)).rejects.toMatchObject({ status: 401 });
    const actor = environment("member", ["forum.topic.create"]);
    await expect(requestLoader(actor.context)).rejects.toMatchObject({ status: 403 });
    expect(actor.forUser).toHaveBeenCalledWith("member");
    expect(headers()).toEqual({ "Cache-Control": "private, no-store" });
  });

  it("admits Admin-only actor and projects only current permitted destinations", async () => {
    const actor = environment("admin", ["admin.history.read"]);
    const state = await requestLoader(actor.context, "he");
    expect(state.data).toMatchObject({
      accountId: "admin", locale: "he", canViewForum: false,
      adminDestinations: [
        { id: "overview", label: "adminOverview" },
        { id: "history", label: "adminHistory" },
      ],
    });
    expect(state.data.attentionGroups).toEqual({ signals: [], complaints: [], security: [] });
    expect(state.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
  });

  it("admits Attention-only actor without exposing Admin destinations or another complaint group", async () => {
    const actor = environment("reviewer", ["forum.complaint.appeal.review"]);
    const state = await requestLoader(actor.context);
    expect(state.data.adminDestinations).toEqual([]);
    expect(state.data.attentionGroups).toEqual({
      signals: [], complaints: ["group2"], security: [],
    });
    expect(actor.forUser).toHaveBeenCalledWith("reviewer");
  });

  it("admits complaint-settings-only actor without inventing private case-read access", async () => {
    const actor = environment("manager", ["forum.complaint.priority.manage"]);
    const state = await requestLoader(actor.context);
    expect(state.data.canManageComplaintPriorities).toBe(true);
    expect(state.data.adminDestinations).toEqual([]);
    expect(state.data.attentionGroups.complaints).toEqual([]);
  });
});

function localization(locale: "en" | "ru" | "he") {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source]));
  const values = locale === "ru" ? russianCommonValues
    : locale === "he" ? hebrewCommonValues : english;
  const flat = (input: Record<string, unknown>) => Object.fromEntries(Object.entries(input).flatMap(
    ([key, value]) => typeof value === "string" ? [[key, value]] :
      Object.entries(value as Record<string, string>).map(([form, text]) => [key + "_" + form, text]),
  ));
  return createTranslationRuntime({
    locale: {
      translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"],
      direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" }, nativeName: locale, presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: { en: { common: flat(english) }, [locale]: { common: flat(values) } },
    bundleVersions: { en: { common: "test" }, [locale]: { common: "test" } },
    staleKeys: {},
  });
}

describe("SET-04 preferences controls (local-only)", () => {
  it.each(["en", "ru", "he"] as const)("mounts EN/RU/HE authenticated controls in %s", async locale => {
    const router = createMemoryRouter([{
      path: "/:locale/settings/administrator",
      loader: () => ({
        accountId: "alice", locale, canViewForum: false,
        adminDestinations: [{ id: "overview", label: "adminOverview" },
          { id: "users", label: "adminUsers" }],
        attentionGroups: { signals: ["needs-details", "mixed"], complaints: ["group2"], security: [] },
        canManageComplaintPriorities: false,
      }),
      Component: SettingsAdministratorRoute,
    }], { initialEntries: ["/" + locale + "/settings/administrator"] });
    const page = render(<I18nextProvider i18n={localization(locale)}>
      <HeaderAuthProvider initialUser={{ id: "alice", name: "Alice" }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("heading", { name: locale === "ru" ? "Настройки администратора"
      : locale === "he" ? "העדפות מנהל" : "Administrator preferences", level: 2 });
    const entry = page.container.querySelector("#settings-admin-entry")!;
    const density = page.container.querySelector("#settings-admin-density")!;
    await waitFor(() => expect(entry).toHaveValue("overview"));
    await userEvent.selectOptions(entry, "users");
    await userEvent.selectOptions(density, "compact");
    await userEvent.click(page.container.querySelector<HTMLInputElement>("#settings-admin-details")!);
    const raw = window.localStorage.getItem("vico:administrator-preferences:v1:alice");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).adminEntry).toBe("users");
    expect(JSON.parse(raw!).density).toBe("compact");
    expect(JSON.parse(raw!).detailsExpanded).toBe(true);
    expect(page.container.querySelectorAll("main")).toHaveLength(1);
    expect(page.container.querySelectorAll(".settings-panel-nav [aria-current='page']")).toHaveLength(1);
    page.unmount(); router.dispose(); window.localStorage.clear();
  });

  it("disables writing when the mounted Settings loader does not match the header session", async () => {
    const router = createMemoryRouter([{
      path: "/en/settings/administrator", loader: () => ({
        accountId: "alice", locale: "en", canViewForum: false,
        adminDestinations: [{ id: "overview", label: "adminOverview" }],
        attentionGroups: { signals: [], complaints: [], security: [] },
        canManageComplaintPriorities: false,
      }), Component: SettingsAdministratorRoute,
    }], { initialEntries: ["/en/settings/administrator"] });
    const page = render(<I18nextProvider i18n={localization("en")}>
      <HeaderAuthProvider initialUser={{ id: "bob", name: "Bob" }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("heading", { name: "Administrator preferences", level: 2 });
    expect(page.container.querySelector("#settings-admin-entry")).toBeDisabled();
    expect(page.container.querySelector("#settings-admin-density")).toBeDisabled();
    expect(window.localStorage.length).toBe(0);
    page.unmount(); router.dispose();
  });
});
