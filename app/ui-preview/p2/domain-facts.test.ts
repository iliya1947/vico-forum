import { describe, expect, it } from "vitest";
import { createP2RawBaseline, assertP2RawBaselineIntegrity, previewActorId,
  type PreviewRawBaseline } from "./raw-baseline";
import { P0_POST_BODY, P0_TOPIC_ID } from "../p0/fixture";
import { P0_ATTACHMENT_ID, P0_ATTACHMENT_BYTE_SIZE } from "../p0/attachment-fixture";
import { deriveAppealPolicy } from "../../../db/complaint-appeal-policy";
import { catalogDescriptors } from "../../localization/catalog";

const now = new Date("2026-11-24T10:00:00.000Z");
const baseline = () => createP2RawBaseline(now);
const mutate = (base: PreviewRawBaseline, domains: PreviewRawBaseline["domains"]): PreviewRawBaseline =>
  ({ ...base, domains });

describe("P2 cross-domain raw fixture integrity", () => {
  it("shares live and retained revisions with published forum records", () => {
    const base = baseline(), facts = base.domains;
    expect(facts.revisions.find((item) => item.id === base.topics[0]?.titleRevisionId))
      .toMatchObject({ kind: "topic-title", contentId: P0_TOPIC_ID, originalContent: base.topics[0]?.title });
    expect(facts.revisions.find((item) => item.id === "review-title-v0"))
      .toMatchObject({ kind: "topic-title", contentId: "preview-review-topic" });
    expect(facts.revisions.filter((item) => item.contentId === "preview-review-topic")).toHaveLength(2);
    expect(base.posts.find((post) => post.id === "p0-first-post")?.body)
      .toBe(P0_POST_BODY + "\n\n![P0 fixture image](vico-attachment:" + P0_ATTACHMENT_ID + ")");
    const reviewRevisions = facts.revisions.filter((item) => item.contentId === "preview-review-topic")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    expect(reviewRevisions[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
      base.topics.find((item) => item.id === "preview-review-topic")!.createdAt.getTime());
    expect(reviewRevisions[1]!.createdAt.getTime()).toBeGreaterThan(reviewRevisions[0]!.createdAt.getTime());
    expect(facts.tags).toContainEqual({ key: "typescript", name: "TypeScript" });
    expect(facts.attachmentPayloads[0]).toMatchObject({
      attachmentId: P0_ATTACHMENT_ID, byteSize: P0_ATTACHMENT_BYTE_SIZE,
    });
    expect(() => assertP2RawBaselineIntegrity(base)).not.toThrow();
  });

  it("keeps the same author, reporters, case, Decision and evidence under actor switches", () => {
    const base = baseline(), facts = base.domains;
    const complaint = facts.complaintCases.find((item) => item.id === "preview-case-resolved")!;
    const evidence = facts.complaintEvidence[0]!;
    expect(complaint.target).toEqual({
      kind: "post", topicId: P0_TOPIC_ID, postId: "p0-first-post",
      revisionId: "p0-post-body-revision",
    });
    expect(facts.complaintDecisions[0]?.caseId).toBe(complaint.id);
    expect(evidence).toMatchObject({ caseId: complaint.id, attachmentId: P0_ATTACHMENT_ID });
    expect(facts.complaintReports[0]?.reporterId).toBe(base.actorIds.member);
    expect(facts.complaintAppeals[0]?.appellantId).toBe("sample-author");
    for (const actor of ["guest", "member", "moderator", "admin", "owner", "inactive"] as const) {
      previewActorId(base, actor);
      expect(base.posts.find((post) => post.id === "p0-first-post")?.authorId).toBe("sample-author");
      expect(facts.complaintCases[0]?.target).toEqual(complaint.target);
    }
    expect(deriveAppealPolicy(facts.complaintDecisions[0]!.outcome, facts.complaintAppeals))
      .toMatchObject({ eligibleSide: "author", used: 1, pending: true });
  });

  it("has relative live session/measure/review timestamps, including inactive account", () => {
    const first = baseline();
    const shifted = createP2RawBaseline(new Date(now.getTime() + 7 * 86_400_000));
    expect(first.domains.sessions.map((session) => session.userId)).toContain(first.actorIds.inactive);
    for (const session of first.domains.sessions) {
      expect(session.issuedAt.getTime()).toBeLessThan(now.getTime());
      expect(session.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    }
    expect(shifted.domains.sessions[0]!.expiresAt.getTime() - first.domains.sessions[0]!.expiresAt.getTime())
      .toBe(7 * 86_400_000);
    expect(first.domains.measures[0]!.expiresAt!.getTime()).toBeGreaterThan(now.getTime());
    expect(shifted.domains.measures[0]!.expiresAt!.getTime() - first.domains.measures[0]!.expiresAt!.getTime())
      .toBe(7 * 86_400_000);
    expect(first.domains.complaintActivity[0]!.expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("preserves separate private facts and an honest Owner infrastructure placeholder", () => {
    const base = baseline();
    expect(base.domains.privacy.find((item) => item.userId === base.actorIds.member)?.showOnline).toBe(false);
    expect(base.domains.presence.some((item) => item.userId === base.actorIds.member)).toBe(false);
    expect(base.domains.notifications.find((item) => item.kind === "complaint-decision")?.caseId)
      .toBe("preview-case-resolved");
    expect(base.domains.registrationSettings).toMatchObject({
      googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 1,
    });
    expect(base.domains.locales.map((locale) => locale.tag)).toEqual(["en", "ru", "he"]);
    expect(base.domains.locales.find((locale) => locale.tag === "he")?.direction).toBe("rtl");
    expect(base.users.find((user) => user.identity.id === base.actorIds.moderator)?.identity.locale).toBe("ru");
    expect(base.domains).not.toHaveProperty("userPreferences");
    expect(catalogDescriptors().some((item) => item.namespace === "common" && item.key === "sa08Unavailable")).toBe(true);
    expect(base.domains.contentTranslations[0]).toMatchObject({
      contentType: "topic-title", contentId: "preview-review-topic",
      revisionId: "review-title-revision", targetLocale: "ru",
    });
    expect(base.domains.generationStatuses[0]).toMatchObject({ state: "pending", targetLocale: "he" });
    expect(base.domains.infrastructure).toEqual({
      area: "infrastructure", status: "placeholder", sources: [], figures: [],
    });
    expect(base.domains.operationalFacts[0]).toMatchObject({
      kind: "file.accepted", sourceId: P0_ATTACHMENT_ID, actorUserId: "sample-author",
    });
  });

  it("rejects a revision moved to another topic or an unrelated retained title", () => {
    const base = baseline();
    const broken = mutate(base, {
      ...base.domains,
      revisions: base.domains.revisions.map((revision) => revision.id === "p0-topic-title-revision"
        ? { ...revision, contentId: "preview-review-topic" } : revision),
    });
    expect(() => assertP2RawBaselineIntegrity(broken)).toThrow("revision owner mismatch");
    const stale = mutate(base, {
      ...base.domains, complaintCases: base.domains.complaintCases.map((item) => item.id === "preview-case-open"
        ? { ...item, target: { kind: "topic-title" as const,
          topicId: P0_TOPIC_ID, revisionId: "review-title-v0" } } : item),
    });
    expect(() => assertP2RawBaselineIntegrity(stale)).toThrow("revision owner mismatch");
    const premature = mutate(base, {
      ...base.domains,
      revisions: base.domains.revisions.map((revision) => revision.id === "review-title-v0"
        ? { ...revision, createdAt: new Date("2000-01-01T00:00:00Z") } : revision),
    });
    expect(() => assertP2RawBaselineIntegrity(premature)).toThrow("revision predates content");
  });

  it("rejects complaint evidence, Decision and Appeal attached to another case", () => {
    const base = baseline();
    const unrelated = mutate(base, {
      ...base.domains,
      complaintEvidence: [{ caseId: "preview-case-open",
        attachmentId: P0_ATTACHMENT_ID, revisionId: "review-title-v0" }],
    });
    expect(() => assertP2RawBaselineIntegrity(unrelated)).toThrow("evidence target/revision mismatch");
    const badDecision = mutate(base, {
      ...base.domains,
      complaintDecisions: base.domains.complaintDecisions.map((item) => ({
        ...item, caseId: "preview-case-open",
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(badDecision)).toThrow("orphan/mismatched Decision");
    const badAppeal = mutate(base, {
      ...base.domains,
      complaintAppeals: base.domains.complaintAppeals.map((item) => ({
        ...item, appellantId: "preview-admin",
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(badAppeal)).toThrow("appeal author mismatch");
    const badMeasureAppeal = mutate(base, {
      ...base.domains,
      measureAppeals: base.domains.measureAppeals.map((item) => ({
        ...item, appellantId: base.actorIds.member,
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(badMeasureAppeal)).toThrow("measure appeal subject mismatch");
    const lateAppeal = mutate(base, {
      ...base.domains,
      measureAppeals: base.domains.measureAppeals.map((appeal) => ({ ...appeal, createdAt: now })),
    });
    expect(() => assertP2RawBaselineIntegrity(lateAppeal)).toThrow("outside active account lifecycle");
  });

  it("rejects a fresh Complaint against an already superseded source revision", () => {
    const base = baseline();
    const stale = mutate(base, {
      ...base.domains,
      complaintCases: base.domains.complaintCases.map((item) => item.id === "preview-case-open"
        ? { ...item, target: { kind: "topic-title" as const,
          topicId: "preview-review-topic", revisionId: "review-title-v0" } } : item),
    });
    expect(() => assertP2RawBaselineIntegrity(stale)).toThrow("fresh complaint targets a stale");
    const missingActivityEvent = mutate(base, {
      ...base.domains,
      complaintHistory: base.domains.complaintHistory.filter((item) => item.event !== "review-started"),
    });
    expect(() => assertP2RawBaselineIntegrity(missingActivityEvent)).toThrow("no review-started event");
  });

  it("rejects privacy leakage, invalid translation references and wrong attachment bytes", () => {
    const base = baseline();
    const invisibleOnline = mutate(base, {
      ...base.domains,
      presence: [...base.domains.presence, { userId: base.actorIds.member, seenAt: now }],
    });
    expect(() => assertP2RawBaselineIntegrity(invisibleOnline)).toThrow("private user has public presence");
    const invalidLocale = mutate(base, {
      ...base.domains,
      uiTranslations: base.domains.uiTranslations.map((item) => ({ ...item, locale: "missing-locale" })),
    });
    expect(() => assertP2RawBaselineIntegrity(invalidLocale)).toThrow("UI translation locale");
    const invalidKey = mutate(base, {
      ...base.domains,
      uiTranslations: base.domains.uiTranslations.map((item) => ({ ...item, key: "not-in-catalog" })),
    });
    expect(() => assertP2RawBaselineIntegrity(invalidKey)).toThrow("unknown UI translation source");
    const wrongSource = mutate(base, {
      ...base.domains,
      contentTranslations: base.domains.contentTranslations.map((item) => ({
        ...item, revisionId: "review-title-v0",
      })),
    });
    // An earlier retained revision can legitimately have a translation: this remains well-linked.
    expect(() => assertP2RawBaselineIntegrity(wrongSource)).not.toThrow();
    const missingSource = mutate(base, {
      ...base.domains,
      contentTranslations: base.domains.contentTranslations.map((item) => ({
        ...item, revisionId: "unrelated-revision",
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(missingSource)).toThrow("missing revision");
    const invalidBytes = mutate(base, {
      ...base.domains,
      attachmentPayloads: base.domains.attachmentPayloads.map((item) => ({
        ...item, byteSize: item.byteSize + 1,
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(invalidBytes)).toThrow("attachment bytes/metadata mismatch");
    const fakedInfrastructure = mutate(base, {
      ...base.domains,
      infrastructure: {
        ...base.domains.infrastructure,
        figures: [{ monitorKey: "forum.state", field: "ready", value: true }],
      },
    });
    expect(() => assertP2RawBaselineIntegrity(fakedInfrastructure)).toThrow("non-measured placeholder");
  });

  it("rejects cross-reader notification, session, role and missing event references", () => {
    const base = baseline();
    const wrongNotification = mutate(base, {
      ...base.domains,
      notifications: base.domains.notifications.map((item) => item.kind === "reply"
        ? { ...item, topicId: P0_TOPIC_ID } : item),
    });
    expect(() => assertP2RawBaselineIntegrity(wrongNotification)).toThrow("notification post/topic mismatch");
    const wrongSession = mutate(base, {
      ...base.domains,
      sessions: base.domains.sessions.map((item) => item.id === "preview-session-owner"
        ? { ...item, userId: "missing-user" } : item),
    });
    expect(() => assertP2RawBaselineIntegrity(wrongSession)).toThrow("session user");
    const orphanHistory = mutate(base, {
      ...base.domains,
      complaintHistory: base.domains.complaintHistory.map((item) => ({
        ...item, caseId: "missing-case",
      })),
    });
    expect(() => assertP2RawBaselineIntegrity(orphanHistory)).toThrow("complaint history case");
  });
});
