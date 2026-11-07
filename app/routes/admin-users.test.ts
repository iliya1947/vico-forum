import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { adminUsersContext } from "../admin/users.server";
import { AdminUsersUnavailableError } from "../../db/hyperdrive-admin-users";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { loader as index } from "./admin-users";
import { loader as detail } from "./admin-user";
import { loader as legacy } from "./under-development";

const secret = "never-serialize@example.invalid";
const management = {
  userId: "user/עברית",
  roles: [{ id: "builtin-user", slug: "user", displayName: "User", isSystem: true }],
  authorization: {
    role: { id: "builtin-user", slug: "user", displayName: "User", isSystem: true },
    explicitAssignment: false, grants: ["forum.reply.create"],
    overrides: { "forum.topic.create": "deny" },
    effectivePermissions: ["forum.reply.create"],
  },
};
const profile = {
  id: "user/עברית", name: "Name עברית", image: null, joinedAt: new Date("2026-10-01T10:00:00Z"),
  bio: "Public bio", githubUrl: "https://github.com/example", websiteUrl: null,
  role: { slug: "user", displayName: "Member", isSystem: true }, messageCount: 2, bestAnswerCount: 1,
  email: secret, grants: ["access.authorization.manage"], overrides: [{ permission: "admin.users.read" }],
};
function environment(permissions: string[] = [], signedIn = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, signedIn ? { user: { id: "actor", email: secret } } as never : null);
  context.set(authorizationOwnerContext, "bound-owner");
  const has = vi.fn(async (key: string) => permissions.includes(key));
  const readManagementState = vi.fn();
  const readUserManagementState = vi.fn(async () => management);
  context.set(authorizationContext, {
    forUser: () => ({ has }), readManagementState, readUserManagementState,
  } as never);
  const listUsers = vi.fn(async () => ({ items: [
    { id: profile.id, name: profile.name, image: profile.image, joinedAt: profile.joinedAt.toISOString() },
  ], total: 1, next: null }));
  const readProfile = vi.fn(async () => profile);
  context.set(adminUsersContext, { listUsers });
  context.set(forumReaderContext, { readProfile } as never);
  return { context, has, listUsers, readProfile, readManagementState, readUserManagementState };
}
function indexArgs(context: RouterContextProvider, query = "") {
  return { request: new Request(`https://vico.test/he/admin/users${query}`), params: { locale: "he" }, context };
}
function detailArgs(context: RouterContextProvider, userId = profile.id) {
  return { params: { locale: "he", userId }, context };
}

