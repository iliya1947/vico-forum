import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { createAuthMailRuntime, type AuthMailEnvironment } from "./auth-mail.server";
import { authMailPurposes, AuthMailValidationError, type AuthMailExecution, type AuthMailPurpose, type AuthMailFetch } from "./auth-mail-contract.server";
import { createFakeAuthMailTransport } from "./auth-mail-transports.server";
import { authMailLocale, authMailOrigin, buildAuthMailActionURL, validateAuthMailActionURL } from "./auth-mail-urls.server";
import { renderAuthMail } from "./auth-mail-templates.server";
import { localeRegistry, InMemoryLocaleRegistry } from "../localization/registry";
import { TranslationResourceLoader } from "../localization/resource-loader";
import { CanonicalEnglishSource, LocalTranslationSource } from "../localization/sources";
import { manualTranslationPacks } from "../localization/manual-packs";
import { registryLoaderContext, uiTranslationStoreContext } from "../localization/request-context";
import { createRequestAuthMailRuntime } from "../../workers/auth-mail";

const origin = "https://forum.example";
const operationId = "12345678-1234-4123-8123-123456789abc";
const resources = new TranslationResourceLoader([
  new LocalTranslationSource(manualTranslationPacks), new CanonicalEnglishSource(),
]);
const localization = async () => ({ registry: localeRegistry, resources });
function action(locale = "en", purpose: AuthMailPurpose = authMailPurposes[0]) {
  return buildAuthMailActionURL(origin, localeRegistry, { purpose, locale, token: "private-token_123" });
}
function input(locale = "en", purpose: AuthMailPurpose = authMailPurposes[0]) {
  return { purpose, locale, recipient: "person@example.com", operationId, actionURL: action(locale, purpose) };
}
function fakeRuntime(overrides: AuthMailEnvironment = {}, execution: AuthMailExecution = "test") {
  const inbox = createFakeAuthMailTransport(execution);
  const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "fake", ...overrides }, {
    execution, localization, fakeTransport: inbox.transport,
  });
  return { runtime, inbox };
}
beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Real egress forbidden"); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("AUTH-01 URL boundary", () => {
  it.each(authMailPurposes)("builds and revalidates the canonical %s action", purpose => {
    const url = buildAuthMailActionURL(origin, localeRegistry, {
      purpose, locale: "ru", token: "eyJhb.opaque-token_123.signature", returnTo: "/ru/topics/example",
    });
    expect(validateAuthMailActionURL(origin, localeRegistry, purpose, "ru", url)).toBe(url);
    const target = new URL(url);
    if (purpose === "email-verification") {
      expect(target.pathname).toBe("/ru/verify-email");
      expect(target.searchParams.get("token")).toBe("eyJhb.opaque-token_123.signature");
      expect(target.searchParams.get("callbackURL")).toBeNull();
      expect(target.searchParams.get("returnTo")).toBe("/ru/topics/example");
    } else {
      const callback = new URL(target.searchParams.get("callbackURL")!);
      expect(callback.origin).toBe(origin);
      expect(callback.searchParams.get("returnTo")).toBe("/ru/topics/example");
    }
  });
  it.each([
    "https://other.example/en", "//other.example/en", "/en\\other", "/ru/topics/1",
    "/en/../evil", "/en/%2e%2e/evil", "/en/%252e%252e/evil", "/en/%25252fother",
    "/en/%0aheader", "/en/%C2%85header", "/en/%E2%80%AEevil", "/en/%ZZ",
    "/en?token=private", "/en?returnTo=https://other.example", "/en#token", "/en/\r\nHeader",
  ])("rejects unsafe return destination %j", returnTo => {
    expect(() => buildAuthMailActionURL(origin, localeRegistry, {
      purpose: "email-verification", locale: "en", token: "token", returnTo,
    })).toThrow(AuthMailValidationError);
  });
  it.each([
    "http://forum.example", "https://user:pass@forum.example", "//forum.example",
    "https://forum.example/a/..", "https://forum.example:444", "https://forum.example?x=1",
    "https://forum.example#x", "https:\\forum.example", "https://forum.example\n",
  ])("rejects unsafe trusted base config %j", base => {
    expect(() => authMailOrigin(base, "production")).toThrow(AuthMailValidationError);
  });
  it("sends verification mail with the bootstrap destination when the requested locale is unavailable", async () => {
    const { runtime } = fakeRuntime();
    const url = await runtime.buildActionURL({
      purpose: "email-verification", locale: "fr", token: "token", returnTo: "/fr/topics/example",
    });
    const fallback = new URL(url);
    expect(fallback.pathname).toBe("/en/verify-email");
    expect(fallback.searchParams.get("returnTo")).toBe("/en");
    expect(validateAuthMailActionURL(origin, localeRegistry, "email-verification", "fr", url)).toBe(url);
    await expect(runtime.sendAuthMail({ ...input(), purpose: "email-verification", locale: "fr", actionURL: url }))
      .resolves.toEqual({ status: "accepted" });
    fallback.searchParams.set("returnTo", "/en/topics/example");
    expect(() => validateAuthMailActionURL(origin, localeRegistry, "email-verification", "fr", fallback.href)).toThrow();
  });

  it("allows loopback HTTP only in explicit local/test execution", () => {
    expect(authMailOrigin("http://localhost:5173", "test")).toBe("http://localhost:5173");
    expect(() => authMailOrigin("http://localhost:5173", "production")).toThrow(AuthMailValidationError);
    expect(() => authMailOrigin("http://evil.example:5173", "test")).toThrow(AuthMailValidationError);
  });
  it("rejects altered origin/path, extra/duplicate/nested query and locale mismatch", () => {
    const url = action();
    for (const altered of [
      url.replace(origin, "https://other.example"), url.replace("/verify-email", "/sign-in/email"),
      `${url}&token=second`, `${url}&redirect=https://other.example`, `${url}#private`,
      url.replace("/en/verify-email", "/en/../en/verify-email"),
      url.replace("/en/verify-email", "/api/auth/verify-email"),
      url.replace("/en/verify-email", "/ru/verify-email"),
      url.replace("returnTo=%2Fen", "returnTo=" + encodeURIComponent("https://other.example")),
      url.replace("returnTo=%2Fen", "returnTo=%2Fru"),
      `${url}&returnTo=%2Fen`,
      `${url}&callbackURL=%2Fen%2Fsign-in`,
    ]) expect(() => validateAuthMailActionURL(origin, localeRegistry, "email-verification", "en", altered))
      .toThrow(AuthMailValidationError);
    expect(() => validateAuthMailActionURL(origin, localeRegistry, "password-reset", "en", url))
      .toThrow(AuthMailValidationError);
  });
});

