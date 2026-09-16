import { describe, expect, it } from "vitest";
import { compileNamespaceBundle } from "../app/localization/bundles";
import {
  PersistentBundleIntegrityError,
  verifyPersistedCompiledBundle,
} from "./ui-translation-bundle-store";

describe("persisted UI translation bundle verification", () => {
  it("accepts a structurally valid current bundle", async () => {
    const bundle = await compileNamespaceBundle("ru", "common", { heading: "Текущий пакет" });
    await expect(verifyPersistedCompiledBundle(bundle)).resolves.toEqual(bundle);
  });

  it.each([
    ["version mismatch", { bundleVersion: "0".repeat(64) }],
    ["unknown resource", { resources: { unknown: "corrupt" } }],
    ["structured payload", { resources: { heading: { other: "corrupt" } } }],
  ])("rejects a persisted bundle with %s", async (_label, override) => {
    const bundle = await compileNamespaceBundle("ru", "common", { heading: "Текущий пакет" });
    await expect(verifyPersistedCompiledBundle({ ...bundle, ...override }))
      .rejects.toBeInstanceOf(PersistentBundleIntegrityError);
  });
});
