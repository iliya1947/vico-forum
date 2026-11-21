import {withOperationalFacts,type OwnerOperationalFactSink,type FileReferenceTransition} from "../app/observability/operational-facts";
import { projectPublicAccountIdentity, PublicIdentityInvariantError } from "./public-identity";
import { activeAccountPredicate, AccountInactiveError, assertActiveAccountForDrizzleMutation, type AccountState } from "./account-state";
import {appendForumHistory,appendVisibilityHistory} from "./forum-history";
import { lockPrivacySubject } from "./user-privacy";
import { isBoundOwner } from "../app/authorization/owner";
import type {HelpSignalHistoryEffect} from "./admin-history";
import { validateProfileFields, type ForumProfile, type ProfileFields } from "../app/forum/profile";
import { publishedMentionRecipients } from "../app/forum/mentions";
import { recordOrdinaryPostNotifications } from "./personal-notification-policy";
import { and, asc, count, desc, eq, gt, gte, lt, inArray, min, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";
import {
  authzRoles,
  authzRolePermissions,
  authzUserPermissionOverrides,
  authzUserRoles,
  forumProfiles,
  forumAttachmentDraftRefs,
  forumAttachments,
  forumPostAttachments,
  forumOnlinePresence,
  userPrivacyPreferences,
  forumCategories,
  forumHelpDuplicateAppeals,
  forumHelpDuplicateRelationships,
  forumHelpSignals,
  forumPostRevisions,
  forumPublicationReceipts,
  forumPosts,
  forumReplyNotifications,
  forumSections,
  forumTags,
  forumTopicReadStates,
  forumTopicBookmarks,
  forumTopicMutes,
  forumUserBlocks,
  forumTopicWatches,
  forumTopicPins,
  forumTopicTags,
  forumTopicTitleRevisions,
  forumTopics,
  user,
} from "./schema";
import { ForumWriteRateLimitError, forumWritePolicy, type ForumWritePolicy } from "./forum-write-policy";
import { assertNoActiveUserMeasureRestriction } from "./user-measure-policy";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";
import {
  ForumAttachmentDraftConflictError,
  lockAttachmentDraftScope,
  resolveAttachmentDraftGeneration,
  retireAttachmentDraftGeneration,
} from "./attachment-draft-generation";

export interface ForumCategorySummary {
  id: string;
  name: string;
  sectionCount: number;
}

export interface ForumHomepageSectionSummary {
  id: string;
  name: string;
  topicCount: number;
  messageCount: number;
}

export interface ForumHomepageCategorySummary {
  id: string;
  name: string;
  sectionCount: number;
  topicCount: number;
  messageCount: number;
  sections: ForumHomepageSectionSummary[];
}

export type ForumPopularPeriod = "24h" | "7d" | "30d";

export interface ForumPopularTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  authorName: string;
  activityCount: number;
  latestActivityAt: Date;
}

export type ForumPopularPage = Record<ForumPopularPeriod, ForumPopularTopicSummary[]>;

export interface ForumUnansweredTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  sourceLocale: string;
  authorName: string;
  createdAt: Date;
  section: { id: string; name: string } | null;
  category: { id: string; name: string };
}

export interface ForumTag {
  key: string;
  name: string;
}

export interface ForumTagSummary extends ForumTag {
  topicCount: number;
}

export interface ForumTaggedTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  authorName: string;
  postCount: number;
  createdAt: Date;
  section: { id: string; name: string } | null;
  category: { id: string; name: string };
  tags: ForumTag[];
}

export interface ForumTagPage {
  tag: ForumTag;
  topics: ForumTaggedTopicSummary[];
}

export interface ForumSearchResult {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  sourceLocale: string;
  authorName: string;
  postCount: number;
  activityAt: Date;
  section: { id: string; name: string } | null;
  category: { id: string; name: string };
  tags: ForumTag[];
}

export type ForumTopicReadKind = "new" | "unread" | "read";

export interface ForumTopicReadState {
  topicId: string;
  state: ForumTopicReadKind;
  lastReadPostId: string | null;
  firstUnreadPostId: string | null;
  latestPostId: string | null;
}

export type ForumTopicBookmarkSummary = { id: string; savedAt: Date } & (
  | {
    unavailable: true;
    title?: never;
    authorName?: never;
    authorIdentityKind?: never;
    section?: never;
    category?: never;
  }
  | {
    unavailable?: false;
    title: string;
    authorName: string;
    authorIdentityKind?: "deleted";
    section: { id: string; name: string } | null;
    category: { id: string; name: string };
  }
);

export interface ForumTopicBookmarkCursor {
  savedAt: Date;
  topicId: string;
}

export interface ForumTopicBookmarksPage {
  items: ForumTopicBookmarkSummary[];
  next: ForumTopicBookmarkCursor | null;
}

/** Strict two-field private keyset cursor; actor is always a separate server argument. */
export interface ForumPersonalFilterCursor { createdAt: Date; targetId: string; }
export interface ForumMutedTopicSummary {
  id: string; title: string; mutedAt: Date;
  authorName: string; authorIdentityKind?: "deleted";
  section: { id: string; name: string } | null;
  category: { id: string; name: string };
}
export interface ForumBlockedUserSummary {
  id: string; name: string; blockedAt: Date; identityKind?: "deleted";
}
export interface ForumPersonalPage<T> {
  items: T[];
  next: ForumPersonalFilterCursor | null;
}

export interface ForumUnreadTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  authorName: string;
  state: Exclude<ForumTopicReadKind, "read">;
  firstUnreadPostId: string;
  latestPostId: string;
  unreadCount: number;
  activityAt: Date;
  section: { id: string; name: string } | null;
  category: { id: string; name: string };
}

// Only public category/section identities are returned to generic discovery lists.
// Help questions retain their public category, but not the internal service section.
function publicDiscoveryLocation(row: {
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
}) {
  return {
    category: { id: row.categoryId, name: row.categoryName },
    section: row.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID
      ? null : { id: row.sectionId, name: row.sectionName },
  };
}

export interface ForumNotificationSummary {
  id:string;kind:"reply"|"mention"|"complaint-decision"|"complaint-appeal-result";actorName:string|null;
  actorIdentityKind?: "deleted";
  topicId:string|null;topicTitle:string|null;postId:string|null;caseId?:string|null;appealId?:string|null;
  createdAt:Date;readAt:Date|null;
}
export interface ForumNotificationPage {
  items:ForumNotificationSummary[];total:number;page:number;hasMore:boolean;
}
export type ForumNotificationTarget =
  | {kind:"complaint-decision";caseId:string}
  | {kind:"complaint-appeal-result";caseId:string;appealId:string}
  | {kind:"reply"|"mention";topicId:string;postId:string};

export interface ForumReplyNotificationSummary {
  id: string;
  kind: "reply" | "mention";
  actorName: string;
  actorIdentityKind?: "deleted";
  topicId: string;
  topicTitle: string;
  postId: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface ForumSectionTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  authorName: string;
  activityAt: Date;
}

export interface ForumSectionSummary {
  id: string;
  name: string;
  topicCount: number;
  postCount: number;
  pinnedTopics: ForumSectionTopicSummary[];
  latestTopics: ForumSectionTopicSummary[];
}

export interface ForumCategoryPage {
  id: string;
  name: string;
  sections: ForumSectionSummary[];
}

export type HelpSolutionModerationStatus = "needs-review" | "outdated";
export type HelpSolutionOutdatedReasonKind = "best-answer-replaced";

export interface ForumHelpDuplicateReference {
  id: string;
  title: string;
  unavailable?: boolean;
}

export interface ForumHelpDuplicateAppeal {
  id: string;
  relationshipId: string;
  explanation: string;
  createdAt: Date;
}

export type HelpDuplicateAppealResolution = "accepted" | "rejected";
export type HelpSignalKind = "needs-details" | "needs-review" | "solution-outdated" | "duplicate";
export type HelpSignalStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "superseded";
export type HelpSignalResolution = "accepted" | "rejected";

export interface ForumHelpSignal {
  id: string;
  kind: HelpSignalKind;
  topicId: string;
  targetPostId: string | null;
  proposedOriginalTopicId: string | null;
  submittedByUserId: string;
  explanation: string | null;
  status: HelpSignalStatus;
  createdAt: Date;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
}

export interface ForumHelpAttentionVisibility {
  signalKinds: readonly HelpSignalKind[];
  appeals: boolean;
}

export type ForumAttentionQueueGroup = "needs-details" | "needs-review" | "solution-outdated" | "duplicate" | "appeals" | "mixed";

export interface ForumAttentionQueueCase {
  type: "signal" | "appeal" | "review-status";
  /** Retained appeal keeps its guarded review-action topicId even when no topic link exists. */
  topicUnavailable?: boolean;
  id: string;
  kind: HelpSignalKind | "appeal" | "review-status";
  topicId: string;
  topicTitle: string;
  submittedByUserId: string | null;
  submittedByName: string | null;
  explanation: string | null;
  createdAt: Date;
  targetPostId: string | null;
  original: { id: string; title: string } | null;
}

export interface ForumAttentionQueuePage {
  cases: ForumAttentionQueueCase[];
  /** Mixed pages count topics; all other pages count individual tasks. */
  hasMore: boolean;
  page: number;
}

export type ForumAttentionQueueCounts = Record<ForumAttentionQueueGroup, number>;

export interface ForumHelpAttentionState {
  signals: Partial<Record<HelpSignalKind, number>>;
  totalSignals: number;
  appeal: boolean;
  reviewRequired?: boolean;
}

export interface ForumHelpQuestionSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  isSolved: boolean;
  hasBestAnswer: boolean;
  solutionModerationStatus: HelpSolutionModerationStatus | null;
  solutionOutdatedReason: string | null;
  solutionOutdatedReasonKind: HelpSolutionOutdatedReasonKind | null;
  needsDetails: boolean;
  duplicateOf: ForumHelpDuplicateReference | null;
  duplicateDisputed: boolean;
  attention?: ForumHelpAttentionState;
  createdAt: Date;
  activityAt: Date;
  tags: ForumTag[];
}

export interface ForumHelpSolutionsPage {
  id: string;
  name: string;
  questions: ForumHelpQuestionSummary[];
}

export type HelpSolutionsSolutionFilter = "open" | "solved" | "needs-review" | "outdated";
export type HelpSolutionsAnswersFilter = "none" | "has";
export type HelpSolutionsQualityFilter = "normal" | "needs-details";
export type HelpSolutionsRelationFilter = "standalone" | "duplicate";

export interface ForumHelpSolutionsFilters {
  solution?: HelpSolutionsSolutionFilter;
  answers?: HelpSolutionsAnswersFilter;
  quality?: HelpSolutionsQualityFilter;
  relation?: HelpSolutionsRelationFilter;
}

export interface ForumHelpSimilarQuestionQuery {
  title: string;
  body: string;
  tags: readonly string[];
}

export type ForumHelpSimilarMatchSource = "title" | "tags" | "body";

export interface ForumHelpSimilarQuestionSummary {
  id: string;
  title: string;
  replyCount: number;
  isSolved: boolean;
  tags: ForumTag[];
  matchSource: ForumHelpSimilarMatchSource;
}

const HELP_SOLUTIONS_ACTIVE_LIMIT = 100;
const HELP_SOLUTIONS_NEEDS_ATTENTION_LIMIT = 100;
const HELP_SOLUTIONS_MINE_LIMIT = 100;
const HELP_SOLUTIONS_WANT_TO_HELP_LIMIT = 100;
const HELP_SOLUTIONS_FOR_ME_LIMIT = 100;
const HELP_SOLUTIONS_FOR_ME_INTEREST_TAG_LIMIT = 100;

export interface ForumTopicSummary {
  authorIdentityKind?: "deleted";
  id: string;
  title: ForumRevisionContent;
  authorName: string;
  postCount: number;
  createdAt: Date;
  isPinned: boolean;
  tags: ForumTag[];
}

export interface ForumSectionPage {
  id: string;
  name: string;
  category: { id: string; name: string };
  topics: ForumTopicSummary[];
}

export interface ForumVisibleThreadPost extends ForumPost {
  kind?: "visible";
  authorIdentityKind?: "deleted";
  attachments?: Array<{ id: string; fileName: string; byteSize: number; detectedType: string }>;
  authorImage?: string | null;
  authorName: string;
  createdAt: Date;
  editedAt?: Date | null;
}

/** A public tombstone must never contain author identity, revision, body or assets. */
export interface ForumHiddenThreadPost {
  kind: "hidden";
  id: string;
  topicId: string;
  parentPostId: string | null;
  createdAt: Date;
}

export type ForumThreadPost = ForumVisibleThreadPost | ForumHiddenThreadPost;

export interface ForumTopicPage extends ForumTopic {
  authorIdentityKind?: "deleted";
  createdAt: Date;
  needsDetails: boolean;
  duplicateOf: ForumHelpDuplicateReference | null;
  duplicateRelationshipId?: string | null;
  duplicateDisputed: boolean;
  authorName: string;
  isPinned: boolean;
  section: { id: string; name: string; category: { id: string; name: string } };
  tags: ForumTag[];
  posts: ForumThreadPost[];
}

/** Project a public forum author from identity and lifecycle fields of one joined user row. */
function projectForumPublicAuthor(row: {
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  authorDeactivatedAt: Date | null;
  authorDeactivatedByUserId: string | null;
  authorRetainAtLeastUntil: Date | null;
}) {
  let state: AccountState;
  if (row.authorDeactivatedAt === null) {
    if (row.authorDeactivatedByUserId !== null || row.authorRetainAtLeastUntil !== null) {
      throw new PublicIdentityInvariantError();
    }
    state = { status: "active", userId: row.authorId };
  } else {
    if (row.authorDeactivatedByUserId === null || row.authorRetainAtLeastUntil === null) {
      throw new PublicIdentityInvariantError();
    }
    state = {
      status: "deactivated", userId: row.authorId,
      deactivatedAt: row.authorDeactivatedAt,
      deactivatedByUserId: row.authorDeactivatedByUserId,
      retainAtLeastUntil: row.authorRetainAtLeastUntil,
    };
  }
  // Unused profile fields are neutral placeholders, not additional private reads.
  return projectPublicAccountIdentity({
    id: row.authorId, name: row.authorName, image: row.authorImage ?? null,
    bio: "", githubUrl: null, websiteUrl: null,
  }, state);
}

/** One-row A1/A4 actor projection; no retained identity or lifecycle in the DTO. */
function projectNotificationActor(row: {
  actorId: string | null;
  actorName: string | null;
  actorDeactivatedAt: Date | string | null;
  actorDeactivatedByUserId: string | null;
  actorRetainAtLeastUntil: Date | string | null;
}): { actorName: string; actorIdentityKind?: "deleted" } {
  // Raw execute() timestamps may be decoded as strings; A4 validates Date values.
  const asDate = (value: Date | string | null) => value === null ? null : new Date(value);
  const projected = projectForumPublicAuthor({
    authorId: row.actorId!,
    authorName: row.actorName!,
    authorDeactivatedAt: asDate(row.actorDeactivatedAt),
    authorDeactivatedByUserId: row.actorDeactivatedByUserId,
    authorRetainAtLeastUntil: asDate(row.actorRetainAtLeastUntil),
  });
  return projected.kind === "deleted"
    ? { actorName: projected.name, actorIdentityKind: "deleted" }
    : { actorName: projected.name };
}

export interface ForumOnlinePresence {
  count: number;
  members: { id: string; name: string; image: string | null }[];
}

export interface ForumAdminOverviewCounts {
  categories: number; sections: number; topics: number; posts: number;
}

