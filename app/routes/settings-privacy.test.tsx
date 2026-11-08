import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { hebrewCommonValues, russianCommonValues } from "../localization/manual-values";
import { userPrivacyContext } from "../settings/user-privacy-context";
import { UserPrivacyUnavailableError } from "../../db/hyperdrive-user-privacy";
import { UserPrivacyAccountMissingError } from "../../db/user-privacy";
import routes from "../routes";
import SettingsPrivacyRoute, { action, headers, loader } from "./settings-privacy";

const privacy = {
  read: vi.fn(async () => true),
  save: vi.fn(async () => undefined),
};
function environment(actorId: string | null = "member-a") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId
    ? { user: { id: actorId, name: actorId } } as AuthSession : null);
  context.set(authorizationOwnerContext, undefined);
  context.set(userPrivacyContext, privacy);
  return context;
}
function post(fields: Array<[string, string]> = [
  ["intent", "save-online-visibility"], ["expectedUserId", "member-a"], ["showOnline", "false"],
], origin: string | null = "https://vico.test", method = "POST") {
  const body = new FormData();
  for (const [key, value] of fields) body.append(key, value);
  return new Request("https://vico.test/en/settings/privacy", {
    method, headers: origin ? { Origin: origin } : {},
    ...(method === "POST" ? { body } : {}),
  });
}
function run(request: Request, context = environment()) {
  return action({ request, params: { locale: "en" }, context });
}
function flat(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) =>
    typeof value === "string" ? [[key, value]]
      : Object.entries(value as Record<string, string>).map(([branch, text]) => [`${key}_${branch}`, text])));
}
function translated(locale: "en" | "ru" | "he") {
  const english = flat(Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source])));
  const localeValues = locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : english;
  const i18n = createInstance();
  void i18n.init({
    lng: locale, initAsync: false, defaultNS: "common",
    resources: { en: { common: english }, [locale]: { common: flat(localeValues) } },
  });
  return { i18n, messages: flat(localeValues) };
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  privacy.read.mockResolvedValue(true);
  privacy.save.mockResolvedValue(undefined);
});

