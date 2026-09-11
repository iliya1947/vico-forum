import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createHyperdriveRegistryLoader } from "./hyperdrive-registry";

describe("Hyperdrive registry request factory", () => {
  it("is lazy and reuses one connection and snapshot inside a request", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    const connect = vi.fn(async () => undefined);
    const createClient = vi.fn(() => ({ connect, query }) as unknown as Client);
    const load = createHyperdriveRegistryLoader("postgres://runtime@hyperdrive/vico", createClient);

    expect(createClient).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();

    const [first, second] = await Promise.all([load(), load()]);

    expect(first).toBe(second);
    expect(first.health).toEqual({ status: "healthy" });
    expect(createClient).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
  });

  it("classifies a connection outage as degraded bootstrap-only state", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const createClient = () => ({
      connect: vi.fn(async () => { throw unavailable; }),
      query: vi.fn(),
    }) as unknown as Client;

    const loaded = await createHyperdriveRegistryLoader("postgres://runtime@hyperdrive/vico", createClient)();

    expect(loaded.health).toEqual({ status: "degraded", reason: "unavailable" });
    expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
  });
});