describe("AP-09 independent Users route protection and minimal DTO", () => {
  it("rejects guest, management-only and unrelated permissions before query validation or reads", async () => {
    for (const [permissions, signedIn, status] of [
      [[], false, 401], [[], true, 403], [["access.authorization.manage"], true, 403],
      [["admin.history.read"], true, 403], [["forum.post.history.read"], true, 403],
    ] as const) {
      const e = environment([...permissions], signedIn);
      await expect(index(indexArgs(e.context, "?q=x&q=y"))).rejects.toMatchObject({ status });
      await expect(detail(detailArgs(e.context, ""))).rejects.toMatchObject({ status });
      expect(e.listUsers).not.toHaveBeenCalled();
      expect(e.readProfile).not.toHaveBeenCalled();
      expect(e.readUserManagementState).not.toHaveBeenCalled();
    }
  });

  it("keeps public DTO minimal and reads one user's management data only for both capabilities", async () => {
    for (const permissions of [["admin.users.read"], ["admin.users.read", "access.authorization.manage"]]) {
      const e = environment(permissions);
      const indexResult = await index(indexArgs(e.context, "?q=%20Name%20&after=cursor"));
      expect(indexResult.data.query).toEqual({ search: "Name", after: "cursor" });
      expect(indexResult.data.access).toMatchObject({ canReadUsers: true, canEnter: true });
      expect(indexResult.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
      expect(e.listUsers).toHaveBeenCalledWith({ search: "Name", after: "cursor" });

      const detailResult = await detail(detailArgs(e.context));
      expect(detailResult.data.user).toEqual({
        id: profile.id, name: profile.name, image: null, joinedAt: profile.joinedAt.toISOString(),
        bio: "Public bio", githubUrl: "https://github.com/example", websiteUrl: null,
        role: profile.role, messageCount: 2, bestAnswerCount: 1,
      });
      expect(detailResult.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
      expect(e.readProfile).toHaveBeenCalledWith(profile.id);
      expect(JSON.stringify(indexResult.data) + JSON.stringify(detailResult.data)).not.toContain(secret);
      expect(e.readManagementState).not.toHaveBeenCalled();
      if (permissions.includes("access.authorization.manage")) {
        expect(e.readUserManagementState).toHaveBeenCalledTimes(1);
        expect(e.readUserManagementState).toHaveBeenCalledWith(profile.id);
        expect(detailResult.data).toMatchObject({
          management, managerActorId: "actor", canManageElevated: false, canMutateAuthorization: false,
        });
        expect(JSON.stringify(detailResult.data)).not.toContain("email");
      } else {
        expect(e.readUserManagementState).not.toHaveBeenCalled();
        expect(JSON.stringify(detailResult.data)).not.toContain("grants");
        expect(JSON.stringify(detailResult.data)).not.toContain("overrides");
        expect(JSON.stringify(detailResult.data)).not.toContain("managerActorId");
      }
    }
  });

  it("exposes a separate Owner-only write flag without changing management read admission", async () => {
    const actor = environment(["admin.users.read", "access.authorization.manage"]);
    actor.context.set(authorizationOwnerContext, "actor");
    const result = await detail(detailArgs(actor.context));
    expect(result.data).toMatchObject({
      management, managerActorId: "actor", canManageElevated: true, canMutateAuthorization: true,
    });
    expect(actor.readUserManagementState).toHaveBeenCalledExactlyOnceWith(profile.id);
  });
  it("validates bounded search/cursor and user ID after permission gate", async () => {
    for (const query of ["?q=x&q=y", "?after=x&after=y", "?after=", "?q=%00", "?after=%00",
      "?q=" + "x".repeat(201), "?after=" + "x".repeat(2049)]) {
      const e = environment(["admin.users.read"]);
      await expect(index(indexArgs(e.context, query))).rejects.toMatchObject({ status: 400 });
      expect(e.listUsers).not.toHaveBeenCalled();
    }
    for (const id of ["", "\0", "x".repeat(2049)]) {
      const e = environment(["admin.users.read"]);
      await expect(detail(detailArgs(e.context, id))).rejects.toMatchObject({ status: 400 });
      expect(e.readProfile).not.toHaveBeenCalled();
    }
    const e = environment(["admin.users.read"]);
    await index(indexArgs(e.context, "?q=" + encodeURIComponent("😀".repeat(200))));
    expect(e.listUsers).toHaveBeenCalled();
  });

  it("distinguishes 404, availability outages and unexpected errors", async () => {
    const missing = environment(["admin.users.read"]);
    missing.readProfile.mockResolvedValueOnce(undefined as never);
    await expect(detail(detailArgs(missing.context))).rejects.toMatchObject({ status: 404 });
    const lost = environment(["admin.users.read"]);
    lost.listUsers.mockRejectedValueOnce(new AdminUsersUnavailableError());
    await expect(index(indexArgs(lost.context))).rejects.toMatchObject({ status: 503 });
    const unexpected = new Error("unexpected SQL");
    lost.listUsers.mockRejectedValueOnce(unexpected);
    await expect(index(indexArgs(lost.context))).rejects.toBe(unexpected);
    const managerLost = environment(["admin.users.read", "access.authorization.manage"]);
    managerLost.readUserManagementState.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(detail(detailArgs(managerLost.context))).rejects.toMatchObject({ status: 503 });
    const readFailure = new Error("unexpected management SQL");
    const unexpectedManager = environment(["admin.users.read", "access.authorization.manage"]);
    unexpectedManager.readUserManagementState.mockRejectedValueOnce(readFailure);
    await expect(detail(detailArgs(unexpectedManager.context))).rejects.toBe(readFailure);
    const denied = environment(["admin.users.read"]);
    denied.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(index(indexArgs(denied.context))).rejects.toMatchObject({ status: 503 });
    expect(denied.listUsers).not.toHaveBeenCalled();
  });

  it("redirects only permitted legacy Users links, preserving original placeholders", async () => {
    const read = environment(["admin.users.read"]);
    const r = await legacy({ params: { locale: "he" }, context: read.context,
      request: new Request("https://vico.test/he/under-development?feature=admin-users") });
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).headers.get("Location")).toBe("/he/admin/users");
    expect((r as Response).headers.get("Cache-Control")).toBe("private, no-store");
    const manager = environment(["access.authorization.manage"]);
    const m = await legacy({ params: { locale: "ru" }, context: manager.context,
      request: new Request("https://vico.test/ru/under-development?feature=admin-users") });
    expect((m as Response).headers.get("Location")).toBe("/ru/admin/authorization#authorization-users-heading");
    expect((m as Response).headers.get("Cache-Control")).toBe("private, no-store");
    const guest = environment([], false);
    await expect(legacy({ params: { locale: "en" }, context: guest.context,
      request: new Request("https://vico.test/en/under-development?feature=admin-users") }))
      .rejects.toMatchObject({ status: 401, headers: expect.any(Headers) });
    const forbidden = environment(["forum.topic.pin"]);
    await expect(legacy({ params: { locale: "en" }, context: forbidden.context,
      request: new Request("https://vico.test/en/under-development?feature=admin-users") }))
      .rejects.toMatchObject({ status: 403 });
  });
});
