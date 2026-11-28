import { describe, expect, it } from "vitest";
import {
  ForumControlDenied, requireScopedProviderClaims,
  type ForumControlBinding, type ForumControlGrant,
} from "./delegation-admission.server";
import { forumControlScopes } from "./write-tool-contract";

const binding: ForumControlBinding = {
  ownerUserId: "owner-id", issuer: "https://issuer.example/api/auth",
  clientId: "fixture-client", resource: "https://site.example/mcp", repositoryId: "123",
};
const grant: ForumControlGrant = {
  id: "grant-id", userId: binding.ownerUserId, sessionId: "session-id",
  clientId: binding.clientId, issuer: binding.issuer, resource: binding.resource,
  repositoryId: binding.repositoryId, scopes: [forumControlScopes.read, forumControlScopes.write],
  revokedAt: null,
};
const now = 1_800_000_000_000;
const claims = {
  active: true, iss: binding.issuer, aud: binding.resource, client_id: binding.clientId,
  sub: grant.userId, sid: grant.sessionId, token_type: "Bearer",
  exp: now / 1000 + 60, scope: forumControlScopes.read,
};
const verify = (value: unknown, scope = forumControlScopes.read as typeof forumControlScopes[keyof typeof forumControlScopes],
  persisted = grant, config = binding) => requireScopedProviderClaims(value, config, persisted, scope, now);

describe("forum control introspection admission", () => {
  it("admits exact resource, bound owner, live-session identifier and scope claims", () => {
    expect(() => verify(claims)).not.toThrow();
    expect(() => verify({ ...claims, aud: [binding.resource] })).not.toThrow();
    expect(() => verify(claims, forumControlScopes.write)).toThrow(ForumControlDenied);
  });

  it("denies mismatched or missing identity, token, resource and scope claims", () => {
    for (const patch of [
      { active: false }, { active: "true" }, { iss: "https://other.example" },
      { aud: undefined }, { aud: [binding.resource, "https://other.example"] },
      { client_id: "other-client" }, { sub: "other-owner" },
      { sid: undefined }, { sid: "replacement-session" }, { token_type: "DPoP" },
      { exp: now / 1000 }, { exp: "1800000060" }, { scope: "offline_access" },
      { scope: forumControlScopes.read + " unknown" }, { scope: forumControlScopes.read + " " + forumControlScopes.read },
    ]) {
      expect(() => verify({ ...claims, ...patch })).toThrow(ForumControlDenied);
    }
  });

  it("denies revoked, foreign, stale or over-scoped grants", () => {
    for (const patch of [
      { revokedAt: new Date(now) }, { userId: "other-owner" }, { sessionId: "" },
      { clientId: "other-client" }, { resource: "https://other.example" },
      { issuer: "https://other.example" }, { repositoryId: "456" },
      { scopes: [forumControlScopes.write] },
    ]) {
      expect(() => verify(claims, forumControlScopes.read, { ...grant, ...patch })).toThrow(ForumControlDenied);
    }
    expect(() => verify(claims, forumControlScopes.read, grant, { ...binding, ownerUserId: "new-owner" }))
      .toThrow(ForumControlDenied);
  });
});