export interface ForumReader {
  readAdminOverviewCounts(): Promise<ForumAdminOverviewCounts>;
  searchMentionableUsers(query: string): Promise<Array<{ id: string; name: string }>>;
  readOnlinePresence(): Promise<ForumOnlinePresence>;
  readProfile(userId: string): Promise<ForumProfile | undefined>;
  listCategories(): Promise<ForumCategorySummary[]>;
  readHomepage(): Promise<ForumHomepageCategorySummary[]>;
  readPopular(referenceTime?: Date, limitPerPeriod?: number): Promise<ForumPopularPage>;
  readUnanswered(): Promise<ForumUnansweredTopicSummary[]>;
  readTags(): Promise<ForumTagSummary[]>;
  readTag(key: string): Promise<ForumTagPage | undefined>;
  search(query: string, limit?: number): Promise<ForumSearchResult[]>;
  readUnreadForUser(userId: string): Promise<ForumUnreadTopicSummary[]>;
  readTopicReadState(userId: string, topicId: string): Promise<ForumTopicReadState | undefined>;
  readTopicWatch(userId: string, topicId: string): Promise<boolean>;
  readTopicMute(userId: string, topicId: string): Promise<boolean>;
  readMutedTopics(userId: string, before?: ForumPersonalFilterCursor): Promise<ForumPersonalPage<ForumMutedTopicSummary>>;
  readBlockedUsers(userId: string, before?: ForumPersonalFilterCursor): Promise<ForumPersonalPage<ForumBlockedUserSummary>>;
  readUserBlock(userId: string, blockedUserId: string): Promise<boolean>;
  readTopicBlockedAuthors(userId: string, topicId: string): Promise<string[]>;
  readTopicBookmark(userId: string, topicId: string): Promise<boolean>;
  readTopicBookmarks(userId: string, before?: ForumTopicBookmarkCursor): Promise<ForumTopicBookmarksPage>;
  readNotifications(userId:string,page:number):Promise<ForumNotificationPage>;
  countUnreadNotifications(userId:string):Promise<number>;
  readReplyNotifications(userId: string, limit?: number): Promise<ForumReplyNotificationSummary[]>;
  countUnreadReplyNotifications(userId: string): Promise<number>;
  readTopicPinState(topicId: string): Promise<boolean>;
  readHelpSolutionsAll(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsOpen(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsActive(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsNeedsAttention(filters: ForumHelpSolutionsFilters, visibility: ForumHelpAttentionVisibility): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpAttentionCases(group: ForumAttentionQueueGroup, visibility: ForumHelpAttentionVisibility, page?: number): Promise<ForumAttentionQueuePage>;
  readHelpAttentionCounts(visibility: ForumHelpAttentionVisibility): Promise<ForumAttentionQueueCounts>;
  readHelpSolutionsSolved(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsMine(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsWantToHelp(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsForMe(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  searchHelpSolutionsSimilar(query: ForumHelpSimilarQuestionQuery, limit?: number): Promise<ForumHelpSimilarQuestionSummary[]>;
  readPendingHelpDuplicateAppeal(topicId: string): Promise<ForumHelpDuplicateAppeal | undefined>;
  readHelpSignal(id: string): Promise<ForumHelpSignal | undefined>;
  readCategory(id: string, pinnedTopicsPerSection?: number): Promise<ForumCategoryPage | undefined>;
  readSection(id: string): Promise<ForumSectionPage | undefined>;
  readTopicPage(id: string): Promise<ForumTopicPage | undefined>;
  readPostLocation(postId: string): Promise<{ topicId: string; authorId: string } | undefined>;
  readPostHistory(postId: string, topicId: string): Promise<Array<{
    id: string; authorId: string; authorName: string; authorIdentityKind?: "deleted";
    originalContent: string; sourceLocale: string; createdAt: Date;
  }>>;
}

export interface ForumRevisionContent {
  id: string;
  originalContent: string;
  sourceLocale: string;
}

export interface ForumTopic {
  id: string;
  sectionId: string;
  authorId: string;
  title: ForumRevisionContent;
  isSolved: boolean;
  isClosed: boolean;
  closureVersion: number;
  bestAnswerPostId: string | null;
}

export interface ForumPost {
  id: string;
  topicId: string;
  authorId: string;
  parentPostId: string | null;
  solutionModerationStatus: HelpSolutionModerationStatus | null;
  solutionOutdatedReason: string | null;
  solutionOutdatedReasonKind: HelpSolutionOutdatedReasonKind | null;
  body: ForumRevisionContent;
}

export interface ForumHierarchy {
  id: string;
  name: string;
  sections: Array<{
    id: string;
    name: string;
    topics: Array<ForumTopic & { posts: ForumPost[] }>;
  }>;
}

export interface CreateTopicInput {
  id: string;
  sectionId: string;
  authorId: string;
  titleRevision: ForumRevisionContent;
  tags?: readonly ForumTag[];
}

export interface CreatePostInput {
  publishedDraft?: { contextKey: string; draftId?: string; attachmentIds?: readonly string[] };
  id: string;
  topicId: string;
  authorId: string;
  parentPostId?: string | null;
  bodyRevision: ForumRevisionContent;
}

export interface CreateTopicWithInitialPostInput extends CreateTopicInput {
  publishedDraft?: { contextKey: string; draftId?: string; attachmentIds?: readonly string[] };
  initialPost: CreatePostInput;
}

export class ConcurrentRevisionError extends Error {}
export class ForumEntityNotFoundError extends Error {}
export class ForumAuthorizationError extends Error {}
export class ForumStateConflictError extends Error {}
export class ForumTopicClosedError extends ForumStateConflictError {}
export class ForumVisibilityReasonError extends Error {}
export class ForumPublicationReplayConflictError extends ForumStateConflictError {}
export type SolutionManagementScope = "own" | "any";

async function publicationFingerprint(input: unknown): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(input));
  const hash = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class DrizzleForumRepository {
  constructor(
    private readonly database: NodePgDatabase,
    private readonly writePolicy: ForumWritePolicy = forumWritePolicy,
    private readonly measureAdmission: typeof assertNoActiveUserMeasureRestriction = assertNoActiveUserMeasureRestriction,
    private readonly operational?:OwnerOperationalFactSink,
    private readonly ownerUserId?: string,
  ) {}

  async searchMentionableUsers(query: string): Promise<Array<{ id: string; name: string }>> {
    const term = query.trim();
    if (!term || term.length > 64) return [];
    // The user's term is literal, not a SQL LIKE pattern.
    const escaped = term.replace(/[!%_]/gu, (char) => "!" + char);
    return this.database.select({ id: user.id, name: user.name }).from(user)
      .where(and(activeAccountPredicate(user.deactivatedAt), sql`${user.name} ilike ${"%" + escaped + "%"} escape '!'`))
      .orderBy(asc(user.name), asc(user.id))
      .limit(8);
  }

  async readOnlinePresence(): Promise<ForumOnlinePresence> {
    const recent = sql`${forumOnlinePresence.lastSeenAt} >= now() - interval '5 minutes'`;
    // A window count keeps the total and the bounded member list on one DB snapshot.
    const rows = await this.database.select({
      id: user.id, name: user.name, image: user.image,
      total: sql<number>`count(*) over ()::int`,
    })
      .from(forumOnlinePresence)
      .innerJoin(user, eq(user.id, forumOnlinePresence.userId))
      .leftJoin(userPrivacyPreferences, eq(userPrivacyPreferences.userId, user.id))
      // Filter before the window count and LIMIT: stale hidden presence cannot leak.
      .where(and(recent, activeAccountPredicate(user.deactivatedAt), sql`coalesce(${userPrivacyPreferences.showOnline}, true) = true`))
      .orderBy(desc(forumOnlinePresence.lastSeenAt), asc(user.id))
      .limit(12);
    return {
      count: rows[0]?.total ?? 0,
      members: rows.map((row) => ({ id: row.id, name: row.name, image: row.image })),
    };
  }

  async recordOnlinePresence(userId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      // The same account-row lock protects both preference writes and heartbeats.
      const deactivatedAt = await lockPrivacySubject(tx, userId);
      // The locked row reflects any preceding committed deactivation.
      if (deactivatedAt !== null) throw new AccountInactiveError();
      // Separate statement after lock acquisition sees the latest committed preference.
      const [preference] = await tx.select({ showOnline: userPrivacyPreferences.showOnline })
        .from(userPrivacyPreferences).where(eq(userPrivacyPreferences.userId, userId));
      if (preference?.showOnline === false) return;
      await tx.insert(forumOnlinePresence)
        .values({ userId })
        .onConflictDoUpdate({
          target: forumOnlinePresence.userId,
          set: { lastSeenAt: sql`greatest(${forumOnlinePresence.lastSeenAt}, now())` },
          // The browser timer is not authoritative: reject excess DB writes per user.
          setWhere: sql`${forumOnlinePresence.lastSeenAt} < now() - interval '45 seconds'`,
        });
    }, { isolationLevel: "read committed" });
  }

  async readProfile(userId: string): Promise<ForumProfile | undefined> {
    // Read the lifecycle tuple alongside the public fields in one DB snapshot.
    // Never return the original identity/lifecycle columns to a public caller.
    const [profile] = await this.database.select({
      id: user.id, name: user.name, image: user.image, joinedAt: user.createdAt,
      deactivatedAt: user.deactivatedAt, deactivatedByUserId: user.deactivatedByUserId,
      retainAtLeastUntil: user.retainAtLeastUntil,
      bio: sql<string>`coalesce(${forumProfiles.bio}, '')`,
      githubUrl: forumProfiles.githubUrl, websiteUrl: forumProfiles.websiteUrl,
      role: { slug: authzRoles.slug, displayName: authzRoles.displayName, isSystem: authzRoles.isSystem },
      messageCount: sql<number>`(select count(*) from ${forumPosts} join ${forumTopics} on ${forumTopics.id} = ${forumPosts.topicId} where ${forumPosts.authorId} = ${user.id} and not ${forumTopics.isHidden} and not ${forumPosts.isHidden})`.mapWith(Number),
      bestAnswerCount: sql<number>`(select count(*) from ${forumTopics} join ${forumPosts} on ${forumPosts.id} = ${forumTopics.bestAnswerPostId} where ${forumPosts.authorId} = ${user.id} and not ${forumTopics.isHidden} and not ${forumPosts.isHidden})`.mapWith(Number),
    }).from(user)
      .leftJoin(forumProfiles, eq(forumProfiles.userId, user.id))
      .leftJoin(authzUserRoles, eq(authzUserRoles.userId, user.id))
      .innerJoin(authzRoles, sql`${authzRoles.id} = coalesce(${authzUserRoles.roleId}, (select id from authz_roles where slug = 'user'))`)
      .where(eq(user.id, userId));
    if (!profile) return undefined;
    let state: AccountState;
    if (profile.deactivatedAt === null) {
      if (profile.deactivatedByUserId !== null || profile.retainAtLeastUntil !== null) {
        throw new PublicIdentityInvariantError();
      }
      state = { status: "active", userId: profile.id };
    } else {
      if (profile.deactivatedByUserId === null || profile.retainAtLeastUntil === null) {
        throw new PublicIdentityInvariantError();
      }
      state = {
        status: "deactivated", userId: profile.id,
        deactivatedAt: profile.deactivatedAt, deactivatedByUserId: profile.deactivatedByUserId,
        retainAtLeastUntil: profile.retainAtLeastUntil,
      };
    }
    const identity = projectPublicAccountIdentity(profile, state);
    return {
      id: identity.id, name: identity.name, image: identity.image, joinedAt: profile.joinedAt,
      bio: identity.bio, githubUrl: identity.githubUrl, websiteUrl: identity.websiteUrl,
      role: profile.role, messageCount: profile.messageCount, bestAnswerCount: profile.bestAnswerCount,
      ...(identity.kind === "deleted" ? { identityKind: "deleted" as const } : {}),
    };
  }

  async updateProfile(actorId: string, input: ProfileFields): Promise<void> {
    const fields = validateProfileFields(input);
    await this.database.transaction(async (tx) => {
      const [owner] = await tx.select({ id: user.id }).from(user)
        .where(eq(user.id, actorId)).for("update");
      if (!owner) throw new ForumEntityNotFoundError("user does not exist");
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "profile.edit");
      await tx.insert(forumProfiles).values({ userId: actorId, ...fields })
        .onConflictDoUpdate({ target: forumProfiles.userId, set: { ...fields, updatedAt: sql`now()` } });
    });
  }

  async createCategory(input: { id: string; name: string }) {
    const [created] = await this.database.insert(forumCategories).values(input).returning();
    return created;
  }

  async createSection(input: { id: string; categoryId: string; name: string }) {
    const [created] = await this.database.insert(forumSections).values(input).returning();
    return created;
  }

  async createTopic(input: CreateTopicInput): Promise<ForumTopic> {
    return this.database.transaction(async (tx) => {
      await assertActiveAccountForDrizzleMutation(tx, input.authorId);
      await this.measureAdmission(tx, input.authorId, "topics.create");
      await tx.insert(forumTopics).values({
        id: input.id,
        sectionId: input.sectionId,
        authorId: input.authorId,
        currentTitleRevisionId: input.titleRevision.id,
      });
      await tx.insert(forumTopicTitleRevisions).values({
        ...input.titleRevision,
        topicId: input.id,
        authorId: input.authorId,
      });
      if (input.tags?.length) {
        await tx.insert(forumTags).values([...input.tags]).onConflictDoNothing();
        await tx.insert(forumTopicTags).values(input.tags.map((tag) => ({
          topicId: input.id,
          tagKey: tag.key,
        })));
      }
      return {
        id: input.id,
        sectionId: input.sectionId,
        authorId: input.authorId,
        title: input.titleRevision,
        isSolved: false,
        isClosed: false,
        closureVersion: 0,
        bestAnswerPostId: null,
      };
    });
  }

  async createTopicWithInitialPost(input: CreateTopicWithInitialPostInput): Promise<{ topic: ForumTopic; post: ForumPost }> {
    const fingerprint = input.publishedDraft?.draftId
      ? await publicationFingerprint({
        kind: "topic", sectionId: input.sectionId,
        title: input.titleRevision.originalContent, titleLocale: input.titleRevision.sourceLocale,
        body: input.initialPost.bodyRevision.originalContent,
        bodyLocale: input.initialPost.bodyRevision.sourceLocale,
        tags: (input.tags ?? []).map((tag) => [tag.key, tag.name]),
        attachmentIds: [...(input.publishedDraft.attachmentIds ?? [])].sort(),
          }) : null;
    return withOperationalFacts(this.operational,facts=>this.database.transaction(async (tx) => {
      const changes:{added:FileReferenceTransition[];removed:FileReferenceTransition[]}={added:[],removed:[]};
      if (input.publishedDraft) {
        await lockAttachmentDraftScope(tx, input.authorId, input.publishedDraft.contextKey);
        const existing = await this.publicationReceipt(tx, input.authorId, input.publishedDraft, fingerprint);
        if (existing) {
          // An idempotent receipt is not active-account admission.
          await assertActiveAccountForDrizzleMutation(tx, input.authorId);
          // Receipt replay may follow closure: project persisted closure, not a default.
          const [persisted] = await tx.select({
            isClosed: forumTopics.isClosed, closureVersion: forumTopics.closureVersion,
          }).from(forumTopics).where(eq(forumTopics.id, existing.topicId));
          if (!persisted) throw new ForumEntityNotFoundError("replayed topic does not exist");
          return {
            topic: {
              id: existing.topicId, sectionId: input.sectionId, authorId: input.authorId,
              title: input.titleRevision, isSolved: false, bestAnswerPostId: null,
              isClosed: persisted.isClosed, closureVersion: persisted.closureVersion,
            },
            post: {
              id: existing.postId, topicId: existing.topicId, authorId: input.authorId,
              parentPostId: null, solutionModerationStatus: null,
              solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
              body: input.initialPost.bodyRevision,
            },
          };
        }
      }
      await assertActiveAccountForDrizzleMutation(tx, input.authorId);
      await this.measureAdmission(tx, input.authorId, "topics.create");
      const createdAt = await enforceForumWriteCooldown(tx, input.authorId, this.writePolicy);
      const [section] = await tx.select({ id: forumSections.id }).from(forumSections)
        .where(eq(forumSections.id, input.sectionId));
      if (!section) throw new ForumEntityNotFoundError("section does not exist");

      await tx.insert(forumTopics).values({
        id: input.id,
        sectionId: input.sectionId,
        authorId: input.authorId,
        currentTitleRevisionId: input.titleRevision.id,
      });
      await tx.insert(forumTopicTitleRevisions).values({
        ...input.titleRevision,
        topicId: input.id,
        authorId: input.authorId,
      });
      await tx.insert(forumPosts).values({
        id: input.initialPost.id,
        topicId: input.id,
        authorId: input.authorId,
        currentRevisionId: input.initialPost.bodyRevision.id,
        createdAt,
      });
      await tx.insert(forumPostRevisions).values({
        ...input.initialPost.bodyRevision,
        postId: input.initialPost.id,
        authorId: input.authorId,
      });
      await this.recordPublishedMentions(tx, {
        actorId: input.authorId, topicId: input.id, postId: input.initialPost.id,
        body: input.initialPost.bodyRevision.originalContent, createdAt,
      });
      if (input.tags?.length) {
        await tx.insert(forumTags).values([...input.tags]).onConflictDoNothing();
        await tx.insert(forumTopicTags).values(input.tags.map((tag) => ({
          topicId: input.id,
          tagKey: tag.key,
        })));
      }
      if (input.publishedDraft) {
        await this.finishPublishedDraft(tx, input.authorId, input.publishedDraft, input.initialPost.id,changes);
        await this.recordPublicationReceipt(tx, input.authorId, input.publishedDraft, fingerprint, input.id, input.initialPost.id);
      }
      facts.captureFileReferences(input.initialPost.id,input.authorId,changes);
      return {
        topic: {
          id: input.id,
          sectionId: input.sectionId,
          authorId: input.authorId,
          title: input.titleRevision,
          isSolved: false,
          isClosed: false,
          closureVersion: 0,
          bestAnswerPostId: null,
        },
        post: {
          id: input.initialPost.id,
          topicId: input.id,
          authorId: input.authorId,
          parentPostId: null,
          solutionModerationStatus: null,
          solutionOutdatedReason: null,
          solutionOutdatedReasonKind: null,
          body: input.initialPost.bodyRevision,
        },
      };
    }));
  }

  async setTopicMute(input: { topicId: string; actorId: string; muted: boolean }): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      // Preserve target FK, then admit active actor on this same transaction.
      const [topic] = await tx.select({ id: forumTopics.id }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId)).for("key share");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (input.muted) {
        await tx.insert(forumTopicMutes).values({ userId: input.actorId, topicId: input.topicId })
          .onConflictDoNothing();
      } else {
        await tx.delete(forumTopicMutes).where(and(
          eq(forumTopicMutes.userId, input.actorId), eq(forumTopicMutes.topicId, input.topicId),
        ));
      }
      return input.muted;
    });
  }

  async setUserBlock(input: { actorId: string; blockedUserId: string; blocked: boolean }): Promise<boolean> {
    if (input.actorId === input.blockedUserId) throw new Error("cannot block self");
    return this.database.transaction(async (tx) => {
      const [target] = await tx.select({ id: user.id }).from(user)
        .where(eq(user.id, input.blockedUserId)).for("key share");
      if (!target) throw new ForumEntityNotFoundError("user does not exist");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (input.blocked) {
        await tx.insert(forumUserBlocks).values({ userId: input.actorId, blockedUserId: input.blockedUserId })
          .onConflictDoNothing();
      } else {
        await tx.delete(forumUserBlocks).where(and(
          eq(forumUserBlocks.userId, input.actorId), eq(forumUserBlocks.blockedUserId, input.blockedUserId),
        ));
      }
      return input.blocked;
    });
  }

  async setTopicBookmark(input: { topicId: string; actorId: string; bookmarked: boolean }): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      // SAVE must serialize with Hide (NO KEY UPDATE). REMOVE retains its
      // previous FK-safe KEY SHARE lock and remains safe for missing targets.
      const [topic] = await tx.select({ id: forumTopics.id, isHidden: forumTopics.isHidden }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId)).for(input.bookmarked ? "share" : "key share");
      if (input.bookmarked && (!topic || topic.isHidden))
        throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (input.bookmarked) {
        await tx.insert(forumTopicBookmarks).values({ userId: input.actorId, topicId: input.topicId })
          .onConflictDoNothing();
      } else {
        await tx.delete(forumTopicBookmarks).where(and(
          eq(forumTopicBookmarks.userId, input.actorId), eq(forumTopicBookmarks.topicId, input.topicId),
        ));
      }
      return input.bookmarked;
    });
  }

  async setTopicWatch(input: { topicId: string; actorId: string; watching: boolean }): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      // Matches reply publication's topic mutex, so state changes and fanout are serialized.
      const [topic] = await tx.select({ id: forumTopics.id, isHidden: forumTopics.isHidden }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId)).for("no key update");
      // New subscriptions require a visible topic. Own Unwatch remains safe even
      // when the topic is hidden or absent, without probing target existence.
      if (input.watching && (!topic || topic.isHidden))
        throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (input.watching) {
        await tx.insert(forumTopicWatches).values({ userId: input.actorId, topicId: input.topicId })
          .onConflictDoNothing();
      } else {
        await tx.delete(forumTopicWatches).where(and(
          eq(forumTopicWatches.userId, input.actorId), eq(forumTopicWatches.topicId, input.topicId),
        ));
      }
      return input.watching;
    });
  }

  async createPost(input: CreatePostInput): Promise<ForumPost> {
    const fingerprint = input.publishedDraft?.draftId
      ? await publicationFingerprint({
        kind: "reply", topicId: input.topicId, parentPostId: input.parentPostId ?? null,
        body: input.bodyRevision.originalContent, bodyLocale: input.bodyRevision.sourceLocale,
        attachmentIds: [...(input.publishedDraft.attachmentIds ?? [])].sort(),
          }) : null;
    return withOperationalFacts(this.operational,facts=>this.database.transaction(async (tx) => {
      const changes:{added:FileReferenceTransition[];removed:FileReferenceTransition[]}={added:[],removed:[]};
      if (input.publishedDraft) {
        await lockAttachmentDraftScope(tx, input.authorId, input.publishedDraft.contextKey);
        const existing = await this.publicationReceipt(tx, input.authorId, input.publishedDraft, fingerprint);
        if (existing) {
          await assertActiveAccountForDrizzleMutation(tx, input.authorId);
          return {
            id: existing.postId, topicId: existing.topicId, authorId: input.authorId,
            parentPostId: input.parentPostId ?? null,
            solutionModerationStatus: null, solutionOutdatedReason: null,
            solutionOutdatedReasonKind: null, body: input.bodyRevision,
          };
        }
      }
      const [topic] = await tx.select({
        id: forumTopics.id, authorId: forumTopics.authorId,
        isClosed: forumTopics.isClosed, isHidden: forumTopics.isHidden,
      }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId))
        // Still serializes topic-state writers without blocking other FK KEY SHARE reads.
        .for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.isClosed) throw new ForumTopicClosedError("topic is closed to new replies");
      const [activeDuplicate] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, input.topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .limit(1);
      if (activeDuplicate) {
        throw new ForumStateConflictError("a confirmed duplicate cannot receive new replies");
      }
      const parentPostId = input.parentPostId ?? null;
      let parentAuthorId: string | null = null;
      if (parentPostId) {
        // Resolve/lock the existing FK parent before taking the actor mutex.
        const [parent] = await tx.select({
          id: forumPosts.id, authorId: forumPosts.authorId, isHidden: forumPosts.isHidden,
        }).from(forumPosts)
          .where(and(eq(forumPosts.id, parentPostId), eq(forumPosts.topicId, input.topicId)))
          .for("key share");
        if (!parent || parent.isHidden)
          throw new ForumEntityNotFoundError("parent post does not exist in topic");
        parentAuthorId = parent.authorId;
      }
      await assertActiveAccountForDrizzleMutation(tx, input.authorId);
      await this.measureAdmission(tx, input.authorId, "replies.create");
      const createdAt = await enforceForumWriteCooldown(tx, input.authorId, this.writePolicy);
      await tx.insert(forumPosts).values({
        id: input.id,
        topicId: input.topicId,
        authorId: input.authorId,
        currentRevisionId: input.bodyRevision.id,
        parentPostId,
        createdAt,
      });
      await tx.insert(forumPostRevisions).values({
        ...input.bodyRevision,
        postId: input.id,
        authorId: input.authorId,
      });

      // Watch candidates remain set-based and are decided after the topic mutex.
      await recordOrdinaryPostNotifications(tx, {
        actorId: input.authorId, topicId: input.topicId, postId: input.id,
        createdAt, kind: "reply",
        candidates: sql`select ${topic.authorId}::text as user_id
          union select ${parentAuthorId}::text
          union select ${forumTopicWatches.userId} from ${forumTopicWatches}
          where ${forumTopicWatches.topicId} = ${input.topicId}`,
      });

      await this.recordPublishedMentions(tx, {
        actorId: input.authorId, topicId: input.topicId, postId: input.id,
        body: input.bodyRevision.originalContent, createdAt,
      });

      if (input.publishedDraft) {
        await this.finishPublishedDraft(tx, input.authorId, input.publishedDraft, input.id,changes);
        await this.recordPublicationReceipt(tx, input.authorId, input.publishedDraft, fingerprint, input.topicId, input.id);
      }
      facts.captureFileReferences(input.id,input.authorId,changes);
      return {
        id: input.id,
        topicId: input.topicId,
        authorId: input.authorId,
        parentPostId,
        solutionModerationStatus: null,
        solutionOutdatedReason: null,
        solutionOutdatedReasonKind: null,
        body: input.bodyRevision,
      };
    }));
  }

  private async recordPublishedMentions(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0],
    input: { actorId: string; topicId: string; postId: string; body: string; createdAt: Date },
  ): Promise<void> {
    const identifiers = publishedMentionRecipients(input.body).filter((id) => id !== input.actorId);
    if (!identifiers.length) return;
    const existing = await tx.select({ id: user.id }).from(user).where(inArray(user.id, identifiers));
    if (!existing.length) return;
    await recordOrdinaryPostNotifications(tx, {
      ...input, kind: "mention",
      candidates: sql`select mentions.user_id from
        (values ${sql.join(existing.map(({id})=>sql`(${id}::text)`), sql`,`)}) as mentions(user_id)`,
    });
  }

  private async publicationReceipt(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0],
    ownerId: string,
    draft: { contextKey: string; draftId?: string },
    fingerprint: string | null,
  ) {
    if (!draft.draftId || !fingerprint) return null;
    const [receipt] = await tx.select({
      fingerprint: forumPublicationReceipts.fingerprint,
      topicId: forumPublicationReceipts.topicId,
      postId: forumPublicationReceipts.postId,
    }).from(forumPublicationReceipts).where(and(
      eq(forumPublicationReceipts.ownerId, ownerId),
      eq(forumPublicationReceipts.contextKey, draft.contextKey),
      eq(forumPublicationReceipts.draftId, draft.draftId),
    )).limit(1);
    if (receipt && receipt.fingerprint !== fingerprint) {
      throw new ForumPublicationReplayConflictError("published draft generation cannot be reused for a different request");
    }
    return receipt ?? null;
  }

  private async recordPublicationReceipt(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0],
    ownerId: string,
    draft: { contextKey: string; draftId?: string },
    fingerprint: string | null,
    topicId: string,
    postId: string,
  ) {
    if (!draft.draftId || !fingerprint) return;
    await tx.insert(forumPublicationReceipts).values({
      ownerId, contextKey: draft.contextKey, draftId: draft.draftId, fingerprint,
      topicId, postId, createdAt: new Date(),
    });
  }

  private async finishPublishedDraft(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0], ownerId: string,
    operation: { contextKey: string; draftId?: string; attachmentIds?: readonly string[] }, postId: string,
    changes:{added:FileReferenceTransition[];removed:FileReferenceTransition[]},
  ) {
    const selected = operation.attachmentIds ?? [];
    if (!operation.draftId) {
      if (selected.length) throw new ForumStateConflictError("attachments require an operation");
      return;
    }
    if (!/^[0-9a-f-]{36}$/iu.test(operation.draftId) || !Array.isArray(selected)
      || selected.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/iu.test(id))
      || new Set(selected.map((id) => id.toLowerCase())).size !== selected.length)
      throw new ForumStateConflictError("invalid publication operation");
    let generation: string;
    try { generation = await resolveAttachmentDraftGeneration(tx, ownerId, operation.contextKey, operation.draftId); }
    catch (error) { if (error instanceof ForumAttachmentDraftConflictError) throw new ForumStateConflictError("operation finished"); throw error; }
    if (generation !== operation.draftId) throw new ForumStateConflictError("operation changed");
    const refs = await tx.select({id: forumAttachments.id, verification: forumAttachments.verificationStatus,
      cleanup: forumAttachments.cleanupStatus}).from(forumAttachmentDraftRefs)
      .innerJoin(forumAttachments, eq(forumAttachments.id, forumAttachmentDraftRefs.attachmentId))
      .where(and(eq(forumAttachmentDraftRefs.ownerId, ownerId), eq(forumAttachments.ownerId, ownerId),
        eq(forumAttachmentDraftRefs.contextKey, operation.contextKey), eq(forumAttachmentDraftRefs.draftId, generation)));
    const ids = selected.map((id) => id.toLowerCase());
    if (ids.some((id) => !refs.some((ref) => ref.id === id && ref.verification === "type-checked" && ref.cleanup === "active")))
      throw new ForumStateConflictError("selected attachments are unavailable");
    if (ids.length) changes.added.push(...await tx.insert(forumPostAttachments).values(ids.map((attachmentId) => ({postId, attachmentId, createdAt: new Date()})))
      .returning({attachmentId:forumPostAttachments.attachmentId,
        referenceCreatedAt:sql<string>`to_char(${forumPostAttachments.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        operationAt:sql<string>`to_char(${forumPostAttachments.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}));
    await retireAttachmentDraftGeneration(tx, ownerId, operation.contextKey, generation);
    await tx.delete(forumAttachmentDraftRefs).where(and(eq(forumAttachmentDraftRefs.ownerId, ownerId),
      eq(forumAttachmentDraftRefs.contextKey, operation.contextKey), eq(forumAttachmentDraftRefs.draftId, generation)));
  }

  async listCategories(): Promise<ForumCategorySummary[]> {
    return this.database
      .select({
        id: forumCategories.id,
        name: forumCategories.name,
        sectionCount: sql<number>`count(distinct ${forumSections.id})::int`,
      })
      .from(forumCategories)
      .leftJoin(
        forumSections,
        and(
          eq(forumSections.categoryId, forumCategories.id),
          ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        ),
      )
      .groupBy(forumCategories.id, forumCategories.name, forumCategories.createdAt)
      .orderBy(
        sql`case when ${forumCategories.id} = ${HELP_SOLUTIONS_CATEGORY_ID} then 0 else 1 end`,
        asc(forumCategories.createdAt),
        asc(forumCategories.id),
      );
  }

  async readAdminOverviewCounts(): Promise<ForumAdminOverviewCounts> {
    // Four scalar aggregates in one statement/snapshot, independent of bounded public lists.
    const result = await this.database.execute<ForumAdminOverviewCounts & Record<string, unknown>>(sql`
      select (select count(*)::int from ${forumCategories}) as categories,
        (select count(*)::int from ${forumSections} where ${forumSections.id} <> ${HELP_SOLUTIONS_SERVICE_SECTION_ID}) as sections,
        (select count(*)::int from ${forumTopics}) as topics,
        (select count(*)::int from ${forumPosts}) as posts
    `);
    return result.rows[0]!;
  }

  async readHomepage(): Promise<ForumHomepageCategorySummary[]> {
    const categories = await this.database
      .select({
        id: forumCategories.id,
        name: forumCategories.name,
        topicCount: sql<number>`count(distinct ${forumTopics.id})::int`,
        messageCount: sql<number>`count(distinct ${forumPosts.id})::int`,
      })
      .from(forumCategories)
      .leftJoin(forumSections, eq(forumSections.categoryId, forumCategories.id))
      .leftJoin(forumTopics, and(eq(forumTopics.sectionId, forumSections.id), eq(forumTopics.isHidden, false)))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .groupBy(forumCategories.id, forumCategories.name, forumCategories.createdAt)
      .orderBy(
        sql`case when ${forumCategories.id} = ${HELP_SOLUTIONS_CATEGORY_ID} then 0 else 1 end`,
        asc(forumCategories.createdAt),
        asc(forumCategories.id),
      );

    const sectionRows = await this.database
      .select({
        categoryId: forumSections.categoryId,
        id: forumSections.id,
        name: forumSections.name,
        topicCount: sql<number>`count(distinct ${forumTopics.id})::int`,
        messageCount: sql<number>`count(distinct ${forumPosts.id})::int`,
      })
      .from(forumSections)
      .leftJoin(forumTopics, and(eq(forumTopics.sectionId, forumSections.id), eq(forumTopics.isHidden, false)))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .where(ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID))
      .groupBy(
        forumSections.id,
        forumSections.categoryId,
        forumSections.name,
        forumSections.createdAt,
      )
      .orderBy(
        asc(forumSections.categoryId),
        asc(forumSections.createdAt),
        asc(forumSections.id),
      );

    const sectionsByCategory = new Map<string, ForumHomepageSectionSummary[]>();
    for (const section of sectionRows) {
      const sections = sectionsByCategory.get(section.categoryId) ?? [];
      sections.push({
        id: section.id,
        name: section.name,
        topicCount: section.topicCount,
        messageCount: section.messageCount,
      });
      sectionsByCategory.set(section.categoryId, sections);
    }

    return categories.map((category) => {
      const sections = sectionsByCategory.get(category.id) ?? [];
      return {
        ...category,
        sectionCount: sections.length,
        topicCount: category.topicCount,
        messageCount: category.messageCount,
        sections,
      };
    });
  }

  async readPopular(referenceTime = new Date(), limitPerPeriod = 10): Promise<ForumPopularPage> {
    if (!Number.isFinite(referenceTime.getTime())) {
      throw new RangeError("referenceTime must be a valid Date");
    }
    if (!Number.isInteger(limitPerPeriod) || limitPerPeriod < 1 || limitPerPeriod > 20) {
      throw new RangeError("limitPerPeriod must be an integer between 1 and 20");
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const cutoff24h = new Date(referenceTime.getTime() - dayMs);
    const cutoff7d = new Date(referenceTime.getTime() - 7 * dayMs);
    const cutoff30d = new Date(referenceTime.getTime() - 30 * dayMs);

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        activity24h: sql<number>`count(${forumPosts.id}) filter (where ${forumPosts.createdAt} >= ${cutoff24h})::int`,
        activity7d: sql<number>`count(${forumPosts.id}) filter (where ${forumPosts.createdAt} >= ${cutoff7d})::int`,
        activity30d: sql<number>`count(${forumPosts.id})::int`,
        latest24h: sql<Date | null>`max(${forumPosts.createdAt}) filter (where ${forumPosts.createdAt} >= ${cutoff24h})`.mapWith(forumPosts.createdAt),
        latest7d: sql<Date | null>`max(${forumPosts.createdAt}) filter (where ${forumPosts.createdAt} >= ${cutoff7d})`.mapWith(forumPosts.createdAt),
        latest30d: sql<Date | null>`max(${forumPosts.createdAt})`.mapWith(forumPosts.createdAt),
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .where(and(gte(forumPosts.createdAt, cutoff30d), eq(forumTopics.isHidden, false), eq(forumPosts.isHidden, false)))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil);

    const rank = (
      countKey: "activity24h" | "activity7d" | "activity30d",
      latestKey: "latest24h" | "latest7d" | "latest30d",
    ): ForumPopularTopicSummary[] => rows
      .flatMap((row) => {
        const activityCount = row[countKey];
        const latestActivityAt = row[latestKey];
        if (activityCount <= 0 || !latestActivityAt) return [];
        const author = projectForumPublicAuthor(row);
        return [{
          id: row.id,
          title: row.title,
          authorName: author.name,
          ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
          activityCount,
          latestActivityAt,
        }];
      })
      .sort((left, right) =>
        right.activityCount - left.activityCount
        || right.latestActivityAt.getTime() - left.latestActivityAt.getTime()
        || (right.id < left.id ? -1 : right.id > left.id ? 1 : 0)
      )
      .slice(0, limitPerPeriod);

    return {
      "24h": rank("activity24h", "latest24h"),
      "7d": rank("activity7d", "latest7d"),
      "30d": rank("activity30d", "latest30d"),
    };
  }

  async readUnanswered(): Promise<ForumUnansweredTopicSummary[]> {
    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        createdAt: forumTopics.createdAt,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
      })
      .from(forumTopics)
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .where(and(eq(forumTopics.isSolved, false), eq(forumTopics.isHidden, false)))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name, user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .having(sql`count(${forumPosts.id}) filter (
        where not ${forumPosts.isHidden}
          and ${forumPosts.id} <> (
            select root.id from forum_posts root
            where root.topic_id = ${forumTopics.id}
            order by root.created_at, root.id limit 1
          )
      ) = 0`)
      .orderBy(desc(forumTopics.createdAt), desc(forumTopics.id));

    return rows.map((row) => {
      const author = projectForumPublicAuthor(row);
      return {
        id: row.id,
        title: row.title,
        sourceLocale: row.sourceLocale,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        createdAt: row.createdAt,
        ...publicDiscoveryLocation(row),
      };
    });
  }

  async readTags(): Promise<ForumTagSummary[]> {
    return this.database
      .select({
        key: forumTags.key,
        name: forumTags.name,
        topicCount: sql<number>`count(distinct ${forumTopics.id})::int`,
      })
      .from(forumTags)
      .leftJoin(forumTopicTags, eq(forumTopicTags.tagKey, forumTags.key))
      .leftJoin(forumTopics, and(
        eq(forumTopics.id, forumTopicTags.topicId), eq(forumTopics.isHidden, false),
      ))
      .groupBy(forumTags.key, forumTags.name, forumTags.createdAt)
      // A user-supplied tag used only by hidden topics must not reveal its name.
      .having(sql`count(distinct ${forumTopics.id}) > 0`)
      .orderBy(asc(forumTags.name), asc(forumTags.key));
  }

  async readTag(key: string): Promise<ForumTagPage | undefined> {
    const [tag] = await this.database
      .selectDistinct({ key: forumTags.key, name: forumTags.name })
      .from(forumTags)
      .innerJoin(forumTopicTags, eq(forumTopicTags.tagKey, forumTags.key))
      .innerJoin(forumTopics, and(
        eq(forumTopics.id, forumTopicTags.topicId),
        eq(forumTopics.isHidden, false),
      ))
      .where(eq(forumTags.key, key))
      .limit(1);
    if (!tag) return undefined;

    const topics = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
        createdAt: forumTopics.createdAt,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
      })
      .from(forumTopicTags)
      .innerJoin(forumTopics, and(eq(forumTopics.id, forumTopicTags.topicId), eq(forumTopics.isHidden, false)))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .where(eq(forumTopicTags.tagKey, key))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .orderBy(desc(forumTopics.createdAt), desc(forumTopics.id));

    const tagsByTopic = await this.readTagsForTopics(topics.map((topic) => topic.id));
    return {
      tag,
      topics: topics.map((topic) => {
        const author = projectForumPublicAuthor(topic);
        return {
          id: topic.id,
          title: topic.title,
          authorName: author.name,
          ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
          postCount: topic.postCount,
          createdAt: topic.createdAt,
          ...publicDiscoveryLocation(topic),
          tags: tagsByTopic.get(topic.id) ?? [],
        };
      }),
    };
  }

  async search(query: string, limit = 50): Promise<ForumSearchResult[]> {
    const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalizedQuery) return [];
    if (normalizedQuery.length > 200) {
      throw new RangeError("search query must be at most 200 characters");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("search limit must be an integer between 1 and 100");
    }

    const pattern = `%${escapeSearchPattern(normalizedQuery)}%`;
    const titleMatch = sql<boolean>`${forumTopicTitleRevisions.originalContent} ilike ${pattern} escape '!'`;
    const tagMatch = sql<boolean>`coalesce(${forumTags.name} ilike ${pattern} escape '!', false)
      or coalesce(${forumTags.key} ilike ${pattern} escape '!', false)`;
    const postMatch = sql<boolean>`coalesce(${forumPostRevisions.originalContent} ilike ${pattern} escape '!', false)`;
    const matchRank = sql<number>`case
      when ${titleMatch} then 3
      when bool_or(${tagMatch}) then 2
      else 1
    end::int`;
    const activityAt = sql`greatest(
      ${forumTopics.createdAt},
      coalesce(max(${forumPosts.createdAt}), ${forumTopics.createdAt})
    )`.mapWith(forumTopics.createdAt);

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
        activityAt,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
        matchRank,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .leftJoin(forumPostRevisions, and(
        eq(forumPostRevisions.postId, forumPosts.id),
        eq(forumPostRevisions.id, forumPosts.currentRevisionId),
      ))
      .leftJoin(forumTopicTags, eq(forumTopicTags.topicId, forumTopics.id))
      .leftJoin(forumTags, eq(forumTags.key, forumTopicTags.tagKey))
      .where(eq(forumTopics.isHidden, false))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .having(sql`bool_or(${titleMatch}) or bool_or(${tagMatch}) or bool_or(${postMatch})`)
      .orderBy(desc(matchRank), desc(activityAt), desc(forumTopics.id))
      .limit(limit);

    const tagsByTopic = await this.readTagsForTopics(rows.map((row) => row.id));
    return rows.map((row) => {
      const author = projectForumPublicAuthor(row);
      return {
        id: row.id,
        title: row.title,
        sourceLocale: row.sourceLocale,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        postCount: row.postCount,
        activityAt: row.activityAt,
        ...publicDiscoveryLocation(row),
        tags: tagsByTopic.get(row.id) ?? [],
      };
    });
  }

  async readUnreadForUser(userId: string): Promise<ForumUnreadTopicSummary[]> {
    const lastReadPost = alias(forumPosts, "forum_last_read_post");
    const activityAt = sql<Date>`max(${forumPosts.createdAt})`.mapWith(forumPosts.createdAt);
    const firstUnreadPostId = sql<string>`(array_agg(${forumPosts.id} order by ${forumPosts.createdAt} asc, ${forumPosts.id} asc))[1]`;
    const latestPostId = sql<string>`(array_agg(${forumPosts.id} order by ${forumPosts.createdAt} desc, ${forumPosts.id} desc))[1]`;

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        state: sql<"new" | "unread">`case when ${forumTopicReadStates.userId} is null then 'new' else 'unread' end`,
        firstUnreadPostId,
        latestPostId,
        unreadCount: sql<number>`count(${forumPosts.id})::int`,
        activityAt,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .innerJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .leftJoin(forumTopicReadStates, and(
        eq(forumTopicReadStates.userId, userId),
        eq(forumTopicReadStates.topicId, forumTopics.id),
      ))
      .leftJoin(lastReadPost, and(
        eq(lastReadPost.topicId, forumTopicReadStates.topicId),
        eq(lastReadPost.id, forumTopicReadStates.lastReadPostId),
      ))
      .where(and(
        eq(forumTopics.isHidden, false),
        or(
          isNull(forumTopicReadStates.userId),
          gt(forumPosts.createdAt, lastReadPost.createdAt),
          and(eq(forumPosts.createdAt, lastReadPost.createdAt), gt(forumPosts.id, lastReadPost.id)),
        ),
      ))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
        forumTopicReadStates.userId,
      )
      .orderBy(desc(activityAt), desc(forumTopics.id));

    return rows.map((row) => {
      const author = projectForumPublicAuthor(row);
      return {
        id: row.id,
        title: row.title,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        state: row.state,
        firstUnreadPostId: row.firstUnreadPostId,
        latestPostId: row.latestPostId,
        unreadCount: row.unreadCount,
        activityAt: row.activityAt,
        ...publicDiscoveryLocation(row),
      };
    });
  }

  async readMutedTopics(userId: string, before?: ForumPersonalFilterCursor): Promise<ForumPersonalPage<ForumMutedTopicSummary>> {
    const rows = await this.database.select({
      id: forumTopicMutes.topicId, createdAt: forumTopicMutes.createdAt,
      title: forumTopicTitleRevisions.originalContent,
      authorId: forumTopics.authorId, authorName: user.name,
      authorDeactivatedAt: user.deactivatedAt,
      authorDeactivatedByUserId: user.deactivatedByUserId,
      authorRetainAtLeastUntil: user.retainAtLeastUntil,
      sectionId: forumSections.id, sectionName: forumSections.name,
      categoryId: forumCategories.id, categoryName: forumCategories.name,
    }).from(forumTopicMutes)
      .innerJoin(forumTopics, eq(forumTopics.id, forumTopicMutes.topicId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .where(and(
        eq(forumTopicMutes.userId, userId),
        before ? or(lt(forumTopicMutes.createdAt, before.createdAt),
          and(eq(forumTopicMutes.createdAt, before.createdAt),
            lt(forumTopicMutes.topicId, before.targetId))) : undefined,
      ))
      .orderBy(desc(forumTopicMutes.createdAt), desc(forumTopicMutes.topicId))
      .limit(51);
    const pageRows = rows.slice(0, 50);
    const items = pageRows.map(row => {
      const author = projectForumPublicAuthor(row);
      return {
        id: row.id, title: row.title, mutedAt: row.createdAt,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        ...publicDiscoveryLocation(row),
      };
    });
    const last = pageRows.at(-1);
    return { items, next: rows.length > 50 && last
      ? { createdAt: last.createdAt, targetId: last.id } : null };
  }

  async readBlockedUsers(userId: string, before?: ForumPersonalFilterCursor): Promise<ForumPersonalPage<ForumBlockedUserSummary>> {
    const rows = await this.database.select({
      id: forumUserBlocks.blockedUserId, createdAt: forumUserBlocks.createdAt,
      authorId: user.id, authorName: user.name,
      authorDeactivatedAt: user.deactivatedAt,
      authorDeactivatedByUserId: user.deactivatedByUserId,
      authorRetainAtLeastUntil: user.retainAtLeastUntil,
    }).from(forumUserBlocks)
      .innerJoin(user, eq(user.id, forumUserBlocks.blockedUserId))
      .where(and(eq(forumUserBlocks.userId, userId),
        before ? or(lt(forumUserBlocks.createdAt, before.createdAt),
          and(eq(forumUserBlocks.createdAt, before.createdAt),
            lt(forumUserBlocks.blockedUserId, before.targetId))) : undefined))
      .orderBy(desc(forumUserBlocks.createdAt), desc(forumUserBlocks.blockedUserId))
      .limit(51);
    const pageRows = rows.slice(0, 50);
    const items = pageRows.map(row => {
      const projected = projectForumPublicAuthor(row);
      return { id: row.id, name: projected.name, blockedAt: row.createdAt,
        ...(projected.kind === "deleted" ? { identityKind: "deleted" as const } : {}) };
    });
    const last = pageRows.at(-1);
    return { items, next: rows.length > 50 && last
      ? { createdAt: last.createdAt, targetId: last.id } : null };
  }

  async readTopicMute(userId: string, topicId: string): Promise<boolean> {
    const rows = await this.database.select({ id: forumTopicMutes.topicId }).from(forumTopicMutes)
      .where(and(eq(forumTopicMutes.userId, userId), eq(forumTopicMutes.topicId, topicId))).limit(1);
    return rows.length > 0;
  }

  async readUserBlock(userId: string, blockedUserId: string): Promise<boolean> {
    const rows = await this.database.select({ id: forumUserBlocks.blockedUserId }).from(forumUserBlocks)
      .where(and(eq(forumUserBlocks.userId, userId), eq(forumUserBlocks.blockedUserId, blockedUserId))).limit(1);
    return rows.length > 0;
  }

  /** Only match blocked authors of visible posts in a visible topic; hidden
   * authors must not leak indirectly through the personalized loader DTO. */
  async readTopicBlockedAuthors(userId: string, topicId: string): Promise<string[]> {
    const rows = await this.database.select({ id: forumUserBlocks.blockedUserId })
      .from(forumUserBlocks)
      .innerJoin(forumPosts, and(
        eq(forumPosts.authorId, forumUserBlocks.blockedUserId),
        eq(forumPosts.isHidden, false),
      ))
      .innerJoin(forumTopics, and(
        eq(forumTopics.id, forumPosts.topicId),
        eq(forumTopics.isHidden, false),
      ))
      .where(and(eq(forumUserBlocks.userId, userId), eq(forumPosts.topicId, topicId)))
      .groupBy(forumUserBlocks.blockedUserId);
    return rows.map(row => row.id);
  }

  async readTopicBookmark(userId: string, topicId: string): Promise<boolean> {
    const rows = await this.database.select({ userId: forumTopicBookmarks.userId })
      .from(forumTopicBookmarks)
      .where(and(eq(forumTopicBookmarks.userId, userId), eq(forumTopicBookmarks.topicId, topicId)))
      .limit(1);
    return rows.length > 0;
  }

  async readTopicBookmarks(userId: string, before?: ForumTopicBookmarkCursor): Promise<ForumTopicBookmarksPage> {
    const rows = await this.database.select({
      id: forumTopicBookmarks.topicId,
      savedAt: forumTopicBookmarks.savedAt,
      title: forumTopicTitleRevisions.originalContent,
      authorId: forumTopics.authorId,
      authorName: user.name,
      authorDeactivatedAt: user.deactivatedAt,
      authorDeactivatedByUserId: user.deactivatedByUserId,
      authorRetainAtLeastUntil: user.retainAtLeastUntil,
      sectionId: forumSections.id,
      sectionName: forumSections.name,
      categoryId: forumCategories.id,
      categoryName: forumCategories.name,
    }).from(forumTopicBookmarks)
      // Page by retained own pairs; join current source metadata only for
      // visible topics, never selecting hidden title/identity/location.
      .leftJoin(forumTopics, and(
        eq(forumTopics.id, forumTopicBookmarks.topicId), eq(forumTopics.isHidden, false),
      ))
      .leftJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .leftJoin(user, eq(user.id, forumTopics.authorId))
      .leftJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .leftJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .where(and(
        eq(forumTopicBookmarks.userId, userId),
        before ? or(
          lt(forumTopicBookmarks.savedAt, before.savedAt),
          and(eq(forumTopicBookmarks.savedAt, before.savedAt),
            lt(forumTopicBookmarks.topicId, before.topicId)),
        ) : undefined,
      ))
      .orderBy(desc(forumTopicBookmarks.savedAt), desc(forumTopicBookmarks.topicId))
      .limit(51);

    const pageRows = rows.slice(0, 50);
    const items: ForumTopicBookmarkSummary[] = pageRows.map(row => {
      if (row.title === null || row.authorId === null || row.authorName === null
        || row.sectionId === null || row.sectionName === null
        || row.categoryId === null || row.categoryName === null) {
        return { id: row.id, savedAt: row.savedAt, unavailable: true };
      }
      const author = projectForumPublicAuthor({
        authorId: row.authorId, authorName: row.authorName,
        authorDeactivatedAt: row.authorDeactivatedAt,
        authorDeactivatedByUserId: row.authorDeactivatedByUserId,
        authorRetainAtLeastUntil: row.authorRetainAtLeastUntil,
      });
      return {
        id: row.id, title: row.title, savedAt: row.savedAt,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        ...publicDiscoveryLocation({
          sectionId: row.sectionId, sectionName: row.sectionName,
          categoryId: row.categoryId, categoryName: row.categoryName,
        }),
      };
    });
    const last = pageRows.at(-1);
    return { items, next: rows.length > 50 && last
      ? { savedAt: last.savedAt, topicId: last.id } : null };
  }

  async readTopicWatch(userId: string, topicId: string): Promise<boolean> {
    const rows = await this.database.select({ userId: forumTopicWatches.userId })
      .from(forumTopicWatches).where(and(eq(forumTopicWatches.userId, userId), eq(forumTopicWatches.topicId, topicId)))
      .limit(1);
    return rows.length > 0;
  }

  async readTopicReadState(userId: string, topicId: string): Promise<ForumTopicReadState | undefined> {
    return this.readTopicReadStateOn(this.database, userId, topicId);
  }

  private async readTopicReadStateOn(
    database: Pick<NodePgDatabase, "select">, userId: string, topicId: string,
  ): Promise<ForumTopicReadState | undefined> {
    const [topic] = await database
      .select({ id: forumTopics.id })
      .from(forumTopics)
      .where(and(eq(forumTopics.id, topicId), eq(forumTopics.isHidden, false)));
    if (!topic) return undefined;

    const [marker] = await database
      .select({ lastReadPostId: forumTopicReadStates.lastReadPostId })
      .from(forumTopicReadStates)
      .where(and(
        eq(forumTopicReadStates.userId, userId),
        eq(forumTopicReadStates.topicId, topicId),
      ));

    const posts = await database
      .select({ id: forumPosts.id, isHidden: forumPosts.isHidden })
      .from(forumPosts)
      .where(eq(forumPosts.topicId, topicId))
      .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));

    const visiblePosts = posts.filter((post) => !post.isHidden);
    const latestPostId = visiblePosts.at(-1)?.id ?? null;
    if (!latestPostId) {
      return {
        topicId,
        state: "read",
        lastReadPostId: marker?.lastReadPostId ?? null,
        firstUnreadPostId: null,
        latestPostId: null,
      };
    }

    if (!marker) {
      return {
        topicId,
        state: "new",
        lastReadPostId: null,
        firstUnreadPostId: visiblePosts[0]!.id,
        latestPostId,
      };
    }

    const markerIndex = posts.findIndex((post) => post.id === marker.lastReadPostId);
    if (markerIndex < 0) {
      throw new ForumStateConflictError("topic read marker does not belong to current topic snapshot");
    }
    const firstUnreadPostId = posts.slice(markerIndex + 1).find((post) => !post.isHidden)?.id ?? null;
    return {
      topicId,
      state: firstUnreadPostId ? "unread" : "read",
      lastReadPostId: marker.lastReadPostId,
      firstUnreadPostId,
      latestPostId,
    };
  }

  async advanceTopicReadState(userId: string, topicId: string, postId: string): Promise<ForumTopicReadState> {
    return this.database.transaction(async (tx) => {
      // FK dependencies before actor admission. KEY SHARE is compatible with
      // concurrent non-key content edits and does not require lock upgrades.
      const [topic] = await tx.select({ id: forumTopics.id }).from(forumTopics)
        .where(eq(forumTopics.id, topicId)).for("key share");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      const [target] = await tx.select({ id: forumPosts.id }).from(forumPosts)
        .where(and(eq(forumPosts.topicId, topicId), eq(forumPosts.id, postId)))
        .for("key share");
      if (!target) throw new ForumEntityNotFoundError("post does not exist in topic");

      await assertActiveAccountForDrizzleMutation(tx, userId);

      await tx.execute(sql`
        insert into forum_topic_read_states (user_id, topic_id, last_read_post_id, updated_at)
        values (${userId}, ${topicId}, ${postId}, now())
        on conflict (user_id, topic_id) do update
        set last_read_post_id = excluded.last_read_post_id,
            updated_at = now()
        where exists (
          select 1
          from forum_posts as candidate
          inner join forum_posts as current_marker
            on current_marker.topic_id = forum_topic_read_states.topic_id
           and current_marker.id = forum_topic_read_states.last_read_post_id
          where candidate.topic_id = excluded.topic_id
            and candidate.id = excluded.last_read_post_id
            and (
              candidate.created_at > current_marker.created_at
              or (
                candidate.created_at = current_marker.created_at
                and candidate.id > current_marker.id
              )
            )
        )
      `);

      const state = await this.readTopicReadStateOn(tx, userId, topicId);
      if (!state) throw new ForumEntityNotFoundError("topic does not exist");
      return state;
    });
  }

  async readNotifications(userId:string,page:number):Promise<ForumNotificationPage>{
    if(!Number.isSafeInteger(page)||page<0||page>10000)throw new RangeError("invalid page");
    return this.database.transaction(async tx=>{
      const total=await tx.execute<{total:number}>(sql`select count(*)::int as total from forum_reply_notifications where recipient_user_id=${userId}`);
      const rows=await tx.execute<ForumNotificationSummary & {
        actorId: string | null; actorDeactivatedAt: Date | string | null;
        actorDeactivatedByUserId: string | null; actorRetainAtLeastUntil: Date | string | null;
      } & Record<string, unknown>>(sql`
        select n.id,n.kind,n.created_at as "createdAt",n.read_at as "readAt",
          actor.id as "actorId",actor.name as "actorName",
          actor.deactivated_at as "actorDeactivatedAt",
          actor.deactivated_by_user_id as "actorDeactivatedByUserId",
          actor.retain_at_least_until as "actorRetainAtLeastUntil",
          n.topic_id as "topicId",title.original_content as "topicTitle",
          n.post_id as "postId",coalesce(d.case_id,a.case_id) as "caseId",a.id as "appealId"
        from forum_reply_notifications n
        left join "user" actor on actor.id=n.actor_user_id and n.kind in ('reply','mention')
        left join forum_topics topic on topic.id=n.topic_id
        left join forum_topic_title_revisions title on title.topic_id=topic.id and title.id=topic.current_title_revision_id
        left join forum_complaint_decisions d on d.id=n.complaint_decision_id and n.kind='complaint-decision'
        left join forum_complaint_appeals a on a.id=n.complaint_appeal_id and n.kind='complaint-appeal-result'
        where n.recipient_user_id=${userId}
        order by case when n.read_at is null then 0 else 1 end,n.created_at desc,n.id desc
        limit 51 offset ${page*50}`);
      return {
        items: rows.rows.slice(0,50).map(row => ({
          id: row.id, kind: row.kind,
          ...(row.kind === "reply" || row.kind === "mention"
            ? projectNotificationActor(row) : { actorName: null }),
          topicId: row.topicId, topicTitle: row.topicTitle, postId: row.postId,
          caseId: row.caseId, appealId: row.appealId,
          createdAt: row.createdAt, readAt: row.readAt,
        })),
        page, total: total.rows[0]?.total??0, hasMore: rows.rows.length>50,
      };
    },{isolationLevel:"repeatable read",accessMode:"read only"});
  }

  async countUnreadNotifications(userId:string):Promise<number>{
    const [row]=await this.database.select({count:sql<number>`count(*)::int`})
      .from(forumReplyNotifications)
      .where(and(eq(forumReplyNotifications.recipientUserId,userId),isNull(forumReplyNotifications.readAt)));
    return row?.count??0;
  }

  async markNotificationRead(userId:string,notificationId:string):Promise<ForumNotificationTarget>{
    return this.database.transaction(async tx=>{
      await assertActiveAccountForDrizzleMutation(tx, userId);
      const row=await tx.execute<{kind:ForumNotificationTarget["kind"];caseId:string|null;appealId:string|null;topicId:string|null;postId:string|null}>(sql`
        select n.kind,coalesce(d.case_id,a.case_id) as "caseId",a.id as "appealId",n.topic_id as "topicId",n.post_id as "postId"
        from forum_reply_notifications n
        left join forum_complaint_decisions d on d.id=n.complaint_decision_id
        left join forum_complaint_appeals a on a.id=n.complaint_appeal_id
        where n.id=${notificationId} and n.recipient_user_id=${userId}
        for update of n`);
      const n=row.rows[0];
      if(!n)throw new ForumEntityNotFoundError("notification not found");
      if(n.kind==="complaint-decision"||n.kind==="complaint-appeal-result"){
        if(!n.caseId)throw new ForumEntityNotFoundError("notification target missing");
        const member=await tx.execute(sql`select 1 from forum_complaint_cases c
          join forum_complaint_targets t on t.id=c.target_id
          where c.id=${n.caseId} and (t.affected_author_id=${userId} or exists(
            select 1 from forum_complaints r where r.case_id=c.id and r.reporter_user_id=${userId}))`);
        if(!member.rows.length)throw new ForumEntityNotFoundError("notification not found");
        await tx.execute(sql`update forum_reply_notifications set read_at=coalesce(read_at,statement_timestamp()) where id=${notificationId}`);
        return n.kind==="complaint-appeal-result"&&n.appealId?{kind:n.kind,caseId:n.caseId,appealId:n.appealId}:{kind:"complaint-decision" as const,caseId:n.caseId};
      }
      if(!n.topicId||!n.postId)throw new ForumEntityNotFoundError("notification target missing");
      await tx.execute(sql`update forum_reply_notifications set read_at=coalesce(read_at,statement_timestamp()) where id=${notificationId}`);
      return {kind:n.kind,topicId:n.topicId,postId:n.postId};
    });
  }

  async readReplyNotifications(userId: string, limit = 50): Promise<ForumReplyNotificationSummary[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("notification limit must be an integer between 1 and 100");
    }
    const actor = alias(user, "notification_actor");
    const rows = await this.database
      .select({
        id: forumReplyNotifications.id,
        actorId: actor.id,
        actorName: actor.name,
        actorDeactivatedAt: actor.deactivatedAt,
        actorDeactivatedByUserId: actor.deactivatedByUserId,
        actorRetainAtLeastUntil: actor.retainAtLeastUntil,
        topicId: forumReplyNotifications.topicId,
        topicTitle: forumTopicTitleRevisions.originalContent,
        postId: forumReplyNotifications.postId,
        kind: forumReplyNotifications.kind,
        createdAt: forumReplyNotifications.createdAt,
        readAt: forumReplyNotifications.readAt,
      })
      .from(forumReplyNotifications)
      .innerJoin(actor, eq(actor.id, forumReplyNotifications.actorUserId))
      .innerJoin(forumTopics, eq(forumTopics.id, forumReplyNotifications.topicId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .where(and(eq(forumReplyNotifications.recipientUserId, userId),inArray(forumReplyNotifications.kind,["reply","mention"])))
      // Keep every unread row reachable even when the bounded inbox contains
      // more than `limit` notifications. Read history remains newest-first.
      .orderBy(
        sql`case when ${forumReplyNotifications.readAt} is null then 0 else 1 end`,
        desc(forumReplyNotifications.createdAt),
        desc(forumReplyNotifications.id),
      )
      .limit(limit);
    return rows.map(row => ({
      id: row.id, kind: row.kind as "reply" | "mention",
      ...projectNotificationActor(row),
      topicId: row.topicId!, topicTitle: row.topicTitle, postId: row.postId!,
      createdAt: row.createdAt, readAt: row.readAt,
    }));
  }

  async countUnreadReplyNotifications(userId: string): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(forumReplyNotifications)
      .where(and(
        eq(forumReplyNotifications.recipientUserId, userId),
        isNull(forumReplyNotifications.readAt),
        inArray(forumReplyNotifications.kind,["reply","mention"]),
      ));
    return row?.count ?? 0;
  }

  async markReplyNotificationRead(
    userId: string,
    notificationId: string,
  ): Promise<{ topicId: string; postId: string }> {
    return this.database.transaction(async (tx) => {
      await assertActiveAccountForDrizzleMutation(tx, userId);
      const [notification] = await tx
        .update(forumReplyNotifications)
        .set({ readAt: sql`coalesce(${forumReplyNotifications.readAt}, now())` })
        .where(and(
          eq(forumReplyNotifications.id, notificationId),
          eq(forumReplyNotifications.recipientUserId, userId),
          inArray(forumReplyNotifications.kind,["reply","mention"]),
        ))
        .returning({
          topicId: forumReplyNotifications.topicId,
          postId: forumReplyNotifications.postId,
        });
    if (!notification?.topicId || !notification.postId) throw new ForumEntityNotFoundError("notification does not exist for user");
    return {topicId:notification.topicId,postId:notification.postId};
    });
  }

  async readTopicPinState(topicId: string): Promise<boolean> {
    const [pin] = await this.database
      .select({ topicId: forumTopicPins.topicId })
      .from(forumTopicPins)
      .where(eq(forumTopicPins.topicId, topicId));
    return Boolean(pin);
  }

  /** Dynamic RBAC checked inside the same transaction, without cached UI hints. */
  private async assertVisibilityManagementPermission(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0], actorId: string,
  ): Promise<void> {
    if (isBoundOwner(actorId, this.ownerUserId)) return;
    const result = await tx.execute<{ allowed: boolean }>(sql`
      select case
        when o.effect = 'deny' then false
        when o.effect = 'allow' then true
        when rp.permission_key is not null then true
        else false end as allowed
      from ${user} u
      left join ${authzUserPermissionOverrides} o
        on o.user_id = u.id and o.permission_key = 'forum.content.visibility.manage'
      left join ${authzUserRoles} ur on ur.user_id = u.id
      join ${authzRoles} r on r.id = coalesce(ur.role_id,
        (select id from ${authzRoles} where slug = 'user'))
      left join ${authzRolePermissions} rp on rp.role_id = r.id
        and rp.permission_key = 'forum.content.visibility.manage'
      where u.id = ${actorId}
    `);
    if (result.rows[0]?.allowed !== true)
      throw new ForumAuthorizationError("visibility management permission required");
  }

  /** Atomically switch a topic's visibility without changing its content/revision. */
  async setTopicVisibility(input: {
    topicId: string; actorId: string; hidden: boolean;
    expectedVisibilityVersion: number; expectedRevisionId: string; reason: string;
  }): Promise<{ hidden: boolean; visibilityVersion: number; changed: boolean }> {
    return this.database.transaction(async tx => {
      const [topic] = await tx.select({
        hidden: forumTopics.isHidden, version: forumTopics.visibilityVersion,
        revisionId: forumTopics.currentTitleRevisionId,
      }).from(forumTopics).where(eq(forumTopics.id, input.topicId)).for("no key update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      await this.measureAdmission(tx, input.actorId, "admin.forum");
      await this.assertVisibilityManagementPermission(tx, input.actorId);
      if (topic.version !== input.expectedVisibilityVersion || topic.revisionId !== input.expectedRevisionId)
        throw new ForumStateConflictError("topic visibility baseline changed");
      if (topic.hidden === input.hidden)
        return { hidden: topic.hidden, visibilityVersion: topic.version, changed: false };
      if (!input.reason) throw new ForumVisibilityReasonError("visibility reason required");
      if (topic.version >= 2_147_483_647)
        throw new ForumStateConflictError("topic visibility version exhausted");
      const version = topic.version + 1;
      await tx.update(forumTopics).set({
        isHidden: input.hidden, visibilityVersion: version,
        visibilityChangedAt: sql`clock_timestamp()`,
      }).where(eq(forumTopics.id, input.topicId));
      await appendVisibilityHistory(tx, input.actorId, {
        action: input.hidden ? "topic.hidden" : "topic.restored",
        targetType: "topic", targetId: input.topicId, reason: input.reason,
        context: {
          topicId: input.topicId, before: topic.hidden, after: input.hidden,
          previousVersion: topic.version, version, observedRevisionId: topic.revisionId,
        },
      });
      return { hidden: input.hidden, visibilityVersion: version, changed: true };
    });
  }

  /** Lock topic, target post, then actor, with History as the last write. */
  async setPostVisibility(input: {
    topicId: string; postId: string; actorId: string; hidden: boolean;
    expectedVisibilityVersion: number; expectedRevisionId: string; reason: string;
  }): Promise<{ hidden: boolean; visibilityVersion: number; changed: boolean }> {
    return this.database.transaction(async tx => {
      const [topic] = await tx.select({ id: forumTopics.id }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId)).for("no key update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      const [post] = await tx.select({
        topicId: forumPosts.topicId, hidden: forumPosts.isHidden,
        version: forumPosts.visibilityVersion, revisionId: forumPosts.currentRevisionId,
      }).from(forumPosts).where(eq(forumPosts.id, input.postId)).for("no key update");
      if (!post || post.topicId !== input.topicId)
        throw new ForumEntityNotFoundError("post does not exist in topic");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      await this.measureAdmission(tx, input.actorId, "admin.forum");
      await this.assertVisibilityManagementPermission(tx, input.actorId);
      if (post.version !== input.expectedVisibilityVersion || post.revisionId !== input.expectedRevisionId)
        throw new ForumStateConflictError("post visibility baseline changed");
      if (post.hidden === input.hidden)
        return { hidden: post.hidden, visibilityVersion: post.version, changed: false };
      if (!input.reason) throw new ForumVisibilityReasonError("visibility reason required");
      if (post.version >= 2_147_483_647)
        throw new ForumStateConflictError("post visibility version exhausted");
      const version = post.version + 1;
      await tx.update(forumPosts).set({
        isHidden: input.hidden, visibilityVersion: version,
        visibilityChangedAt: sql`clock_timestamp()`,
      }).where(and(eq(forumPosts.id, input.postId), eq(forumPosts.topicId, input.topicId)));
      await appendVisibilityHistory(tx, input.actorId, {
        action: input.hidden ? "post.hidden" : "post.restored",
        targetType: "post", targetId: input.postId, reason: input.reason,
        context: {
          topicId: input.topicId, postId: input.postId, before: post.hidden, after: input.hidden,
          previousVersion: post.version, version, observedRevisionId: post.revisionId,
        },
      });
      return { hidden: input.hidden, visibilityVersion: version, changed: true };
    });
  }

  /** Uses the same topic row lock as reply admission; append History last. */
  async setTopicClosed(input: {
    topicId: string; actorId: string; isClosed: boolean; expectedClosureVersion: number;
  }): Promise<{ isClosed: boolean; closureVersion: number; changed: boolean }> {
    return this.database.transaction(async (tx) => {
      const [topic] = await tx.select({
        isClosed: forumTopics.isClosed, closureVersion: forumTopics.closureVersion,
        isHidden: forumTopics.isHidden,
      }).from(forumTopics).where(eq(forumTopics.id, input.topicId)).for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.closureVersion !== input.expectedClosureVersion)
        throw new ForumStateConflictError("topic closure state changed");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (topic.isClosed === input.isClosed)
        return { isClosed: topic.isClosed, closureVersion: topic.closureVersion, changed: false };
      await this.measureAdmission(tx, input.actorId, "admin.forum");
      if (topic.closureVersion >= 2_147_483_647)
        throw new ForumStateConflictError("topic closure version exhausted");

      const version = topic.closureVersion + 1;
      await tx.update(forumTopics).set({
        isClosed: input.isClosed, closureVersion: version,
      }).where(eq(forumTopics.id, input.topicId));
      await appendForumHistory(tx, input.actorId, {
        action: input.isClosed ? "topic.closed" : "topic.reopened",
        targetType: "topic", targetId: input.topicId,
        context: {
          before: topic.isClosed, after: input.isClosed,
          previousVersion: topic.closureVersion, version,
        },
      });
      return { isClosed: input.isClosed, closureVersion: version, changed: true };
    });
  }

  async pinTopic(topicId: string, pinnedByUserId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ isHidden: forumTopics.isHidden })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, pinnedByUserId);
      await this.measureAdmission(tx, pinnedByUserId, "admin.forum");
      const changed = await tx.insert(forumTopicPins)
        .values({ topicId, pinnedByUserId })
        .onConflictDoNothing({ target: forumTopicPins.topicId }).returning({topicId:forumTopicPins.topicId});
      if (changed.length) await appendForumHistory(tx,pinnedByUserId,{action:"topic.pinned",targetType:"topic",targetId:topicId,context:{before:false,after:true}});
    });
  }

  async unpinTopic(topicId: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ isHidden: forumTopics.isHidden })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");
      const changed=await tx.delete(forumTopicPins).where(eq(forumTopicPins.topicId, topicId)).returning({topicId:forumTopicPins.topicId});
      if(changed.length)await appendForumHistory(tx,actorId,{action:"topic.unpinned",targetType:"topic",targetId:topicId,context:{before:true,after:false}});
    });
  }

  async searchHelpSolutionsSimilar(
    query: ForumHelpSimilarQuestionQuery,
    limit = 5,
  ): Promise<ForumHelpSimilarQuestionSummary[]> {
    const normalizedTitle = query.title.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalizedTitle) return [];
    if (normalizedTitle.length > 200) {
      throw new RangeError("similar-question title must be at most 200 characters");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      throw new RangeError("similar-question limit must be an integer between 1 and 10");
    }

    const titleTerms = helpSimilarTitleTerms(normalizedTitle, HELP_SIMILAR_TITLE_TERM_LIMIT);
    const normalizedTags = helpSimilarNormalizedTags(query.tags);
    const terms = helpSimilarSearchTerms({
      title: normalizedTitle,
      body: query.body,
      tags: query.tags,
    });
    if (terms.length === 0 && normalizedTags.length === 0) return [];

    const patterns = terms.map((term) => `%${escapeSearchPattern(term)}%`);
    const titlePatterns = terms.map(helpSimilarTitleTokenPattern);
    const titleTermMatches = titlePatterns.map((pattern) =>
      sql<boolean>`${forumTopicTitleRevisions.originalContent} ~* ${pattern}`,
    );
    const tagTermMatches = terms.map((term, index) =>
      usefulHelpSimilarTerm(term)
        ? sql<boolean>`exists (
            select 1
            from ${forumTopicTags}
            inner join ${forumTags} on ${forumTags.key} = ${forumTopicTags.tagKey}
            where ${forumTopicTags.topicId} = ${forumTopics.id}
              and (
                ${forumTags.name} ilike ${patterns[index]!} escape '!'
                or ${forumTags.key} ilike ${patterns[index]!} escape '!'
              )
          )`
        : sql<boolean>`false`,
    );
    const bodyTermMatches = terms.map((term, index) =>
      usefulHelpSimilarTerm(term)
        ? sql<boolean>`exists (
            select 1
            from ${forumPosts}
            inner join ${forumPostRevisions}
              on ${forumPostRevisions.postId} = ${forumPosts.id}
              and ${forumPostRevisions.id} = ${forumPosts.currentRevisionId}
            where ${forumPosts.topicId} = ${forumTopics.id}
              and not ${forumPosts.isHidden}
              and ${forumPostRevisions.originalContent} ilike ${patterns[index]!} escape '!'
          )`
        : sql<boolean>`false`,
    );

    const titleQueryMatches = titleTerms.map((term) =>
      sql<boolean>`${forumTopicTitleRevisions.originalContent} ~* ${helpSimilarTitleTokenPattern(term)}`,
    );
    const titleQueryMatchCount = sql<number>`(${sql.join(
      titleQueryMatches.length > 0
        ? titleQueryMatches.map((match) => sql`case when ${match} then 1 else 0 end`)
        : [sql`0`],
      sql` + `,
    )})::int`;
    const titleMatchCount = sql<number>`(${sql.join(
      titleTermMatches.length > 0
        ? titleTermMatches.map((match) => sql`case when ${match} then 1 else 0 end`)
        : [sql`0`],
      sql` + `,
    )})::int`;
    const tagMatchCount = sql<number>`(${sql.join(
      tagTermMatches.length > 0
        ? tagTermMatches.map((match) => sql`case when ${match} then 1 else 0 end`)
        : [sql`0`],
      sql` + `,
    )})::int`;
    const bodyMatchCount = sql<number>`(${sql.join(
      bodyTermMatches.length > 0
        ? bodyTermMatches.map((match) => sql`case when ${match} then 1 else 0 end`)
        : [sql`0`],
      sql` + `,
    )})::int`;
    const coveredTermCount = sql<number>`(${sql.join(
      titleTermMatches.length > 0
        ? titleTermMatches.map((titleMatch, index) => sql`case
            when ${titleMatch}
              or ${tagTermMatches[index]!}
              or ${bodyTermMatches[index]!}
            then 1 else 0 end`)
        : [sql`0`],
      sql` + `,
    )})::int`;

    const exactTitleMatch = sql<boolean>`
      ${forumTopicTitleRevisions.originalContent} ilike
      ${escapeSearchPattern(normalizedTitle)} escape '!'
    `;
    const exactTagMatch = normalizedTags.length > 0
      ? sql<boolean>`exists (
          select 1
          from ${forumTopicTags}
          inner join ${forumTags} on ${forumTags.key} = ${forumTopicTags.tagKey}
          where ${forumTopicTags.topicId} = ${forumTopics.id}
            and (
              ${sql.join(
                normalizedTags.map((tag) => sql`
                  lower(${forumTags.name}) = ${tag}
                  or lower(${forumTags.key}) = ${tag}
                `),
                sql` or `,
              )}
            )
        )`
      : sql<boolean>`false`;
    const requiredTitleMatches = titleTerms.length >= 2 ? 2 : 1;
    const strongTitleMatch = titleTerms.length > 0
      ? sql<boolean>`${titleQueryMatchCount} >= ${requiredTitleMatches}`
      : sql<boolean>`false`;

    const relevanceScore = sql<number>`(
      case when ${exactTitleMatch} then 1000 else 0 end
      + case when ${exactTagMatch} then 500 else 0 end
      + ${titleMatchCount} * 20
      + ${tagMatchCount} * 8
      + ${bodyMatchCount} * 2
    )::int`;
    const matchTier = sql<number>`case
      when ${exactTitleMatch} then 5
      when ${exactTagMatch} then 4
      when ${strongTitleMatch} then 3
      when ${tagMatchCount} > 0 then 2
      when ${bodyMatchCount} > 0 then 1
      else 0
    end::int`;
    const matchSource = sql<ForumHelpSimilarMatchSource>`case
      when ${exactTitleMatch} then 'title'
      when ${exactTagMatch} then 'tags'
      when ${strongTitleMatch} then 'title'
      when ${tagMatchCount} > 0 then 'tags'
      when ${bodyMatchCount} > 0 then 'body'
      else 'title'
    end`;
    const postCount = sql<number>`(
      select count(*)::int
      from ${forumPosts}
      where ${forumPosts.topicId} = ${forumTopics.id}
        and not ${forumPosts.isHidden}
        and ${forumPosts.id} <> (
          select root.id from forum_posts root
          where root.topic_id = ${forumTopics.id}
          order by root.created_at, root.id limit 1
        )
    )`;
    const activityAt = sql`greatest(
      ${forumTopics.createdAt},
      coalesce(
        (
          select max(${forumPosts.createdAt})
          from ${forumPosts}
          where ${forumPosts.topicId} = ${forumTopics.id} and not ${forumPosts.isHidden}
        ),
        ${forumTopics.createdAt}
      )
    )`.mapWith(forumTopics.createdAt);

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        postCount,
        isSolved: forumTopics.isSolved,
        activityAt,
        relevanceScore,
        matchTier,
        coveredTermCount,
        matchSource,
      })
      .from(forumTopics)
      .innerJoin(forumSections, and(
        eq(forumSections.id, forumTopics.sectionId),
        eq(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
      ))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .where(and(eq(forumTopics.isHidden, false), sql`(
        ${exactTitleMatch}
        or ${exactTagMatch}
        or ${strongTitleMatch}
        or ${tagMatchCount} > 0
        or ${bodyMatchCount} > 0
        or ${titleMatchCount} > 0
      )`))
      .orderBy(
        desc(matchTier),
        desc(coveredTermCount),
        desc(relevanceScore),
        desc(activityAt),
        desc(forumTopics.id),
      )
      .limit(limit);

    const tagsByTopic = await this.readTagsForTopics(rows.map(({ id }) => id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      replyCount: row.postCount,
      isSolved: row.isSolved,
      tags: tagsByTopic.get(row.id) ?? [],
      matchSource: row.matchSource,
    }));
  }

  async readHelpSolutionsAll(filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "all" }, filters);
  }

  async readHelpSolutionsOpen(filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "open" }, filters);
  }

  async readHelpSolutionsActive(filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "active" }, filters);
  }

  async readHelpSolutionsNeedsAttention(
    filters: ForumHelpSolutionsFilters,
    visibility: ForumHelpAttentionVisibility,
  ): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "attention" }, filters, visibility);
  }

  /** Counts reflect pending, visible work across all topics, independently of the current page. */
  async readHelpAttentionCounts(visibility: ForumHelpAttentionVisibility): Promise<ForumAttentionQueueCounts> {
    const result: ForumAttentionQueueCounts = {
      "needs-details": 0, "needs-review": 0,
      "solution-outdated": 0, "duplicate": 0, appeals: 0, mixed: 0,
    };
    const kinds = [...new Set(visibility.signalKinds)];
    const signalTarget = alias(forumPosts, "attention_count_signal_target");
    if (kinds.length) {
      const wherePending = and(
        eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isHidden, false),
        eq(forumHelpSignals.status, "pending"),
        inArray(forumHelpSignals.kind, kinds),
        or(isNull(forumHelpSignals.targetPostId), eq(signalTarget.isHidden, false)),
      );
      const [byKind, mixedCount] = await Promise.all([
        this.database.select({ kind: forumHelpSignals.kind, total: count() })
          .from(forumHelpSignals)
          .innerJoin(forumTopics, eq(forumTopics.id, forumHelpSignals.topicId))
          .leftJoin(signalTarget, eq(signalTarget.id, forumHelpSignals.targetPostId))
          .where(wherePending).groupBy(forumHelpSignals.kind),
        this.database.select({ total: count() }).from(
          this.database.select({ topicId: forumHelpSignals.topicId })
            .from(forumHelpSignals)
            .innerJoin(forumTopics, eq(forumTopics.id, forumHelpSignals.topicId))
            .leftJoin(signalTarget, eq(signalTarget.id, forumHelpSignals.targetPostId))
            .where(wherePending)
            .groupBy(forumHelpSignals.topicId)
            .having(gt(count(), 1))
            .as("attention_mixed_topics"),
        ),
      ]);
      for (const row of byKind) result[row.kind as HelpSignalKind] = row.total;
      result.mixed = mixedCount[0]?.total ?? 0;
    }
    if (visibility.appeals) {
      const rows = await this.database.select({ total: count() })
        .from(forumHelpDuplicateAppeals)
        .innerJoin(forumHelpDuplicateRelationships,
          eq(forumHelpDuplicateRelationships.id, forumHelpDuplicateAppeals.relationshipId))
        .innerJoin(forumTopics, eq(forumTopics.id, forumHelpDuplicateRelationships.duplicateTopicId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumHelpDuplicateAppeals.status, "pending"),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ));
      result.appeals = rows[0]?.total ?? 0;
    }
    if (kinds.includes("needs-review")) {
      const rows = await this.database.select({ total: count() })
        .from(forumTopics)
        .innerJoin(forumPosts, eq(forumPosts.id, forumTopics.bestAnswerPostId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumTopics.isHidden, false),
          eq(forumPosts.isHidden, false),
          eq(forumTopics.isSolved, true),
          eq(forumPosts.solutionModerationStatus, "needs-review"),
        ));
      result["needs-review"] += rows[0]?.total ?? 0;
    }
    return result;
  }

  /** Select actionable cases before pagination, independently of topic activity. */
  async readHelpAttentionCases(
    group: ForumAttentionQueueGroup,
    visibility: ForumHelpAttentionVisibility,
    page = 0,
  ): Promise<ForumAttentionQueuePage> {
    if (!Number.isSafeInteger(page) || page < 0 || page > 10000) {
      throw new RangeError("invalid attention queue page");
    }
    const pageSize = 50;
    const offset = page * pageSize;
    const kinds = [...new Set(visibility.signalKinds)];
    const empty = (): ForumAttentionQueuePage => ({ cases: [], hasMore: false, page });
    const compare = (a: ForumAttentionQueueCase, b: ForumAttentionQueueCase) =>
      a.createdAt.getTime() - b.createdAt.getTime()
      || (a.type + ":" + a.id).localeCompare(b.type + ":" + b.id, "en");

    const original = alias(forumTopics, "attention_original_topic");
    const originalRevision = alias(forumTopicTitleRevisions, "attention_original_revision");
    const signalTarget = alias(forumPosts, "attention_signal_target");
    const mixedTarget = alias(forumPosts, "attention_mixed_signal_target");
    const readSignals = async (selected: HelpSignalKind[], limit?: number, skip = 0, topicIds?: string[]) => {
      if (!selected.length || (topicIds && !topicIds.length)) return [] as ForumAttentionQueueCase[];
      const query = this.database.select({
        id: forumHelpSignals.id, kind: forumHelpSignals.kind,
        topicId: forumHelpSignals.topicId,
        topicTitle: forumTopicTitleRevisions.originalContent,
        targetPostId: forumHelpSignals.targetPostId,
        originalId: original.id, originalTitle: originalRevision.originalContent,
        submittedByUserId: forumHelpSignals.submittedByUserId,
        submittedByName: user.name,
        explanation: forumHelpSignals.explanation, createdAt: forumHelpSignals.createdAt,
      }).from(forumHelpSignals)
        .innerJoin(forumTopics, eq(forumTopics.id, forumHelpSignals.topicId))
        .innerJoin(forumTopicTitleRevisions, eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId))
        .innerJoin(user, eq(user.id, forumHelpSignals.submittedByUserId))
        .leftJoin(signalTarget, eq(signalTarget.id, forumHelpSignals.targetPostId))
        .leftJoin(original, and(
          eq(original.id, forumHelpSignals.proposedOriginalTopicId),
          eq(original.isHidden, false),
        ))
        .leftJoin(originalRevision, eq(originalRevision.id, original.currentTitleRevisionId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumTopics.isHidden, false),
          eq(forumHelpSignals.status, "pending"),
          inArray(forumHelpSignals.kind, selected),
          or(isNull(forumHelpSignals.targetPostId), eq(signalTarget.isHidden, false)),
          topicIds ? inArray(forumHelpSignals.topicId, topicIds) : undefined,
        )).orderBy(asc(forumHelpSignals.createdAt), asc(forumHelpSignals.id))
        .$dynamic();
      const rows = await (limit === undefined ? query : query.limit(limit).offset(skip));
      return rows.map((row): ForumAttentionQueueCase => ({
        type: "signal", id: row.id, kind: row.kind as HelpSignalKind,
        topicId: row.topicId, topicTitle: row.topicTitle,
        submittedByUserId: row.submittedByUserId, submittedByName: row.submittedByName,
        explanation: row.explanation, createdAt: row.createdAt,
        targetPostId: row.targetPostId,
        original: row.originalId && row.originalTitle
          ? { id: row.originalId, title: row.originalTitle } : null,
      }));
    };

    if (group === "mixed") {
      if (!kinds.length) return empty();
      const topics = await this.database.select({ topicId: forumHelpSignals.topicId })
        .from(forumHelpSignals)
        .innerJoin(forumTopics, eq(forumTopics.id, forumHelpSignals.topicId))
        .leftJoin(mixedTarget, eq(mixedTarget.id, forumHelpSignals.targetPostId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumTopics.isHidden, false),
          eq(forumHelpSignals.status, "pending"),
          inArray(forumHelpSignals.kind, kinds),
          or(isNull(forumHelpSignals.targetPostId), eq(mixedTarget.isHidden, false)),
        ))
        .groupBy(forumHelpSignals.topicId)
        .having(gt(count(), 1))
        .orderBy(asc(min(forumHelpSignals.createdAt)), asc(forumHelpSignals.topicId))
        .limit(pageSize + 1).offset(offset);
      const cases = await readSignals(kinds, undefined, 0,
        topics.slice(0, pageSize).map((row) => row.topicId));
      return { cases: cases.sort(compare), hasMore: topics.length > pageSize, page };
    }

    if (group === "appeals") {
      if (!visibility.appeals) return empty();
      const duplicate = alias(forumTopics, "attention_appeal_original");
      const duplicateTitle = alias(forumTopicTitleRevisions, "attention_appeal_original_revision");
      const rows = await this.database.select({
        id: forumHelpDuplicateAppeals.id,
        topicId: forumHelpDuplicateRelationships.duplicateTopicId,
        topicHidden: forumTopics.isHidden,
        topicTitle: forumTopicTitleRevisions.originalContent,
        originalId: duplicate.id, originalHidden: duplicate.isHidden,
        originalTitle: duplicateTitle.originalContent,
        submittedByUserId: forumHelpDuplicateAppeals.appellantUserId,
        submittedByName: user.name, explanation: forumHelpDuplicateAppeals.explanation,
        createdAt: forumHelpDuplicateAppeals.createdAt,
      }).from(forumHelpDuplicateAppeals)
        .innerJoin(forumHelpDuplicateRelationships,
          eq(forumHelpDuplicateRelationships.id, forumHelpDuplicateAppeals.relationshipId))
        .innerJoin(forumTopics, eq(forumTopics.id, forumHelpDuplicateRelationships.duplicateTopicId))
        .leftJoin(forumTopicTitleRevisions, and(
          eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
          eq(forumTopics.isHidden, false),
        ))
        .innerJoin(duplicate, eq(duplicate.id, forumHelpDuplicateRelationships.originalTopicId))
        .leftJoin(duplicateTitle, and(
          eq(duplicateTitle.id, duplicate.currentTitleRevisionId),
          eq(duplicate.isHidden, false),
        ))
        .innerJoin(user, eq(user.id, forumHelpDuplicateAppeals.appellantUserId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumHelpDuplicateAppeals.status, "pending"),
          isNull(forumHelpDuplicateRelationships.removedAt),
        )).orderBy(asc(forumHelpDuplicateAppeals.createdAt), asc(forumHelpDuplicateAppeals.id))
        .limit(pageSize + 1).offset(offset);
      return {
        cases: rows.slice(0, pageSize).map((row): ForumAttentionQueueCase => ({
          type: "appeal", id: row.id, kind: "appeal",
          topicId: row.topicId, topicTitle: row.topicHidden ? "" : row.topicTitle ?? "",
          ...(row.topicHidden ? { topicUnavailable: true } : {}),
          submittedByUserId: row.submittedByUserId, submittedByName: row.submittedByName,
          explanation: row.explanation, createdAt: row.createdAt,
          targetPostId: null,
          original: row.originalHidden || !row.originalTitle
            ? null : { id: row.originalId, title: row.originalTitle },
        })),
        hasMore: rows.length > pageSize, page,
      };
    }

    if (!kinds.includes(group)) return empty();
    if (group !== "needs-review") {
      const rows = await readSignals([group], pageSize + 1, offset);
      return { cases: rows.slice(0, pageSize), hasMore: rows.length > pageSize, page };
    }

    // A moderator-assigned status is not a user signal. Both work sources
    // remain distinct despite sharing the Needs review navigation group.
    const countThroughPage = offset + pageSize + 1;
    const [signals, reviewRows] = await Promise.all([
      readSignals(["needs-review"], countThroughPage),
      this.database.select({
        id: forumPosts.id, topicId: forumTopics.id,
        topicTitle: forumTopicTitleRevisions.originalContent,
        createdAt: forumPosts.createdAt,
      }).from(forumTopics)
        .innerJoin(forumPosts, eq(forumPosts.id, forumTopics.bestAnswerPostId))
        .innerJoin(forumTopicTitleRevisions, eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId))
        .where(and(
          eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
          eq(forumTopics.isHidden, false),
          eq(forumPosts.isHidden, false),
          eq(forumTopics.isSolved, true),
          eq(forumPosts.solutionModerationStatus, "needs-review"),
        )).orderBy(asc(forumPosts.createdAt), asc(forumPosts.id))
        .limit(countThroughPage),
    ]);
    const cases: ForumAttentionQueueCase[] = [
      ...signals,
      ...reviewRows.map((row): ForumAttentionQueueCase => ({
        type: "review-status", id: row.id, kind: "review-status",
        topicId: row.topicId, topicTitle: row.topicTitle,
        submittedByUserId: null, submittedByName: null,
        explanation: null, createdAt: row.createdAt,
        targetPostId: row.id, original: null,
      })),
    ];
    cases.sort(compare);
    return { cases: cases.slice(offset, offset + pageSize),
      hasMore: cases.length > offset + pageSize, page };
  }

  async readHelpSolutionsSolved(filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "solved" }, filters);
  }

  async readHelpSolutionsMine(userId: string, filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "mine", authorId: userId }, filters);
  }

  async readHelpSolutionsWantToHelp(userId: string, filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "help", excludedAuthorId: userId }, filters);
  }

  async readHelpSolutionsForMe(userId: string, filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    const [category] = await this.database
      .select({ id: forumCategories.id, name: forumCategories.name })
      .from(forumCategories)
      .where(eq(forumCategories.id, HELP_SOLUTIONS_CATEGORY_ID));
    if (!category) return undefined;

    const interestRows = await this.database
      .selectDistinct({ tagKey: forumTopicTags.tagKey })
      .from(forumTopicTags)
      .innerJoin(forumTopics, eq(forumTopics.id, forumTopicTags.topicId))
      .leftJoin(
        forumPosts,
        and(
          eq(forumPosts.topicId, forumTopics.id),
          eq(forumPosts.authorId, userId),
          eq(forumPosts.isHidden, false),
        ),
      )
      .where(and(
        eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isHidden, false),
        or(
          eq(forumTopics.authorId, userId),
          eq(forumPosts.authorId, userId),
        ),
      ))
      .orderBy(asc(forumTopicTags.tagKey))
      .limit(HELP_SOLUTIONS_FOR_ME_INTEREST_TAG_LIMIT);

    const interestTagKeys = interestRows.map(({ tagKey }) => tagKey);
    if (interestTagKeys.length === 0) return { ...category, questions: [] };

    const activityAt = sql`greatest(
      ${forumTopics.createdAt},
      coalesce(max(${forumPosts.createdAt}), ${forumTopics.createdAt})
    )`.mapWith(forumTopics.createdAt);
    const matchCount = sql<number>`count(distinct ${forumTopicTags.tagKey})::int`;
    const currentBestAnswer = alias(forumPosts, "help_for_me_current_best_answer");
    const activeDuplicate = alias(forumHelpDuplicateRelationships, "help_for_me_active_duplicate");
    const solutionCondition = filters.solution === "open"
      ? eq(forumTopics.isSolved, false)
      : filters.solution === "solved"
        ? eq(forumTopics.isSolved, true)
        : filters.solution === "needs-review"
          ? eq(currentBestAnswer.solutionModerationStatus, "needs-review")
          : filters.solution === "outdated"
            ? eq(currentBestAnswer.solutionModerationStatus, "outdated")
            : undefined;
    const qualityCondition = filters.quality === "normal"
      ? eq(forumTopics.needsDetails, false)
      : filters.quality === "needs-details"
        ? eq(forumTopics.needsDetails, true)
        : undefined;
    const relationCondition = filters.relation === "standalone"
      ? isNull(activeDuplicate.id)
      : filters.relation === "duplicate"
        ? isNotNull(activeDuplicate.id)
        : undefined;
    const visibleReplyCount = sql<number>`count(distinct ${forumPosts.id}) filter (
      where ${forumPosts.id} <> (
        select root.id from forum_posts root where root.topic_id = ${forumTopics.id}
        order by root.created_at, root.id limit 1
      )
    )::int`;
    const answersCondition = filters.answers === "none"
      ? sql`${visibleReplyCount} = 0`
      : filters.answers === "has"
        ? sql`${visibleReplyCount} > 0`
        : sql`true`;

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        postCount: visibleReplyCount,
        isSolved: forumTopics.isSolved,
        bestAnswerPostId: forumTopics.bestAnswerPostId,
        solutionModerationStatus: currentBestAnswer.solutionModerationStatus,
        solutionOutdatedReason: currentBestAnswer.solutionOutdatedReason,
        solutionOutdatedReasonKind: currentBestAnswer.solutionOutdatedReasonKind,
        needsDetails: forumTopics.needsDetails,
        createdAt: forumTopics.createdAt,
        activityAt,
        matchCount,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(
        forumTopicTags,
        and(
          eq(forumTopicTags.topicId, forumTopics.id),
          inArray(forumTopicTags.tagKey, interestTagKeys),
        ),
      )
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .leftJoin(currentBestAnswer, and(
        eq(currentBestAnswer.topicId, forumTopics.id),
        eq(currentBestAnswer.id, forumTopics.bestAnswerPostId),
        eq(currentBestAnswer.isHidden, false),
      ))
      .leftJoin(activeDuplicate, and(
        eq(activeDuplicate.duplicateTopicId, forumTopics.id),
        isNull(activeDuplicate.removedAt),
      ))
      .where(and(
        eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isHidden, false),
        eq(forumTopics.isSolved, false),
        ne(forumTopics.authorId, userId),
        solutionCondition,
        qualityCondition,
        relationCondition,
      ))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        currentBestAnswer.solutionModerationStatus,
        currentBestAnswer.solutionOutdatedReason,
        currentBestAnswer.solutionOutdatedReasonKind,
      )
      .having(answersCondition)
      .orderBy(desc(matchCount), desc(activityAt), desc(forumTopics.id))
      .limit(HELP_SOLUTIONS_FOR_ME_LIMIT);

    const topicIds = rows.map(({ id }) => id);
    const tagsByTopic = await this.readTagsForTopics(topicIds);
    const duplicatesByTopic = await this.readHelpDuplicatePresentations(topicIds);
    return {
      ...category,
      questions: rows.map((row) => {
        const author = projectForumPublicAuthor(row);
        return {
        id: row.id,
        title: row.title,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        replyCount: row.postCount,
        isSolved: row.isSolved,
        hasBestAnswer: row.bestAnswerPostId !== null,
        solutionModerationStatus: row.solutionModerationStatus as HelpSolutionModerationStatus | null,
        solutionOutdatedReason: row.solutionOutdatedReason,
        solutionOutdatedReasonKind: row.solutionOutdatedReasonKind as HelpSolutionOutdatedReasonKind | null,
        needsDetails: row.needsDetails,
        duplicateOf: duplicatesByTopic.get(row.id)?.duplicateOf ?? null,
        duplicateDisputed: duplicatesByTopic.get(row.id)?.duplicateDisputed ?? false,
        createdAt: row.createdAt,
        activityAt: row.activityAt,
        tags: tagsByTopic.get(row.id) ?? [],
        };
      }),
    };
  }

  private async readHelpSolutionsPage(
    filter:
      | { mode: "all" }
      | { mode: "open" }
      | { mode: "active" }
      | { mode: "attention" }
      | { mode: "solved" }
      | { mode: "mine"; authorId: string }
      | { mode: "help"; excludedAuthorId: string },
    filters: ForumHelpSolutionsFilters = {},
    attentionVisibility?: ForumHelpAttentionVisibility,
  ): Promise<ForumHelpSolutionsPage | undefined> {
    const [category] = await this.database
      .select({ id: forumCategories.id, name: forumCategories.name })
      .from(forumCategories)
      .where(eq(forumCategories.id, HELP_SOLUTIONS_CATEGORY_ID));
    if (!category) return undefined;

    const activityAt = sql`greatest(
      ${forumTopics.createdAt},
      coalesce(max(${forumPosts.createdAt}), ${forumTopics.createdAt})
    )`.mapWith(forumTopics.createdAt);
    const currentBestAnswer = alias(forumPosts, "help_page_current_best_answer");
    const activeDuplicate = alias(forumHelpDuplicateRelationships, "help_page_active_duplicate");
    const solutionCondition = filters.solution === "open"
      ? eq(forumTopics.isSolved, false)
      : filters.solution === "solved"
        ? eq(forumTopics.isSolved, true)
        : filters.solution === "needs-review"
          ? eq(currentBestAnswer.solutionModerationStatus, "needs-review")
          : filters.solution === "outdated"
            ? eq(currentBestAnswer.solutionModerationStatus, "outdated")
            : undefined;
    const qualityCondition = filters.quality === "normal"
      ? eq(forumTopics.needsDetails, false)
      : filters.quality === "needs-details"
        ? eq(forumTopics.needsDetails, true)
        : undefined;
    const relationCondition = filters.relation === "standalone"
      ? isNull(activeDuplicate.id)
      : filters.relation === "duplicate"
        ? isNotNull(activeDuplicate.id)
        : undefined;
    const visibleSignalKinds = filter.mode === "attention" ? [...(attentionVisibility?.signalKinds ?? [])] : [];
    // Match the same public visibility gate as the Attention queue, including
    // targetless signals. The predicate also applies to the later badge count.
    const visibleSignalTarget = sql`(
      ${forumHelpSignals.targetPostId} is null or exists (
        select 1 from ${forumPosts}
        where ${forumPosts.id} = ${forumHelpSignals.targetPostId}
          and ${forumPosts.topicId} = ${forumHelpSignals.topicId}
          and not ${forumPosts.isHidden}
      )
    )`;
    // Correlated EXISTS selects actionable cases before applying the 100-question bound.
    // A denied signal/appeal capability must not leak its cases into this private queue.
    const signalAttentionCondition = visibleSignalKinds.length
      ? sql`exists (
          select 1 from ${forumHelpSignals}
          where ${forumHelpSignals.topicId} = ${forumTopics.id}
          and ${forumHelpSignals.status} = 'pending'
          and ${inArray(forumHelpSignals.kind, visibleSignalKinds)}
          and ${visibleSignalTarget}
        )`
      : sql`false`;
    const appealAttentionCondition = attentionVisibility?.appeals
      ? sql`exists (
          select 1 from ${forumHelpDuplicateRelationships}
          inner join ${forumHelpDuplicateAppeals}
            on ${forumHelpDuplicateAppeals.relationshipId} = ${forumHelpDuplicateRelationships.id}
          where ${forumHelpDuplicateRelationships.duplicateTopicId} = ${forumTopics.id}
          and ${forumHelpDuplicateRelationships.removedAt} is null
          and ${forumHelpDuplicateAppeals.status} = 'pending'
        )`
      : sql`false`;
    const reviewAttentionCondition = visibleSignalKinds.includes("needs-review")
      ? eq(currentBestAnswer.solutionModerationStatus, "needs-review")
      : sql`false`;
    const visibleReplyCount = sql<number>`count(distinct ${forumPosts.id}) filter (
      where ${forumPosts.id} <> (
        select root.id from forum_posts root where root.topic_id = ${forumTopics.id}
        order by root.created_at, root.id limit 1
      )
    )::int`;
    const answersCondition = filters.answers === "none"
      ? sql`${visibleReplyCount} = 0`
      : filters.answers === "has"
        ? sql`${visibleReplyCount} > 0`
        : sql`true`;

    const questionQuery = this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        postCount: visibleReplyCount,
        isSolved: forumTopics.isSolved,
        bestAnswerPostId: forumTopics.bestAnswerPostId,
        solutionModerationStatus: currentBestAnswer.solutionModerationStatus,
        solutionOutdatedReason: currentBestAnswer.solutionOutdatedReason,
        solutionOutdatedReasonKind: currentBestAnswer.solutionOutdatedReasonKind,
        needsDetails: forumTopics.needsDetails,
        createdAt: forumTopics.createdAt,
        activityAt,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .leftJoin(currentBestAnswer, and(
        eq(currentBestAnswer.topicId, forumTopics.id),
        eq(currentBestAnswer.id, forumTopics.bestAnswerPostId),
        eq(currentBestAnswer.isHidden, false),
      ))
      .leftJoin(activeDuplicate, and(
        eq(activeDuplicate.duplicateTopicId, forumTopics.id),
        isNull(activeDuplicate.removedAt),
      ))
      .where(and(
        eq(forumTopics.isHidden, false),
        filter.mode === "solved"
          ? and(
              eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
              eq(forumTopics.isSolved, true),
            )
          : filter.mode === "open"
            ? and(
                eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
                eq(forumTopics.isSolved, false),
              )
            : filter.mode === "attention"
              ? eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID)
            : filter.mode === "mine"
              ? and(
                  eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
                  eq(forumTopics.authorId, filter.authorId),
                )
              : filter.mode === "help"
                ? and(
                    eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
                    eq(forumTopics.isSolved, false),
                    ne(forumTopics.authorId, filter.excludedAuthorId),
                  )
                : eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        solutionCondition,
        qualityCondition,
        relationCondition,
        filter.mode === "attention"
          ? or(signalAttentionCondition, appealAttentionCondition, reviewAttentionCondition)
          : undefined,
      ))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        forumTopics.authorId, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        currentBestAnswer.solutionModerationStatus,
        currentBestAnswer.solutionOutdatedReason,
        currentBestAnswer.solutionOutdatedReasonKind,
      )
      .having(and(
        filter.mode === "active"
          ? sql`${visibleReplyCount} > 0`
          : sql`true`,
        answersCondition,
      ))
      .orderBy(desc(activityAt), desc(forumTopics.id));

    const rows = filter.mode === "active"
      ? await questionQuery.limit(HELP_SOLUTIONS_ACTIVE_LIMIT)
      : filter.mode === "attention"
        ? await questionQuery.limit(HELP_SOLUTIONS_NEEDS_ATTENTION_LIMIT)
        : filter.mode === "mine"
          ? await questionQuery.limit(HELP_SOLUTIONS_MINE_LIMIT)
          : filter.mode === "help"
            ? await questionQuery.limit(HELP_SOLUTIONS_WANT_TO_HELP_LIMIT)
            : await questionQuery;
    const topicIds = rows.map(({ id }) => id);
    const tagsByTopic = await this.readTagsForTopics(topicIds);
    const duplicatesByTopic = await this.readHelpDuplicatePresentations(topicIds);
    const attentionByTopic = new Map<string, ForumHelpAttentionState>();
    if (filter.mode === "attention" && topicIds.length > 0) {
      const [signals, appeals] = await Promise.all([
        visibleSignalKinds.length
          ? this.database.select({ topicId: forumHelpSignals.topicId, kind: forumHelpSignals.kind })
              .from(forumHelpSignals)
              .where(and(
                inArray(forumHelpSignals.topicId, topicIds),
                eq(forumHelpSignals.status, "pending"),
                inArray(forumHelpSignals.kind, visibleSignalKinds),
                visibleSignalTarget,
              ))
          : Promise.resolve([]),
        attentionVisibility?.appeals
          ? this.database.select({ topicId: forumHelpDuplicateRelationships.duplicateTopicId })
              .from(forumHelpDuplicateRelationships)
              .innerJoin(forumHelpDuplicateAppeals, and(
                eq(forumHelpDuplicateAppeals.relationshipId, forumHelpDuplicateRelationships.id),
                eq(forumHelpDuplicateAppeals.status, "pending"),
              ))
              .where(and(
                inArray(forumHelpDuplicateRelationships.duplicateTopicId, topicIds),
                isNull(forumHelpDuplicateRelationships.removedAt),
              ))
          : Promise.resolve([]),
      ]);
      const entryFor = (topicId: string) => {
        let entry = attentionByTopic.get(topicId);
        if (!entry) {
          entry = { signals: {}, totalSignals: 0, appeal: false };
          attentionByTopic.set(topicId, entry);
        }
        return entry;
      };
      for (const signal of signals) {
        const state = entryFor(signal.topicId);
        const kind = signal.kind as HelpSignalKind;
        state.signals[kind] = (state.signals[kind] ?? 0) + 1;
        state.totalSignals += 1;
      }
      for (const appeal of appeals) entryFor(appeal.topicId).appeal = true;
      // The authoritative Needs review status is itself unfinished moderation work;
      // resolved labels such as Needs details or Solution outdated are not.
      if (visibleSignalKinds.includes("needs-review")) {
        for (const row of rows) {
          if (row.solutionModerationStatus === "needs-review") {
            entryFor(row.id).reviewRequired = true;
          }
        }
      }
    }
    return {
      ...category,
      questions: rows.filter((row) => filter.mode !== "attention" || attentionByTopic.has(row.id)).map((row) => {
        const author = projectForumPublicAuthor(row);
        return {
        id: row.id,
        title: row.title,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        replyCount: row.postCount,
        isSolved: row.isSolved,
        hasBestAnswer: row.bestAnswerPostId !== null,
        solutionModerationStatus: row.solutionModerationStatus as HelpSolutionModerationStatus | null,
        solutionOutdatedReason: row.solutionOutdatedReason,
        solutionOutdatedReasonKind: row.solutionOutdatedReasonKind as HelpSolutionOutdatedReasonKind | null,
        needsDetails: row.needsDetails,
        duplicateOf: duplicatesByTopic.get(row.id)?.duplicateOf ?? null,
        duplicateDisputed: duplicatesByTopic.get(row.id)?.duplicateDisputed ?? false,
        ...(filter.mode === "attention" ? { attention: attentionByTopic.get(row.id) } : {}),
        createdAt: row.createdAt,
        activityAt: row.activityAt,
        tags: tagsByTopic.get(row.id) ?? [],
        };
      }),
    };
  }

  private async readHelpDuplicatePresentations(
    topicIds: readonly string[],
    queryDb: Pick<NodePgDatabase, "select"> = this.database,
  ): Promise<Map<string, {
    duplicateOf: ForumHelpDuplicateReference;
    duplicateRelationshipId: string;
    duplicateDisputed: boolean;
  }>> {
    if (topicIds.length === 0) return new Map();
    const originalTopic = alias(forumTopics, "help_duplicate_original_topic");
    const originalTitle = alias(forumTopicTitleRevisions, "help_duplicate_original_title");
    const pendingAppeal = alias(forumHelpDuplicateAppeals, "help_duplicate_pending_appeal");
    const rows = await queryDb
      .select({
        relationshipId: forumHelpDuplicateRelationships.id,
        duplicateTopicId: forumHelpDuplicateRelationships.duplicateTopicId,
        originalTopicId: forumHelpDuplicateRelationships.originalTopicId,
        originalHidden: originalTopic.isHidden,
        originalTitle: originalTitle.originalContent,
        pendingAppealId: pendingAppeal.id,
      })
      .from(forumHelpDuplicateRelationships)
      .innerJoin(originalTopic, eq(originalTopic.id, forumHelpDuplicateRelationships.originalTopicId))
      .leftJoin(originalTitle, and(
        eq(originalTitle.topicId, originalTopic.id),
        eq(originalTitle.id, originalTopic.currentTitleRevisionId),
        eq(originalTopic.isHidden, false),
      ))
      .leftJoin(pendingAppeal, and(
        eq(pendingAppeal.relationshipId, forumHelpDuplicateRelationships.id),
        eq(pendingAppeal.status, "pending"),
      ))
      .where(and(
        inArray(forumHelpDuplicateRelationships.duplicateTopicId, [...topicIds]),
        isNull(forumHelpDuplicateRelationships.removedAt),
      ));

    return new Map(rows.map((row) => [
      row.duplicateTopicId,
      {
        duplicateOf: row.originalHidden
          ? { id: "", title: "", unavailable: true }
          : { id: row.originalTopicId, title: row.originalTitle! },
        duplicateRelationshipId: row.relationshipId,
        duplicateDisputed: row.pendingAppealId !== null,
      },
    ]));
  }

  async readPendingHelpDuplicateAppeal(topicId: string): Promise<ForumHelpDuplicateAppeal | undefined> {
    const [row] = await this.database
      .select({
        id: forumHelpDuplicateAppeals.id,
        relationshipId: forumHelpDuplicateAppeals.relationshipId,
        explanation: forumHelpDuplicateAppeals.explanation,
        createdAt: forumHelpDuplicateAppeals.createdAt,
      })
      .from(forumHelpDuplicateRelationships)
      .innerJoin(
        forumHelpDuplicateAppeals,
        and(
          eq(forumHelpDuplicateAppeals.relationshipId, forumHelpDuplicateRelationships.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ),
      )
      .where(and(
        eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
        isNull(forumHelpDuplicateRelationships.removedAt),
      ));
    return row;
  }

  async readCategory(id: string, pinnedTopicsPerSection = 10): Promise<ForumCategoryPage | undefined> {
    if (!Number.isInteger(pinnedTopicsPerSection) || pinnedTopicsPerSection < 1 || pinnedTopicsPerSection > 10) {
      throw new RangeError("pinnedTopicsPerSection must be an integer between 1 and 10");
    }
    const rows = await this.database
      .select({
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        sectionCreatedAt: forumSections.createdAt,
        topicCount: sql<number>`count(distinct ${forumTopics.id})::int`,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
      })
      .from(forumCategories)
      .leftJoin(
        forumSections,
        and(
          eq(forumSections.categoryId, forumCategories.id),
          ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        ),
      )
      .leftJoin(forumTopics, and(eq(forumTopics.sectionId, forumSections.id), eq(forumTopics.isHidden, false)))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .where(eq(forumCategories.id, id))
      .groupBy(forumCategories.id, forumCategories.name, forumSections.id, forumSections.name, forumSections.createdAt)
      .orderBy(asc(forumSections.createdAt), asc(forumSections.id));
    const first = rows[0];
    if (!first) return undefined;

    const topicActivity = this.database
      .select({
        sectionId: forumTopics.sectionId,
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        activityAt: sql`greatest(
          ${forumTopics.createdAt},
          coalesce(max(${forumPosts.createdAt}), ${forumTopics.createdAt})
        )`.mapWith(forumTopics.createdAt).as("activity_at"),
      })
      .from(forumTopics)
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .where(and(
        eq(forumSections.categoryId, id),
        ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isHidden, false),
      ))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, user.id, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil)
      .as("category_section_topic_activity");

    const rankedTopics = this.database
      .select({
        sectionId: topicActivity.sectionId,
        id: topicActivity.id,
        title: topicActivity.title,
        authorId: topicActivity.authorId, authorName: topicActivity.authorName,
        authorDeactivatedAt: topicActivity.authorDeactivatedAt,
        authorDeactivatedByUserId: topicActivity.authorDeactivatedByUserId,
        authorRetainAtLeastUntil: topicActivity.authorRetainAtLeastUntil,
        activityAt: topicActivity.activityAt,
        activityRank: sql<number>`row_number() over (
          partition by ${topicActivity.sectionId}
          order by ${topicActivity.activityAt} desc, ${topicActivity.id} desc
        )::int`.as("activity_rank"),
      })
      .from(topicActivity)
      .as("category_section_ranked_topics");

    const latestTopics = await this.database
      .select({
        sectionId: rankedTopics.sectionId,
        id: rankedTopics.id,
        title: rankedTopics.title,
        authorId: rankedTopics.authorId, authorName: rankedTopics.authorName,
        authorDeactivatedAt: rankedTopics.authorDeactivatedAt,
        authorDeactivatedByUserId: rankedTopics.authorDeactivatedByUserId,
        authorRetainAtLeastUntil: rankedTopics.authorRetainAtLeastUntil,
        activityAt: rankedTopics.activityAt,
      })
      .from(rankedTopics)
      .where(lte(rankedTopics.activityRank, 6))
      .orderBy(asc(rankedTopics.sectionId), asc(rankedTopics.activityRank));

    const latestBySection = new Map<string, ForumSectionTopicSummary[]>();
    for (const topic of latestTopics) {
      const author = projectForumPublicAuthor(topic);
      const list = latestBySection.get(topic.sectionId) ?? [];
      list.push({
        id: topic.id,
        title: topic.title,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        activityAt: topic.activityAt,
      });
      latestBySection.set(topic.sectionId, list);
    }

    const pinnedActivity = this.database
      .select({
        sectionId: forumTopics.sectionId,
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        pinnedAt: forumTopicPins.pinnedAt,
        activityAt: sql`greatest(
          ${forumTopics.createdAt},
          coalesce(max(${forumPosts.createdAt}), ${forumTopics.createdAt})
        )`.mapWith(forumTopics.createdAt).as("activity_at"),
      })
      .from(forumTopicPins)
      .innerJoin(forumTopics, eq(forumTopics.id, forumTopicPins.topicId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .where(and(
        eq(forumSections.categoryId, id),
        ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isHidden, false),
      ))
      .groupBy(
        forumTopics.id,
        forumSections.id,
        forumTopicTitleRevisions.id,
        user.id, user.name, user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil,
        forumTopicPins.pinnedAt,
      )
      .as("category_section_pin_activity");

    const rankedPinned = this.database
      .select({
        sectionId: pinnedActivity.sectionId,
        id: pinnedActivity.id,
        title: pinnedActivity.title,
        authorId: pinnedActivity.authorId, authorName: pinnedActivity.authorName,
        authorDeactivatedAt: pinnedActivity.authorDeactivatedAt,
        authorDeactivatedByUserId: pinnedActivity.authorDeactivatedByUserId,
        authorRetainAtLeastUntil: pinnedActivity.authorRetainAtLeastUntil,
        activityAt: pinnedActivity.activityAt,
        pinRank: sql<number>`row_number() over (
          partition by ${pinnedActivity.sectionId}
          order by ${pinnedActivity.pinnedAt} desc, ${pinnedActivity.id} desc
        )::int`.as("pin_rank"),
      })
      .from(pinnedActivity)
      .as("category_section_ranked_pins");

    const pinnedTopics = await this.database
      .select({
        sectionId: rankedPinned.sectionId,
        id: rankedPinned.id,
        title: rankedPinned.title,
        authorId: rankedPinned.authorId, authorName: rankedPinned.authorName,
        authorDeactivatedAt: rankedPinned.authorDeactivatedAt,
        authorDeactivatedByUserId: rankedPinned.authorDeactivatedByUserId,
        authorRetainAtLeastUntil: rankedPinned.authorRetainAtLeastUntil,
        activityAt: rankedPinned.activityAt,
      })
      .from(rankedPinned)
      .where(lte(rankedPinned.pinRank, pinnedTopicsPerSection))
      .orderBy(asc(rankedPinned.sectionId), asc(rankedPinned.pinRank));

    const pinnedBySection = new Map<string, ForumSectionTopicSummary[]>();
    for (const topic of pinnedTopics) {
      const author = projectForumPublicAuthor(topic);
      const list = pinnedBySection.get(topic.sectionId) ?? [];
      list.push({
        id: topic.id,
        title: topic.title,
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        activityAt: topic.activityAt,
      });
      pinnedBySection.set(topic.sectionId, list);
    }

    return {
      id: first.categoryId,
      name: first.categoryName,
      sections: rows.flatMap((row) => row.sectionId && row.sectionName
        ? [{
            id: row.sectionId,
            name: row.sectionName,
            topicCount: row.topicCount,
            postCount: row.postCount,
            pinnedTopics: pinnedBySection.get(row.sectionId) ?? [],
            latestTopics: latestBySection.get(row.sectionId) ?? [],
          }]
        : []),
    };
  }

  async readSection(id: string): Promise<ForumSectionPage | undefined> {
    if (id === HELP_SOLUTIONS_SERVICE_SECTION_ID) return undefined;
    const [section] = await this.database
      .select({ id: forumSections.id, name: forumSections.name, categoryId: forumCategories.id, categoryName: forumCategories.name })
      .from(forumSections)
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .where(eq(forumSections.id, id));
    if (!section) return undefined;
    const topics = await this.database
      .select({
        id: forumTopics.id,
        revisionId: forumTopicTitleRevisions.id,
        originalContent: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
        authorId: forumTopics.authorId, authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
        createdAt: forumTopics.createdAt,
        isPinned: sql<boolean>`${forumTopicPins.topicId} is not null`,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .leftJoin(forumPosts, and(eq(forumPosts.topicId, forumTopics.id), eq(forumPosts.isHidden, false)))
      .leftJoin(forumTopicPins, eq(forumTopicPins.topicId, forumTopics.id))
      .where(and(eq(forumTopics.sectionId, id), eq(forumTopics.isHidden, false)))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, user.id, user.name,
        user.deactivatedAt, user.deactivatedByUserId, user.retainAtLeastUntil, forumTopicPins.topicId)
      .orderBy(asc(forumTopics.createdAt), asc(forumTopics.id));
    const tagsByTopic = await this.readTagsForTopics(topics.map((topic) => topic.id));
    return {
      id: section.id,
      name: section.name,
      category: { id: section.categoryId, name: section.categoryName },
      topics: topics.map((topic) => {
        const author = projectForumPublicAuthor(topic);
        return {
        id: topic.id,
        title: { id: topic.revisionId, originalContent: topic.originalContent, sourceLocale: topic.sourceLocale },
        authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        postCount: topic.postCount,
        createdAt: topic.createdAt,
        isPinned: topic.isPinned,
        tags: tagsByTopic.get(topic.id) ?? [],
        };
      }),
    };
  }

  async readTopicPage(id: string): Promise<ForumTopicPage | undefined> {
    return this.database.transaction(async (tx) => {
    const [topic] = await tx
      .select({
        id: forumTopics.id, sectionId: forumSections.id, sectionName: forumSections.name,
        categoryId: forumCategories.id, categoryName: forumCategories.name, authorId: forumTopics.authorId,
        authorName: user.name,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        createdAt: forumTopics.createdAt, revisionId: forumTopicTitleRevisions.id,
        originalContent: forumTopicTitleRevisions.originalContent, sourceLocale: forumTopicTitleRevisions.sourceLocale,
        isSolved: forumTopics.isSolved, bestAnswerPostId: forumTopics.bestAnswerPostId,
        isClosed: forumTopics.isClosed, closureVersion: forumTopics.closureVersion,
        needsDetails: forumTopics.needsDetails,
        isPinned: sql<boolean>`${forumTopicPins.topicId} is not null`,
      })
      .from(forumTopics)
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .leftJoin(forumTopicPins, eq(forumTopicPins.topicId, forumTopics.id))
      .where(and(eq(forumTopics.id, id), eq(forumTopics.isHidden, false)));
    if (!topic) return undefined;
    const topicAuthor = projectForumPublicAuthor(topic);
    const tags = await this.readTagsForTopics([id], tx);
    const duplicatePresentation = (await this.readHelpDuplicatePresentations([id], tx)).get(id);
    const posts = await tx
      .select({
        id: forumPosts.id, topicId: forumPosts.topicId, authorId: forumPosts.authorId,
        isHidden: forumPosts.isHidden,
        parentPostId: forumPosts.parentPostId,
        authorName: user.name, authorImage: user.image,
        authorDeactivatedAt: user.deactivatedAt, authorDeactivatedByUserId: user.deactivatedByUserId,
        authorRetainAtLeastUntil: user.retainAtLeastUntil,
        createdAt: forumPosts.createdAt, editedAt: forumPosts.editedAt, revisionId: forumPostRevisions.id,
        originalContent: forumPostRevisions.originalContent, sourceLocale: forumPostRevisions.sourceLocale,
        solutionModerationStatus: forumPosts.solutionModerationStatus,
        solutionOutdatedReason: forumPosts.solutionOutdatedReason,
        solutionOutdatedReasonKind: forumPosts.solutionOutdatedReasonKind,
      })
      .from(forumPosts)
      .innerJoin(user, eq(user.id, forumPosts.authorId))
      .leftJoin(forumPostRevisions, and(
        eq(forumPostRevisions.postId, forumPosts.id),
        eq(forumPostRevisions.id, forumPosts.currentRevisionId),
        eq(forumPosts.isHidden, false),
      ))
      .where(eq(forumPosts.topicId, id))
      .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));
    // A hidden post must never join attachment metadata into the public snapshot.
    const visiblePostIds = posts.filter((post) => !post.isHidden).map((post) => post.id);
    const attached = visiblePostIds.length === 0 ? [] : await tx.select({
      postId: forumPostAttachments.postId,
      id: forumAttachments.id,
      fileName: forumAttachments.fileName,
      byteSize: forumAttachments.byteSize,
      detectedType: forumAttachments.detectedType,
    }).from(forumPostAttachments).innerJoin(forumAttachments,
      eq(forumAttachments.id, forumPostAttachments.attachmentId),
    ).where(inArray(forumPostAttachments.postId, visiblePostIds))
      .orderBy(asc(forumPostAttachments.createdAt), asc(forumAttachments.id));
    const attachmentsByPost = new Map<string, Array<{ id: string; fileName: string; byteSize: number; detectedType: string }>>();
    for (const attachment of attached) {
      const list = attachmentsByPost.get(attachment.postId) ?? [];
      list.push({ id: attachment.id, fileName: attachment.fileName, byteSize: attachment.byteSize, detectedType: attachment.detectedType });
      attachmentsByPost.set(attachment.postId, list);
    }
    return {
      id: topic.id, sectionId: topic.sectionId, authorId: topic.authorId, authorName: topicAuthor.name,
      ...(topicAuthor.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
      isSolved: topic.isSolved, bestAnswerPostId: topic.bestAnswerPostId,
      isClosed: topic.isClosed, closureVersion: topic.closureVersion,
      needsDetails: topic.needsDetails,
      duplicateOf: duplicatePresentation?.duplicateOf ?? null,
      duplicateRelationshipId: duplicatePresentation?.duplicateRelationshipId ?? null,
      duplicateDisputed: duplicatePresentation?.duplicateDisputed ?? false,
      isPinned: topic.isPinned,
      createdAt: topic.createdAt,
      title: { id: topic.revisionId, originalContent: topic.originalContent, sourceLocale: topic.sourceLocale },
      section: { id: topic.sectionId, name: topic.sectionName, category: { id: topic.categoryId, name: topic.categoryName } },
      tags: tags.get(id) ?? [],
      posts: posts.map((post): ForumThreadPost => {
        if (post.isHidden) {
          return {
            kind: "hidden",
            id: post.id, topicId: post.topicId,
            parentPostId: post.parentPostId, createdAt: post.createdAt,
          };
        }
        if (!post.revisionId || post.originalContent === null || !post.sourceLocale) {
          throw new Error("visible published post revision is missing");
        }
        const postAuthor = projectForumPublicAuthor(post);
        return {
        id: post.id, topicId: post.topicId, authorId: post.authorId, parentPostId: post.parentPostId,
        authorName: postAuthor.name, authorImage: postAuthor.image,
        ...(postAuthor.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        createdAt: post.createdAt, editedAt: post.editedAt,
        attachments: attachmentsByPost.get(post.id) ?? [],
        solutionModerationStatus: post.solutionModerationStatus as HelpSolutionModerationStatus | null,
        solutionOutdatedReason: post.solutionOutdatedReason,
        solutionOutdatedReasonKind: post.solutionOutdatedReasonKind as HelpSolutionOutdatedReasonKind | null,
        body: { id: post.revisionId, originalContent: post.originalContent, sourceLocale: post.sourceLocale },
      };
      }),
    };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }

  async readPostLocation(postId: string) {
    const [post] = await this.database.select({ topicId: forumPosts.topicId, authorId: forumPosts.authorId })
      .from(forumPosts)
      .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
      .where(and(eq(forumPosts.id, postId), eq(forumPosts.isHidden, false), eq(forumTopics.isHidden, false)))
      .limit(1);
    return post;
  }

  async readPostHistory(postId: string, topicId: string) {
    const rows = await this.database.select({
      id: forumPostRevisions.id,
      authorId: forumPostRevisions.authorId,
      authorName: user.name,
      authorDeactivatedAt: user.deactivatedAt,
      authorDeactivatedByUserId: user.deactivatedByUserId,
      authorRetainAtLeastUntil: user.retainAtLeastUntil,
      originalContent: forumPostRevisions.originalContent,
      sourceLocale: forumPostRevisions.sourceLocale,
      createdAt: forumPostRevisions.createdAt,
    }).from(forumPostRevisions)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostRevisions.postId))
      .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
      .innerJoin(user, eq(user.id, forumPostRevisions.authorId))
      .where(and(
        eq(forumPostRevisions.postId, postId), eq(forumPosts.topicId, topicId),
        eq(forumPosts.isHidden, false), eq(forumTopics.isHidden, false),
      ))
      .orderBy(desc(forumPostRevisions.createdAt), desc(forumPostRevisions.id));
    return rows.map(row => {
      const author = projectForumPublicAuthor(row);
      return {
        id: row.id, authorId: row.authorId, authorName: author.name,
        ...(author.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        originalContent: row.originalContent, sourceLocale: row.sourceLocale, createdAt: row.createdAt,
      };
    });
  }

  private async readTagsForTopics(
    topicIds: readonly string[],
    queryDb: Pick<NodePgDatabase, "select"> = this.database,
  ): Promise<Map<string, ForumTag[]>> {
    if (topicIds.length === 0) return new Map();
    const rows = await queryDb
      .select({
        topicId: forumTopicTags.topicId,
        key: forumTags.key,
        name: forumTags.name,
      })
      .from(forumTopicTags)
      .innerJoin(forumTags, eq(forumTags.key, forumTopicTags.tagKey))
      .where(inArray(forumTopicTags.topicId, [...topicIds]))
      .orderBy(asc(forumTags.name), asc(forumTags.key));
    const byTopic = new Map<string, ForumTag[]>();
    for (const row of rows) {
      const list = byTopic.get(row.topicId) ?? [];
      list.push({ key: row.key, name: row.name });
      byTopic.set(row.topicId, list);
    }
    return byTopic;
  }

  async readTopic(id: string): Promise<ForumTopic | undefined> {
    const [row] = await this.database
      .select({
        id: forumTopics.id,
        sectionId: forumTopics.sectionId,
        authorId: forumTopics.authorId,
        revisionId: forumTopicTitleRevisions.id,
        originalContent: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
        isSolved: forumTopics.isSolved,
        isClosed: forumTopics.isClosed,
        closureVersion: forumTopics.closureVersion,
        bestAnswerPostId: forumTopics.bestAnswerPostId,
      })
      .from(forumTopics)
      .innerJoin(
        forumTopicTitleRevisions,
        and(
          eq(forumTopicTitleRevisions.topicId, forumTopics.id),
          eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
        ),
      )
      .where(eq(forumTopics.id, id));
    return row && {
      id: row.id,
      sectionId: row.sectionId,
      authorId: row.authorId,
      isSolved: row.isSolved,
      isClosed: row.isClosed,
      closureVersion: row.closureVersion,
      bestAnswerPostId: row.bestAnswerPostId,
      title: { id: row.revisionId, originalContent: row.originalContent, sourceLocale: row.sourceLocale },
    };
  }

  async readHelpSignal(id: string): Promise<ForumHelpSignal | undefined> {
    const [row] = await this.database
      .select({
        id: forumHelpSignals.id,
        kind: forumHelpSignals.kind,
        topicId: forumHelpSignals.topicId,
        targetPostId: forumHelpSignals.targetPostId,
        proposedOriginalTopicId: forumHelpSignals.proposedOriginalTopicId,
        submittedByUserId: forumHelpSignals.submittedByUserId,
        explanation: forumHelpSignals.explanation,
        status: forumHelpSignals.status,
        createdAt: forumHelpSignals.createdAt,
        resolvedByUserId: forumHelpSignals.resolvedByUserId,
        resolvedAt: forumHelpSignals.resolvedAt,
      })
      .from(forumHelpSignals)
      .where(eq(forumHelpSignals.id, id));
    return row && {
      ...row,
      kind: row.kind as HelpSignalKind,
      status: row.status as HelpSignalStatus,
    };
  }

  async createHelpSignal(input: {
    kind: HelpSignalKind;
    topicId: string;
    actorId: string;
    explanation: string | null;
    proposedOriginalTopicId: string | null;
  }): Promise<ForumHelpSignal> {
    return this.database.transaction(async (tx) => {
      let topic: {
        id: string;
        sectionId: string;
        isSolved: boolean;
        bestAnswerPostId: string | null;
        needsDetails: boolean;
        isHidden: boolean;
      };

      if (input.kind === "duplicate") {
        const originalTopicId = input.proposedOriginalTopicId;
        if (!originalTopicId || input.topicId === originalTopicId) {
          throw new ForumStateConflictError("duplicate signal requires a different proposed original");
        }
        const lockedIds = [input.topicId, originalTopicId].sort();
        const topics = await tx
          .select({
            id: forumTopics.id,
            sectionId: forumTopics.sectionId,
            isSolved: forumTopics.isSolved,
            bestAnswerPostId: forumTopics.bestAnswerPostId,
            needsDetails: forumTopics.needsDetails,
            isHidden: forumTopics.isHidden,
          })
          .from(forumTopics)
          .where(inArray(forumTopics.id, lockedIds))
          .orderBy(asc(forumTopics.id))
          .for("no key update");
        if (topics.length !== 2 || topics.some(row => row.isHidden)) {
          throw new ForumEntityNotFoundError("duplicate question or proposed original question does not exist");
        }
        if (topics.some((candidate) => candidate.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID)) {
          throw new ForumStateConflictError("duplicate signals are only available between Help & solutions questions");
        }
        const candidate = topics.find((row) => row.id === input.topicId);
        if (!candidate) throw new ForumEntityNotFoundError("duplicate question does not exist");
        topic = candidate;
        if (candidate.isSolved || candidate.bestAnswerPostId) {
          throw new ForumStateConflictError("a question with its own solution cannot be signaled as a duplicate");
        }

        const active = await tx
          .select({
            duplicateTopicId: forumHelpDuplicateRelationships.duplicateTopicId,
            originalTopicId: forumHelpDuplicateRelationships.originalTopicId,
          })
          .from(forumHelpDuplicateRelationships)
          .where(and(
            isNull(forumHelpDuplicateRelationships.removedAt),
            or(
              eq(forumHelpDuplicateRelationships.duplicateTopicId, input.topicId),
              eq(forumHelpDuplicateRelationships.duplicateTopicId, originalTopicId),
              eq(forumHelpDuplicateRelationships.originalTopicId, input.topicId),
            ),
          ));
        if (active.some((row) => row.duplicateTopicId === input.topicId)) {
          throw new ForumStateConflictError("question is already a confirmed duplicate");
        }
        if (active.some((row) => row.duplicateTopicId === originalTopicId)) {
          throw new ForumStateConflictError("proposed original question must be a canonical root");
        }
        if (active.some((row) => row.originalTopicId === input.topicId)) {
          throw new ForumStateConflictError("a canonical original cannot be signaled as a duplicate while active duplicates point to it");
        }
      } else {
        const [lockedTopic] = await tx
          .select({
            id: forumTopics.id,
            sectionId: forumTopics.sectionId,
            isSolved: forumTopics.isSolved,
            bestAnswerPostId: forumTopics.bestAnswerPostId,
            needsDetails: forumTopics.needsDetails,
            isHidden: forumTopics.isHidden,
          })
          .from(forumTopics)
          .where(eq(forumTopics.id, input.topicId))
          .for("no key update");
        if (!lockedTopic || lockedTopic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
        if (lockedTopic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
          throw new ForumStateConflictError("Help signals are only available for Help & solutions questions");
        }
        topic = lockedTopic;
      }

      let targetPostId: string | null = null;
      if (input.kind === "needs-details") {
        if (topic.needsDetails) {
          throw new ForumStateConflictError("question already has the Needs details label");
        }
      } else if (input.kind === "needs-review" || input.kind === "solution-outdated") {
        if (!topic.isSolved || !topic.bestAnswerPostId) {
          throw new ForumStateConflictError("solution signals require the current selected solution of a solved Help question");
        }
        targetPostId = topic.bestAnswerPostId;
        const [answer] = await tx
          .select({
            status: forumPosts.solutionModerationStatus,
            isHidden: forumPosts.isHidden,
          })
          .from(forumPosts)
          .where(and(
            eq(forumPosts.topicId, input.topicId),
            eq(forumPosts.id, targetPostId),
          ))
          .for("no key update");
        if (!answer || answer.isHidden)
          throw new ForumEntityNotFoundError("current selected solution does not exist");
        if (
          (input.kind === "needs-review" && answer.status !== null)
          || (input.kind === "solution-outdated" && answer.status === "outdated")
        ) {
          throw new ForumStateConflictError("requested solution moderation state is already authoritative");
        }
      }

      // The actor NO KEY UPDATE mutex serializes the cooldown and the write.
      // Never upgrade the actor row with an additional FOR UPDATE lock.
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      // Submission restriction does not apply to signal withdrawal or review.
      await this.measureAdmission(tx, input.actorId, "helpSignals.submit");
      await enforceHelpSignalWriteCooldown(tx, input.actorId, this.writePolicy);

      const pendingConditions = [
        eq(forumHelpSignals.status, "pending"),
        eq(forumHelpSignals.kind, input.kind),
        eq(forumHelpSignals.topicId, input.topicId),
        eq(forumHelpSignals.submittedByUserId, input.actorId),
      ];
      if (targetPostId) pendingConditions.push(eq(forumHelpSignals.targetPostId, targetPostId));
      if (input.kind === "duplicate" && input.proposedOriginalTopicId) {
        pendingConditions.push(eq(forumHelpSignals.proposedOriginalTopicId, input.proposedOriginalTopicId));
      }
      const [existing] = await tx
        .select({ id: forumHelpSignals.id })
        .from(forumHelpSignals)
        .where(and(...pendingConditions))
        .limit(1);
      if (existing) throw new ForumStateConflictError("matching Help signal is already pending");

      const [created] = await tx
        .insert(forumHelpSignals)
        .values({
          id: crypto.randomUUID(),
          kind: input.kind,
          topicId: input.topicId,
          targetPostId,
          proposedOriginalTopicId: input.kind === "duplicate" ? input.proposedOriginalTopicId : null,
          submittedByUserId: input.actorId,
          explanation: input.explanation,
          // Lifecycle timestamps for Help signals are database-owned. In
          // particular, statement time does not freeze at transaction start
          // while this write waits on row locks.
          createdAt: sql`statement_timestamp()`,
        })
        .returning();
      if (!created) throw new Error("failed to create Help signal");
      return {
        ...created,
        kind: created.kind as HelpSignalKind,
        status: created.status as HelpSignalStatus,
      };
    });
  }

  /** Lock both signal topic dependencies and the optional answer before signal/actor. */
  private async lockVisibleHelpSignalDependencies(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0],
    identity: { topicId: string; proposedOriginalTopicId: string | null; targetPostId: string | null },
    message: string,
  ): Promise<void> {
    const topicIds = [...new Set([
      identity.topicId,
      ...(identity.proposedOriginalTopicId ? [identity.proposedOriginalTopicId] : []),
    ])].sort();
    const topics = await tx.select({ id: forumTopics.id, isHidden: forumTopics.isHidden })
      .from(forumTopics).where(inArray(forumTopics.id, topicIds))
      .orderBy(asc(forumTopics.id)).for("no key update");
    if (topics.length !== topicIds.length || topics.some(row => row.isHidden))
      throw new ForumEntityNotFoundError(message);
    if (identity.targetPostId) {
      const [post] = await tx.select({ id: forumPosts.id, isHidden: forumPosts.isHidden })
        .from(forumPosts)
        .where(and(
          eq(forumPosts.id, identity.targetPostId),
          eq(forumPosts.topicId, identity.topicId),
        ))
        .for("no key update");
      if (!post || post.isHidden) throw new ForumEntityNotFoundError(message);
    }
  }

  async withdrawHelpSignal(signalId: string, topicId: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      // Resolve immutable signal→topic membership before taking any write lock.
      const [identity] = await tx.select({
        topicId: forumHelpSignals.topicId,
        proposedOriginalTopicId: forumHelpSignals.proposedOriginalTopicId,
        targetPostId: forumHelpSignals.targetPostId,
      }).from(forumHelpSignals).where(eq(forumHelpSignals.id, signalId));
      if (!identity || identity.topicId !== topicId)
        throw new ForumEntityNotFoundError("Help signal does not belong to topic");
      await this.lockVisibleHelpSignalDependencies(tx, identity, "Help signal does not belong to topic");
      const [signal] = await tx
        .select({
          id: forumHelpSignals.id,
          topicId: forumHelpSignals.topicId,
          submittedByUserId: forumHelpSignals.submittedByUserId,
          status: forumHelpSignals.status,
        })
        .from(forumHelpSignals)
        .where(eq(forumHelpSignals.id, signalId))
        .for("update");
      if (!signal || signal.topicId !== topicId) {
        throw new ForumEntityNotFoundError("Help signal does not belong to topic");
      }
      if (signal.submittedByUserId !== actorId) {
        throw new ForumAuthorizationError("only the signal author may withdraw it");
      }
      if (signal.status !== "pending") {
        throw new ForumStateConflictError("only a pending Help signal may be withdrawn");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await tx
        .update(forumHelpSignals)
        .set({
          status: "withdrawn",
          resolvedByUserId: actorId,
          resolvedAt: sql`statement_timestamp()`,
        })
        .where(eq(forumHelpSignals.id, signalId));
    });
  }

  async resolveHelpSignal(
    signalId: string,
    actorId: string,
    resolution: HelpSignalResolution,
  ): Promise<HelpSignalStatus> {
    if (resolution === "rejected") {
      return this.database.transaction(async (tx) => {
        const [identity] = await tx.select({
          topicId: forumHelpSignals.topicId,
          proposedOriginalTopicId: forumHelpSignals.proposedOriginalTopicId,
          targetPostId: forumHelpSignals.targetPostId,
        }).from(forumHelpSignals).where(eq(forumHelpSignals.id, signalId));
        if (!identity) throw new ForumEntityNotFoundError("Help signal does not exist");
        await this.lockVisibleHelpSignalDependencies(tx, identity, "Help signal does not exist");
        const [signal] = await tx
          .select({
            id: forumHelpSignals.id,
            status: forumHelpSignals.status,
            topicId: forumHelpSignals.topicId, kind: forumHelpSignals.kind,
          })
          .from(forumHelpSignals)
          .where(eq(forumHelpSignals.id, signalId))
          .for("update");
        if (!signal) throw new ForumEntityNotFoundError("Help signal does not exist");
        if (signal.status !== "pending") {
          throw new ForumStateConflictError("Help signal is no longer pending");
        }
        await assertActiveAccountForDrizzleMutation(tx, actorId);
        await this.measureAdmission(tx, actorId, "admin.forum");
        await tx
          .update(forumHelpSignals)
          .set({
            status: "rejected",
            resolvedByUserId: actorId,
            resolvedAt: sql`statement_timestamp()`,
          })
          .where(eq(forumHelpSignals.id, signalId));
        await appendForumHistory(tx,actorId,{action:"help.signalReviewed",targetType:"topic",targetId:signal.topicId,context:{signalId,kind:signal.kind,resolution:"rejected"}});
        return "rejected" as const;
      });
    }

    return this.database.transaction(async (tx) => {
      let effect: HelpSignalHistoryEffect | undefined;
      const [snapshot] = await tx
        .select({
          id: forumHelpSignals.id,
          kind: forumHelpSignals.kind,
          topicId: forumHelpSignals.topicId,
          targetPostId: forumHelpSignals.targetPostId,
          proposedOriginalTopicId: forumHelpSignals.proposedOriginalTopicId,
        })
        .from(forumHelpSignals)
        .where(eq(forumHelpSignals.id, signalId));
      if (!snapshot) throw new ForumEntityNotFoundError("Help signal does not exist");

      const kind = snapshot.kind as HelpSignalKind;
      const topicIds = kind === "duplicate" && snapshot.proposedOriginalTopicId
        ? [snapshot.topicId, snapshot.proposedOriginalTopicId].sort()
        : [snapshot.topicId];
      const topics = await tx
        .select({
          id: forumTopics.id,
          sectionId: forumTopics.sectionId,
          isSolved: forumTopics.isSolved,
          bestAnswerPostId: forumTopics.bestAnswerPostId,
          needsDetails: forumTopics.needsDetails,
          isHidden: forumTopics.isHidden,
        })
        .from(forumTopics)
        .where(inArray(forumTopics.id, topicIds))
        .orderBy(asc(forumTopics.id))
        .for("no key update");
      if (topics.some(row => row.isHidden))
        throw new ForumEntityNotFoundError("Help signal topic does not exist");

      // Accepted reviews may update solution moderation and multiple signals.
      // Lock any existing post dependency before signals, then the entire
      // potentially affected pending signal set by stable ID, including the
      // third-topic proposed-original rows in duplicate review.
      if (
        (kind === "needs-review" || kind === "solution-outdated")
        && snapshot.targetPostId
      ) {
        const [answer] = await tx.select({
          id: forumPosts.id, isHidden: forumPosts.isHidden,
        }).from(forumPosts)
          .where(and(
            eq(forumPosts.topicId, snapshot.topicId),
            eq(forumPosts.id, snapshot.targetPostId),
          ))
          .for("no key update");
        if (answer?.isHidden)
          throw new ForumEntityNotFoundError("Help signal solution does not exist");
      }
      const pendingSignalScope = kind === "needs-details"
        ? and(
            eq(forumHelpSignals.topicId, snapshot.topicId),
            eq(forumHelpSignals.kind, "needs-details"),
          )
        : kind === "needs-review" || kind === "solution-outdated"
          ? and(
              eq(forumHelpSignals.topicId, snapshot.topicId),
              eq(forumHelpSignals.targetPostId, snapshot.targetPostId ?? ""),
              inArray(forumHelpSignals.kind, ["needs-review", "solution-outdated"]),
            )
          : and(
              eq(forumHelpSignals.kind, "duplicate"),
              or(
                eq(forumHelpSignals.topicId, snapshot.topicId),
                ...(snapshot.proposedOriginalTopicId
                  ? [eq(forumHelpSignals.topicId, snapshot.proposedOriginalTopicId)]
                  : []),
                eq(forumHelpSignals.proposedOriginalTopicId, snapshot.topicId),
              ),
            );
      await tx.select({ id: forumHelpSignals.id })
        .from(forumHelpSignals)
        .where(or(
          eq(forumHelpSignals.id, signalId),
          and(eq(forumHelpSignals.status, "pending"), pendingSignalScope),
        ))
        .orderBy(asc(forumHelpSignals.id))
        .for("no key update");

      // The locked target is read after the entire set is held: a concurrent
      // withdrawal/rejection must be reflected before any actor admission.
      const [signal] = await tx
        .select({
          id: forumHelpSignals.id,
          kind: forumHelpSignals.kind,
          topicId: forumHelpSignals.topicId,
          targetPostId: forumHelpSignals.targetPostId,
          proposedOriginalTopicId: forumHelpSignals.proposedOriginalTopicId,
          explanation: forumHelpSignals.explanation,
          status: forumHelpSignals.status,
        })
        .from(forumHelpSignals)
        .where(eq(forumHelpSignals.id, signalId));
      if (!signal) throw new ForumEntityNotFoundError("Help signal does not exist");
      if (signal.status !== "pending") {
        throw new ForumStateConflictError("Help signal is no longer pending");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");

      const topic = topics.find((row) => row.id === signal.topicId);
      let applicable = Boolean(topic && topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID);
      if (kind === "duplicate") {
        applicable = applicable
          && topics.length === 2
          && topics.every((row) => row.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID);
      }

      const resolvedAt = sql`statement_timestamp()`;
      const recordReview = (resolution: "accepted" | "superseded") => appendForumHistory(tx,actorId,{
        action:"help.signalReviewed",targetType:"topic",targetId:signal.topicId,
        context:{signalId,kind:signal.kind,resolution,...(effect?{effect}:{})},
      });
      const supersedeCurrent = async () => {
        await tx
          .update(forumHelpSignals)
          .set({
            status: "superseded",
            resolvedByUserId: actorId,
            resolvedAt,
          })
          .where(eq(forumHelpSignals.id, signalId));
        await recordReview("superseded");
        return "superseded" as const;
      };

      if (!applicable || !topic) return supersedeCurrent();

      if (kind === "needs-details") {
        if (topic.needsDetails) return supersedeCurrent();
        effect={action:"help.needsDetailsChanged",context:{before:false,after:true}};
        await tx
          .update(forumTopics)
          .set({ needsDetails: true })
          .where(eq(forumTopics.id, signal.topicId));
        await tx
          .update(forumHelpSignals)
          .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
          .where(and(
            eq(forumHelpSignals.topicId, signal.topicId),
            eq(forumHelpSignals.kind, "needs-details"),
            eq(forumHelpSignals.status, "pending"),
            ne(forumHelpSignals.id, signal.id),
          ));
      } else if (kind === "needs-review" || kind === "solution-outdated") {
        if (
          !topic.isSolved
          || !topic.bestAnswerPostId
          || topic.bestAnswerPostId !== signal.targetPostId
        ) {
          await tx
            .update(forumHelpSignals)
            .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
            .where(and(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.targetPostId, signal.targetPostId ?? ""),
              eq(forumHelpSignals.status, "pending"),
              inArray(forumHelpSignals.kind, ["needs-review", "solution-outdated"]),
            ));
          await recordReview("superseded");
          return "superseded";
        }
        const [answer] = await tx
          .select({
            status: forumPosts.solutionModerationStatus,
          })
          .from(forumPosts)
          .where(and(
            eq(forumPosts.topicId, signal.topicId),
            eq(forumPosts.id, signal.targetPostId),
          ))
          .for("no key update");
        if (!answer) return supersedeCurrent();

        if (
          (kind === "needs-review" && answer.status !== null)
          || (kind === "solution-outdated" && answer.status === "outdated")
        ) {
          const staleKinds: HelpSignalKind[] = answer.status === "outdated"
            ? ["needs-review", "solution-outdated"]
            : ["needs-review"];
          await tx
            .update(forumHelpSignals)
            .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
            .where(and(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.targetPostId, signal.targetPostId),
              eq(forumHelpSignals.status, "pending"),
              inArray(forumHelpSignals.kind, staleKinds),
            ));
          await recordReview("superseded");
          return "superseded";
        }

        await tx
          .update(forumPosts)
          .set({
            solutionModerationStatus: kind === "needs-review" ? "needs-review" : "outdated",
            solutionOutdatedReason: kind === "solution-outdated" ? signal.explanation : null,
            solutionOutdatedReasonKind: null,
          })
          .where(and(
            eq(forumPosts.topicId, signal.topicId),
            eq(forumPosts.id, signal.targetPostId),
          ));

        effect={action:"help.solutionModerationChanged",context:{postId:signal.targetPostId,before:answer.status,after:kind==="needs-review"?"needs-review":"outdated"}};
        const kindsToSupersede: HelpSignalKind[] = kind === "solution-outdated"
          ? ["needs-review", "solution-outdated"]
          : ["needs-review"];
        await tx
          .update(forumHelpSignals)
          .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
          .where(and(
            eq(forumHelpSignals.topicId, signal.topicId),
            eq(forumHelpSignals.targetPostId, signal.targetPostId),
            eq(forumHelpSignals.status, "pending"),
            inArray(forumHelpSignals.kind, kindsToSupersede),
            ne(forumHelpSignals.id, signal.id),
          ));
      } else {
        const originalTopicId = signal.proposedOriginalTopicId;
        if (!originalTopicId) return supersedeCurrent();
        const original = topics.find((row) => row.id === originalTopicId);
        if (!original || signal.topicId === originalTopicId) {
          return supersedeCurrent();
        }
        if (topic.isSolved || Boolean(topic.bestAnswerPostId)) {
          await tx
            .update(forumHelpSignals)
            .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
            .where(and(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.kind, "duplicate"),
              eq(forumHelpSignals.status, "pending"),
            ));
          await recordReview("superseded");
          return "superseded";
        }
        const active = await tx
          .select({
            duplicateTopicId: forumHelpDuplicateRelationships.duplicateTopicId,
            originalTopicId: forumHelpDuplicateRelationships.originalTopicId,
          })
          .from(forumHelpDuplicateRelationships)
          .where(and(
            isNull(forumHelpDuplicateRelationships.removedAt),
            or(
              eq(forumHelpDuplicateRelationships.duplicateTopicId, signal.topicId),
              eq(forumHelpDuplicateRelationships.duplicateTopicId, originalTopicId),
              eq(forumHelpDuplicateRelationships.originalTopicId, signal.topicId),
            ),
          ));
        const candidateIsDuplicate = active.some((row) => row.duplicateTopicId === signal.topicId);
        const candidateIsCanonicalOriginal = active.some((row) => row.originalTopicId === signal.topicId);
        const proposedOriginalIsDuplicate = active.some((row) => row.duplicateTopicId === originalTopicId);
        if (candidateIsDuplicate || candidateIsCanonicalOriginal) {
          await tx
            .update(forumHelpSignals)
            .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
            .where(and(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.kind, "duplicate"),
              eq(forumHelpSignals.status, "pending"),
            ));
          await recordReview("superseded");
          return "superseded";
        }
        if (proposedOriginalIsDuplicate) {
          await tx
            .update(forumHelpSignals)
            .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
            .where(and(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.proposedOriginalTopicId, originalTopicId),
              eq(forumHelpSignals.kind, "duplicate"),
              eq(forumHelpSignals.status, "pending"),
            ));
          await recordReview("superseded");
          return "superseded";
        }
        const relationshipId=crypto.randomUUID();
        await tx.insert(forumHelpDuplicateRelationships).values({
          id: relationshipId,
          duplicateTopicId: signal.topicId,
          originalTopicId,
          confirmedByUserId: actorId,
        });
        effect={action:"help.duplicateConfirmed",context:{relationshipId,originalTopicId}};
        await tx
          .update(forumHelpSignals)
          .set({ status: "superseded", resolvedByUserId: actorId, resolvedAt })
          .where(and(
            eq(forumHelpSignals.kind, "duplicate"),
            eq(forumHelpSignals.status, "pending"),
            ne(forumHelpSignals.id, signal.id),
            or(
              eq(forumHelpSignals.topicId, signal.topicId),
              eq(forumHelpSignals.topicId, originalTopicId),
              eq(forumHelpSignals.proposedOriginalTopicId, signal.topicId),
            ),
          ));
      }

      await tx
        .update(forumHelpSignals)
        .set({
          status: "accepted",
          resolvedByUserId: actorId,
          resolvedAt,
        })
        .where(eq(forumHelpSignals.id, signal.id));
      await recordReview("accepted");
      return "accepted";
    });
  }

  async setHelpSolutionModeration(
    topicId: string,
    status: HelpSolutionModerationStatus | null,
    outdatedReason: string | null,
    actorId: string,
    expectedBestAnswerPostId: string,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({
          sectionId: forumTopics.sectionId,
          isSolved: forumTopics.isSolved,
          bestAnswerPostId: forumTopics.bestAnswerPostId,
          isHidden: forumTopics.isHidden,
        })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("solution moderation is only available for Help & solutions questions");
      }
      if (!topic.isSolved) {
        throw new ForumStateConflictError("solution moderation requires a solved Help & solutions question");
      }
      if (!topic.bestAnswerPostId) {
        throw new ForumStateConflictError("solution moderation requires a selected best answer");
      }
      if (topic.bestAnswerPostId !== expectedBestAnswerPostId) {
        throw new ForumStateConflictError("best answer is no longer the expected moderation target");
      }
      // J10: acquire every mutable content dependency before the actor mutex.
      // Non-key locks remain compatible with the Complaint target FK KEY SHARE.
      const [previous] = await tx
        .select({
          status: forumPosts.solutionModerationStatus,
          reason: forumPosts.solutionOutdatedReason,
          kind: forumPosts.solutionOutdatedReasonKind,
          isHidden: forumPosts.isHidden,
        })
        .from(forumPosts)
        .where(and(
          eq(forumPosts.topicId, topicId),
          eq(forumPosts.id, topic.bestAnswerPostId),
        ))
        .for("no key update");
      if (!previous || previous.isHidden)
        throw new ForumEntityNotFoundError("selected solution does not exist");
      if (status !== null) {
        const staleKinds: HelpSignalKind[] = status === "outdated"
          ? ["needs-review", "solution-outdated"]
          : ["needs-review"];
        await tx.select({ id: forumHelpSignals.id })
          .from(forumHelpSignals)
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.targetPostId, topic.bestAnswerPostId),
            eq(forumHelpSignals.status, "pending"),
            inArray(forumHelpSignals.kind, staleKinds),
          ))
          .orderBy(asc(forumHelpSignals.id))
          .for("no key update");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");
      await tx.update(forumPosts)
        .set({
          solutionModerationStatus: status,
          solutionOutdatedReason: status === "outdated" ? outdatedReason : null,
          solutionOutdatedReasonKind: null,
        })
        .where(and(
          eq(forumPosts.topicId, topicId),
          eq(forumPosts.id, topic.bestAnswerPostId),
        ));

      if (status !== null) {
        const staleKinds: HelpSignalKind[] = status === "outdated"
          ? ["needs-review", "solution-outdated"]
          : ["needs-review"];
        await tx.update(forumHelpSignals)
          .set({
            status: "superseded",
            resolvedByUserId: actorId,
            resolvedAt: sql`statement_timestamp()`,
          })
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.targetPostId, topic.bestAnswerPostId),
            eq(forumHelpSignals.status, "pending"),
            inArray(forumHelpSignals.kind, staleKinds),
          ));
      }
      if(previous && (previous.status!==status || previous.reason!==(status==="outdated"?outdatedReason:null) || previous.kind!==null))
        await appendForumHistory(tx,actorId,{action:"help.solutionModerationChanged",targetType:"topic",targetId:topicId,
          context:{postId:topic.bestAnswerPostId,before:previous.status,after:status},reason:status==="outdated"?outdatedReason:null});
    });
  }

  async confirmHelpDuplicate(topicId: string, originalTopicId: string, actorId: string): Promise<void> {
    if (topicId === originalTopicId) {
      throw new ForumStateConflictError("question cannot duplicate itself");
    }
    await this.database.transaction(async (tx) => {
      const lockedIds = [topicId, originalTopicId].sort();
      const topics = await tx
        .select({
          id: forumTopics.id,
          sectionId: forumTopics.sectionId,
          isSolved: forumTopics.isSolved,
          bestAnswerPostId: forumTopics.bestAnswerPostId,
          isHidden: forumTopics.isHidden,
        })
        .from(forumTopics)
        .where(inArray(forumTopics.id, lockedIds))
        .orderBy(asc(forumTopics.id))
        .for("no key update");
      if (topics.length !== 2 || topics.some((topic) => topic.isHidden)) {
        throw new ForumEntityNotFoundError("duplicate question or original question does not exist");
      }
      if (topics.some((topic) => topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID)) {
        throw new ForumStateConflictError("duplicate relationships are only available between Help & solutions questions");
      }
      const duplicateTopic = topics.find((topic) => topic.id === topicId);
      if (!duplicateTopic) {
        throw new ForumEntityNotFoundError("duplicate question does not exist");
      }
      if (duplicateTopic.isSolved || duplicateTopic.bestAnswerPostId) {
        throw new ForumStateConflictError("a question with its own solution cannot be confirmed as a duplicate");
      }

      const active = await tx
        .select({
          duplicateTopicId: forumHelpDuplicateRelationships.duplicateTopicId,
          originalTopicId: forumHelpDuplicateRelationships.originalTopicId,
        })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          isNull(forumHelpDuplicateRelationships.removedAt),
          or(
            eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
            eq(forumHelpDuplicateRelationships.duplicateTopicId, originalTopicId),
            eq(forumHelpDuplicateRelationships.originalTopicId, topicId),
          ),
        ));
      if (active.some((row) => row.duplicateTopicId === topicId)) {
        throw new ForumStateConflictError("question is already a confirmed duplicate");
      }
      if (active.some((row) => row.duplicateTopicId === originalTopicId)) {
        throw new ForumStateConflictError("original question must be a canonical root");
      }
      if (active.some((row) => row.originalTopicId === topicId)) {
        throw new ForumStateConflictError("a canonical original cannot become a duplicate while active duplicates point to it");
      }

      // The exact bulk-supersession set must precede the lifecycle mutex.
      // Topic mutexes also serialize concurrent pending duplicate-signal inserts.
      await tx.select({ id: forumHelpSignals.id })
        .from(forumHelpSignals)
        .where(and(
          eq(forumHelpSignals.kind, "duplicate"),
          eq(forumHelpSignals.status, "pending"),
          or(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.topicId, originalTopicId),
            eq(forumHelpSignals.proposedOriginalTopicId, topicId),
          ),
        ))
        .orderBy(asc(forumHelpSignals.id))
        .for("no key update");
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");

      const relationshipId=crypto.randomUUID();
      await tx.insert(forumHelpDuplicateRelationships).values({
        id: relationshipId,
        duplicateTopicId: topicId,
        originalTopicId,
        confirmedByUserId: actorId,
      });
      await tx.update(forumHelpSignals)
        .set({
          status: "superseded",
          resolvedByUserId: actorId,
          resolvedAt: sql`statement_timestamp()`,
        })
        .where(and(
          eq(forumHelpSignals.kind, "duplicate"),
          eq(forumHelpSignals.status, "pending"),
          or(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.topicId, originalTopicId),
            eq(forumHelpSignals.proposedOriginalTopicId, topicId),
          ),
        ));
      await appendForumHistory(tx,actorId,{action:"help.duplicateConfirmed",targetType:"topic",targetId:topicId,context:{relationshipId,originalTopicId}});
    });
  }

  async removeHelpDuplicate(topicId: string, actorId: string, expectedRelationshipId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      // The relationship's original topic is immutable. Read its identity before
      // acquiring locks so both topic mutexes can be taken in sorted order.
      const [identity] = await tx
        .select({ originalTopicId: forumHelpDuplicateRelationships.originalTopicId })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .limit(1);
      const lockedIds = [topicId, ...(identity ? [identity.originalTopicId] : [])].sort();
      const topics = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId, isHidden: forumTopics.isHidden })
        .from(forumTopics)
        .where(inArray(forumTopics.id, lockedIds))
        .orderBy(asc(forumTopics.id))
        .for("no key update");
      if (topics.length !== lockedIds.length || topics.some((topic) => topic.isHidden)) {
        throw new ForumEntityNotFoundError("topic does not exist");
      }
      const topic = topics.find((row) => row.id === topicId);
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("duplicate relationships are only available for Help & solutions questions");
      }
      const [relationship] = await tx
        .select({ id: forumHelpDuplicateRelationships.id, originalTopicId:forumHelpDuplicateRelationships.originalTopicId })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .for("no key update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");
      if (relationship.id !== expectedRelationshipId || relationship.originalTopicId !== identity?.originalTopicId) {
        throw new ForumStateConflictError("duplicate relationship is no longer the expected relationship");
      }
      // Removal may accept the current pending appeal as part of the same effect.
      await tx.select({ id: forumHelpDuplicateAppeals.id })
        .from(forumHelpDuplicateAppeals)
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ))
        .orderBy(asc(forumHelpDuplicateAppeals.id))
        .for("no key update");
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");

      const resolvedAt = sql`statement_timestamp()`;
      const [resolvedAppeal] = await tx.update(forumHelpDuplicateAppeals)
        .set({ status: "accepted", resolvedByUserId: actorId, resolvedAt })
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        )).returning({ id: forumHelpDuplicateAppeals.id });
      await tx.update(forumHelpDuplicateRelationships)
        .set({ removedByUserId: actorId, removedAt: resolvedAt })
        .where(eq(forumHelpDuplicateRelationships.id, relationship.id));
      await appendForumHistory(tx,actorId,{action:"help.duplicateRemoved",targetType:"topic",targetId:topicId,context:{relationshipId:relationship.id,originalTopicId:relationship.originalTopicId,...(resolvedAppeal?{resolvedAppeal:{id:resolvedAppeal.id,outcome:"accepted" as const}}:{})}});
    });
  }

  async appealHelpDuplicate(topicId: string, actorId: string, explanation: string, expectedRelationshipId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId, authorId: forumTopics.authorId })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("duplicate appeals are only available for Help & solutions questions");
      }
      if (topic.authorId !== actorId) {
        throw new ForumAuthorizationError("only the duplicate question author may appeal");
      }
      const [relationship] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .for("no key update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");
      if (relationship.id !== expectedRelationshipId) {
        throw new ForumStateConflictError("duplicate relationship is no longer the expected relationship");
      }
      const [pending] = await tx
        .select({ id: forumHelpDuplicateAppeals.id })
        .from(forumHelpDuplicateAppeals)
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ))
        .for("no key update");
      if (pending) throw new ForumStateConflictError("duplicate appeal is already pending");
      await assertActiveAccountForDrizzleMutation(tx, actorId);

      await tx.insert(forumHelpDuplicateAppeals).values({
        id: crypto.randomUUID(),
        relationshipId: relationship.id,
        appellantUserId: actorId,
        explanation,
      });
    });
  }

  async resolveHelpDuplicateAppeal(
    topicId: string,
    actorId: string,
    resolution: HelpDuplicateAppealResolution,
    expectedAppealId: string,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("duplicate appeals are only available for Help & solutions questions");
      }
      const [relationship] = await tx
        .select({ id: forumHelpDuplicateRelationships.id, originalTopicId:forumHelpDuplicateRelationships.originalTopicId })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .for("no key update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");
      const [appeal] = await tx
        .select({ id: forumHelpDuplicateAppeals.id })
        .from(forumHelpDuplicateAppeals)
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ))
        .for("no key update");
      if (!appeal || appeal.id !== expectedAppealId) {
        throw new ForumStateConflictError("duplicate appeal is no longer the expected pending appeal");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      await this.measureAdmission(tx, actorId, "admin.forum");

      const resolvedAt = sql`statement_timestamp()`;
      await tx.update(forumHelpDuplicateAppeals)
        .set({ status: resolution, resolvedByUserId: actorId, resolvedAt })
        .where(eq(forumHelpDuplicateAppeals.id, appeal.id));
      if (resolution === "accepted") {
        await tx.update(forumHelpDuplicateRelationships)
          .set({ removedByUserId: actorId, removedAt: resolvedAt })
          .where(eq(forumHelpDuplicateRelationships.id, relationship.id));
      }
      await appendForumHistory(tx,actorId,{action:"help.duplicateAppealResolved",targetType:"topic",targetId:topicId,context:{relationshipId:relationship.id,originalTopicId:relationship.originalTopicId,appealId:appeal.id,resolution}});
    });
  }

  async markTopicSolved(topicId: string, actorId: string, scope: SolutionManagementScope = "own"): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({
        authorId: forumTopics.authorId,
        sectionId: forumTopics.sectionId,
        isSolved: forumTopics.isSolved,
        isHidden: forumTopics.isHidden,
      }).from(forumTopics)
        .where(eq(forumTopics.id, topicId)).for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (scope === "own" && topic.authorId !== actorId) throw new ForumAuthorizationError("only the topic author may solve it");
      if (topic.isSolved) throw new ForumStateConflictError("topic is already solved");
      const [activeDuplicate] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .limit(1);
      if (activeDuplicate) {
        throw new ForumStateConflictError("a confirmed duplicate cannot be marked solved");
      }
      if (topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        // Dependency rows before the actor lock: keep pending-set updates and
        // the existing Help signal review path in a stable content→actor order.
        await tx.select({ id: forumHelpSignals.id })
          .from(forumHelpSignals)
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.kind, "duplicate"),
            eq(forumHelpSignals.status, "pending"),
          ))
          .orderBy(asc(forumHelpSignals.id))
          .for("no key update");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      if (scope === "any") await this.measureAdmission(tx, actorId, "admin.forum");
      await tx.update(forumTopics).set({ isSolved: true }).where(eq(forumTopics.id, topicId));
      if (topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        await tx.update(forumHelpSignals)
          .set({
            status: "superseded",
            resolvedByUserId: actorId,
            resolvedAt: sql`statement_timestamp()`,
          })
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.kind, "duplicate"),
            eq(forumHelpSignals.status, "pending"),
          ));
      }
      if(scope === "any")await appendForumHistory(tx,actorId,{action:"topic.solved",targetType:"topic",targetId:topicId,context:{before:false,after:true}});
    });
  }

  async selectBestAnswer(topicId: string, postId: string, actorId: string, scope: SolutionManagementScope = "own"): Promise<{ topicAuthorId: string; isSolved: boolean }> {
    return this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({
          authorId: forumTopics.authorId,
          sectionId: forumTopics.sectionId,
          isSolved: forumTopics.isSolved,
          bestAnswerPostId: forumTopics.bestAnswerPostId,
          isHidden: forumTopics.isHidden,
        })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (scope === "own" && topic.authorId !== actorId) throw new ForumAuthorizationError("only the topic author may select an answer");
      const [activeDuplicate] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .limit(1);
      if (activeDuplicate) {
        throw new ForumStateConflictError("a confirmed duplicate cannot have its own best answer");
      }
      const [post] = await tx.select({ topicId: forumPosts.topicId }).from(forumPosts).where(eq(forumPosts.id, postId));
      if (!post) throw new ForumEntityNotFoundError("post does not exist");
      if (post.topicId !== topicId) throw new ForumStateConflictError("post belongs to another topic");
      const [originalPost] = await tx.select({ id: forumPosts.id })
        .from(forumPosts)
        .where(eq(forumPosts.topicId, topicId))
        .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id))
        .limit(1);
      if (originalPost?.id === postId) {
        throw new ForumStateConflictError("original topic post cannot be selected as best answer");
      }
      // Check candidate and current answer under their ordered post locks,
      // including same-answer no-op, before actor admission or any side effect.
      const affectedPostIds = [...new Set([postId, topic.bestAnswerPostId]
        .filter((id): id is string => id !== null))].sort();
      const lockedAnswers = await tx.select({
        id: forumPosts.id, isHidden: forumPosts.isHidden,
      })
        .from(forumPosts)
        .where(and(eq(forumPosts.topicId, topicId), inArray(forumPosts.id, affectedPostIds)))
        .orderBy(asc(forumPosts.id))
        .for("no key update");
      if (lockedAnswers.length !== affectedPostIds.length || lockedAnswers.some(answer => answer.isHidden))
        throw new ForumEntityNotFoundError("selected answer does not exist");
      if (
        topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID
        && topic.bestAnswerPostId !== postId
      ) {
        const affectedKinds = topic.bestAnswerPostId
          ? or(
              eq(forumHelpSignals.kind, "duplicate"),
              and(
                eq(forumHelpSignals.targetPostId, topic.bestAnswerPostId),
                inArray(forumHelpSignals.kind, ["needs-review", "solution-outdated"]),
              ),
            )
          : eq(forumHelpSignals.kind, "duplicate");
        await tx.select({ id: forumHelpSignals.id })
          .from(forumHelpSignals)
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.status, "pending"),
            affectedKinds,
          ))
          .orderBy(asc(forumHelpSignals.id))
          .for("no key update");
      }
      await assertActiveAccountForDrizzleMutation(tx, actorId);
      if (scope === "any") await this.measureAdmission(tx, actorId, "admin.forum");
      // Active same-answer selection is a genuine no-op; inactive/missing
      // actors are still denied before this success boundary.
      if (topic.bestAnswerPostId === postId) {
        return { topicAuthorId: topic.authorId, isSolved: topic.isSolved };
      }
      if (
        topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID
      ) {
        if (topic.bestAnswerPostId) {
          await tx.update(forumPosts)
            .set({
              solutionModerationStatus: "outdated",
              solutionOutdatedReason: null,
              solutionOutdatedReasonKind: "best-answer-replaced",
            })
            .where(and(
              eq(forumPosts.topicId, topicId),
              eq(forumPosts.id, topic.bestAnswerPostId),
            ));
          await tx.update(forumHelpSignals)
            .set({
              status: "superseded",
              resolvedByUserId: actorId,
              resolvedAt: sql`statement_timestamp()`,
            })
            .where(and(
              eq(forumHelpSignals.topicId, topicId),
              eq(forumHelpSignals.targetPostId, topic.bestAnswerPostId),
              eq(forumHelpSignals.status, "pending"),
              inArray(forumHelpSignals.kind, ["needs-review", "solution-outdated"]),
            ));
        }
        await tx.update(forumPosts)
          .set({
            solutionModerationStatus: null,
            solutionOutdatedReason: null,
            solutionOutdatedReasonKind: null,
          })
          .where(and(
            eq(forumPosts.topicId, topicId),
            eq(forumPosts.id, postId),
          ));
        await tx.update(forumHelpSignals)
          .set({
            status: "superseded",
            resolvedByUserId: actorId,
            resolvedAt: sql`statement_timestamp()`,
          })
          .where(and(
            eq(forumHelpSignals.topicId, topicId),
            eq(forumHelpSignals.kind, "duplicate"),
            eq(forumHelpSignals.status, "pending"),
          ));
      }
      await tx.update(forumTopics).set({ bestAnswerPostId: postId }).where(eq(forumTopics.id, topicId));
      if(scope === "any" && topic.bestAnswerPostId !== postId)await appendForumHistory(tx,actorId,{action:"topic.bestAnswerChanged",targetType:"topic",targetId:topicId,context:{before:topic.bestAnswerPostId,after:postId}});
      return { topicAuthorId: topic.authorId, isSolved: topic.isSolved };
    });
  }

  async readPost(id: string): Promise<ForumPost | undefined> {
    const [row] = await this.database
      .select({
        id: forumPosts.id,
        topicId: forumPosts.topicId,
        authorId: forumPosts.authorId,
        parentPostId: forumPosts.parentPostId,
        solutionModerationStatus: forumPosts.solutionModerationStatus,
        solutionOutdatedReason: forumPosts.solutionOutdatedReason,
        solutionOutdatedReasonKind: forumPosts.solutionOutdatedReasonKind,
        revisionId: forumPostRevisions.id,
        originalContent: forumPostRevisions.originalContent,
        sourceLocale: forumPostRevisions.sourceLocale,
      })
      .from(forumPosts)
      .innerJoin(
        forumPostRevisions,
        and(eq(forumPostRevisions.postId, forumPosts.id), eq(forumPostRevisions.id, forumPosts.currentRevisionId)),
      )
      .where(eq(forumPosts.id, id));
    return row && {
      id: row.id,
      topicId: row.topicId,
      authorId: row.authorId,
      parentPostId: row.parentPostId,
      solutionModerationStatus: row.solutionModerationStatus as HelpSolutionModerationStatus | null,
      solutionOutdatedReason: row.solutionOutdatedReason,
      solutionOutdatedReasonKind: row.solutionOutdatedReasonKind as HelpSolutionOutdatedReasonKind | null,
      body: { id: row.revisionId, originalContent: row.originalContent, sourceLocale: row.sourceLocale },
    };
  }

  /** Resolve the post's topic first, then lock the topic before the post and actor. */
  private async lockVisibleSourceLocalePost(
    tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0], postId: string,
  ): Promise<{ authorId: string; revisionId: string }> {
    const [location] = await tx.select({ topicId: forumPosts.topicId })
      .from(forumPosts).where(eq(forumPosts.id, postId));
    if (!location) throw new ForumEntityNotFoundError("source locale content does not exist");
    const [topic] = await tx.select({ isHidden: forumTopics.isHidden })
      .from(forumTopics).where(eq(forumTopics.id, location.topicId)).for("no key update");
    if (!topic || topic.isHidden)
      throw new ForumEntityNotFoundError("source locale content does not exist");
    const [post] = await tx.select({
      topicId: forumPosts.topicId, isHidden: forumPosts.isHidden,
      authorId: forumPosts.authorId, revisionId: forumPosts.currentRevisionId,
    }).from(forumPosts).where(eq(forumPosts.id, postId)).for("no key update");
    if (!post || post.isHidden || post.topicId !== location.topicId)
      throw new ForumEntityNotFoundError("source locale content does not exist");
    return post;
  }

  /** Same-locale source correction is a success boundary even without a new revision. */
  async admitSourceLocaleNoop(input: {
    kind: "topic" | "post"; contentId: string; expectedRevisionId: string;
    actorId: string; scope: "own" | "any";
  }): Promise<void> {
    await this.database.transaction(async (tx) => {
      let content: { authorId: string; revisionId: string };
      if (input.kind === "topic") {
        const [topic] = await tx.select({
          authorId: forumTopics.authorId, revisionId: forumTopics.currentTitleRevisionId,
          isHidden: forumTopics.isHidden,
        }).from(forumTopics).where(eq(forumTopics.id, input.contentId)).for("no key update");
        if (!topic || topic.isHidden)
          throw new ForumEntityNotFoundError("source locale content does not exist");
        content = topic;
      } else {
        content = await this.lockVisibleSourceLocalePost(tx, input.contentId);
      }
      if (content.revisionId !== input.expectedRevisionId)
        throw new ForumStateConflictError("source locale current revision changed");
      if (input.scope === "own" && content.authorId !== input.actorId)
        throw new ForumAuthorizationError("actor cannot correct another author's source locale");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      if (input.scope === "any") await this.measureAdmission(tx, input.actorId, "admin.forum");
    });
  }

  async editOwnTopicTitle(input: {
    topicId: string; actorId: string; expectedRevisionId: string; title: string;
  }): Promise<ForumRevisionContent> {
    return this.database.transaction(async (tx) => {
      const [topic] = await tx.select({
        authorId: forumTopics.authorId, revisionId: forumTopics.currentTitleRevisionId,
        isHidden: forumTopics.isHidden,
      }).from(forumTopics).where(eq(forumTopics.id, input.topicId)).for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.authorId !== input.actorId) throw new ForumAuthorizationError("only author can edit topic title");
      if (topic.revisionId !== input.expectedRevisionId)
        throw new ForumStateConflictError("topic title current revision changed");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      await this.measureAdmission(tx, input.actorId, "posts.edit");
      const [current] = await tx.select({
        id: forumTopicTitleRevisions.id, originalContent: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
      }).from(forumTopicTitleRevisions).where(and(
        eq(forumTopicTitleRevisions.topicId, input.topicId),
        eq(forumTopicTitleRevisions.id, topic.revisionId),
      ));
      if (!current) throw new ForumEntityNotFoundError("current title revision does not exist");
      if (current.originalContent === input.title) return current;
      const revision = { id: crypto.randomUUID(), originalContent: input.title, sourceLocale: "und" };
      await tx.insert(forumTopicTitleRevisions).values({ ...revision, topicId: input.topicId, authorId: input.actorId });
      const updated = await tx.update(forumTopics).set({ currentTitleRevisionId: revision.id })
        .where(and(eq(forumTopics.id, input.topicId), eq(forumTopics.currentTitleRevisionId, input.expectedRevisionId)))
        .returning({ id: forumTopics.id });
      if (!updated.length) throw new ForumStateConflictError("topic title current revision changed");
      return revision;
    });
  }

  async reviseTopicTitle(topicId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string, correctionScope?: "own" | "any") {
    return this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ isHidden: forumTopics.isHidden }).from(forumTopics)
        .where(eq(forumTopics.id, topicId)).for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      await assertActiveAccountForDrizzleMutation(tx, authorId);
      if (correctionScope === "any") await this.measureAdmission(tx, authorId, "admin.forum");
      const [previous]=correctionScope==="any"?await tx.select({sourceLocale:forumTopicTitleRevisions.sourceLocale}).from(forumTopicTitleRevisions).where(eq(forumTopicTitleRevisions.id,expectedRevisionId)):[];
      await tx.insert(forumTopicTitleRevisions).values({ ...revision, topicId, authorId });
      const updated = await tx.update(forumTopics)
        .set({ currentTitleRevisionId: revision.id })
        .where(and(eq(forumTopics.id, topicId), eq(forumTopics.currentTitleRevisionId, expectedRevisionId)))
        .returning({ id: forumTopics.id });
      if (updated.length === 0) throw new ConcurrentRevisionError("topic title current revision changed");
      if(previous && previous.sourceLocale!==revision.sourceLocale)await appendForumHistory(tx,authorId,{action:"topic.sourceLocaleCorrected",targetType:"topic",targetId:topicId,context:{before:previous.sourceLocale,after:revision.sourceLocale,previousRevisionId:expectedRevisionId,revisionId:revision.id}});
      return revision;
    });
  }

  async revisePostBody(postId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string, correctionScope?: "own" | "any") {
    return this.database.transaction(async (tx) => {
      await this.lockVisibleSourceLocalePost(tx, postId);
      await assertActiveAccountForDrizzleMutation(tx, authorId);
      if (correctionScope === "any") await this.measureAdmission(tx, authorId, "admin.forum");
      const [previous]=correctionScope==="any"?await tx.select({sourceLocale:forumPostRevisions.sourceLocale}).from(forumPostRevisions).where(eq(forumPostRevisions.id,expectedRevisionId)):[];
      await tx.insert(forumPostRevisions).values({ ...revision, postId, authorId });
      const updated = await tx.update(forumPosts)
        .set({ currentRevisionId: revision.id })
        .where(and(eq(forumPosts.id, postId), eq(forumPosts.currentRevisionId, expectedRevisionId)))
        .returning({ id: forumPosts.id });
      if (updated.length === 0) throw new ConcurrentRevisionError("post body current revision changed");
      if(previous && previous.sourceLocale!==revision.sourceLocale){
        const [post]=await tx.select({topicId:forumPosts.topicId}).from(forumPosts).where(eq(forumPosts.id,postId));
        await appendForumHistory(tx,authorId,{action:"post.sourceLocaleCorrected",targetType:"post",targetId:postId,context:{topicId:post.topicId,before:previous.sourceLocale,after:revision.sourceLocale,previousRevisionId:expectedRevisionId,revisionId:revision.id}});
      }
      return revision;
    });
  }

  async editPublishedPost(input: {
    postId: string; topicId: string; actorId: string;
    expectedRevisionId: string; body: string;
    draftId: string; attachmentIds: readonly string[]; retainedAttachmentIds?: readonly string[];
  }) {
    const contextKey = `post:${input.postId}:edit`;
    const draft = {
      contextKey, draftId: input.draftId,
      attachmentIds: input.attachmentIds,
    };
    const fingerprint = await publicationFingerprint({
      kind: "edit", postId: input.postId, topicId: input.topicId,
      expectedRevisionId: input.expectedRevisionId, body: input.body,
      attachmentIds: [...input.attachmentIds].sort(),
      ...(input.retainedAttachmentIds === undefined ? {} : { retainedAttachmentIds: [...input.retainedAttachmentIds].sort() }),
    });
    return withOperationalFacts(this.operational,facts=>this.database.transaction(async (tx) => {
      const changes:{added:FileReferenceTransition[];removed:FileReferenceTransition[]}={added:[],removed:[]};
      await lockAttachmentDraftScope(tx, input.actorId, contextKey);
      const replay = await this.publicationReceipt(tx, input.actorId, draft, fingerprint);
      if (replay) {
        if (replay.topicId !== input.topicId || replay.postId !== input.postId)
          throw new ForumStateConflictError("edit receipt references another post");
        await assertActiveAccountForDrizzleMutation(tx, input.actorId);
        return;
      }
      // The topic mutex serializes Hide/Restore with edits and resolves the
      // notification topic FK before the post/actor locks.
      const [topic] = await tx.select({ isHidden: forumTopics.isHidden }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId)).for("no key update");
      if (!topic || topic.isHidden) throw new ForumEntityNotFoundError("topic does not exist");
      const [post] = await tx.select({
        id: forumPosts.id, authorId: forumPosts.authorId,
        revisionId: forumPosts.currentRevisionId, isHidden: forumPosts.isHidden,
      }).from(forumPosts).where(and(
        eq(forumPosts.id, input.postId), eq(forumPosts.topicId, input.topicId),
      )).for("update");
      if (!post || post.isHidden) throw new ForumEntityNotFoundError("post does not exist");
      if (post.authorId !== input.actorId) throw new ForumAuthorizationError("only author can edit post");
      if (post.revisionId !== input.expectedRevisionId)
        throw new ForumStateConflictError("post revision changed before edit");
      await assertActiveAccountForDrizzleMutation(tx, input.actorId);
      await this.measureAdmission(tx, input.actorId, "posts.edit");
      const existing = await tx.select({ id: forumPostAttachments.attachmentId })
        .from(forumPostAttachments).where(eq(forumPostAttachments.postId, input.postId));
      const retained = input.retainedAttachmentIds?.map((id) => id.toLowerCase()) ?? existing.map((item) => item.id);
      if (new Set(retained).size !== retained.length
        || retained.some((id) => !existing.some((item) => item.id === id))) {
        throw new ForumStateConflictError("retained attachment is not bound to this post");
      }
      if (!input.body.trim() && input.attachmentIds.length === 0 && retained.length === 0)
        throw new ForumStateConflictError("post requires body or attachments");
      const removed = existing.filter((item) => !retained.includes(item.id)).map((item) => item.id);
      if (removed.length) changes.removed.push(...await tx.delete(forumPostAttachments).where(and(
        eq(forumPostAttachments.postId, input.postId), inArray(forumPostAttachments.attachmentId, removed),
      )).returning({attachmentId:forumPostAttachments.attachmentId,
        referenceCreatedAt:sql<string>`to_char(${forumPostAttachments.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        operationAt:sql<string>`to_char(statement_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}));
      const now = new Date();
      const revisionId = crypto.randomUUID();
      await tx.insert(forumPostRevisions).values({
        id: revisionId, postId: input.postId, authorId: input.actorId,
        originalContent: input.body, sourceLocale: "und", createdAt: now,
      });
      const updated = await tx.update(forumPosts)
        .set({ currentRevisionId: revisionId, editedAt: now })
        .where(and(eq(forumPosts.id, input.postId), eq(forumPosts.currentRevisionId, input.expectedRevisionId)))
        .returning({ id: forumPosts.id });
      if (!updated.length) throw new ForumStateConflictError("post revision changed before edit");
      await this.recordPublishedMentions(tx, {
        actorId: input.actorId, topicId: input.topicId, postId: input.postId,
        body: input.body, createdAt: now,
      });
      await this.finishPublishedDraft(tx, input.actorId, draft, input.postId,changes);
      await this.recordPublicationReceipt(tx, input.actorId, draft, fingerprint, input.topicId, input.postId);
      facts.captureFileReferences(input.postId,input.actorId,changes);
    }));
  }

  async readHierarchy(categoryId: string): Promise<ForumHierarchy | undefined> {
    const [category] = await this.database.select().from(forumCategories).where(eq(forumCategories.id, categoryId));
    if (!category) return undefined;
    const sections = await this.database.select().from(forumSections)
      .where(eq(forumSections.categoryId, categoryId)).orderBy(asc(forumSections.createdAt), asc(forumSections.id));
    const result: ForumHierarchy = { id: category.id, name: category.name, sections: [] };
    for (const section of sections) {
      const topicIds = await this.database.select({ id: forumTopics.id }).from(forumTopics)
        .where(eq(forumTopics.sectionId, section.id)).orderBy(asc(forumTopics.createdAt), asc(forumTopics.id));
      const topics = [];
      for (const { id } of topicIds) {
        const topic = await this.readTopic(id);
        if (!topic) throw new ForumEntityNotFoundError(`current title revision missing for topic ${id}`);
        const postIds = await this.database.select({ id: forumPosts.id }).from(forumPosts)
          .where(eq(forumPosts.topicId, id)).orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));
        const posts: ForumPost[] = [];
        for (const postIdentity of postIds) {
          const post = await this.readPost(postIdentity.id);
          if (!post) throw new ForumEntityNotFoundError(`current body revision missing for post ${postIdentity.id}`);
          posts.push(post);
        }
        topics.push({ ...topic, posts });
      }
      result.sections.push({ id: section.id, name: section.name, topics });
    }
    return result;
  }

  async revisionCounts() {
    const [titles] = await this.database.select({ count: sql<number>`count(*)::int` }).from(forumTopicTitleRevisions);
    const [posts] = await this.database.select({ count: sql<number>`count(*)::int` }).from(forumPostRevisions);
    return { topicTitles: titles?.count ?? 0, postBodies: posts?.count ?? 0 };
  }
}

