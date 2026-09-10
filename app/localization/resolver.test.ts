import { describe, expect, it } from "vitest";
import type { LocaleDefinition } from "./locale";
import { InMemoryLocaleRegistry } from "./registry";
import { negotiateLocale, resolveExplicitLocale } from "./resolver";

const fixtures: LocaleDefinition[] = [
  {
    tag: "ru",
    translationStatus: "ready",
    publicationStatus: "active",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "Русский",
  },
  {
    tag: "ar",
    translationStatus: "partial",
    publicationStatus: "active",
    direction: "rtl",
    fallbackChain: ["en"],
    aliases: ["arb"],
    nativeName: "العربية",
  },
  {
    tag: "ka",
    translationStatus: "ready",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "ქართული",
  },
  {
    tag: "de",
    translationStatus: "ready",
    publicationStatus: "disabled",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "Deutsch",
  },
];
const registry = new InMemoryLocaleRegistry(fixtures);

describe("explicit locale resolution", () => {
  it("resolves canonical LTR and RTL locale contexts with explicit formatting inputs", () => {
    const ltr = resolveExplicitLocale(new Request("https://vico.test/ru/"), "ru", registry);
    const rtl = resolveExplicitLocale(new Request("https://vico.test/ar/"), "ar", registry);

    expect(ltr).toMatchObject({
      type: "resolved",
      context: { direction: "ltr", fallbackLocales: ["en"], formatting: { timeZone: "UTC" } },
    });
    expect(rtl).toMatchObject({ type: "resolved", context: { direction: "rtl" } });
  });

  it.each(["RU", "arb", "ar-u-nu-arab"])("permanently canonicalizes active %s", (candidate) => {
    const result = resolveExplicitLocale(
      new Request(`https://vico.test/${candidate}/topic?view=latest`),
      candidate,
      registry,
    );
    const expected = candidate === "RU" ? "ru" : "ar";
    expect(result).toEqual({
      type: "redirect",
      status: 308,
      location: `/${expected}/topic?view=latest`,
    });
  });

  it.each(["unknown", "not_a_tag", "ka", "de"])(
    "temporarily falls back unavailable %s to English",
    (candidate) => {
      const request = new Request(`https://vico.test/${candidate}/topic?view=latest`, {
        headers: { Cookie: "vico_locale=ru", "Accept-Language": "ar" },
      });
      expect(resolveExplicitLocale(request, candidate, registry)).toEqual({
        type: "redirect",
        status: 307,
        location: "/en/topic?view=latest",
      });
    },
  );

  it("applies the same redirect policy to HEAD requests", () => {
    const canonicalizable = resolveExplicitLocale(
      new Request("https://vico.test/RU/topic?view=latest", { method: "HEAD" }),
      "RU",
      registry,
    );
    const unavailable = resolveExplicitLocale(
      new Request("https://vico.test/ka/topic?view=latest", { method: "HEAD" }),
      "ka",
      registry,
    );

    expect(canonicalizable).toEqual({
      type: "redirect",
      status: 308,
      location: "/ru/topic?view=latest",
    });
    expect(unavailable).toEqual({
      type: "redirect",
      status: 307,
      location: "/en/topic?view=latest",
    });
  });

  it("does not implicitly reduce an unregistered locale tag", () => {
    const request = new Request("https://vico.test/ru-RU/topic");
    expect(resolveExplicitLocale(request, "ru-RU", registry)).toEqual({
      type: "redirect",
      status: 307,
      location: "/en/topic",
    });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("fails closed for %s before a locale redirect", (method) => {
    const request = new Request("https://vico.test/RU/topic", { method });
    expect(resolveExplicitLocale(request, "RU", registry)).toEqual({ type: "not-found" });
  });

  it("allows a mutation request for an active canonical locale", () => {
    const request = new Request("https://vico.test/ru/topic", { method: "POST" });
    expect(resolveExplicitLocale(request, "ru", registry)).toMatchObject({ type: "resolved" });
  });
});

describe("root locale negotiation", () => {
  it("uses authenticated, cookie, header, then English priority", () => {
    const request = new Request("https://vico.test/", {
      headers: { Cookie: "vico_locale=ru", "Accept-Language": "ar" },
    });
    expect(negotiateLocale(request, registry, { locale: "ar" })?.translationLocale).toBe("ar");
    expect(negotiateLocale(request, registry)?.translationLocale).toBe("ru");
    expect(
      negotiateLocale(new Request("https://vico.test/", { headers: { "Accept-Language": "ar" } }), registry)
        ?.translationLocale,
    ).toBe("ar");
    expect(negotiateLocale(new Request("https://vico.test/"), registry)?.translationLocale).toBe("en");
  });

  it("respects q priorities and q=0 while treating wildcard as the English default", () => {
    const preferred = new Request("https://vico.test/", {
      headers: { "Accept-Language": "ar;q=0, ru;q=0.7, en;q=0.2" },
    });
    const wildcard = new Request("https://vico.test/", {
      headers: { "Accept-Language": "unknown, *;q=0.9" },
    });
    expect(negotiateLocale(preferred, registry)?.translationLocale).toBe("ru");
    expect(negotiateLocale(wildcard, registry)?.translationLocale).toBe("en");
  });

  it("does not negotiate mutation requests", () => {
    expect(negotiateLocale(new Request("https://vico.test/", { method: "POST" }), registry)).toBeUndefined();
  });
});
