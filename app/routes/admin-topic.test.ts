import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { ADMIN_FORUM_PERMISSIONS } from "../admin/access";
import { forumReaderContext } from "../forum/request-context";
import { localeContext, registryLoaderContext, contentTranslationPresentationContext } from "../localization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { loader } from "./admin-topic";

function topicFixture() {
  return {
    id: "topic/עברית", title: { id: "title-r1", originalContent: "Hebrew original", sourceLocale: "he" },
    section: { id: "help-solutions-questions", name: "Internal Help", category: { id: "help-solutions", name: "Help" } },
    authorId: "author", authorName: "Author", isPinned: true, isSolved: false,
    bestAnswerPostId: null, needsDetails: false, duplicateDisputed: true,
    duplicateOf: { id: "original", title: "Original" }, duplicateRelationshipId: "private-relationship",
    createdAt: new Date("2026-01-01T00:00:00Z"), tags: [{ key: "react", name: "React" }],
    posts: [
      { id: "post-a", authorId: "author", authorName: "Author", authorImage: null,
        parentPostId: null, createdAt: new Date("2026-01-01T00:00:00Z"), editedAt: null,
        body: { id: "body-r1", originalContent: "Hello **markdown**", sourceLocale: "en" },
        solutionModerationStatus: null, solutionOutdatedReason: null,
        attachments: [{ id: "attach-1", fileName: "picture.png", byteSize: 12, detectedType: "png" }] },
      { id: "post-b", authorId: "other", authorName: "Other", authorImage: null,
        parentPostId: "post-a", createdAt: new Date("2026-01-02T00:00:00Z"), editedAt: null,
        body: { id: "body-r2", originalContent: "", sourceLocale: "und" },
        solutionModerationStatus: null, solutionOutdatedReason: null, attachments: [] },
    ],
  };
}

function environment(permissions: readonly string[] = [], signedIn = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, signedIn ? { user: { id: "actor" } } as never : null);
  const has = vi.fn(async (key: string) => permissions.includes(key));
  context.set(authorizationContext, { forUser: () => ({ has }) } as never);
  const readTopicPage = vi.fn(async () => topicFixture());
  const readPendingHelpDuplicateAppeal = vi.fn(async () => ({
    id: "private-appeal", relationshipId: "private-relationship",
    explanation: "PRIVATE EXPLANATION", createdAt: new Date("2026-02-01T00:00:00Z"),
  }));
  context.set(forumReaderContext, { readTopicPage, readPendingHelpDuplicateAppeal } as never);
  context.set(localeContext, { translationLocale: "he", direction: "rtl" } as never);
  context.set(registryLoaderContext, async () => ({
    registry: { find: (locale: string) => ({ locale: { direction: locale === "he" ? "rtl" : "ltr" } }) },
  }) as never);
  const readCurrent = vi.fn(async (revisions: readonly {
    contentType: "topic-title" | "post-body"; contentId: string; revisionId: string;
    originalContent: string; sourceLocale: string;
  }[]) => revisions.map((revision) => ({
    contentType: revision.contentType, contentId: revision.contentId, revisionId: revision.revisionId,
    selected: "original" as const, content: revision.originalContent,
    contentLocale: revision.sourceLocale === "und" ? undefined : revision.sourceLocale,
    contentDirection: revision.sourceLocale === "he" ? "rtl" as const : "ltr" as const,
    originalContent: revision.originalContent,
    originalLocale: revision.sourceLocale === "und" ? undefined : revision.sourceLocale,
    originalDirection: revision.sourceLocale === "he" ? "rtl" as const : "ltr" as const,
  })));
  context.set(contentTranslationPresentationContext, { readCurrent } as never);
  return { context, has, readTopicPage, readPendingHelpDuplicateAppeal, readCurrent };
}
const args = (context: RouterContextProvider, topicId = "topic/עברית") => ({ context, params: { locale: "he", topicId } });