const HELP_SIMILAR_TITLE_TERM_LIMIT = 6;
const HELP_SIMILAR_BODY_TERM_LIMIT = 6;
const HELP_SIMILAR_TAG_TERM_LIMIT = 4;
const HELP_SIMILAR_TAG_SEARCH_TERM_LIMIT = 4;
const HELP_SIMILAR_TOTAL_TERM_LIMIT = 16;
const HELP_SIMILAR_BODY_INPUT_LIMIT = 4_000;
const HELP_SIMILAR_TAG_INPUT_LIMIT = 8;
const HELP_SIMILAR_TAG_LENGTH_LIMIT = 100;
const HELP_SIMILAR_SINGLE_LETTER_TECH_TERMS = new Set(["c", "r"]);
const HELP_SIMILAR_TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "be", "can", "could", "did", "do", "does", "for", "from",
  "how", "i", "in", "is", "my", "of", "on", "or", "our", "should", "that", "the", "this",
  "to", "we", "what", "when", "where", "which", "who", "why", "with", "would", "you", "your",
  "в", "вы", "где", "для", "и", "из", "или", "как", "какая", "какие", "какой", "когда", "кто",
  "ли", "мой", "моя", "мои", "мы", "на", "надо", "нужно", "почему", "с", "что", "это", "эта",
  "этот", "я",
  "או", "איך", "איפה", "אני", "אנחנו", "את", "אתם", "האם", "זה", "זאת", "למה", "מה", "מי",
  "מתי", "על", "עם", "של",
]);