describe("AUTH-01 templates and locale architecture", () => {
  it("loads only the mail namespace, without loading the general UI catalog", async () => {
    const load = vi.fn(resources.load.bind(resources));
    const locale = authMailLocale("en", localeRegistry);
    await renderAuthMail("email-verification", action(), locale, { load });
    expect(load).toHaveBeenCalledExactlyOnceWith(locale, ["authMail"]);
  });
  it.each(authMailPurposes)("renders HTML/text %s for EN/RU/HE without egress", async purpose => {
    for (const [locale, direction, subject] of [
      ["en", "ltr", /email|password/i], ["ru", "ltr", /Подтвердите|пароля/], ["he", "rtl", /דוא״ל|סיסמה/],
    ] as const) {
      const { runtime, inbox } = fakeRuntime();
      expect(await runtime.sendAuthMail(input(locale, purpose))).toEqual({ status: "accepted" });
      const [mail] = inbox.drain();
      expect(mail.subject).toMatch(subject);
      expect(mail.html).toContain(`lang="${locale}" dir="${direction}"`);
      expect(mail.html).toContain('<bdi dir="ltr">');
      const document = new DOMParser().parseFromString(mail.html, "text/html");
      expect(document.querySelector("a")?.getAttribute("href")).toBe(action(locale, purpose));
      expect(mail.text).toContain(`\u2066${action(locale, purpose)}\u2069`);
      expect(mail.text).not.toContain("<html");
    }
  });
  it("uses registry aliases and English fallback for another registered script, never a fixed locale list", async () => {
    const registry = new InMemoryLocaleRegistry([{
      tag: "ar", translationStatus: "partial", publicationStatus: "active", direction: "rtl",
      fallbackChain: ["en"], nativeName: "العربية",
    }]);
    const locale = authMailLocale("ar", registry);
    const url = buildAuthMailActionURL(origin, registry, { purpose: "email-verification", locale: "ar", token: "token" });
    const mail = await renderAuthMail("email-verification", url, locale, resources);
    expect(mail.subject).toBe("Confirm your email");
    expect(mail.html).toContain('lang="ar" dir="rtl"');
    expect(authMailLocale("iw", localeRegistry).translationLocale).toBe("he");
    expect(authMailLocale("ka", localeRegistry).translationLocale).toBe("en");
    expect(authMailLocale("unknown", localeRegistry).translationLocale).toBe("en");
  });
  it("escapes translated HTML and rejects header injection without reflecting it", async () => {
    const locale = authMailLocale("en", localeRegistry);
    const snapshot = await resources.load(locale, ["authMail"]);
    snapshot.resourcesByLocale.en.authMail.authMailVerifyBody = '<img src=x onerror="attack()"> & text';
    const loader = { load: async () => snapshot };
    const mail = await renderAuthMail("email-verification", action(), locale, loader);
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
    expect(mail.text).toContain('<img src=x onerror="attack()">');
    snapshot.resourcesByLocale.en.authMail.authMailVerifySubject = "Subject\r\nBcc: victim@example.com";
    await expect(renderAuthMail("email-verification", action(), locale, loader)).rejects.toThrow("Invalid authentication mail input");
  });
});

