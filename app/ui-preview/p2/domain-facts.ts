import type { PreviewRawBaseline } from "./raw-baseline";
import type { RegistrationSettings } from "../../../db/registration-settings";
import type { UserMeasureRestrictionId } from "../../admin/user-measure-restrictions";
import type { ComplaintReason, ComplaintOutcome, ComplaintTarget } from "../../../db/complaints-domain";
import { deriveAppealPolicy, type AppealSide, type AppealResult } from "../../../db/complaint-appeal-policy";
import type { LocaleDefinition } from "../../localization/locale";
import { InMemoryLocaleRegistry, localeRegistry } from "../../localization/registry";
import { catalogDescriptors } from "../../localization/catalog";
import type { StoredContentTranslation } from "../../localization/content-translation";
import type { ContentGenerationTaskStatus } from "../../localization/content-generation-status";
import type { OwnerOperationalFact } from "../../observability/operational-facts";
import type { OverviewArea } from "../../../db/owner-overview-catalog";
import { P0_TOPIC_ID } from "../p0/fixture";
import { P0_ATTACHMENT_ID, P0_ATTACHMENT_BYTE_SIZE, P0_ATTACHMENT_PNG_BASE64 } from "../p0/attachment-fixture";

type Core = Pick<PreviewRawBaseline,
  "referenceTime" | "ownerUserId" | "users" | "topics" | "posts" | "attachments">;

export interface PreviewRawRevision {
  readonly id: string;
  readonly kind: "topic-title" | "post-body";
  readonly contentId: string;
  readonly originalContent: string;
  readonly sourceLocale: string;
  readonly createdAt: Date;
}
export interface PreviewRawComplaintCase {
  readonly id: string;
  readonly target: ComplaintTarget;
  readonly state: "open" | "resolved";
  readonly version: number;
  readonly initialDecisionId: string | null;
}
export interface PreviewRawComplaintAppeal {
  readonly id: string;
  readonly caseId: string;
  readonly decisionId: string;
  readonly appellantId: string;
  readonly side: AppealSide;
  readonly ordinal: number;
  readonly argument: string;
  readonly status: "pending" | "resolved";
  readonly outcome: AppealResult | null;
  readonly createdAt: Date;
}
export interface PreviewRawDomainFacts {
  readonly sessions: readonly {
    readonly id: string; readonly userId: string; readonly issuedAt: Date; readonly expiresAt: Date;
  }[];
  readonly revisions: readonly PreviewRawRevision[];
  readonly tags: readonly { readonly key: string; readonly name: string }[];
  readonly notifications: readonly {
    readonly id: string; readonly recipientId: string; readonly actorId: string | null;
    readonly kind: "reply" | "mention" | "complaint-decision" | "complaint-appeal-result";
    readonly topicId: string | null; readonly postId: string | null;
    readonly caseId: string | null; readonly createdAt: Date; readonly readAt: Date | null;
  }[];
  readonly presence: readonly { readonly userId: string; readonly seenAt: Date }[];
  readonly privacy: readonly { readonly userId: string; readonly showOnline: boolean }[];
  readonly registrationSettings: RegistrationSettings;
  readonly measures: readonly {
    readonly id: string; readonly targetUserId: string; readonly issuerId: string;
    readonly restrictions: readonly UserMeasureRestrictionId[]; readonly version: number;
    readonly createdAt: Date; readonly expiresAt: Date | null; readonly liftedAt: Date | null; readonly reason: string;
  }[];
  readonly measureAppeals: readonly {
    readonly id: string; readonly measureId: string; readonly appellantId: string;
    readonly status: "pending" | "rejected" | "accepted" | "moot"; readonly ordinal: number;
    readonly createdAt: Date;
  }[];
  readonly complaintCases: readonly PreviewRawComplaintCase[];
  readonly complaintReports: readonly {
    readonly id: string; readonly caseId: string; readonly reporterId: string;
    readonly reason: ComplaintReason; readonly explanation: string; readonly createdAt: Date;
  }[];
  readonly complaintEvidence: readonly {
    readonly caseId: string; readonly attachmentId: string; readonly revisionId: string;
  }[];
  readonly complaintDecisions: readonly {
    readonly id: string; readonly caseId: string; readonly reviewerId: string;
    readonly outcome: ComplaintOutcome; readonly reasoning: string; readonly createdAt: Date;
  }[];
  readonly complaintAppeals: readonly PreviewRawComplaintAppeal[];
  readonly complaintNotes: readonly {
    readonly id: string; readonly caseId: string; readonly authorId: string;
    readonly body: string; readonly createdAt: Date;
  }[];
  readonly complaintActivity: readonly {
    readonly caseId: string; readonly reviewerId: string; readonly expiresAt: Date;
  }[];
  readonly complaintHistory: readonly {
    readonly id: string; readonly caseId: string; readonly actorId: string | null;
    readonly event: "submitted" | "decision" | "appeal-submitted" | "review-started";
    readonly occurredAt: Date;
  }[];
  readonly locales: readonly LocaleDefinition[];
  readonly uiTranslations: readonly {
    readonly locale: string; readonly namespace: string; readonly key: string;
    readonly translatedContent: string; readonly origin: "persistent_manual" | "machine";
    readonly status: "approved" | "pending";
  }[];
  readonly contentTranslations: readonly StoredContentTranslation[];
  readonly generationStatuses: readonly (ContentGenerationTaskStatus & { readonly targetLocale: string })[];
  readonly attachmentPayloads: readonly {
    readonly attachmentId: string; readonly byteSize: number; readonly bytesBase64: string;
  }[];
  readonly operationalFacts: readonly OwnerOperationalFact[];
  /** Owner only. Stage 6 infrastructure remains an explicit, unmeasured placeholder. */
  readonly infrastructure: OverviewArea & { readonly area: "infrastructure"; readonly status: "placeholder" };
}