function helpSimilarNormalizedTags(tags: readonly string[]): string[] {
  return [...new Set(
    tags
      .slice(0, HELP_SIMILAR_TAG_INPUT_LIMIT)
      .map((tag) => tag
        .slice(0, HELP_SIMILAR_TAG_LENGTH_LIMIT)
        .normalize("NFKC")
        .trim()
        .replace(/\s+/gu, " ")
        .toLowerCase())
      .filter(Boolean),
  )];
}

function helpSimilarSearchTerms(query: ForumHelpSimilarQuestionQuery): string[] {
  const titleTerms = helpSimilarTitleTerms(query.title, HELP_SIMILAR_TITLE_TERM_LIMIT);
  const normalizedTags = helpSimilarNormalizedTags(query.tags);
  const tagTerms = [...new Set(normalizedTags.flatMap((tag) => [
    tag,
    ...helpSimilarTextTerms(tag, HELP_SIMILAR_TAG_TERM_LIMIT),
  ]))].slice(0, HELP_SIMILAR_TAG_SEARCH_TERM_LIMIT);
  const bodyTerms = helpSimilarTextTerms(
    query.body.slice(0, HELP_SIMILAR_BODY_INPUT_LIMIT),
    HELP_SIMILAR_BODY_TERM_LIMIT,
  );
  const ordered = [...titleTerms, ...tagTerms, ...bodyTerms];

  return [...new Set(ordered)].slice(0, HELP_SIMILAR_TOTAL_TERM_LIMIT);
}

