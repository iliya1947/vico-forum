import { describe, expect, it } from "vitest";
import {
  bundleCacheIdentity,
  compileNamespaceBundle,
  translationBundleEtag,
} from "./bundles";

describe("compiled UI namespace bundles", () => {
  it("produces a deterministic locale/namespace content identity", async () => {
    const first = await compileNamespaceBundle("ru", "common", {
      stageSummary: "Описание",
      heading: "Основа переводов",
    });
    const second = await compileNamespaceBundle("ru", "common", {
      heading: "Основа переводов",
      stageSummary: "Описание",
    });

    expect(first).toEqual(second);
    expect(first.bundleVersion).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(first.resources)).toEqual(["heading", "stageSummary"]);
  });

  it("changes version when locale or current resource content changes", async () => {
    const baseline = await compileNamespaceBundle("ru", "common", { heading: "Перевод" });
    const changedValue = await compileNamespaceBundle("ru", "common", { heading: "Новый перевод" });
    const changedLocale = await compileNamespaceBundle("he", "common", { heading: "Перевод" });

    expect(changedValue.bundleVersion).not.toBe(baseline.bundleVersion);
    expect(changedLocale.bundleVersion).not.toBe(baseline.bundleVersion);
  });

  it("rejects blank locale and unknown resource identities", async () => {
    await expect(compileNamespaceBundle("   ", "common", {})).rejects.toThrow("locale must not be blank");
    await expect(compileNamespaceBundle("ru", "unknown", {})).rejects.toThrow("Unknown canonical namespace");
    await expect(compileNamespaceBundle("ru", "common", { typo: "value" })).rejects.toThrow(
      "Unknown canonical key",
    );
  });

  it("validates resource semantics before publishing a bundle identity", async () => {
    await expect(compileNamespaceBundle("ru", "common", { heading: "<b>unsafe</b>" })).rejects.toThrow(
      "Markup is forbidden",
    );
  });

  it("derives cache and weak semantic ETag identities from the validated bundle version", async () => {
    const bundle = await compileNamespaceBundle("ru", "common", { heading: "Основа переводов" });

    expect(bundleCacheIdentity(bundle.locale, bundle.namespace, bundle.bundleVersion)).toBe(
      JSON.stringify(["vico-ui-bundle-cache-v1", "ru", "common", bundle.bundleVersion]),
    );
    expect(translationBundleEtag(bundle.bundleVersion)).toBe(`W/"vico-ui-${bundle.bundleVersion}"`);
    expect(() => translationBundleEtag("bad")).toThrow("bundle version");
  });
});
