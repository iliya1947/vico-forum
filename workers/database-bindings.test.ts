import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  RuntimeDatabaseBindingConfigurationError,
  resolveRuntimeDatabaseConnectionStrings,
} from "./database-bindings";

describe("runtime database binding routing", () => {
  it("keeps localization and web capabilities on distinct bindings", () => {
    expect(resolveRuntimeDatabaseConnectionStrings({
      HYPERDRIVE: { connectionString: "postgresql://localization" },
      WEB_HYPERDRIVE: { connectionString: "postgresql://web" },
    })).toEqual({
      localizationConnectionString: "postgresql://localization",
      webConnectionString: "postgresql://web",
    });
  });

  it("fails closed instead of falling web traffic back to localization", () => {
    expect(() => resolveRuntimeDatabaseConnectionStrings({
      HYPERDRIVE: { connectionString: "postgresql://localization" },
    })).toThrowError(
      new RuntimeDatabaseBindingConfigurationError("WEB_HYPERDRIVE"),
    );
  });

  it("fails closed instead of falling localization reads back to web", () => {
    expect(() => resolveRuntimeDatabaseConnectionStrings({
      WEB_HYPERDRIVE: { connectionString: "postgresql://web" },
    })).toThrowError(
      new RuntimeDatabaseBindingConfigurationError("HYPERDRIVE"),
    );
  });

  it.each([
    ["HYPERDRIVE", { HYPERDRIVE: { connectionString: " " }, WEB_HYPERDRIVE: { connectionString: "postgresql://web" } }],
    ["WEB_HYPERDRIVE", { HYPERDRIVE: { connectionString: "postgresql://localization" }, WEB_HYPERDRIVE: { connectionString: "" } }],
  ] as const)("rejects a blank %s connection string", (bindingName, env) => {
    try {
      resolveRuntimeDatabaseConnectionStrings(env);
      throw new Error("expected binding resolution to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeDatabaseBindingConfigurationError);
      expect((error as RuntimeDatabaseBindingConfigurationError).bindingName).toBe(bindingName);
    }
  });
});


describe("Worker capability composition", () => {
  const source = readFileSync("workers/app.ts", "utf8");

  it("routes localization-only adapters through localizationConnectionString", () => {
    expect(source).toContain("createHyperdriveRegistryLoader(localizationConnectionString)");
    expect(source).toContain("createHyperdriveUiTranslationStore(localizationConnectionString)");
  });

  it("routes web adapters through webConnectionString", () => {
    expect(source).toContain("createHyperdriveAuthRuntime(webConnectionString");
    expect(source).toContain("createHyperdriveForumReader(webConnectionString)");
    expect(source).toContain("createHyperdriveForumWriter(webConnectionString)");
    expect(source).toContain("createHyperdriveContentTranslationBatchReader(webConnectionString)");
    expect(source).toContain("createHyperdriveAuthorization(webConnectionString)");
  });

  it("keeps database binding lookup fail-closed and content generation disabled", () => {
    expect(source).toContain("resolveRuntimeDatabaseConnectionStrings(env)");
    expect(source).toContain("DISABLED_CONTENT_GENERATION_ACTION_RUNTIME");
    expect(source).not.toContain("env.HYPERDRIVE.connectionString");
    expect(source).not.toContain("env.WEB_HYPERDRIVE.connectionString");
    expect(source).not.toContain("createHyperdriveContentGenerationStatusReader");
  });
});
