import type { AuthUser } from "../../auth/request-context";
import type { AccountState } from "../../../db/account-state";
import { INITIAL_ROLE_GRANTS, type PermissionKey } from "../../authorization/catalog";
import { P0_ACTOR_ID, P0_TOPIC_ID, P0_TOPIC_TITLE, P0_POST_BODY } from "../p0/fixture";
import { P0_ATTACHMENT_ID, P0_ATTACHMENT_NAME, P0_ATTACHMENT_BYTE_SIZE } from "../p0/attachment-fixture";
import { createP2DomainFacts, assertP2DomainFactsIntegrity, type PreviewRawDomainFacts } from "./domain-facts";

/**
 * P2 raw, synthetic domain facts. Handlers/readers will project these records
 * through their production interfaces; this file is not an endpoint response map.
 */
export type PreviewActor = "guest" | "member" | "moderator" | "admin" | "owner" | "inactive";
export type PreviewRoleId = keyof typeof INITIAL_ROLE_GRANTS;
export type PreviewAuthMethod = "password" | "google";
export type PreviewPermissionOverride = "allow" | "deny" | "inherit";

export interface PreviewRawUser {
  readonly identity: AuthUser;
  readonly state: AccountState;
  readonly methods: readonly PreviewAuthMethod[];
}
export interface PreviewRawTopic {
  readonly id: string;
  readonly sectionId: string;
  readonly authorId: string;
  readonly titleRevisionId: string;
  readonly title: string;
  readonly sourceLocale: string;
  readonly createdAt: Date;
  readonly isSolved: boolean;
  readonly isClosed: boolean;
  readonly closureVersion: number;
  readonly needsDetails: boolean;
  readonly duplicateOf: string | null;
  readonly duplicateDisputed: boolean;
  readonly isPinned: boolean;
  readonly bestAnswerPostId: string | null;
  readonly tags: readonly string[];
}
export interface PreviewRawPost {
  readonly id: string;
  readonly topicId: string;
  readonly authorId: string;
  readonly parentPostId: string | null;
  readonly bodyRevisionId: string;
  readonly body: string;
  readonly sourceLocale: string;
  readonly createdAt: Date;
  readonly solutionModerationStatus: null | "needs-review" | "outdated";
  readonly solutionOutdatedReason: string | null;
  readonly solutionOutdatedReasonKind: null | "best-answer-replaced";
}
export interface PreviewRawBaseline {
  readonly domains: PreviewRawDomainFacts;
  readonly referenceTime: Date;
  readonly ownerUserId: string;
  readonly actorIds: Readonly<Record<Exclude<PreviewActor, "guest">, string>>;
  readonly users: readonly PreviewRawUser[];
  readonly roles: readonly { readonly id: PreviewRoleId; readonly grants: readonly PermissionKey[] }[];
  readonly assignments: readonly { readonly userId: string; readonly roleId: PreviewRoleId }[];
  readonly overrides: readonly {
    readonly userId: string; readonly permission: PermissionKey; readonly effect: PreviewPermissionOverride;
  }[];
  readonly categories: readonly { readonly id: string; readonly name: string }[];
  readonly sections: readonly { readonly id: string; readonly categoryId: string; readonly name: string }[];
  readonly topics: readonly PreviewRawTopic[];
  readonly posts: readonly PreviewRawPost[];
  readonly attachments: readonly {
    readonly id: string; readonly postId: string; readonly fileName: string; readonly byteSize: number; readonly detectedType: string;
  }[];
  readonly bookmarks: readonly { readonly userId: string; readonly topicId: string; readonly savedAt: Date }[];
  readonly watches: readonly { readonly userId: string; readonly topicId: string }[];
  readonly mutes: readonly { readonly userId: string; readonly topicId: string }[];
  readonly blocks: readonly { readonly userId: string; readonly blockedUserId: string }[];
  readonly readStates: readonly { readonly userId: string; readonly topicId: string; readonly lastReadPostId: string }[];
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const memberId = P0_ACTOR_ID;
const authorId = "sample-author";
const moderatorId = "preview-moderator";
const adminId = "preview-admin";
const ownerId = "preview-owner";
const inactiveId = "preview-inactive";

/** The selected actor is a reference to a stable user, never a replacement author. */
export function previewActorId(baseline: PreviewRawBaseline, actor: PreviewActor): string | null {
  return actor === "guest" ? null : baseline.actorIds[actor];
}

export function createP2RawBaseline(referenceTime: Date): PreviewRawBaseline {
  if (!Number.isFinite(referenceTime.getTime())) {
    throw new Error("P2 reference clock must be valid");
  }
  const at = (delta: number) => new Date(referenceTime.getTime() + delta);
  const identity = (id: string, name: string, locale = "en"): AuthUser => ({
    id, name, email: id + "@preview.invalid", emailVerified: true,
    image: null, locale, createdAt: at(-120 * day), updatedAt: at(-day),
  });
  const users: PreviewRawUser[] = [
    { identity: identity(memberId, "Preview member"), state: { status: "active", userId: memberId }, methods: ["password"] },
    { identity: identity(authorId, "Preview author"), state: { status: "active", userId: authorId }, methods: ["google"] },
    { identity: identity(moderatorId, "Preview moderator", "ru"), state: { status: "active", userId: moderatorId }, methods: ["password"] },
    { identity: identity(adminId, "Preview admin"), state: { status: "active", userId: adminId }, methods: ["google"] },
    // The Owner's ordinary role deliberately remains "user": only the exact binding grants Owner authority.
    { identity: identity(ownerId, "Preview owner"), state: { status: "active", userId: ownerId }, methods: ["google"] },
    {
      identity: identity(inactiveId, "Inactive member"),
      state: {
        status: "deactivated", userId: inactiveId,
        deactivatedAt: at(-day), deactivatedByUserId: ownerId,
        retainAtLeastUntil: at(365 * day),
      },
      methods: ["password"],
    },
  ];
  const core: Omit<PreviewRawBaseline, "domains"> = {
    referenceTime: new Date(referenceTime),
    ownerUserId: ownerId,
    actorIds: {
      member: memberId, moderator: moderatorId, admin: adminId, owner: ownerId, inactive: inactiveId,
    },
    users,
    roles: (Object.keys(INITIAL_ROLE_GRANTS) as PreviewRoleId[]).map((id) => ({
      id, grants: [...INITIAL_ROLE_GRANTS[id]],
    })),
    assignments: [
      { userId: memberId, roleId: "user" },
      { userId: authorId, roleId: "user" },
      { userId: moderatorId, roleId: "moderator" },
      { userId: adminId, roleId: "admin" },
      { userId: ownerId, roleId: "user" },
      { userId: inactiveId, roleId: "user" },
    ],
    overrides: [
      { userId: moderatorId, permission: "forum.complaint.reporterIdentity.read", effect: "deny" },
      { userId: memberId, permission: "forum.topic.pin", effect: "inherit" },
    ],
    categories: [
      { id: "sample-category", name: "Example category" },
      { id: "projects-category", name: "Projects" },
    ],
    sections: [
      { id: "sample-section", categoryId: "sample-category", name: "Example section" },
      { id: "review-section", categoryId: "projects-category", name: "Project reviews" },
    ],
    topics: [
      {
        id: P0_TOPIC_ID, sectionId: "sample-section", authorId,
        titleRevisionId: "p0-topic-title-revision", title: P0_TOPIC_TITLE,
        sourceLocale: "en", createdAt: at(-4 * day), isSolved: false,
        isClosed: false, closureVersion: 0, needsDetails: false,
        duplicateOf: null, duplicateDisputed: false, isPinned: false,
        bestAnswerPostId: null, tags: ["typescript"],
      },
      {
        id: "preview-review-topic", sectionId: "review-section", authorId: memberId,
        titleRevisionId: "review-title-revision", title: "Feedback on a small project",
        sourceLocale: "en", createdAt: at(-3 * day), isSolved: true,
        isClosed: false, closureVersion: 0, needsDetails: false,
        duplicateOf: null, duplicateDisputed: false, isPinned: false,
        bestAnswerPostId: "preview-review-reply", tags: ["typescript"],
      },
    ],
    posts: [
      {
        id: "p0-first-post", topicId: P0_TOPIC_ID, authorId,
        parentPostId: null, bodyRevisionId: "p0-post-body-revision",
        body: P0_POST_BODY + "\n\n![P0 fixture image](vico-attachment:" + P0_ATTACHMENT_ID + ")",
        sourceLocale: "en", createdAt: at(-4 * day + hour),
        solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
      },
      {
        id: "preview-review-post", topicId: "preview-review-topic", authorId: memberId,
        parentPostId: null, bodyRevisionId: "preview-review-body-revision",
        body: "Looking for feedback.", sourceLocale: "en", createdAt: at(-3 * day + hour),
        solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
      },
      {
        id: "preview-review-reply", topicId: "preview-review-topic", authorId: moderatorId,
        parentPostId: "preview-review-post", bodyRevisionId: "preview-review-reply-revision",
        body: "Check the error boundary and retry path.", sourceLocale: "en",
        createdAt: at(-3 * day + 2 * hour),
        solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
      },
    ],
    attachments: [{
      id: P0_ATTACHMENT_ID, postId: "p0-first-post",
      fileName: P0_ATTACHMENT_NAME, byteSize: P0_ATTACHMENT_BYTE_SIZE, detectedType: "png",
    }],
    bookmarks: [{ userId: memberId, topicId: P0_TOPIC_ID, savedAt: at(-day) }],
    watches: [{ userId: memberId, topicId: P0_TOPIC_ID }],
    mutes: [{ userId: moderatorId, topicId: P0_TOPIC_ID }],
    blocks: [{ userId: memberId, blockedUserId: adminId }],
    readStates: [{
      userId: memberId, topicId: "preview-review-topic", lastReadPostId: "preview-review-reply",
    }],
  };
  const baseline: PreviewRawBaseline = { ...core, domains: createP2DomainFacts(core) };
  assertP2RawBaselineIntegrity(baseline);
  return baseline;
}

/** A seed is rejected before a capability can serve inconsistent cross-reader identity. */
export function assertP2RawBaselineIntegrity(baseline: PreviewRawBaseline): void {
  const index = <T>(rows: readonly T[], key: (row: T) => string, label: string) => {
    const ids = new Set<string>();
    for (const row of rows) {
      const id = key(row);
      if (!id || ids.has(id)) throw new Error("P2 duplicate/empty " + label + ": " + id);
      ids.add(id);
    }
    return ids;
  };
  const users = index(baseline.users, (u) => u.identity.id, "user");
  const roles = index(baseline.roles, (r) => r.id, "role");
  const categories = index(baseline.categories, (r) => r.id, "category");
  const sections = index(baseline.sections, (r) => r.id, "section");
  const topics = index(baseline.topics, (r) => r.id, "topic");
  const posts = index(baseline.posts, (r) => r.id, "post");
  index(baseline.attachments, (r) => r.id, "attachment");
  const requireRef = (set: ReadonlySet<string>, id: string, kind: string) => {
    if (!set.has(id)) throw new Error("P2 missing " + kind + ": " + id);
  };
  requireRef(users, baseline.ownerUserId, "Owner user");
  for (const id of Object.values(baseline.actorIds)) requireRef(users, id, "actor");
  for (const user of baseline.users) {
    if (user.state.userId !== user.identity.id) throw new Error("P2 mismatched account state user");
    if (user.state.status === "deactivated") {
      requireRef(users, user.state.deactivatedByUserId, "deactivator");
      if (user.state.retainAtLeastUntil <= user.state.deactivatedAt) throw new Error("P2 invalid retention");
    }
  }
  for (const role of baseline.roles) {
    if (new Set(role.grants).size !== role.grants.length) throw new Error("P2 duplicate grants");
  }
  for (const assignment of baseline.assignments) {
    requireRef(users, assignment.userId, "role holder");
    requireRef(roles, assignment.roleId, "assigned role");
  }
  for (const override of baseline.overrides) requireRef(users, override.userId, "permission subject");
  for (const section of baseline.sections) requireRef(categories, section.categoryId, "section category");
  for (const topic of baseline.topics) {
    requireRef(sections, topic.sectionId, "topic section");
    requireRef(users, topic.authorId, "topic author");
    for (const tag of topic.tags) if (!tag.trim()) throw new Error("P2 empty tag");
    if (topic.bestAnswerPostId !== null) {
      const best = baseline.posts.find((post) => post.id === topic.bestAnswerPostId);
      if (best?.topicId !== topic.id) throw new Error("P2 best answer belongs to another topic");
    }
  }
  for (const post of baseline.posts) {
    requireRef(topics, post.topicId, "post topic");
    requireRef(users, post.authorId, "post author");
    if (post.parentPostId !== null) {
      const parent = baseline.posts.find((item) => item.id === post.parentPostId);
      if (parent?.topicId !== post.topicId) throw new Error("P2 parent belongs to another topic");
    }
  }
  for (const attachment of baseline.attachments) requireRef(posts, attachment.postId, "attachment post");
  for (const item of [...baseline.bookmarks, ...baseline.watches, ...baseline.mutes, ...baseline.readStates]) {
    requireRef(users, item.userId, "personal-state user");
    requireRef(topics, item.topicId, "personal-state topic");
  }
  for (const block of baseline.blocks) {
    requireRef(users, block.userId, "block actor");
    requireRef(users, block.blockedUserId, "blocked user");
    if (block.userId === block.blockedUserId) throw new Error("P2 self block");
  }
  for (const read of baseline.readStates) {
    const post = baseline.posts.find((item) => item.id === read.lastReadPostId);
    if (post?.topicId !== read.topicId) throw new Error("P2 read-state post belongs to another topic");
  }
  assertP2DomainFactsIntegrity(baseline, baseline.domains);
}
