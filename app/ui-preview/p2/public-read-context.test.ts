import { describe, expect, it } from "vitest";
import { authSessionForRequest } from "../../auth/request-context";
import { forumReaderForRequest, forumWriterContext } from "../../forum/request-context";
import { registryForRequest } from "../../localization/request-context";
import { P0_ATTACHMENT_ID } from "../p0/attachment-fixture";
import { P0_POST_BODY, P0_TOPIC_ID } from "../p0/fixture";
import { createP2RawBaseline, previewActorId } from "./raw-baseline";
import { createP2ForumReader, createP2PublicReadContext } from "./public-read-context";

const reference = new Date("2026-11-24T10:00:00.000Z");
const baseline = () => createP2RawBaseline(reference);

describe("P2 first production ForumReader and registry contexts", () => {
  it("reads connected category/section/topic counts from the single seed", async () => {
    const data = baseline();
    const reader = forumReaderForRequest(createP2PublicReadContext(data));
    expect(await reader.listCategories()).toEqual([
      { id: "sample-category", name: "Example category", sectionCount: 1 },
      { id: "projects-category", name: "Projects", sectionCount: 1 },
    ]);
    const homepage = await reader.readHomepage();
    expect(homepage.map(({ id, sectionCount, topicCount, messageCount }) =>
      ({ id, sectionCount, topicCount, messageCount }))).toEqual([
      { id: "sample-category", sectionCount: 1, topicCount: 1, messageCount: 1 },
      { id: "projects-category", sectionCount: 1, topicCount: 1, messageCount: 2 },
    ]);
    expect(homepage[1]?.sections[0]).toMatchObject({
      id: "review-section", topicCount: 1, messageCount: 2,
    });
    expect(await reader.readSection("nonexistent")).toBeUndefined();
    expect((await reader.readSection("review-section"))?.topics[0]).toMatchObject({
      id: "preview-review-topic", authorName: "Preview member", postCount: 2,
      tags: [{ key: "typescript", name: "TypeScript" }],
    });
  });

  it("projects original P0 content and attachment through the typed TopicPage contract", async () => {
    const data = baseline();
    const reader = createP2ForumReader(data);
    const topic = await reader.readTopicPage(P0_TOPIC_ID);
    expect(topic).toMatchObject({
      id: P0_TOPIC_ID, authorId: "sample-author", authorName: "Preview author",
      section: { id: "sample-section", category: { id: "sample-category" } },
      isSolved: false, isClosed: false, title: { id: "p0-topic-title-revision" },
    });
    expect(topic?.posts[0]).toMatchObject({
      id: "p0-first-post", authorId: "sample-author", parentPostId: null,
      body: { id: "p0-post-body-revision",
        originalContent: P0_POST_BODY + "\n\n![P0 fixture image](vico-attachment:" + P0_ATTACHMENT_ID + ")" },
      attachments: [{ id: P0_ATTACHMENT_ID, detectedType: "png", byteSize: 79 }],
    });
    expect(await reader.readTopicPage("nonexistent")).toBeUndefined();
    expect(await reader.readPostLocation("p0-first-post")).toEqual({
      topicId: P0_TOPIC_ID, authorId: "sample-author",
    });
    expect(await reader.readPostLocation("nonexistent")).toBeUndefined();
    expect(await reader.readTopicPinState(P0_TOPIC_ID)).toBe(false);
    expect((await reader.readTopicPage("preview-review-topic"))?.bestAnswerPostId)
      .toBe("preview-review-reply");
  });

  it("resolves public topic/tag/mention data without private User or Owner columns", async () => {
    const reader = createP2ForumReader(baseline());
    expect(await reader.readTags()).toEqual([{ key: "typescript", name: "TypeScript", topicCount: 2 }]);
    expect((await reader.readTag("typescript"))?.topics.map((topic) => topic.id)).toEqual([
      "preview-review-topic", P0_TOPIC_ID,
    ]);
    expect(await reader.readTag("invalid")).toBeUndefined();
    expect(await reader.searchMentionableUsers("PREVIEW")).toEqual([
      { id: "preview-admin", name: "Preview admin" },
      { id: "sample-author", name: "Preview author" },
      { id: "p0-preview-user", name: "Preview member" },
      { id: "preview-moderator", name: "Preview moderator" },
      { id: "preview-owner", name: "Preview owner" },
    ]);
    expect(await reader.searchMentionableUsers("Inactive")).toEqual([]);
    expect(await reader.searchMentionableUsers("")).toEqual([]);
    expect(await reader.searchMentionableUsers("x".repeat(65))).toEqual([]);
    const publicPage = JSON.stringify(await reader.readTopicPage(P0_TOPIC_ID));
    expect(publicPage).not.toContain("@preview.invalid");
    expect(publicPage).not.toContain("deactivatedAt");
    expect(publicPage).not.toContain("ownerUserId");
    expect(publicPage).not.toContain("methods");
  });

  it("filters online presence against the original privacy and lifecycle facts", async () => {
    const data = baseline();
    const reader = createP2ForumReader(data);
    expect(await reader.readOnlinePresence()).toEqual({
      count: 1, members: [{ id: "preview-moderator", name: "Preview moderator", image: null }],
    });
    const altered = {
      ...data, domains: {
        ...data.domains,
        presence: [...data.domains.presence,
          { userId: data.actorIds.member, seenAt: reference },
          { userId: data.actorIds.inactive, seenAt: reference }],
      },
    };
    expect(await createP2ForumReader(altered).readOnlinePresence()).toEqual(
      await reader.readOnlinePresence());
  });

  it("uses the production deleted-account projection instead of revealing retained identity", async () => {
    const data = baseline();
    const deleted = {
      ...data,
      topics: data.topics.map((topic) => topic.id === P0_TOPIC_ID
        ? { ...topic, authorId: data.actorIds.inactive } : topic),
      posts: data.posts.map((post) => post.id === "p0-first-post"
        ? { ...post, authorId: data.actorIds.inactive } : post),
    };
    const page = await createP2ForumReader(deleted).readTopicPage(P0_TOPIC_ID);
    expect(page?.authorName).toBe("Deleted user");
    expect(page?.authorIdentityKind).toBe("deleted");
    expect(page?.posts[0]?.authorName).toBe("Deleted user");
    expect(page?.posts[0]?.authorImage).toBeNull();
    const text = JSON.stringify(page);
    expect(text).not.toContain("Inactive member");
    expect(text).not.toContain("deactivatedAt");
    expect(text).not.toContain("@preview.invalid");
  });

  it("keeps public record ownership stable under every selected actor", async () => {
    const data = baseline();
    const reader = createP2ForumReader(data);
    for (const selected of ["guest", "member", "moderator", "admin", "owner", "inactive"] as const) {
      previewActorId(data, selected);
      const topic = await reader.readTopicPage(P0_TOPIC_ID);
      expect(topic?.authorId).toBe("sample-author");
      expect(topic?.posts[0]?.authorId).toBe("sample-author");
    }
  });

  it("keeps unconfigured methods and context capabilities fail-closed", () => {
    const context = createP2PublicReadContext(baseline());
    const reader = forumReaderForRequest(context);
    expect(() => reader.readPopular).toThrow(
      "P2 forum reader capability not configured: readPopular");
    expect(() => reader.readNotifications).toThrow(
      "P2 forum reader capability not configured: readNotifications");
    expect(() => context.get(forumWriterContext)).toThrow();
    expect(authSessionForRequest(context)).toBeNull();
  });

  it("loads the raw locale rows through the real persistent-registry implementation", async () => {
    const data = baseline();
    const first = createP2PublicReadContext(data);
    const second = createP2PublicReadContext(data);
    const one = await registryForRequest(first);
    const two = await registryForRequest(second);
    expect(first).not.toBe(second);
    expect(one.health).toEqual({ status: "healthy" });
    expect(one.registry.activeLocales().map((item) => item.tag)).toEqual(["en", "ru", "he"]);
    expect(one.registry.find("he")?.locale.direction).toBe("rtl");
    expect(one.registry.find("iw")?.locale.tag).toBe("he");
    expect(one.semanticIdentity).toBe(two.semanticIdentity);
  });
});
