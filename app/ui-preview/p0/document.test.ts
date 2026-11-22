// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rootDocumentLocale } from "../../root-document";
import { createPreviewDocumentAdapter } from "./document";

type Snapshot = Parameters<ReturnType<typeof createPreviewDocumentAdapter>["sync"]>[0];

function state(locale = "en", direction: "ltr" | "rtl" = "ltr"): Snapshot {
  return {
    matches: [
      { route: { id: "root" }, pathname: "/", params: {} },
      { route: { id: "routes/locale-boundary" }, pathname: "/" + locale, params: { locale } },
      {
        route: { id: "routes/topic" },
        pathname: "/" + locale + "/topics/sample",
        params: { locale, topicId: "sample" },
      },
    ],
    loaderData: {
      "routes/locale-boundary": {
        locale: {
          translationLocale: locale,
          direction,
        },
      },
      "routes/topic": { topic: { id: "sample" } },
    },
    location: { pathname: "/" + locale + "/topics/sample", search: "", hash: "", state: null, key: "fixture" },
    errors: null,
  } as unknown as Snapshot;
}

function modules() {
  return new Map<string, Record<string, unknown>>([
    ["root", {
      links: () => [{ rel: "stylesheet", href: "/shared.css" }],
      meta: () => [{ title: "Parent title" }, { name: "parent-only", content: "ignored" }],
    }],
    ["routes/locale-boundary", {
      links: () => [{ rel: "icon", href: "/favicon.ico" }],
    }],
    ["routes/topic", {
      meta: ({ data, params }: { data: unknown; params: { topicId?: string } }) => {
        expect(data).toEqual({ topic: { id: "sample" } });
        expect(params.topicId).toBe("sample");
        return [
          { title: "Topic title" },
          { name: "description", content: "Topic page" },
          { tagName: "link", rel: "canonical", href: "/en/topics/sample" },
        ];
      },
    }],
  ]);
}

beforeEach(() => {
  document.head.innerHTML = "<title>Fallback document</title>";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

afterEach(() => {
  document.head.innerHTML = "";
});

describe("shared Framework root document mapping", () => {
  it("keeps the exact production locale resolution for raw and nested snapshots", () => {
    expect(rootDocumentLocale([])).toEqual({ lang: "en", dir: "ltr" });
    expect(rootDocumentLocale([{
      loaderData: { locale: { translationLocale: "he", direction: "rtl" } },
    }])).toEqual({ lang: "he", dir: "rtl" });
    expect(rootDocumentLocale([{
      loaderData: { translationLocale: "ru", direction: "ltr" },
    }])).toEqual({ lang: "ru", dir: "ltr" });
  });

  it("applies matched meta and links exports with child meta override, without duplicate head nodes", () => {
    const adapter = createPreviewDocumentAdapter(modules());
    const next = state("he", "rtl");
    adapter.sync(next);
    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.title).toBe("Topic title");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Topic page");
    expect(document.querySelector('meta[name="parent-only"]')).toBeNull();
    expect([...document.querySelectorAll('link[rel="stylesheet"]')].map((node) => node.getAttribute("href")))
      .toEqual(["/shared.css"]);
    expect(document.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe("/favicon.ico");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("/en/topics/sample");

    adapter.sync(next);
    expect(document.querySelectorAll("[data-vico-preview-document]")).toHaveLength(4);
    adapter.dispose();
    expect(document.querySelectorAll("[data-vico-preview-document]")).toHaveLength(0);
    expect(document.title).toBe("Fallback document");
  });

  it("rejects unsupported metadata rather than treating malformed exports as valid", () => {
    const broken = modules();
    broken.set("routes/topic", { meta: () => ({ title: "not-an-array" }) });
    expect(() => createPreviewDocumentAdapter(broken).sync(state())).toThrow(/Invalid route meta export/);
  });
});
