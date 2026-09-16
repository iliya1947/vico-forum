import { describe, expect, it } from "vitest";
import {
  bundleCacheIdentity,
  compileNamespaceBundle,
  translationBundleEtag,
  verifyCompiledNamespaceBundle,
} from "./bundles";

describe("compiled translation bundles", () => {
  it("builds deterministic content identity independent of input key order", async () => {
    const first = await compileNamespaceBundle("ru", "common", {
      stageSummary: "Stage 1 создаёт основу локализации.",
      heading: "Основа переводов",
    });
    const second = await compileNamespaceBundle("ru", "common", {
      heading: "Основа переводов",
      stageSummary: "Stage 1 создаёт основу локализации.",
    });

    expect(first.bundleVersion).toMatch(/^[0-9a-f]{64}$/);
    expect(second.bundleVersion).toBe(first.bundleVersion);
    expect(Object.keys(first.resources)).toEqual(["heading", "stageSummary"]);
  });

  it("changes the bundle version when current resource content changes", async () => {
    const first = await compileNamespaceBundle("he", "common", { heading: "תשתית תרגום" });
    const second = await compileNamespaceBundle("he", "common", { heading: "בסיס תרגום" });
    expect(second.bundleVersion).not.toBe(first.bundleVersion);
  });

  it("expands a structured plural payload into i18next v4 suffix keys", async () => {
    const bundle = await compileNamespaceBundle("ru", "common", {
      sectionCount: {
        one: "{{count}} раздел",
        few: "{{count}} раздела",
        many: "{{count}} разделов",
        other: "{{count}} раздела",
      },
    });

    expect(bundle.resources).toEqual({
      sectionCount_few: "{{count}} раздела",
      sectionCount_many: "{{count}} разделов",
      sectionCount_one: "{{count}} раздел",
      sectionCount_other: "{{count}} раздела",
    });
    await expect(verifyCompiledNamespaceBundle("ru", "common", bundle.resources)).resolves.toEqual(bundle);
  });

  it("rejects incomplete or unknown compiled plural resources", async () => {
    await expect(verifyCompiledNamespaceBundle("ru", "common", {
      sectionCount_one: "{{count}} раздел",
    })).rejects.toThrow(/Missing structured branches/);
    await expect(verifyCompiledNamespaceBundle("ru", "common", {
      sectionCount_one: "{{count}} раздел",
      sectionCount_few: "{{count}} раздела",
      sectionCount_many: "{{count}} разделов",
      sectionCount_other: "{{count}} раздела",
      sectionCount_zero: "{{count}} разделов",
    })).rejects.toThrow(/Unknown compiled resource key/);
  });

  it("rejects unknown keys and invalid translation payloads before persistence", async () => {
    await expect(compileNamespaceBundle("ru", "common", { unknown: "x" })).rejects.toThrow(
      "Unknown canonical key",
    );
    await expect(compileNamespaceBundle("ru", "common", { forumTagline: "<b>unsafe</b>" })).rejects.toThrow(
      "Markup is forbidden",
    );
  });

  it("derives stable cache identity and weak ETag from semantic bundle identity", async () => {
    const bundle = await compileNamespaceBundle("ru", "common", { heading: "Основа переводов" });
    expect(bundleCacheIdentity("ru", "common", bundle.bundleVersion)).toBe(
      JSON.stringify(["vico-ui-bundle-cache-v1", "ru", "common", bundle.bundleVersion]),
    );
    expect(translationBundleEtag(bundle.bundleVersion)).toBe(`W/"vico-ui-${bundle.bundleVersion}"`);
  });

  it("rejects malformed cache versions", () => {
    expect(() => bundleCacheIdentity("ru", "common", "bad")).toThrow(/bundle version/);
    expect(() => translationBundleEtag("bad")).toThrow(/bundle version/);
  });
});
