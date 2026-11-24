import { describe, expect, it } from "vitest";
import { INITIAL_ROLE_GRANTS } from "../../authorization/catalog";
import { P0_ACTOR_ID, P0_TOPIC_ID } from "../p0/fixture";
import { P0_ATTACHMENT_ID } from "../p0/attachment-fixture";
import {
  assertP2RawBaselineIntegrity, createP2RawBaseline, previewActorId,
  type PreviewRawBaseline,
} from "./raw-baseline";

const reference = new Date("2026-11-24T10:00:00.000Z");

describe("P2 raw baseline integrity", () => {
  it("reuses accepted P0 identities and resolves every linked forum record", () => {
    const data = createP2RawBaseline(reference);
    expect(data.topics.find((topic) => topic.id === P0_TOPIC_ID)?.authorId).toBe("sample-author");
    expect(data.posts.find((post) => post.id === "p0-first-post")?.topicId).toBe(P0_TOPIC_ID);
    expect(data.attachments.find((file) => file.id === P0_ATTACHMENT_ID)?.postId).toBe("p0-first-post");
    expect(data.sections.find((section) => section.id === "sample-section")?.categoryId).toBe("sample-category");
    expect(data.topics.find((topic) => topic.id === "preview-review-topic")?.bestAnswerPostId)
      .toBe("preview-review-reply");
    expect(() => assertP2RawBaselineIntegrity(data)).not.toThrow();
  });

  it("keeps raw role grants distinct from exact Owner identity and preserves ownership across actor switches", () => {
    const data = createP2RawBaseline(reference);
    const originalTopics = data.topics.map(({ id, authorId }) => ({ id, authorId }));
    const originalPosts = data.posts.map(({ id, authorId }) => ({ id, authorId }));
    expect(previewActorId(data, "guest")).toBeNull();
    expect(previewActorId(data, "member")).toBe(P0_ACTOR_ID);
    expect(previewActorId(data, "moderator")).toBe("preview-moderator");
    expect(previewActorId(data, "admin")).toBe("preview-admin");
    expect(previewActorId(data, "owner")).toBe(data.ownerUserId);
    expect(data.assignments.find((item) => item.userId === data.ownerUserId)?.roleId).toBe("user");
    for (const role of data.roles) expect(role.grants).toEqual([...INITIAL_ROLE_GRANTS[role.id]]);
    for (const actor of ["member", "admin", "owner", "guest"] as const) {
      previewActorId(data, actor);
      expect(data.topics.map(({ id, authorId }) => ({ id, authorId }))).toEqual(originalTopics);
      expect(data.posts.map(({ id, authorId }) => ({ id, authorId }))).toEqual(originalPosts);
    }
  });

  it("computes account retention and session-independent timestamps from the supplied clock", () => {
    const first = createP2RawBaseline(reference);
    const later = createP2RawBaseline(new Date(reference.getTime() + 7 * 24 * 60 * 60 * 1000));
    const inactive = first.users.find((item) => item.identity.id === first.actorIds.inactive);
    const laterInactive = later.users.find((item) => item.identity.id === later.actorIds.inactive);
    expect(inactive?.state.status).toBe("deactivated");
    if (inactive?.state.status !== "deactivated" || laterInactive?.state.status !== "deactivated") {
      throw new Error("Expected deactivated fixture account");
    }
    expect(inactive.state.deactivatedAt.getTime()).toBeLessThan(first.referenceTime.getTime());
    expect(inactive.state.retainAtLeastUntil.getTime()).toBeGreaterThan(first.referenceTime.getTime());
    expect(laterInactive.state.retainAtLeastUntil.getTime() - inactive.state.retainAtLeastUntil.getTime())
      .toBe(7 * 24 * 60 * 60 * 1000);
    expect(() => createP2RawBaseline(new Date(Number.NaN))).toThrow("reference clock");
  });

  it("rejects dangling and cross-topic references before connecting readers", () => {
    const base = createP2RawBaseline(reference);
    const brokenSection: PreviewRawBaseline = {
      ...base, topics: base.topics.map((topic) => (
        topic.id === P0_TOPIC_ID ? { ...topic, sectionId: "missing-section" } : topic
      )),
    };
    expect(() => assertP2RawBaselineIntegrity(brokenSection)).toThrow("topic section");
    const brokenBestAnswer: PreviewRawBaseline = {
      ...base, topics: base.topics.map((topic) => (
        topic.id === P0_TOPIC_ID ? { ...topic, bestAnswerPostId: "preview-review-reply" } : topic
      )),
    };
    expect(() => assertP2RawBaselineIntegrity(brokenBestAnswer)).toThrow("best answer");
    const brokenRead: PreviewRawBaseline = {
      ...base, readStates: [{
        userId: P0_ACTOR_ID, topicId: P0_TOPIC_ID, lastReadPostId: "preview-review-reply",
      }],
    };
    expect(() => assertP2RawBaselineIntegrity(brokenRead)).toThrow("read-state post");
    const selfBlock: PreviewRawBaseline = {
      ...base, blocks: [{ userId: P0_ACTOR_ID, blockedUserId: P0_ACTOR_ID }],
    };
    expect(() => assertP2RawBaselineIntegrity(selfBlock)).toThrow("self block");
  });

  it("rejects duplicate identities and mismatched account ownership", () => {
    const base = createP2RawBaseline(reference);
    expect(() => assertP2RawBaselineIntegrity({
      ...base, users: [...base.users, base.users[0]!],
    })).toThrow("duplicate/empty user");
    const mismatched: PreviewRawBaseline = {
      ...base, users: base.users.map((user) => user.identity.id === P0_ACTOR_ID
        ? { ...user, state: { status: "active", userId: "different-user" } }
        : user),
    };
    expect(() => assertP2RawBaselineIntegrity(mismatched)).toThrow("mismatched account state");
  });
});