export function createP2DomainFacts(core: Core): PreviewRawDomainFacts {
  const day = 24 * 60 * 60 * 1000;
  const at = (delta: number) => new Date(core.referenceTime.getTime() + delta);
  const memberId = "p0-preview-user";
  const authorId = "sample-author";
  const moderatorId = "preview-moderator";
  const adminId = "preview-admin";
  const inactiveId = "preview-inactive";
  const reviewTopicId = "preview-review-topic";
  const reviewPostId = "preview-review-post";
  const reviewReplyId = "preview-review-reply";
  const resolvedCaseId = "preview-case-resolved";
  const openCaseId = "preview-case-open";
  const decisionId = "preview-decision-one";
  const measureId = "ba0869ee-a2a4-4f6a-b133-197e5ae62f3a";
  const ownerBinding = core.ownerUserId;

  const facts: PreviewRawDomainFacts = {
    sessions: [
      { id: "preview-session-member", userId: memberId, issuedAt: at(-6 * 60 * 60 * 1000), expiresAt: at(day) },
      { id: "preview-session-moderator", userId: moderatorId, issuedAt: at(-6 * 60 * 60 * 1000), expiresAt: at(day) },
      { id: "preview-session-admin", userId: adminId, issuedAt: at(-6 * 60 * 60 * 1000), expiresAt: at(day) },
      { id: "preview-session-owner", userId: ownerBinding, issuedAt: at(-6 * 60 * 60 * 1000), expiresAt: at(day) },
      { id: "preview-session-inactive", userId: inactiveId, issuedAt: at(-2 * day), expiresAt: at(day) },
    ],
    revisions: [
      { id: "p0-topic-title-revision", kind: "topic-title", contentId: P0_TOPIC_ID,
        originalContent: core.topics[0]!.title, sourceLocale: "en", createdAt: at(-4 * day) },
      { id: "p0-post-body-revision", kind: "post-body", contentId: "p0-first-post",
        originalContent: core.posts[0]!.body, sourceLocale: "en", createdAt: at(-4 * day + 60 * 60 * 1000) },
      { id: "review-title-v0", kind: "topic-title", contentId: reviewTopicId,
        originalContent: "Early project feedback", sourceLocale: "en", createdAt: at(-3 * day) },
      { id: "review-title-revision", kind: "topic-title", contentId: reviewTopicId,
        originalContent: core.topics[1]!.title, sourceLocale: "en", createdAt: at(-3 * day + 60 * 60 * 1000) },
      { id: "preview-review-body-revision", kind: "post-body", contentId: reviewPostId,
        originalContent: core.posts[1]!.body, sourceLocale: "en", createdAt: at(-3 * day + 60 * 60 * 1000) },
      { id: "preview-review-reply-revision", kind: "post-body", contentId: reviewReplyId,
        originalContent: core.posts[2]!.body, sourceLocale: "en", createdAt: at(-3 * day + 2 * 60 * 60 * 1000) },
    ],
    tags: [{ key: "typescript", name: "TypeScript" }],
    notifications: [
      { id: "preview-notification-reply", recipientId: memberId, actorId: moderatorId,
        kind: "reply", topicId: reviewTopicId, postId: reviewReplyId,
        caseId: null, createdAt: at(-3 * day + 3 * 60 * 60 * 1000), readAt: null },
      { id: "preview-notification-decision", recipientId: authorId, actorId: moderatorId,
        kind: "complaint-decision", topicId: null, postId: null,
        caseId: resolvedCaseId, createdAt: at(-day), readAt: at(-day + 60 * 60 * 1000) },
    ],
    presence: [{ userId: moderatorId, seenAt: at(-60 * 1000) }],
    privacy: [
      { userId: memberId, showOnline: false },
      { userId: moderatorId, showOnline: true },
    ],
    registrationSettings: {
      googleRegistrationEnabled: true, emailRegistrationEnabled: true,
      version: 1, updatedAt: at(-day).toISOString(),
    },
    measures: [
      { id: measureId, targetUserId: inactiveId, issuerId: adminId,
        restrictions: ["topics.create", "replies.create"], version: 1,
        createdAt: at(-5 * day), expiresAt: at(2 * day), liftedAt: null, reason: "Synthetic temporary restriction" },
    ],
    measureAppeals: [
      { id: "7c7ad00b-3d59-4942-a3f8-0c856b065d04", measureId, appellantId: inactiveId,
        status: "pending", ordinal: 1, createdAt: at(-2 * day) },
    ],
    complaintCases: [
      { id: resolvedCaseId,
        target: { kind: "post", topicId: P0_TOPIC_ID, postId: "p0-first-post", revisionId: "p0-post-body-revision" },
        state: "resolved", version: 2, initialDecisionId: decisionId },
      { id: openCaseId,
        target: { kind: "topic-title", topicId: reviewTopicId, revisionId: "review-title-revision" },
        state: "open", version: 1, initialDecisionId: null },
    ],
    complaintReports: [
      { id: "preview-report-resolved", caseId: resolvedCaseId, reporterId: memberId,
        reason: "spam", explanation: "Synthetic report evidence", createdAt: at(-2 * day) },
      { id: "preview-report-open", caseId: openCaseId, reporterId: authorId,
        reason: "other", explanation: "Synthetic title report", createdAt: at(-day) },
    ],
    complaintEvidence: [
      { caseId: resolvedCaseId, attachmentId: P0_ATTACHMENT_ID, revisionId: "p0-post-body-revision" },
    ],
    complaintDecisions: [
      { id: decisionId, caseId: resolvedCaseId, reviewerId: moderatorId,
        outcome: "confirmed", reasoning: "Synthetic decision", createdAt: at(-day) },
    ],
    complaintAppeals: [
      { id: "preview-case-appeal", caseId: resolvedCaseId, decisionId,
        appellantId: authorId, side: "author", ordinal: 1, argument: "Synthetic appeal",
        status: "pending", outcome: null, createdAt: at(-12 * 60 * 60 * 1000) },
    ],
    complaintNotes: [
      { id: "preview-case-note", caseId: resolvedCaseId, authorId: moderatorId,
        body: "Synthetic reviewer note", createdAt: at(-day) },
    ],
    complaintActivity: [
      { caseId: openCaseId, reviewerId: adminId, expiresAt: at(60 * 1000) },
    ],
    complaintHistory: [
      { id: "preview-case-history-submit", caseId: resolvedCaseId, actorId: memberId,
        event: "submitted", occurredAt: at(-2 * day) },
      { id: "preview-case-history-decision", caseId: resolvedCaseId, actorId: moderatorId,
        event: "decision", occurredAt: at(-day) },
      { id: "preview-case-history-appeal", caseId: resolvedCaseId, actorId: authorId,
        event: "appeal-submitted", occurredAt: at(-12 * 60 * 60 * 1000) },
      { id: "preview-case-open-submit", caseId: openCaseId, actorId: authorId,
        event: "submitted", occurredAt: at(-day) },
      { id: "preview-case-open-review", caseId: openCaseId, actorId: adminId,
        event: "review-started", occurredAt: at(-30 * 1000) },
    ],
    locales: localeRegistry.activeLocales().map((locale) => ({
      ...locale, fallbackChain: [...locale.fallbackChain],
    })),
    uiTranslations: [
      { locale: "ru", namespace: "common", key: "sa08Unavailable",
        translatedContent: "Источник недоступен", origin: "persistent_manual", status: "approved" },
    ],
    contentTranslations: [
      { contentType: "topic-title", contentId: reviewTopicId, revisionId: "review-title-revision",
        targetLocale: "ru", sourceLocale: "en", translatedContent: "Обратная связь по проекту",
        provenance: { origin: "persistent_manual" } },
    ],
    generationStatuses: [
      { contentType: "post-body", contentId: reviewPostId, revisionId: "preview-review-body-revision",
        targetLocale: "he", state: "pending" },
    ],
    attachmentPayloads: [
      { attachmentId: P0_ATTACHMENT_ID, byteSize: P0_ATTACHMENT_BYTE_SIZE,
        bytesBase64: P0_ATTACHMENT_PNG_BASE64 },
    ],
    operationalFacts: [
      { kind: "file.accepted", sourceId: P0_ATTACHMENT_ID,
        occurredAt: at(-4 * day).toISOString(), occurrenceDigest: "a".repeat(64),
        actorUserId: authorId, values: { schemaVersion: 1, detectedType: "png", byteSize: P0_ATTACHMENT_BYTE_SIZE } },
    ],
    infrastructure: { area: "infrastructure", status: "placeholder", sources: [], figures: [] },
  };
  assertP2DomainFactsIntegrity(core, facts);
  return facts;
}

