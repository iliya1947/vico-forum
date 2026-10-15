import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext, forumWriterContext } from "../forum/request-context";
import type { ForumReader } from "../../db/forum-repository";
import { ForumStorageUnavailableError, type ForumWriter } from "../../db/hyperdrive-forum";
import { action, loader } from "./profile";

const profile = { id: "owner", name: "Owner", image: null, joinedAt: new Date("2026-09-01"), bio: "", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true }, messageCount: 0, bestAnswerCount: 0 };
function setup(userId: string | null = "owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, userId ? { user: { id: userId } } as AuthSession : null);
  const readProfile = vi.fn(async () => profile);
  const updateProfile = vi.fn(async () => undefined);
  context.set(forumReaderContext, { readProfile } as unknown as ForumReader);
  context.set(forumWriterContext, { updateProfile } as unknown as ForumWriter);
  return { context, readProfile, updateProfile };
}
function request(fields: Record<string, string> = {}, origin: string | null = "https://forum.test") {
  const body = new FormData();
  for (const [key, value] of Object.entries({ intent: "save-profile", bio: "About me", githubUrl: "https://github.com/octocat", websiteUrl: "", ...fields })) body.set(key, value);
  return new Request("https://forum.test/en/users/owner?edit=1", { method: "POST", headers: origin ? { Origin: origin } : {}, body });
}
const params = { locale: "en", userId: "owner" };
function status(value: unknown) { return (value as { init: { status: number } }).init.status; }

describe("profile route", () => {
  it("allows public reads, serializes only public data, and shows editing only to the owner", async () => {
    for (const userId of [null, "other", "owner"]) {
      const env = setup(userId);
      env.readProfile.mockResolvedValue({ ...profile, email: "private@example.test", permissions: ["private"] } as typeof profile);
      const result = await loader({ params, request: new Request("https://forum.test/en/users/owner?edit=1"), context: env.context });
      expect(result.editing).toBe(userId === "owner");
      expect(result.profile.joinedAt).toBe("2026-09-01T00:00:00.000Z");
      expect(JSON.stringify(result)).not.toContain("private");
    }
  });
  it("returns 404 for missing users, 503 for availability, and preserves unexpected errors", async () => {
    const env = setup();
    env.readProfile.mockResolvedValue(undefined as unknown as typeof profile);
    const args = { params, request: new Request("https://forum.test/en/users/owner"), context: env.context };
    await expect(loader(args)).rejects.toMatchObject({ status: 404 });
    env.readProfile.mockRejectedValue(new ForumStorageUnavailableError());
    await expect(loader(args)).rejects.toMatchObject({ status: 503 });
    const bug = new Error("bug"); env.readProfile.mockRejectedValue(bug);
    await expect(loader(args)).rejects.toBe(bug);
  });
  it.each([[null, "https://forum.test", 401], ["other", "https://forum.test", 403], ["owner", "https://evil.test", 403], ["owner", null, 403]] as const)("denies unauthenticated, foreign identity and CSRF requests", async (id, origin, expected) => {
    const env = setup(id);
    expect(status(await action({ request: request({}, origin), params, context: env.context }))).toBe(expected);
    expect(env.updateProfile).not.toHaveBeenCalled();
  });
  it("writes only the server actor and allowed validated fields, then redirects", async () => {
    const env = setup();
    const result = await action({ request: request({ userId: "victim", role: "admin", name: "Impostor" }), params, context: env.context });
    expect(env.updateProfile).toHaveBeenCalledExactlyOnceWith({ actorId: "owner", fields: { bio: "About me", githubUrl: "https://github.com/octocat", websiteUrl: null } });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/en/users/owner?saved=1");
  });
  it("preserves draft on invalid input and transient storage failures; rethrows bugs", async () => {
    const env = setup();
    const invalid = await action({ request: request({ websiteUrl: "javascript:alert(1)" }), params, context: env.context });
    expect(status(invalid)).toBe(400); expect(env.updateProfile).not.toHaveBeenCalled();
    env.updateProfile.mockRejectedValue(new ForumStorageUnavailableError());
    const unavailable = await action({ request: request(), params, context: env.context });
    expect(status(unavailable)).toBe(503);
    expect((unavailable as { data: { draft: { bio: string } } }).data.draft.bio).toBe("About me");
    const bug = new Error("bug"); env.updateProfile.mockRejectedValue(bug);
    await expect(action({ request: request(), params, context: env.context })).rejects.toBe(bug);
  });
  it("rejects malformed forms and unsupported methods without storage calls", async () => {
    const env = setup();
    await expect(action({ request: new Request("https://forum.test/en/users/owner", { method: "PUT" }), params, context: env.context })).rejects.toMatchObject({ status: 405 });
    expect(status(await action({ request: new Request("https://forum.test/en/users/owner", { method: "POST", headers: { Origin: "https://forum.test" }, body: "broken" }), params, context: env.context }))).toBe(400);
    expect(env.updateProfile).not.toHaveBeenCalled();
  });
});
