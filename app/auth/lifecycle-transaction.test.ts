import { describe, expect, it, vi } from "vitest";
import type { Client } from "pg";
import { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

function fixture() {
  const query = vi.fn(async (sql: string) => ({ command: sql.split(" ")[0] }));
  const gap = vi.fn();
  const scope = new AuthLifecycleTransaction({ query } as unknown as Pick<Client, "query">, gap);
  const commands = () => query.mock.calls.map(([sql]) => sql);
  const controls = () => commands().filter(sql => /^(BEGIN|COMMIT|ROLLBACK)$/.test(sql));
  return { query, gap, scope, controls, commands };
}

describe("request-local auth lifecycle transaction ownership", () => {
  it("joins nested work and publishes evidence only after one acknowledged COMMIT", async () => {
    const { scope, controls, commands } = fixture();
    const effects: string[] = [];
    expect(scope.ownsCurrentWork()).toBe(false);
    const value = await scope.run(async () => {
      expect(scope.ownsCurrentWork()).toBe(true);
      scope.stageEvidence(() => effects.push("outer"));
      await scope.run(async () => {
        expect(scope.ownsCurrentWork()).toBe(true);
        scope.stageEvidence(() => effects.push("inner"));
      });
      expect(effects).toEqual([]);
      expect(controls()).toEqual(["BEGIN"]);
      return 42;
    });
    expect(value).toBe(42);
    expect(controls()).toEqual(["BEGIN", "COMMIT"]);
    expect(commands().filter(sql => sql.startsWith("SET LOCAL"))).toHaveLength(3);
    expect(effects).toEqual(["outer", "inner"]);
    expect(scope.ownsCurrentWork()).toBe(false);
  });

  it("rolls back and discards staged effects on failure", async () => {
    const { scope, controls } = fixture();
    const effect = vi.fn();
    const failure = new Error("operation failed");
    await expect(scope.run(async () => {
      scope.stageEvidence(effect);
      throw failure;
    })).rejects.toBe(failure);
    expect(controls()).toEqual(["BEGIN", "ROLLBACK"]);
    expect(effect).not.toHaveBeenCalled();
    expect(scope.connectionUsable).toBe(true);
  });

  it("does not commit a caught nested or guarded failure", async () => {
    const { scope, controls } = fixture();
    const failure = new Error("nested failed");
    await expect(scope.run(async () => {
      await scope.run(async () => { throw failure; }).catch(() => undefined);
      return "not success";
    })).rejects.toBe(failure);
    await expect(scope.run(async () => {
      scope.markFailed(failure);
      return "not success";
    })).rejects.toBe(failure);
    expect(controls()).toEqual(["BEGIN", "ROLLBACK", "BEGIN", "ROLLBACK"]);
  });

  it("rejects unrelated asynchronous work on a busy connection", async () => {
    const { scope, controls } = fixture();
    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    const owner = scope.run(async () => { entered(); await wait; });
    await ready;
    try {
      await expect(scope.run(async () => "foreign")).rejects.toMatchObject({ code: "busy" });
      expect(() => scope.ownsCurrentWork()).toThrow();
    } finally { release(); }
    await owner;
    expect(controls()).toEqual(["BEGIN", "COMMIT"]);
  });

  it("never retries a lost COMMIT acknowledgement or publishes success", async () => {
    const { scope, query, controls, gap } = fixture();
    query.mockImplementation(async sql => {
      if (sql === "COMMIT") throw new Error("connection lost");
      return { command: sql.split(" ")[0] };
    });
    const effect = vi.fn();
    await expect(scope.run(async () => { scope.stageEvidence(effect); }))
      .rejects.toMatchObject({ code: "commit-uncertain" });
    expect(controls()).toEqual(["BEGIN", "COMMIT"]);
    expect(effect).not.toHaveBeenCalled();
    expect(gap).toHaveBeenCalledWith(1);
    expect(scope.connectionUsable).toBe(false);
    await expect(scope.run(async () => undefined)).rejects.toMatchObject({ code: "closed" });
  });

  it("distinguishes explicit ROLLBACK acknowledgement from uncertain COMMIT", async () => {
    const { scope, query, controls, gap } = fixture();
    query.mockImplementation(async sql => ({
      command: sql === "COMMIT" ? "ROLLBACK" : sql.split(" ")[0],
    }));
    const effect = vi.fn();
    await expect(scope.run(async () => { scope.stageEvidence(effect); }))
      .rejects.toMatchObject({ code: "rolled-back" });
    expect(controls()).toEqual(["BEGIN", "COMMIT"]);
    expect(effect).not.toHaveBeenCalled();
    expect(gap).not.toHaveBeenCalled();
    expect(scope.connectionUsable).toBe(true);
  });

  it("discards a connection on uncertain BEGIN or ROLLBACK", async () => {
    for (const command of ["BEGIN", "ROLLBACK"] as const) {
      const { scope, query, controls } = fixture();
      query.mockImplementation(async sql => {
        if (sql === command) throw new Error("connection lost");
        return { command: sql.split(" ")[0] };
      });
      await expect(scope.run(async () => { throw new Error("operation failed"); }))
        .rejects.toMatchObject({ code: command === "BEGIN" ? "begin-uncertain" : "rollback-uncertain" });
      expect(scope.connectionUsable).toBe(false);
      expect(controls()).toEqual(command === "BEGIN" ? ["BEGIN"] : ["BEGIN", "ROLLBACK"]);
    }
  });

  it("keeps recording failures and a bounded evidence queue separate from auth outcome", async () => {
    const { scope, gap } = fixture();
    const effect = vi.fn();
    await expect(scope.run(async () => {
      scope.stageEvidence(() => { throw new Error("recording failed"); });
      for (let i = 0; i < 130; i++) scope.stageEvidence(effect);
      return "committed";
    })).resolves.toBe("committed");
    expect(effect).toHaveBeenCalledTimes(127);
    expect(gap).toHaveBeenCalledWith(1);
    expect(gap).toHaveBeenCalledWith(3);
  });
  it.each([false, true])("drains detached nested work before rollback (outer failure=%s)", async outerFailure => {
    const { scope, query, controls } = fixture();
    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    let nested: Promise<void> | undefined;
    const failure = new Error("outer failure");
    const transaction = scope.run(async () => {
      nested = scope.run(async () => {
        entered();
        await wait;
        // The already admitted native operation finishes before rollback.
        await query("nested statement");
      });
      await ready;
      if (outerFailure) throw failure;
    });
    await ready;
    await Promise.resolve();
    expect(controls()).toEqual(["BEGIN"]);
    release();
    if (outerFailure) await expect(transaction).rejects.toBe(failure);
    else await expect(transaction).rejects.toMatchObject({ code: "unawaited" });
    await nested;
    expect(controls()).toEqual(["BEGIN", "ROLLBACK"]);
    const statements = query.mock.calls.map(([sql]) => sql);
    expect(statements.indexOf("nested statement")).toBeLessThan(statements.indexOf("ROLLBACK"));
  });
  it("retains a completed standalone after-hook without joining the next deletion's transaction", async () => {
    const { scope } = fixture();
    const retained = vi.fn();
    const rolledBack = vi.fn();
    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    const transaction = scope.run(async () => {
      scope.stageEvidence(rolledBack);
      entered();
      await wait;
      throw new Error("next deletion rolled back");
    });
    await ready;
    try {
      scope.stageEvidence(retained);
      expect(retained).toHaveBeenCalledOnce();
      expect(rolledBack).not.toHaveBeenCalled();
    } finally { release(); }
    await expect(transaction).rejects.toThrow("next deletion rolled back");
    expect(rolledBack).not.toHaveBeenCalled();
  });
});