export function assertP2DomainFactsIntegrity(core: Core, facts: PreviewRawDomainFacts): void {
  const ids = <T>(rows: readonly T[], read: (row: T) => string, kind: string) => {
    const keys = rows.map(read);
    if (keys.some((id) => !id) || new Set(keys).size !== keys.length) {
      throw new Error("P2 domain duplicate/empty " + kind);
    }
    return new Set(keys);
  };
  const users = ids(core.users, (row) => row.identity.id, "user");
  const topics = ids(core.topics, (row) => row.id, "topic");
  const posts = ids(core.posts, (row) => row.id, "post");
  const attachments = ids(core.attachments, (row) => row.id, "attachment");
  const revisions = ids(facts.revisions, (row) => row.id, "revision");
  const cases = ids(facts.complaintCases, (row) => row.id, "complaint case");
  const decisions = ids(facts.complaintDecisions, (row) => row.id, "complaint decision");
  const measures = ids(facts.measures, (row) => row.id, "measure");
  const requireRef = (keys: ReadonlySet<string>, id: string, kind: string) => {
    if (!keys.has(id)) throw new Error("P2 domain missing " + kind + ": " + id);
  };
  const revisionFor = (id: string, kind: PreviewRawRevision["kind"], contentId: string) => {
    requireRef(revisions, id, "revision");
    const revision = facts.revisions.find((row) => row.id === id)!;
    if (revision.kind !== kind || revision.contentId !== contentId) {
      throw new Error("P2 domain revision owner mismatch: " + id);
    }
    return revision;
  };
  for (const session of facts.sessions) {
    requireRef(users, session.userId, "session user");
    if (session.issuedAt >= core.referenceTime || session.expiresAt <= core.referenceTime) {
      throw new Error("P2 domain session outside reference clock");
    }
  }
  ids(facts.sessions, (row) => row.id, "session");
  for (const topic of core.topics) {
    const current = revisionFor(topic.titleRevisionId, "topic-title", topic.id);
    if (current.originalContent !== topic.title || current.sourceLocale !== topic.sourceLocale) {
      throw new Error("P2 domain topic current revision mismatch");
    }
  }
  for (const post of core.posts) {
    const current = revisionFor(post.bodyRevisionId, "post-body", post.id);
    if (current.originalContent !== post.body || current.sourceLocale !== post.sourceLocale) {
      throw new Error("P2 domain post current revision mismatch");
    }
  }
  for (const revision of facts.revisions) {
    requireRef(revision.kind === "topic-title" ? topics : posts, revision.contentId, "revision content");
    const sourceCreatedAt = revision.kind === "topic-title"
      ? core.topics.find((row) => row.id === revision.contentId)!.createdAt
      : core.posts.find((row) => row.id === revision.contentId)!.createdAt;
    if (revision.createdAt < sourceCreatedAt) throw new Error("P2 domain revision predates content");
  }
  const tags = ids(facts.tags, (row) => row.key, "tag");
  for (const topic of core.topics) for (const tag of topic.tags) requireRef(tags, tag, "topic tag");
  const registry = new InMemoryLocaleRegistry(facts.locales.filter((locale) => locale.tag !== "en"));
  const locales = new Set(registry.activeLocales().map((locale) => locale.tag));
  // The preferred language has a single source: the production auth user.locale field.
  for (const user of core.users) if (user.identity.locale) {
    requireRef(locales, user.identity.locale, "account locale");
  }
  for (const privacy of facts.privacy) requireRef(users, privacy.userId, "privacy user");
  ids(facts.privacy, (row) => row.userId, "privacy");
  for (const presence of facts.presence) {
    requireRef(users, presence.userId, "presence user");
    if (facts.privacy.some((privacy) => privacy.userId === presence.userId && !privacy.showOnline)) {
      throw new Error("P2 domain private user has public presence");
    }
  }
  ids(facts.presence, (row) => row.userId, "presence");
  if (facts.registrationSettings.version < 1
    || !Number.isFinite(Date.parse(facts.registrationSettings.updatedAt))) {
    throw new Error("P2 domain invalid registration version or time");
  }
  for (const measure of facts.measures) {
    requireRef(users, measure.targetUserId, "measure target");
    requireRef(users, measure.issuerId, "measure issuer");
    if (!measure.restrictions.length || new Set(measure.restrictions).size !== measure.restrictions.length
      || measure.createdAt >= core.referenceTime
      || (measure.expiresAt !== null && measure.expiresAt <= core.referenceTime)) {
      throw new Error("P2 domain invalid active measure");
    }
  }
  ids(facts.measureAppeals, (row) => row.id, "measure appeal");
  for (const appeal of facts.measureAppeals) {
    requireRef(measures, appeal.measureId, "measure appeal measure");
    const measure = facts.measures.find((row) => row.id === appeal.measureId)!;
    if (appeal.appellantId !== measure.targetUserId) {
      throw new Error("P2 domain measure appeal subject mismatch");
    }
    const targetState = core.users.find((row) => row.identity.id === appeal.appellantId)?.state;
    if (appeal.createdAt < measure.createdAt
      || (targetState?.status === "deactivated" && appeal.createdAt >= targetState.deactivatedAt)) {
      throw new Error("P2 domain measure appeal outside active account lifecycle");
    }
  }
  for (const complaint of facts.complaintCases) {
    requireRef(topics, complaint.target.topicId, "complaint topic");
    const target = complaint.target;
    if (target.kind === "post") {
      const post = core.posts.find((row) => row.id === target.postId);
      if (post?.topicId !== target.topicId) throw new Error("P2 domain complaint post/topic mismatch");
      revisionFor(target.revisionId, "post-body", target.postId);
    } else revisionFor(target.revisionId, "topic-title", target.topicId);
    if (complaint.state === "resolved" ? complaint.initialDecisionId === null : complaint.initialDecisionId !== null) {
      throw new Error("P2 domain complaint Decision state mismatch");
    }
    if (complaint.initialDecisionId) requireRef(decisions, complaint.initialDecisionId, "initial decision");
  }
  ids(facts.complaintReports, (row) => row.id, "complaint report");
  for (const report of facts.complaintReports) {
    requireRef(cases, report.caseId, "report case");
    requireRef(users, report.reporterId, "reporter");
    const complaint = facts.complaintCases.find((item) => item.id === report.caseId)!;
    const target = complaint.target;
    const reportedRevision = facts.revisions.find((item) => item.id === target.revisionId)!;
    const currentId = target.kind === "post"
      ? core.posts.find((item) => item.id === target.postId)!.bodyRevisionId
      : core.topics.find((item) => item.id === target.topicId)!.titleRevisionId;
    const current = facts.revisions.find((item) => item.id === currentId)!;
    if (report.createdAt < reportedRevision.createdAt
      || (target.revisionId !== currentId && report.createdAt >= current.createdAt)) {
      throw new Error("P2 domain fresh complaint targets a stale or future revision");
    }
  }
  for (const complaint of facts.complaintCases) {
    if (!facts.complaintReports.some((row) => row.caseId === complaint.id)) {
      throw new Error("P2 domain complaint case has no reports");
    }
  }
  for (const evidence of facts.complaintEvidence) {
    requireRef(cases, evidence.caseId, "evidence case");
    requireRef(attachments, evidence.attachmentId, "evidence attachment");
    const complaint = facts.complaintCases.find((row) => row.id === evidence.caseId)!;
    const attachment = core.attachments.find((row) => row.id === evidence.attachmentId)!;
    if (complaint.target.kind !== "post" || complaint.target.postId !== attachment.postId
      || complaint.target.revisionId !== evidence.revisionId) {
      throw new Error("P2 domain complaint evidence target/revision mismatch");
    }
  }
  for (const decision of facts.complaintDecisions) {
    requireRef(cases, decision.caseId, "decision case");
    requireRef(users, decision.reviewerId, "decision reviewer");
    const complaint = facts.complaintCases.find((row) => row.id === decision.caseId)!;
    if (complaint.initialDecisionId !== decision.id || complaint.state !== "resolved") {
      throw new Error("P2 domain orphan/mismatched Decision");
    }
  }
  ids(facts.complaintAppeals, (row) => row.id, "complaint appeal");
  for (const appeal of facts.complaintAppeals) {
    requireRef(cases, appeal.caseId, "appeal case");
    requireRef(decisions, appeal.decisionId, "appeal decision");
    requireRef(users, appeal.appellantId, "appellant");
    const complaint = facts.complaintCases.find((row) => row.id === appeal.caseId)!;
    const decision = facts.complaintDecisions.find((row) => row.id === appeal.decisionId)!;
    if (complaint.initialDecisionId !== decision.id || decision.caseId !== complaint.id) {
      throw new Error("P2 domain appeal Decision/case mismatch");
    }
    const target = complaint.target;
    const targetAuthorId = target.kind === "post"
      ? core.posts.find((row) => row.id === target.postId)?.authorId
      : core.topics.find((row) => row.id === target.topicId)?.authorId;
    if (appeal.side === "author" && appeal.appellantId !== targetAuthorId) {
      throw new Error("P2 domain appeal author mismatch");
    }
    if (appeal.side === "reporter"
      && !facts.complaintReports.some((report) => report.caseId === complaint.id && report.reporterId === appeal.appellantId)) {
      throw new Error("P2 domain appeal reporter mismatch");
    }
  }
  for (const decision of facts.complaintDecisions) {
    const appeals = facts.complaintAppeals.filter((row) => row.decisionId === decision.id)
      .sort((a, b) => a.ordinal - b.ordinal);
    const policy = deriveAppealPolicy(decision.outcome, appeals);
    for (const appeal of appeals) if (appeal.status === "pending" && appeal.side !== policy.eligibleSide) {
      throw new Error("P2 domain appeal side inconsistent with effective outcome");
    }
  }
  ids(facts.complaintNotes, (row) => row.id, "complaint note");
  for (const note of facts.complaintNotes) {
    requireRef(cases, note.caseId, "note case"); requireRef(users, note.authorId, "note author");
  }
  for (const activity of facts.complaintActivity) {
    requireRef(cases, activity.caseId, "review activity case");
    requireRef(users, activity.reviewerId, "reviewer activity user");
    if (activity.expiresAt <= core.referenceTime) throw new Error("P2 domain expired active review");
    if (!facts.complaintHistory.some((event) => event.caseId === activity.caseId
      && event.actorId === activity.reviewerId && event.event === "review-started"
      && event.occurredAt <= core.referenceTime && event.occurredAt < activity.expiresAt)) {
      throw new Error("P2 domain active review has no review-started event");
    }
  }
  ids(facts.complaintHistory, (row) => row.id, "complaint event");
  for (const event of facts.complaintHistory) {
    requireRef(cases, event.caseId, "complaint history case");
    if (event.actorId) requireRef(users, event.actorId, "complaint history actor");
  }
  ids(facts.notifications, (row) => row.id, "notification");
  for (const item of facts.notifications) {
    requireRef(users, item.recipientId, "notification recipient");
    if (item.actorId) requireRef(users, item.actorId, "notification actor");
    if (item.kind === "reply" || item.kind === "mention") {
      if (!item.topicId || !item.postId
        || core.posts.find((row) => row.id === item.postId)?.topicId !== item.topicId) {
        throw new Error("P2 domain notification post/topic mismatch");
      }
    } else if (!item.caseId || !cases.has(item.caseId)) {
      throw new Error("P2 domain notification case mismatch");
    }
  }
  const knownUiKeys = new Set(catalogDescriptors().map((row) => row.namespace + ":" + row.key));
  for (const item of facts.uiTranslations) {
    requireRef(locales, item.locale, "UI translation locale");
    if (item.locale === "en" || !knownUiKeys.has(item.namespace + ":" + item.key)) {
      throw new Error("P2 domain unknown UI translation source");
    }
  }
  for (const item of facts.contentTranslations) {
    requireRef(locales, item.targetLocale, "content translation locale");
    const revision = revisionFor(item.revisionId, item.contentType, item.contentId);
    if (revision.sourceLocale !== item.sourceLocale || revision.sourceLocale === item.targetLocale) {
      throw new Error("P2 domain content translation source/target mismatch");
    }
  }
  for (const item of facts.generationStatuses) {
    requireRef(locales, item.targetLocale, "generation target locale");
    revisionFor(item.revisionId, item.contentType, item.contentId);
  }
  ids(facts.attachmentPayloads, (row) => row.attachmentId, "attachment payload");
  for (const item of facts.attachmentPayloads) {
    requireRef(attachments, item.attachmentId, "attachment payload reference");
    const attachment = core.attachments.find((row) => row.id === item.attachmentId)!;
    if (atob(item.bytesBase64).length !== item.byteSize || attachment.byteSize !== item.byteSize) {
      throw new Error("P2 domain attachment bytes/metadata mismatch");
    }
  }
  for (const item of facts.operationalFacts) {
    requireRef(attachments, item.sourceId, "operational file fact");
    if (item.actorUserId) requireRef(users, item.actorUserId, "operational actor");
    if (!/^[a-f0-9]{64}$/.test(item.occurrenceDigest)) {
      throw new Error("P2 domain invalid operational occurrence digest");
    }
  }
  if (facts.infrastructure.area !== "infrastructure" || facts.infrastructure.status !== "placeholder"
    || facts.infrastructure.figures.length || facts.infrastructure.sources.length) {
    throw new Error("P2 domain infrastructure must remain a non-measured placeholder");
  }
}
