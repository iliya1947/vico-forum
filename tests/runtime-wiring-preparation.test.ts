import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("Stage 6 web runtime wiring preparation", () => {
  it("uses the shared web PostgreSQL factories for Better Auth, forum, and authorization", () => {
    const auth = source("app/auth/auth.server.ts");
    const forum = source("db/hyperdrive-forum.ts");
    const authorization = source("db/hyperdrive-authorization.ts");

    expect(auth).toContain('import { createWebClient } from "../../db/postgres-deadlines";');
    expect(auth).toContain("= createWebClient");

    expect(forum).toContain("createWebClient");
    expect(forum.match(/= createWebClient/g)).toHaveLength(2);

    expect(authorization).toContain("createWebPool");
    expect(authorization).toContain("= createWebPool");
  });

  it("keeps production content generation disabled without injecting its status reader", () => {
    const worker = source("workers/app.ts");

    expect(worker).toContain("DISABLED_CONTENT_GENERATION_ACTION_RUNTIME");
    expect(worker).not.toContain("createHyperdriveContentGenerationStatusReader");
    expect(worker).not.toContain("contentGenerationStatusReaderContext");
  });
});
