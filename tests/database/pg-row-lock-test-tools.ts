import type { Client, Pool } from "pg";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
/** Pause only AFTER PostgreSQL actually acquired the selected row lock. */
export function createRowLockGate(pool: Pool, match: (sql: string) => boolean) {
  const acquired = deferred<number>(), release = deferred(); let paused = false;
  const gated = new Proxy(pool, {
    get(target, property) {
      if (property === "connect") return async () => {
        const connection = await target.connect();
        return new Proxy(connection, { get(c, key) {
          if (key === "query") return async (...args: unknown[]) => {
            const result = await Reflect.apply(c.query, c, args);
            const sql = typeof args[0] === "string" ? args[0] : (args[0] as { text?: string })?.text ?? "";
            if (!paused && match(sql)) {
              paused = true;
              const pid = (await c.query("select pg_backend_pid() pid")).rows[0].pid;
              acquired.resolve(pid); await release.promise;
            }
            return result;
          };
          const value = Reflect.get(c, key); return typeof value === "function" ? value.bind(c) : value;
        } });
      };
      const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { pool: gated, acquired: acquired.promise, resume: () => release.resolve() };
}
export async function waitForBlockedBy(client: Pick<Client, "query">, pid: number) {
  for (let i = 0; i < 300; i++) {
    await client.query("select pg_stat_clear_snapshot()");
    const result = await client.query("select pid from pg_stat_activity where $1::integer=any(pg_blocking_pids(pid))", [pid]);
    if (result.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected real PostgreSQL row-lock blocker " + pid);
}

export const settledResult = <T>(p: Promise<T>) => p.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