describe("AUTH-01 runtime isolation and safe outcomes", () => {
  it("is dormant by default and performs no localization/auth work", async () => {
    const localize = vi.fn(localization);
    const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin }, { execution: "test", localization: localize });
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "disabled" });
    expect(localize).not.toHaveBeenCalled();
  });
  it.each(["fake", "provider"])("production %s remains disabled even with keys/fixtures", async mode => {
    const providerFetch = vi.fn();
    const inbox = createFakeAuthMailTransport("test");
    const localize = vi.fn(localization);
    const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: mode,
      AUTH_MAIL_PROVIDER: "resend", AUTH_MAIL_RESEND_KEY: "secret-canary" }, {
      execution: "production", localization: localize, fakeTransport: inbox.transport, providerFetch,
    });
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "disabled" });
    expect(providerFetch).not.toHaveBeenCalled();
    expect(localize).not.toHaveBeenCalled();
    expect(inbox.drain()).toEqual([]);
  });
  it("does not silently select fake or live transport on missing/invalid configuration", async () => {
    for (const [env, status] of [
      [{ AUTH_MAIL_MODE: "bogus" }, "rejected"], [{ AUTH_MAIL_MODE: "fake" }, "unavailable"],
      [{ AUTH_MAIL_MODE: "provider", AUTH_MAIL_PROVIDER: "resend" }, "disabled"],
    ] as const) {
      const runtime = createAuthMailRuntime(env, { execution: "test", localization });
      expect(await runtime.sendAuthMail(input())).toEqual({ status });
    }
    const { runtime } = fakeRuntime({ BETTER_AUTH_URL: "https://evil.example/path" });
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "rejected" });
  });
  it.each(["resend", "brevo"] as const)("selects only configured %s with an explicit fixture transport", async provider => {
    const providerFetch = vi.fn<AuthMailFetch>(async () => Response.json(provider === "resend" ? { id: "ack" } : { messageId: "ack" }));
    const fake = { send: vi.fn() };
    const env = { BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "provider", AUTH_MAIL_PROVIDER: provider,
      AUTH_MAIL_FROM_ADDRESS: "auth@example.com", AUTH_MAIL_RESEND_KEY: "resend-canary", AUTH_MAIL_BREVO_KEY: "brevo-canary" };
    const runtime = createAuthMailRuntime(env, { execution: "test", localization, providerFetch, fakeTransport: fake });
    // Selection is a request snapshot, not mutable caller state.
    env.AUTH_MAIL_PROVIDER = provider === "resend" ? "brevo" : "resend";
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "accepted" });
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(providerFetch.mock.calls[0]?.[0]).toBe(provider === "resend" ? "https://api.resend.com/emails" : "https://api.brevo.com/v3/smtp/email");
    expect(fake.send).not.toHaveBeenCalled();
  });
  it("rejects bad provider/timeout/key config and does not fall back", async () => {
    for (const overrides of [
      { AUTH_MAIL_PROVIDER: "other" }, { AUTH_MAIL_TIMEOUT_MS: "bad" }, { AUTH_MAIL_TIMEOUT_MS: "0" },
      { AUTH_MAIL_RESEND_KEY: "" }, { AUTH_MAIL_RESEND_KEY: "key\r\nHeader: private" },
    ]) {
      const providerFetch = vi.fn();
      const fake = { send: vi.fn() };
      const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "provider",
        AUTH_MAIL_PROVIDER: "resend", AUTH_MAIL_FROM_ADDRESS: "auth@example.com", AUTH_MAIL_RESEND_KEY: "canary", ...overrides }, {
        execution: "test", localization, providerFetch, fakeTransport: fake,
      });
      expect(await runtime.sendAuthMail(input())).toEqual({ status: "rejected" });
      expect(providerFetch).not.toHaveBeenCalled();
      expect(fake.send).not.toHaveBeenCalled();
    }
  });
  it("reports localization failure safely before any send", async () => {
    const send = vi.fn();
    const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "fake" }, {
      execution: "test", localization: async () => { throw new Error("private db email token"); }, fakeTransport: { send },
    });
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "unavailable" });
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects recipient injection and nonopaque operation identifiers before transport", async () => {
    const { runtime, inbox } = fakeRuntime();
    for (const recipient of ["a@example.com\r\nBcc: victim@example.com", "a@example.com,b@example.com", "Name <a@example.com>", "a..b@example.com"]) {
      expect(await runtime.sendAuthMail({ ...input(), recipient })).toEqual({ status: "rejected" });
    }
    expect(await runtime.sendAuthMail({ ...input(), operationId: "private-token@example.com" })).toEqual({ status: "rejected" });
    expect(inbox.drain()).toEqual([]);
  });
  it("does not forward arbitrary transport fields, raw error or retry a dispatch", async () => {
    const secret = "private-provider-error-with-token";
    const send = vi.fn(async () => ({ status: "accepted" as const, raw: secret, recipient: "private@example.com" }));
    const runtime = createAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "fake" }, {
      execution: "test", localization, fakeTransport: { send },
    });
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "accepted" });
    send.mockRejectedValueOnce(new Error(secret));
    expect(await runtime.sendAuthMail(input())).toEqual({ status: "uncertain" });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("binds request-local fake inboxes without a public debug endpoint", async () => {
    const ctx = new RouterContextProvider();
    const readRegistry = vi.fn(async () => ({ registry: localeRegistry, semanticIdentity: "test", health: { status: "healthy" as const } }));
    ctx.set(registryLoaderContext, readRegistry);
    ctx.set(uiTranslationStoreContext, { readApproved: async () => [], read: async () => undefined });
    const inbox = createFakeAuthMailTransport("test");
    const other = createFakeAuthMailTransport("test");
    const runtime = createRequestAuthMailRuntime({ BETTER_AUTH_URL: origin, AUTH_MAIL_MODE: "fake" }, ctx, "test", { fakeTransport: inbox.transport });
    expect(readRegistry).not.toHaveBeenCalled();
    expect(await runtime.sendAuthMail(input("he"))).toEqual({ status: "accepted" });
    expect(inbox.drain()).toHaveLength(1);
    expect(other.drain()).toEqual([]);
    expect(await fakeRuntime({}, "production").runtime.sendAuthMail(input())).toEqual({ status: "disabled" });
  });
});