describe("SET-06 independently guarded Privacy route", () => {
  it("registers the route and keeps both document and data responses private", async () => {
    const paths = routes.find(route => route.path === ":locale")?.children?.map(child => child.path);
    expect(paths).toContain("settings/privacy");
    expect(headers()["Cache-Control"]).toBe("private, no-store");
    await expect(loader({ request: new Request("https://vico.test/en/settings/privacy"),
      params: { locale: "en" }, context: environment(null) })).rejects.toMatchObject({ status: 401 });
    expect(privacy.read).not.toHaveBeenCalled();
    const result = await loader({ request: new Request("https://vico.test/ru/settings/privacy"),
      params: { locale: "ru" }, context: environment() });
    expect(result.data).toEqual({ locale: "ru", accountId: "member-a", showOnline: true, canViewForum: false });
    expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect(privacy.read).toHaveBeenCalledExactlyOnceWith("member-a");
  });

  it("classifies missing accounts and only known storage failures for reads", async () => {
    const args = { request: new Request("https://vico.test/en/settings/privacy"),
      params: { locale: "en" }, context: environment() };
    privacy.read.mockRejectedValueOnce(new UserPrivacyAccountMissingError());
    await expect(loader(args)).rejects.toMatchObject({ status: 409 });
    privacy.read.mockRejectedValueOnce(new UserPrivacyUnavailableError());
    await expect(loader(args)).rejects.toMatchObject({ status: 503 });
    const bug = new Error("schema error"); privacy.read.mockRejectedValueOnce(bug);
    await expect(loader(args)).rejects.toBe(bug);
  });

  it("saves both explicit boolean values for only the session actor", async () => {
    const off = await run(post());
    expect(off.data).toEqual({ saved: true });
    expect(new Headers(off.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect(privacy.save).toHaveBeenCalledExactlyOnceWith("member-a", false);
    const on = await run(post([
      ["intent", "save-online-visibility"], ["expectedUserId", "member-a"], ["showOnline", "true"],
    ]));
    expect(on.data).toEqual({ saved: true });
    expect(privacy.save).toHaveBeenLastCalledWith("member-a", true);
  });

  it("rejects guest, unsupported verb and wrong or missing Origin before writes", async () => {
    await expect(run(post(), environment(null))).rejects.toMatchObject({ status: 401 });
    await expect(run(post(undefined, "https://vico.test", "PUT"))).rejects.toMatchObject({ status: 405 });
    const foreign = await run(post(undefined, "https://attacker.test"));
    expect(foreign.data).toEqual({ error: "origin" });
    expect(foreign.init?.status).toBe(403);
    expect(new Headers(foreign.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect((await run(post(undefined, null))).data).toEqual({ error: "origin" });
    expect(privacy.save).not.toHaveBeenCalled();
  });

  it("rejects duplicate, omitted, unknown, malformed or forged fields without saving", async () => {
    const required: Array<[string, string]> = [
      ["intent", "save-online-visibility"], ["expectedUserId", "member-a"], ["showOnline", "false"],
    ];
    for (const fields of [
      [...required, ["showOnline", "true"] as [string, string]],
      [...required, ["expectedUserId", "member-b"] as [string, string]],
      [...required, ["intent", "save-online-visibility"] as [string, string]],
      [...required, ["targetUserId", "victim"] as [string, string]],
      required.filter(([key]) => key !== "showOnline"),
      required.filter(([key]) => key !== "intent"),
      required.filter(([key]) => key !== "expectedUserId"),
      required.map(([k, v]) => [k, k === "showOnline" ? "on" : v] as [string, string]),
      required.map(([k, v]) => [k, k === "showOnline" ? "FALSE" : v] as [string, string]),
    ]) {
      const result = await run(post(fields));
      expect(result.init?.status).toBe(400);
      expect(result.data).toEqual({ error: "invalid" });
      expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
    }
    expect(privacy.save).not.toHaveBeenCalled();
    const stale = await run(post(required.map(([k, v]) =>
      [k, k === "expectedUserId" ? "member-b" : v] as [string, string])));
    expect(stale.data).toEqual({ error: "conflict" });
    expect(stale.init?.status).toBe(409);
    expect(privacy.save).not.toHaveBeenCalled();
  });

  it("maps unavailable and deleted-account writes without false success", async () => {
    privacy.save.mockRejectedValueOnce(new UserPrivacyUnavailableError());
    const outage = await run(post());
    expect(outage.data).toEqual({ error: "unavailable" });
    expect(outage.init?.status).toBe(503);
    privacy.save.mockRejectedValueOnce(new UserPrivacyAccountMissingError());
    const stale = await run(post());
    expect(stale.data).toEqual({ error: "conflict" });
    expect(stale.init?.status).toBe(409);
    const bug = new Error("unexpected SQL error");
    privacy.save.mockRejectedValueOnce(bug);
    await expect(run(post())).rejects.toBe(bug);
  });
});

describe("SET-06 account-isolated Privacy UI", () => {
  it.each(["en", "ru", "he"] as const)(
    "renders one localized accessible checkbox and active Privacy navigation in %s", async locale => {
      const { i18n, messages } = translated(locale);
      const router = createMemoryRouter([{
        path: "/:locale/settings/privacy",
        loader: () => ({ locale, accountId: "member-a", showOnline: true, canViewForum: false }),
        Component: SettingsPrivacyRoute,
      }], { initialEntries: [`/${locale}/settings/privacy`] });
      const page = render(<I18nextProvider i18n={i18n}>
        <HeaderAuthProvider initialUser={{ id: "member-a", name: "Member" }}>
          <RouterProvider router={router} />
        </HeaderAuthProvider>
      </I18nextProvider>);
      const toggle = await screen.findByRole("checkbox", { name: messages.settingsPrivacyShowOnline });
      expect(toggle).toBeChecked();
      expect(page.container.querySelectorAll("main")).toHaveLength(1);
      expect(page.container.querySelector('.settings-panel-nav [aria-current="page"]'))
        .toHaveAttribute("href", `/${locale}/settings/privacy`);
      const form = page.container.querySelector<HTMLFormElement>(".settings-privacy-form")!;
      expect(form.querySelectorAll('input[name="showOnline"]')).toHaveLength(1);
      expect(new FormData(form).getAll("showOnline")).toEqual(["true"]);
      await userEvent.click(toggle);
      expect(toggle).not.toBeChecked();
      expect(new FormData(form).getAll("showOnline")).toEqual(["false"]);
      expect(screen.getByText(messages.settingsPrivacyHidden)).toBeVisible();
      page.unmount(); router.dispose();
    },
  );

  it("preserves a same-account draft and resets on an authenticated account switch", async () => {
    const { i18n } = translated("en");
    let accountId = "member-a";
    let showOnline = true;
    const router = createMemoryRouter([{
      path: "/:locale/settings/privacy",
      loader: ({ params }) => ({ locale: params.locale ?? "en", accountId, showOnline, canViewForum: false }),
      Component: SettingsPrivacyRoute,
    }], { initialEntries: ["/en/settings/privacy"] });
    const component = (id: string) => <I18nextProvider i18n={i18n}>
      <HeaderAuthProvider initialUser={{ id, name: id }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>;
    const page = render(component("member-a"));
    const initialToggle = await screen.findByRole("checkbox", { name: "Show me online" });
    const firstForm = page.container.querySelector<HTMLFormElement>(".settings-privacy-form")!;
    await userEvent.click(initialToggle);
    expect(new FormData(firstForm).getAll("showOnline")).toEqual(["false"]);
    await router.navigate("/ru/settings/privacy");
    expect(page.container.querySelector(".settings-privacy-form")).toBe(firstForm);
    expect(new FormData(firstForm).getAll("showOnline")).toEqual(["false"]);

    accountId = "member-b";
    showOnline = false;
    page.rerender(component("member-b"));
    await router.revalidate();
    await waitFor(() => expect(page.container.querySelector(
      '.settings-privacy-form input[name="expectedUserId"]')).toHaveValue("member-b"));
    const secondForm = page.container.querySelector<HTMLFormElement>(".settings-privacy-form")!;
    expect(secondForm).not.toBe(firstForm);
    expect(new FormData(secondForm).getAll("showOnline")).toEqual(["false"]);
    expect(screen.getByRole("checkbox", { name: "Show me online" })).not.toBeChecked();
    page.unmount(); router.dispose();
  });

  it("never exposes or submits an old account draft with a changed header identity", async () => {
    const { i18n } = translated("en");
    const router = createMemoryRouter([{
      path: "/en/settings/privacy",
      loader: () => ({ locale: "en", accountId: "member-a", showOnline: false, canViewForum: false }),
      Component: SettingsPrivacyRoute,
    }], { initialEntries: ["/en/settings/privacy"] });
    const page = render(<I18nextProvider i18n={i18n}>
      <HeaderAuthProvider initialUser={{ id: "member-b", name: "Member B" }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("alert");
    expect(page.container.querySelector(".settings-privacy-form")).toBeNull();
    page.unmount(); router.dispose();
  });
});
