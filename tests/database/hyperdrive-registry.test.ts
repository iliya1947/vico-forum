import { describe, expect, it, vi } from "vitest";
import { createHyperdriveRegistryLoader } from "../../db/hyperdrive-registry";

describe("Hyperdrive registry connection failure", () => {
  it("degrades to bootstrap English when pg cannot connect to a local endpoint", async () => {
    const reportDegraded = vi.fn();
    const load = createHyperdriveRegistryLoader(
      "postgresql://postgres:postgres@127.0.0.1:1/vico_forum_test",
      undefined,
      reportDegraded,
    );

    const loaded = await load();

    expect(loaded.health).toEqual({ status: "degraded", reason: "unavailable" });
    expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
    expect(reportDegraded).toHaveBeenCalledOnce();
    expect(reportDegraded).toHaveBeenCalledWith("unavailable");
  });
});
