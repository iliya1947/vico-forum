import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { adminUsersContext } from "../admin/users.server";
import { AdminUsersUnavailableError } from "../../db/hyperdrive-admin-users";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { loader as index } from "./admin-users";
import { loader as detail } from "./admin-user";
import { loader as legacy } from "./under-development";

const id = "user/עברית";
const profile = {
  id, name: "Name עברית", image: null, joinedAt: new Date("2026-10-01T10:00:00Z"),
  bio: "Public bio", githubUrl: "https://github.com/example", websiteUrl: null,
  role: { slug: "user", displayName: "Member", isSystem: true },
  messageCount: 2, bestAnswerCount: 1, email: "never-serialize@example.invalid",
};
function setup(permissions: string[] = [], signedIn = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, signedIn ? { user: { id: "actor" } } as never : null);
  context.set(authorizationOwnerContext, "bound-owner");
  const has = vi.fn(async (key: string) => permissions.includes(key));
  const readUserManagementState = vi.fn(async () => { throw new Error("must not read authorization"); });
  context.set(authorizationContext, { forUser: () => ({ has }), readUserManagementState } as never);
  const listUsers = vi.fn(async () => ({ items: [{
    id, name: profile.name, image: profile.image, joinedAt: profile.joinedAt.toISOString(),
  }], total: 1, next: null }));
  const readProfile = vi.fn(async () => profile);
  context.set(adminUsersContext, { listUsers });
  context.set(forumReaderContext, { readProfile } as never);
  return { context, has, listUsers, readProfile, readUserManagementState };
}
const indexArgs = (context: RouterContextProvider, query = "") => ({
  context, params: { locale: "he" }, request: new Request("https://vico.test/he/admin/users" + query),
});
const detailArgs = (context: RouterContextProvider, userId = id) => ({
  context, params: { locale: "he", userId },
});

describe("SA03 legacy Admin user detail redirects only after original directory admission", () => {
  it("denies guest, authorization-only, unrelated and missing directory grants before target validation", async () => {
    for (const [permissions, signedIn, status] of [
      [[], false, 401], [[], true, 403], [["access.authorization.manage"], true, 403],
      [["admin.history.read"], true, 403], [["admin.users.blocks.manage"], true, 403],
    ] as const) {
      const env = setup([...permissions], signedIn);
      await expect(index(indexArgs(env.context, "?q=x&q=y"))).rejects.toMatchObject({ status });
      await expect(detail(detailArgs(env.context, ""))).rejects.toMatchObject({ status });
      expect(env.listUsers).not.toHaveBeenCalled();
      expect(env.readProfile).not.toHaveBeenCalled();
      expect(env.readUserManagementState).not.toHaveBeenCalled();
    }
  });
  it("preserves directory search and private responses", async () => {
    const env = setup(["admin.users.read"]);
    const result = await index(indexArgs(env.context, "?q=Name&after=opaque"));
    expect(result.data.query).toEqual({ search: "Name", after: "opaque" });
    expect(result.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(env.listUsers).toHaveBeenCalledExactlyOnceWith({ search: "Name", after: "opaque" });
  });
  it("SA04-D loader defensive field allowlist hides malformed marked names, image and lifecycle", async () => {
    const env = setup(["admin.users.read"]);
    env.listUsers.mockResolvedValueOnce({
      items: [
        {
          id: "inactive/u-060", name: "SECRET_SA04_D_RETAINED_NAME",
          image: "https://example.test/SECRET_SA04_D_ORIGINAL_IMAGE.png",
          joinedAt: "2026-10-01T10:00:00.000Z",
          identityKind: "deleted",
          deactivatedAt: "SECRET_SA04_D_DEACTIVATION",
          deactivatedByUserId: "SECRET_SA04_D_ACTOR",
          retainAtLeastUntil: "SECRET_SA04_D_RETENTION",
          email: "SECRET_SA04_D_PRIVATE_EMAIL",
        },
        {
          id: "active/user", name: "Active User", image: "https://example.test/active.png",
          joinedAt: "2026-10-02T10:00:00.000Z",
          ignoredPrivateMarker: "SECRET_SA04_D_EXTRA",
        },
      ],
      total: 2, next: "active/user", untrustedExtra: "SECRET_SA04_D_PAGE",
    } as never);
    const result = await index(indexArgs(env.context, "?q=inactive"));
    expect(result.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(env.listUsers).toHaveBeenCalledWith({ search: "inactive" });
    expect(result.data.page).toEqual({
      items: [
        {
          id: "inactive/u-060", name: "Deleted user", image: null,
          joinedAt: "2026-10-01T10:00:00.000Z", identityKind: "deleted",
        },
        {
          id: "active/user", name: "Active User", image: "https://example.test/active.png",
          joinedAt: "2026-10-02T10:00:00.000Z",
        },
      ], total: 2, next: "active/user",
    });
    expect(JSON.stringify(result.data)).not.toContain("SECRET_SA04_D_");
    expect(env.readProfile).not.toHaveBeenCalled();
    expect(env.readUserManagementState).not.toHaveBeenCalled();
  });
  it("redirects fixed encoded canonical destination, never query/returnTo, without private snapshot", async () => {
    for(const permissions of [["admin.users.read"],
      ["admin.users.read","access.authorization.manage"]]) {
      const env = setup(permissions);
      const response = await detail(detailArgs(env.context));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/he/users/" + encodeURIComponent(id));
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(JSON.stringify([...response.headers])).not.toContain("never-serialize");
      expect(env.readProfile).toHaveBeenCalledExactlyOnceWith(id);
      expect(env.readUserManagementState).not.toHaveBeenCalled();
    }
  });
  it("validates target only after gate and preserves missing/outage/unexpected classification", async () => {
    const env = setup(["admin.users.read"]);
    for(const userId of ["", "\0", "x".repeat(2049)]) {
      await expect(detail(detailArgs(env.context,userId))).rejects.toMatchObject({ status: 400 });
    }
    expect(env.readProfile).not.toHaveBeenCalled();
    env.readProfile.mockResolvedValueOnce(undefined as never);
    await expect(detail(detailArgs(env.context))).rejects.toMatchObject({ status: 404 });
    env.readProfile.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await expect(detail(detailArgs(env.context))).rejects.toMatchObject({ status: 503 });
    const fault = new Error("unexpected SQL");
    env.readProfile.mockRejectedValueOnce(fault);
    await expect(detail(detailArgs(env.context))).rejects.toBe(fault);
    const lost = setup(["admin.users.read"]);
    lost.listUsers.mockRejectedValueOnce(new AdminUsersUnavailableError());
    await expect(index(indexArgs(lost.context))).rejects.toMatchObject({ status: 503 });
    const denied = setup(["admin.users.read"]);
    denied.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(detail(detailArgs(denied.context))).rejects.toMatchObject({ status: 503 });
  });
  it("continues to resolve the preexisting under-development Users alias", async () => {
    const env = setup(["admin.users.read"]);
    const response = await legacy({params:{locale:"he"},context:env.context,
      request:new Request("https://vico.test/he/under-development?feature=admin-users")});
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("Location")).toBe("/he/admin/users");
  });
});
