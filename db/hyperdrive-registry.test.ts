import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createHyperdriveRegistryLoader } from "./hyperdrive-registry";

describe("Hyperdrive registry request factory", () => {
  it("is lazy and reuses one connection and snapshot inside a request", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    const connect = vi.fn(async () => undefined);
    const createClient = vi.fn(() => ({ connect, query }) as unknown as Client);
    const reportDegraded = vi.fn();
    const load = createHyperdriveRegistryLoader(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    );

    expect(createClient).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();

    const [first, second] = await Promise.all([load(), load()]);

    expect(first).toBe(second);
    expect(first.health).toEqual({ status: "healthy" });
    expect(createClient).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
    expect(reportDegraded).not.toHaveBeenCalled();
  });

  it("classifies a PostgreSQL connection outage and reports degraded state once", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const createClient = () => ({
      connect: vi.fn(async () => { throw unavailable; }),
      query: vi.fn(),
    }) as unknown as Client;
    const reportDegraded = vi.fn();
    const load = createHyperdriveRegistryLoader(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    );

    const [first, second] = await Promise.all([load(), load()]);

    expect(first).toBe(second);
    expect(first.health).toEqual({ status: "degraded", reason: "unavailable" });
    expect(first.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
    expect(reportDegraded).toHaveBeenCalledOnce();
    expect(reportDegraded).toHaveBeenCalledWith("unavailable");
  });

  it("treats node-postgres code-less connection termination as unavailable", async () => {
    const unavailable = new Error("Connection terminated unexpectedly");
    const createClient = () => ({
      connect: vi.fn(async () => { throw unavailable; }),
      query: vi.fn(),
    }) as unknown as Client;
    const reportDegraded = vi.fn();

    const loaded = await createHyperdriveRegistryLoader(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    )();

    expect(loaded.health).toEqual({ status: "degraded", reason: "unavailable" });
    expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
    expect(reportDegraded).toHaveBeenCalledWith("unavailable");
  });

  it.each([
    Object.assign(new Error("authentication failed"), { code: "28P01" }),
    new TypeError("client programming error"),
    new Error("driver configuration failure"),
  ])("does not mask a non-availability connect failure", async (failure) => {
    const createClient = () => ({
      connect: vi.fn(async () => { throw failure; }),
      query: vi.fn(),
    }) as unknown as Client;
    const reportDegraded = vi.fn();

    await expect(
      createHyperdriveRegistryLoader("postgres://runtime@hyperdrive/vico", createClient, reportDegraded)(),
    ).rejects.toBe(failure);
    expect(reportDegraded).not.toHaveBeenCalled();
  });
});