function helpSimilarTitleTerms(value: string, limit: number): string[] {
  const normalized = value.normalize("NFKC").toLowerCase();
  const chunks = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}+#]*/gu) ?? [];
  const terms: string[] = [];
  for (const chunk of chunks) {
    const semanticLength = chunk.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    const keep = semanticLength >= 2
      || /[+#]/u.test(chunk)
      || HELP_SIMILAR_SINGLE_LETTER_TECH_TERMS.has(chunk);
    if (!keep || HELP_SIMILAR_TITLE_STOP_WORDS.has(chunk) || terms.includes(chunk)) continue;
    terms.push(chunk);
    if (terms.length >= limit) break;
  }
  return terms;
}

function helpSimilarTextTerms(value: string, limit: number): string[] {
  const normalized = value.normalize("NFKC").toLowerCase();
  const chunks = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}+#]*/gu) ?? [];
  const terms: string[] = [];
  for (const chunk of chunks) {
    if (!usefulHelpSimilarTerm(chunk) || terms.includes(chunk)) continue;
    terms.push(chunk);
    if (terms.length >= limit) break;
  }
  return terms;
}

function usefulHelpSimilarTerm(value: string): boolean {
  const semanticLength = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return semanticLength >= 3 || (semanticLength === 1 && /[+#]/u.test(value));
}

function helpSimilarTitleTokenPattern(value: string): string {
  let escaped = value;
  for (const char of ["\\", "^", "$", ".", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"]) {
    escaped = escaped.split(char).join("\\" + char);
  }
  return `(^|[^[:alnum:]_])${escaped}([^[:alnum:]_]|$)`;
}

function escapeSearchPattern(value: string): string {
  return value.replace(/!/gu, "!!").replace(/%/gu, "!%").replace(/_/gu, "!_");
}

type ForumTransaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

async function enforceForumWriteCooldown(
  tx: ForumTransaction,
  authorId: string,
  policy: ForumWritePolicy,
): Promise<Date> {
  // The existing Better Auth user row is the per-author mutex. This lock and the
  // post lookup deliberately live in the same transaction as the forum write.
  // Serialize writes by one author without conflicting with FK KEY SHARE locks
  // acquired when another author inserts a notification for this user.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, authorId)).for("no key update");
  const [latest] = await tx.select({ createdAt: forumPosts.createdAt })
    .from(forumPosts)
    .where(eq(forumPosts.authorId, authorId))
    .orderBy(desc(forumPosts.createdAt), desc(forumPosts.id))
    .limit(1);
  return enforceCooldownFromLatest(latest?.createdAt, policy);
}

async function enforceHelpSignalWriteCooldown(
  tx: ForumTransaction,
  actorId: string,
  policy: ForumWritePolicy,
): Promise<Date> {
  // Caller already holds the authoritative actor FOR NO KEY UPDATE mutex
  // in the same transaction. Keep signal cooldown independent from posts,
  // without upgrading that actor lock or opening a second connection.
  const [latest] = await tx.select({ createdAt: forumHelpSignals.createdAt })
    .from(forumHelpSignals)
    .where(eq(forumHelpSignals.submittedByUserId, actorId))
    .orderBy(desc(forumHelpSignals.createdAt), desc(forumHelpSignals.id))
    .limit(1);
  return enforceCooldownFromLatest(latest?.createdAt, policy);
}

function enforceCooldownFromLatest(
  latestCreatedAt: Date | undefined,
  policy: ForumWritePolicy,
): Date {
  const now = policy.now();
  if (latestCreatedAt) {
    const retryAfterMs = policy.cooldownMs - (now.getTime() - latestCreatedAt.getTime());
    if (retryAfterMs > 0) throw new ForumWriteRateLimitError(retryAfterMs);
  }
  return now;
}
