import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("Stage 6 web runtime preparation wiring", () => {
  it("uses the shared web PostgreSQL factory in auth, forum, and authorization adapters", () => {
    const authSource = readSource("../app/auth/auth.server.ts");
    const forumSource = readSource("./hyperdrive-forum.ts");
    const authorizationSource = readSource("./hyperdrive-authorization.ts");

    expect(authSource)
      .toContain("createClient: (connectionString: string) => Client = createWebClient");
    expect(forumSource.match(/clientFactory: ClientFactory = \(\) => createWebClient\(connectionString\)/g))
      .toHaveLength(2);
    expect(authorizationSource)
      .toContain("const defaultPoolFactory: AuthorizationPoolFactory = createWebPool;");
  });

  it("keeps the disabled generation-status database capability unbound in the production Worker", () => {
    const workerSource = readSource("../workers/app.ts");

    expect(workerSource).toContain("DISABLED_CONTENT_GENERATION_ACTION_RUNTIME");
    expect(workerSource).not.toContain("createHyperdriveContentGenerationStatusReader");
    expect(workerSource).not.toContain("contentGenerationStatusReaderContext");
  });
});
