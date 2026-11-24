import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { P2_WORKER_CONTEXTS, P2_AUTH_CONTEXTS, P2_B1_CONFIGURED_CONTEXTS } from "./context-inventory";

const contextRegistrations = (source: string) =>
  [...source.matchAll(/context\.set\s*\(\s*([A-Za-z_][A-Za-z_0-9]*)\s*,/g)]
    .map((match) => match[1]!);

describe("P2 production context contract inventory", () => {
  it("tracks every Worker request context registration exactly once", () => {
    const worker = readFileSync(resolve(process.cwd(), "workers/app.ts"), "utf8");
    const discovered = contextRegistrations(worker);
    expect(new Set(discovered).size).toBe(discovered.length);
    expect([...discovered].sort()).toEqual([...P2_WORKER_CONTEXTS].sort());
  });

  it("tracks both session initialization contexts without assuming a session", () => {
    const auth = readFileSync(resolve(process.cwd(), "app/auth/session-context.ts"), "utf8");
    expect(contextRegistrations(auth).sort()).toEqual([...P2_AUTH_CONTEXTS].sort());
  });

  it("defines a bounded B1 subset rather than asserting all capabilities are wired", () => {
    expect(P2_WORKER_CONTEXTS).toHaveLength(33);
    expect(P2_AUTH_CONTEXTS).toHaveLength(2);
    expect(P2_B1_CONFIGURED_CONTEXTS).toEqual([
      "forumReaderContext", "registryLoaderContext",
    ]);
  });
});