describe("AP-07 private admin topic loader", () => {
  it("denies before target validation and private reads", async () => {
    for (const [perms, signedIn, status] of [
      [[], false, 401], [[], true, 403], [["access.authorization.manage"], true, 403],
      [["admin.history.read"], true, 403], [["forum.solution.manageOwn"], true, 403],
      [["forum.helpNeedsDetails.manage", "forum.attachmentSecurity.read"], true, 403],
      [["forum.complaint.review"], true, 403],
    ] as const) {
      const e = environment(perms, signedIn);
      await expect(loader(args(e.context, ""))).rejects.toMatchObject({ status });
      expect(e.readTopicPage).not.toHaveBeenCalled();
      expect(e.readPendingHelpDuplicateAppeal).not.toHaveBeenCalled();
      expect(e.readCurrent).not.toHaveBeenCalled();
    }
  });

  it.each(ADMIN_FORUM_PERMISSIONS)("admits %s alone without granting unrelated actions", async (permission) => {
    const e = environment([permission]);
    const result = await loader(args(e.context));
    expect(result.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(e.readTopicPage).toHaveBeenCalledWith("topic/עברית");
    expect(result.data.access.canReadForum).toBe(true);
    expect(result.data.canManagePin).toBe(permission === "forum.topic.pin");
    expect(result.data.canCorrectAnySourceLocale).toBe(permission === "forum.sourceLocale.correctAny");
    expect(result.data.canManageAnySolution).toBe(permission === "forum.solution.manageAny");
    expect(result.data.canReadPostHistory).toBe(permission === "forum.post.history.read");
    expect(result.data.actorId).toBe("actor");
    expect(result.data.canManageHelpDuplicate).toBe(permission === "forum.helpDuplicate.manage");
    expect(result.data.topic.duplicateRelationshipId).toBe(permission === "forum.helpDuplicate.manage" ? "private-relationship" : null);
    expect(result.data.pendingDuplicateAppeal).toEqual(permission === "forum.helpDuplicate.manage" ? { id: "private-appeal" } : null);
    expect(e.readPendingHelpDuplicateAppeal).toHaveBeenCalledTimes(permission === "forum.helpDuplicate.manage" ? 1 : 0);
    expect(JSON.stringify(result.data)).not.toContain("PRIVATE EXPLANATION");
    expect(JSON.stringify(result.data)).not.toContain("private-appeal-description");
    expect(JSON.stringify(result.data)).not.toContain("private@test.invalid");
    expect(result.data.topic.posts).toHaveLength(2);
    expect(result.data.topic.posts[0]).toMatchObject({ id: "post-a", body: { id: "body-r1" }, attachments: [{ id: "attach-1" }] });
    expect(result.data.topic.posts[1]).toMatchObject({ id: "post-b", editedAt: null });
    expect(result.data.postPresentations[1]).toMatchObject({ content: "", contentDirection: "auto", originalLocale: undefined });
    expect(e.readCurrent).toHaveBeenCalledTimes(1);
    expect(e.readCurrent.mock.calls[0]?.[0]).toHaveLength(2); // title + text-only post; attachment-only is excluded
  });

  it("handles invalid/missing topics and classified outages without leaking data", async () => {
    for (const id of ["", "\0", "x".repeat(2049)]) {
      const e = environment(["forum.topic.pin"]);
      await expect(loader(args(e.context, id))).rejects.toMatchObject({ status: 400 });
      expect(e.readTopicPage).not.toHaveBeenCalled();
    }
    const missing = environment(["forum.topic.pin"]);
    missing.readTopicPage.mockResolvedValueOnce(undefined as never);
    await expect(loader(args(missing.context))).rejects.toMatchObject({ status: 404 });
    const storage = environment(["forum.topic.pin"]);
    storage.readTopicPage.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await expect(loader(args(storage.context))).rejects.toMatchObject({ status: 503 });
    const auth = environment(["forum.topic.pin"]);
    auth.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(loader(args(auth.context))).rejects.toMatchObject({ status: 503 });
    expect(auth.readTopicPage).not.toHaveBeenCalled();
    const unexpected = new Error("unexpected schema");
    const err = environment(["forum.topic.pin"]);
    err.readTopicPage.mockRejectedValueOnce(unexpected);
    await expect(loader(args(err.context))).rejects.toBe(unexpected);
  });

  it("keeps duplicate appeal reads independently protected and fails closed", async () => {
    const e = environment(["forum.helpDuplicate.manage"]);
    e.readPendingHelpDuplicateAppeal.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await expect(loader(args(e.context))).rejects.toMatchObject({ status: 503 });
    const other = environment(["forum.helpDuplicate.manage"]);
    other.readTopicPage.mockResolvedValueOnce({ ...topicFixture(), duplicateOf: null } as never);
    const result = await loader(args(other.context));
    expect(result.data.pendingDuplicateAppeal).toBeNull();
    expect(other.readPendingHelpDuplicateAppeal).not.toHaveBeenCalled();
  });
});
