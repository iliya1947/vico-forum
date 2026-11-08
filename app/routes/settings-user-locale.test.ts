import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { registryLoaderContext } from "../localization/request-context";
import { InMemoryLocaleRegistry } from "../localization/registry";
import { userLocaleWriterContext } from "../settings/user-locale-context";
import { UserLocaleAccountMissingError, UserLocaleUnavailableError } from "../../db/hyperdrive-user-locale";
import { action, loader } from "./settings-user";

const registry = new InMemoryLocaleRegistry([
  { tag: "ru", translationStatus: "ready", publicationStatus: "active",
    direction: "ltr", fallbackChain: ["en"], nativeName: "Русский" },
  { tag: "he", translationStatus: "ready", publicationStatus: "active",
    direction: "rtl", fallbackChain: ["en"], nativeName: "עברית", aliases: ["iw"] },
  { tag: "fr-CA", translationStatus: "ready", publicationStatus: "active",
    direction: "ltr", fallbackChain: ["en"], nativeName: "Français (Canada)" },
  { tag: "ka", translationStatus: "draft", publicationStatus: "inactive",
    direction: "ltr", fallbackChain: ["en"], nativeName: "ქართული" },
]);

function setup(userId: string | null = "user-one", preferredLocale: string | null = null,
  health: "healthy" | "degraded" = "healthy") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, userId
    ? { user: { id: userId, locale: preferredLocale }, session: { userId } } as AuthSession
    : null);
  context.set(authorizationOwnerContext, undefined);
  context.set(registryLoaderContext, async () => ({
    registry, semanticIdentity: "fixture",
    health: health === "healthy" ? { status: "healthy" as const }
      : { status: "degraded" as const, reason: "unavailable" as const },
  }));
  const save = vi.fn(async (...args: [string, string]) => { void args; });
  context.set(userLocaleWriterContext, { save });
  return { context, save };
}

function request(fields: [string, string][] = [
  ["intent", "save-locale"], ["locale", "ru"], ["expectedUserId", "user-one"],
], origin: string | null = "https://vico.test") {
  return new Request("https://vico.test/en/settings/user", {
    method: "POST",
    headers: origin === null ? undefined : { Origin: origin },
    body: new URLSearchParams(fields),
  });
}

async function rejected(context: RouterContextProvider, body: Request) {
  const response = await action({ request: body, params: { locale: "en" }, context });
  if (response instanceof Response) throw new Error("Unexpected success redirect");
  return { status: response.init?.status, body: response.data, headers: new Headers(response.init?.headers) };
}

describe("SET-03 authoritative account-locale action", () => {
  it("persists only the session actor and redirects to the selected dynamic locale", async () => {
    const { context, save } = setup();
    const response = await action({ request: request([
      ["intent", "save-locale"], ["locale", "fr-CA"], ["expectedUserId", "user-one"],
    ]), params: { locale: "en" }, context });
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(303);
    expect((response as Response).headers.get("Location")).toBe("/fr-CA/settings/user?localeSaved=1");
    expect((response as Response).headers.get("Cache-Control")).toBe("private, no-store");
    expect(save).toHaveBeenCalledExactlyOnceWith("user-one", "fr-CA");
  });

  it("does not let an explicit URL override the saved account preference in the loader", async () => {
    const { context } = setup("user-one", "he");
    const result = await loader({
      request: new Request("https://vico.test/en/settings/user?localeSaved=1"),
      params: { locale: "en" }, context,
    });
    expect(result.data.locale).toBe("en");
    expect(result.data.preferredLocale).toBe("he");
    expect(result.data.localeSaved).toBe(true);
    expect(result.data.availableLocales.map(option => option.tag)).toEqual(["en", "fr-CA", "he", "ru"]);
    expect(result.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
  });

  it("blocks unauthenticated read and write independently", async () => {
    const { context } = setup(null);
    await expect(loader({ request: new Request("https://vico.test/en/settings/user"),
      params: { locale: "en" }, context })).rejects.toMatchObject({ status: 401 });
    await expect(action({ request: request(), params: { locale: "en" }, context }))
      .rejects.toMatchObject({ status: 401 });
  });

  it("rejects a stale account, forged subject and unexpected input before writing", async () => {
    const { context, save } = setup("user-two");
    const mismatch = await rejected(context, request());
    expect(mismatch).toMatchObject({ status: 409, body: { error: "conflict" } });
    const forged = await rejected(context, request([
      ["intent", "save-locale"], ["locale", "ru"], ["expectedUserId", "user-two"],
      ["targetUserId", "user-one"],
    ]));
    expect(forged).toMatchObject({ status: 400, body: { error: "invalid" } });
    const duplicate = await rejected(context, request([
      ["intent", "save-locale"], ["locale", "ru"], ["locale", "he"],
      ["expectedUserId", "user-two"],
    ]));
    expect(duplicate).toMatchObject({ status: 400, body: { error: "invalid" } });
    expect(save).not.toHaveBeenCalled();
  });

  it.each(["ka", "iw", "fr-ca", "not-a-locale", ""] )(
    "rejects inactive, alias, noncanonical, unknown or empty locale %s", async locale => {
      const { context, save } = setup();
      const response = await rejected(context, request([
        ["intent", "save-locale"], ["locale", locale], ["expectedUserId", "user-one"],
      ]));
      expect(response).toMatchObject({ status: 400, body: { error: "invalid" } });
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("fails closed on degraded registry, including bootstrap English", async () => {
    const { context, save } = setup("user-one", null, "degraded");
    const result = await loader({ request: new Request("https://vico.test/en/settings/user"),
      params: { locale: "en" }, context });
    expect(result.data.localeAvailable).toBe(false);
    const response = await rejected(context, request([
      ["intent", "save-locale"], ["locale", "en"], ["expectedUserId", "user-one"],
    ]));
    expect(response).toMatchObject({ status: 503, body: { error: "unavailable" } });
    expect(save).not.toHaveBeenCalled();
  });

  it("enforces same-origin and a POST-only action", async () => {
    const { context, save } = setup();
    const noOrigin = await rejected(context, request(undefined, null));
    expect(noOrigin).toMatchObject({ status: 403, body: { error: "origin" } });
    const foreign = await rejected(context, request(undefined, "https://evil.test"));
    expect(foreign).toMatchObject({ status: 403, body: { error: "origin" } });
    await expect(action({request: new Request("https://vico.test/en/settings/user"),
      params: {locale: "en"}, context})).rejects.toMatchObject({ status: 405 });
    expect(save).not.toHaveBeenCalled();
  });

  it("classifies missing account and storage unavailability without false success", async () => {
    const { context, save } = setup();
    save.mockRejectedValueOnce(new UserLocaleAccountMissingError("gone"));
    expect(await rejected(context, request())).toMatchObject({ status: 409, body: { error: "conflict" } });
    save.mockRejectedValueOnce(new UserLocaleUnavailableError("down"));
    expect(await rejected(context, request())).toMatchObject({ status: 503, body: { error: "unavailable" } });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("preserves unexpected DB/schema failures rather than reporting ordinary denial", async () => {
    const { context, save } = setup();
    save.mockRejectedValueOnce(new Error("missing column"));
    await expect(action({ request: request(), params: {locale: "en"}, context }))
      .rejects.toThrow("missing column");
  });
});
