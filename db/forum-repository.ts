import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";
import {
  forumCategories,
  forumHelpDuplicateAppeals,
  forumHelpDuplicateRelationships,
  forumHelpSignals,
  forumPostRevisions,
  forumPosts,
  forumReplyNotifications,
  forumSections,
  forumTags,
  forumTopicReadStates,
  forumTopicPins,
  forumTopicTags,
  forumTopicTitleRevisions,
  forumTopics,
  user,
} from "./schema";
import { ForumWriteRateLimitError, forumWritePolicy, type ForumWritePolicy } from "./forum-write-policy";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";

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
  id: string;
  title: string;
  authorName: string;
  activityCount: number;
  latestActivityAt: Date;
}

export type ForumPopularPage = Record<ForumPopularPeriod, ForumPopularTopicSummary[]>;

export interface ForumUnansweredTopicSummary {
  id: string;
  title: string;
  authorName: string;
  createdAt: Date;
  section: { id: string; name: string };
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
  id: string;
  title: string;
  authorName: string;
  postCount: number;
  createdAt: Date;
  section: { id: string; name: string };
  category: { id: string; name: string };
  tags: ForumTag[];
}

export interface ForumTagPage {
  tag: ForumTag;
  topics: ForumTaggedTopicSummary[];
}

export interface ForumSearchResult {
  id: string;
  title: string;
  authorName: string;
  postCount: number;
  activityAt: Date;
  section: { id: string; name: string };
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

export interface ForumUnreadTopicSummary {
  id: string;
  title: string;
  authorName: string;
  state: Exclude<ForumTopicReadKind, "read">;
  firstUnreadPostId: string;
  latestPostId: string;
  unreadCount: number;
  activityAt: Date;
  section: { id: string; name: string };
  category: { id: string; name: string };
}

export interface ForumReplyNotificationSummary {
  id: string;
  actorName: string;
  topicId: string;
  topicTitle: string;
  postId: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface ForumSectionTopicSummary {
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

export interface ForumHelpQuestionSummary {
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

export interface ForumHelpSimilarQuestionSummary {
  id: string;
  title: string;
  replyCount: number;
  isSolved: boolean;
  tags: ForumTag[];
}

const HELP_SOLUTIONS_ACTIVE_LIMIT = 100;
const HELP_SOLUTIONS_NEEDS_ATTENTION_LIMIT = 100;
const HELP_SOLUTIONS_MINE_LIMIT = 100;
const HELP_SOLUTIONS_WANT_TO_HELP_LIMIT = 100;
const HELP_SOLUTIONS_FOR_ME_LIMIT = 100;
const HELP_SOLUTIONS_FOR_ME_INTEREST_TAG_LIMIT = 100;

export interface ForumTopicSummary {
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

export interface ForumThreadPost extends ForumPost {
  authorName: string;
  createdAt: Date;
}

export interface ForumTopicPage extends ForumTopic {
  createdAt: Date;
  needsDetails: boolean;
  duplicateOf: ForumHelpDuplicateReference | null;
  duplicateDisputed: boolean;
  authorName: string;
  isPinned: boolean;
  section: { id: string; name: string; category: { id: string; name: string } };
  tags: ForumTag[];
  posts: ForumThreadPost[];
}

export interface ForumReader {
  listCategories(): Promise<ForumCategorySummary[]>;
  readHomepage(): Promise<ForumHomepageCategorySummary[]>;
  readPopular(referenceTime?: Date, limitPerPeriod?: number): Promise<ForumPopularPage>;
  readUnanswered(): Promise<ForumUnansweredTopicSummary[]>;
  readTags(): Promise<ForumTagSummary[]>;
  readTag(key: string): Promise<ForumTagPage | undefined>;
  search(query: string, limit?: number): Promise<ForumSearchResult[]>;
  readUnreadForUser(userId: string): Promise<ForumUnreadTopicSummary[]>;
  readTopicReadState(userId: string, topicId: string): Promise<ForumTopicReadState | undefined>;
  readReplyNotifications(userId: string, limit?: number): Promise<ForumReplyNotificationSummary[]>;
  countUnreadReplyNotifications(userId: string): Promise<number>;
  readTopicPinState(topicId: string): Promise<boolean>;
  readHelpSolutionsAll(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsOpen(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsActive(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsNeedsAttention(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsSolved(filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsMine(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsWantToHelp(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  readHelpSolutionsForMe(userId: string, filters?: ForumHelpSolutionsFilters): Promise<ForumHelpSolutionsPage | undefined>;
  searchHelpSolutionsSimilar(query: string, limit?: number): Promise<ForumHelpSimilarQuestionSummary[]>;
  readPendingHelpDuplicateAppeal(topicId: string): Promise<ForumHelpDuplicateAppeal | undefined>;
  readHelpSignal(id: string): Promise<ForumHelpSignal | undefined>;
  readCategory(id: string, pinnedTopicsPerSection?: number): Promise<ForumCategoryPage | undefined>;
  readSection(id: string): Promise<ForumSectionPage | undefined>;
  readTopicPage(id: string): Promise<ForumTopicPage | undefined>;
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
  id: string;
  topicId: string;
  authorId: string;
  parentPostId?: string | null;
  bodyRevision: ForumRevisionContent;
}

export interface CreateTopicWithInitialPostInput extends CreateTopicInput {
  initialPost: CreatePostInput;
}

export class ConcurrentRevisionError extends Error {}
export class ForumEntityNotFoundError extends Error {}
export class ForumAuthorizationError extends Error {}
export class ForumStateConflictError extends Error {}
export type SolutionManagementScope = "own" | "any";

export class DrizzleForumRepository {
  constructor(
    private readonly database: NodePgDatabase,
    private readonly writePolicy: ForumWritePolicy = forumWritePolicy,
  ) {}

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
        bestAnswerPostId: null,
      };
    });
  }

  async createTopicWithInitialPost(input: CreateTopicWithInitialPostInput): Promise<{ topic: ForumTopic; post: ForumPost }> {
    return this.database.transaction(async (tx) => {
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
      if (input.tags?.length) {
        await tx.insert(forumTags).values([...input.tags]).onConflictDoNothing();
        await tx.insert(forumTopicTags).values(input.tags.map((tag) => ({
          topicId: input.id,
          tagKey: tag.key,
        })));
      }
      return {
        topic: {
          id: input.id,
          sectionId: input.sectionId,
          authorId: input.authorId,
          title: input.titleRevision,
          isSolved: false,
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
    });
  }

  async createPost(input: CreatePostInput): Promise<ForumPost> {
    return this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ id: forumTopics.id, authorId: forumTopics.authorId }).from(forumTopics)
        .where(eq(forumTopics.id, input.topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
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
      const createdAt = await enforceForumWriteCooldown(tx, input.authorId, this.writePolicy);
      const parentPostId = input.parentPostId ?? null;
      let parentAuthorId: string | null = null;
      if (parentPostId) {
        const [parent] = await tx.select({ id: forumPosts.id, authorId: forumPosts.authorId }).from(forumPosts)
          .where(and(eq(forumPosts.id, parentPostId), eq(forumPosts.topicId, input.topicId)));
        if (!parent) throw new ForumEntityNotFoundError("parent post does not exist in topic");
        parentAuthorId = parent.authorId;
      }
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

      const recipients = new Set<string>();
      if (topic.authorId !== input.authorId) recipients.add(topic.authorId);
      if (parentAuthorId && parentAuthorId !== input.authorId) recipients.add(parentAuthorId);
      if (recipients.size > 0) {
        await tx.insert(forumReplyNotifications).values(
          [...recipients].map((recipientUserId) => ({
            id: crypto.randomUUID(),
            recipientUserId,
            actorUserId: input.authorId,
            topicId: input.topicId,
            postId: input.id,
            createdAt,
          })),
        ).onConflictDoNothing({
          target: [forumReplyNotifications.recipientUserId, forumReplyNotifications.postId],
        });
      }

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
    });
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
      .leftJoin(forumTopics, eq(forumTopics.sectionId, forumSections.id))
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
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
      .leftJoin(forumTopics, eq(forumTopics.sectionId, forumSections.id))
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
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
        authorName: user.name,
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
      .where(gte(forumPosts.createdAt, cutoff30d))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, user.name);

    const rank = (
      countKey: "activity24h" | "activity7d" | "activity30d",
      latestKey: "latest24h" | "latest7d" | "latest30d",
    ): ForumPopularTopicSummary[] => rows
      .flatMap((row) => {
        const activityCount = row[countKey];
        const latestActivityAt = row[latestKey];
        return activityCount > 0 && latestActivityAt
          ? [{
              id: row.id,
              title: row.title,
              authorName: row.authorName,
              activityCount,
              latestActivityAt,
            }]
          : [];
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
        authorName: user.name,
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
      .where(eq(forumTopics.isSolved, false))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .having(sql`count(${forumPosts.id}) = 1`)
      .orderBy(desc(forumTopics.createdAt), desc(forumTopics.id));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      authorName: row.authorName,
      createdAt: row.createdAt,
      section: { id: row.sectionId, name: row.sectionName },
      category: { id: row.categoryId, name: row.categoryName },
    }));
  }

  async readTags(): Promise<ForumTagSummary[]> {
    return this.database
      .select({
        key: forumTags.key,
        name: forumTags.name,
        topicCount: sql<number>`count(distinct ${forumTopicTags.topicId})::int`,
      })
      .from(forumTags)
      .leftJoin(forumTopicTags, eq(forumTopicTags.tagKey, forumTags.key))
      .groupBy(forumTags.key, forumTags.name, forumTags.createdAt)
      .orderBy(asc(forumTags.name), asc(forumTags.key));
  }

  async readTag(key: string): Promise<ForumTagPage | undefined> {
    const [tag] = await this.database
      .select({ key: forumTags.key, name: forumTags.name })
      .from(forumTags)
      .where(eq(forumTags.key, key));
    if (!tag) return undefined;

    const topics = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorName: user.name,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
        createdAt: forumTopics.createdAt,
        sectionId: forumSections.id,
        sectionName: forumSections.name,
        categoryId: forumCategories.id,
        categoryName: forumCategories.name,
      })
      .from(forumTopicTags)
      .innerJoin(forumTopics, eq(forumTopics.id, forumTopicTags.topicId))
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .innerJoin(user, eq(user.id, forumTopics.authorId))
      .innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId))
      .innerJoin(forumCategories, eq(forumCategories.id, forumSections.categoryId))
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .where(eq(forumTopicTags.tagKey, key))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .orderBy(desc(forumTopics.createdAt), desc(forumTopics.id));

    const tagsByTopic = await this.readTagsForTopics(topics.map((topic) => topic.id));
    return {
      tag,
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        authorName: topic.authorName,
        postCount: topic.postCount,
        createdAt: topic.createdAt,
        section: { id: topic.sectionId, name: topic.sectionName },
        category: { id: topic.categoryId, name: topic.categoryName },
        tags: tagsByTopic.get(topic.id) ?? [],
      })),
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
        authorName: user.name,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(forumPostRevisions, and(
        eq(forumPostRevisions.postId, forumPosts.id),
        eq(forumPostRevisions.id, forumPosts.currentRevisionId),
      ))
      .leftJoin(forumTopicTags, eq(forumTopicTags.topicId, forumTopics.id))
      .leftJoin(forumTags, eq(forumTags.key, forumTopicTags.tagKey))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
      )
      .having(sql`bool_or(${titleMatch}) or bool_or(${tagMatch}) or bool_or(${postMatch})`)
      .orderBy(desc(matchRank), desc(activityAt), desc(forumTopics.id))
      .limit(limit);

    const tagsByTopic = await this.readTagsForTopics(rows.map((row) => row.id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      authorName: row.authorName,
      postCount: row.postCount,
      activityAt: row.activityAt,
      section: { id: row.sectionId, name: row.sectionName },
      category: { id: row.categoryId, name: row.categoryName },
      tags: tagsByTopic.get(row.id) ?? [],
    }));
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
        authorName: user.name,
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
      .innerJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(forumTopicReadStates, and(
        eq(forumTopicReadStates.userId, userId),
        eq(forumTopicReadStates.topicId, forumTopics.id),
      ))
      .leftJoin(lastReadPost, and(
        eq(lastReadPost.topicId, forumTopicReadStates.topicId),
        eq(lastReadPost.id, forumTopicReadStates.lastReadPostId),
      ))
      .where(or(
        isNull(forumTopicReadStates.userId),
        gt(forumPosts.createdAt, lastReadPost.createdAt),
        and(eq(forumPosts.createdAt, lastReadPost.createdAt), gt(forumPosts.id, lastReadPost.id)),
      ))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        forumSections.id,
        forumSections.name,
        forumCategories.id,
        forumCategories.name,
        forumTopicReadStates.userId,
      )
      .orderBy(desc(activityAt), desc(forumTopics.id));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      authorName: row.authorName,
      state: row.state,
      firstUnreadPostId: row.firstUnreadPostId,
      latestPostId: row.latestPostId,
      unreadCount: row.unreadCount,
      activityAt: row.activityAt,
      section: { id: row.sectionId, name: row.sectionName },
      category: { id: row.categoryId, name: row.categoryName },
    }));
  }

  async readTopicReadState(userId: string, topicId: string): Promise<ForumTopicReadState | undefined> {
    const [topic] = await this.database
      .select({ id: forumTopics.id })
      .from(forumTopics)
      .where(eq(forumTopics.id, topicId));
    if (!topic) return undefined;

    const [marker] = await this.database
      .select({ lastReadPostId: forumTopicReadStates.lastReadPostId })
      .from(forumTopicReadStates)
      .where(and(
        eq(forumTopicReadStates.userId, userId),
        eq(forumTopicReadStates.topicId, topicId),
      ));

    const posts = await this.database
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.topicId, topicId))
      .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));

    const latestPostId = posts.at(-1)?.id ?? null;
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
        firstUnreadPostId: posts[0]!.id,
        latestPostId,
      };
    }

    const markerIndex = posts.findIndex((post) => post.id === marker.lastReadPostId);
    if (markerIndex < 0) {
      throw new ForumStateConflictError("topic read marker does not belong to current topic snapshot");
    }
    const firstUnreadPostId = posts[markerIndex + 1]?.id ?? null;
    return {
      topicId,
      state: firstUnreadPostId ? "unread" : "read",
      lastReadPostId: marker.lastReadPostId,
      firstUnreadPostId,
      latestPostId,
    };
  }

  async advanceTopicReadState(userId: string, topicId: string, postId: string): Promise<ForumTopicReadState> {
    const [target] = await this.database
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(and(eq(forumPosts.topicId, topicId), eq(forumPosts.id, postId)));
    if (!target) throw new ForumEntityNotFoundError("post does not exist in topic");

    await this.database.execute(sql`
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

    const state = await this.readTopicReadState(userId, topicId);
    if (!state) throw new ForumEntityNotFoundError("topic does not exist");
    return state;
  }

  async readReplyNotifications(userId: string, limit = 50): Promise<ForumReplyNotificationSummary[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("notification limit must be an integer between 1 and 100");
    }
    const actor = alias(user, "notification_actor");
    return this.database
      .select({
        id: forumReplyNotifications.id,
        actorName: actor.name,
        topicId: forumReplyNotifications.topicId,
        topicTitle: forumTopicTitleRevisions.originalContent,
        postId: forumReplyNotifications.postId,
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
      .where(eq(forumReplyNotifications.recipientUserId, userId))
      .orderBy(desc(forumReplyNotifications.createdAt), desc(forumReplyNotifications.id))
      .limit(limit);
  }

  async countUnreadReplyNotifications(userId: string): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(forumReplyNotifications)
      .where(and(
        eq(forumReplyNotifications.recipientUserId, userId),
        isNull(forumReplyNotifications.readAt),
      ));
    return row?.count ?? 0;
  }

  async markReplyNotificationRead(
    userId: string,
    notificationId: string,
  ): Promise<{ topicId: string; postId: string }> {
    const [notification] = await this.database
      .update(forumReplyNotifications)
      .set({ readAt: sql`coalesce(${forumReplyNotifications.readAt}, now())` })
      .where(and(
        eq(forumReplyNotifications.id, notificationId),
        eq(forumReplyNotifications.recipientUserId, userId),
      ))
      .returning({
        topicId: forumReplyNotifications.topicId,
        postId: forumReplyNotifications.postId,
      });
    if (!notification) throw new ForumEntityNotFoundError("notification does not exist for user");
    return notification;
  }

  async readTopicPinState(topicId: string): Promise<boolean> {
    const [pin] = await this.database
      .select({ topicId: forumTopicPins.topicId })
      .from(forumTopicPins)
      .where(eq(forumTopicPins.topicId, topicId));
    return Boolean(pin);
  }

  async pinTopic(topicId: string, pinnedByUserId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ id: forumTopics.id })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      await tx.insert(forumTopicPins)
        .values({ topicId, pinnedByUserId })
        .onConflictDoNothing({ target: forumTopicPins.topicId });
    });
  }

  async unpinTopic(topicId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({ id: forumTopics.id })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      await tx.delete(forumTopicPins).where(eq(forumTopicPins.topicId, topicId));
    });
  }

  async searchHelpSolutionsSimilar(
    query: string,
    limit = 5,
  ): Promise<ForumHelpSimilarQuestionSummary[]> {
    const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalizedQuery) return [];
    if (normalizedQuery.length > 200) {
      throw new RangeError("similar-question query must be at most 200 characters");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      throw new RangeError("similar-question limit must be an integer between 1 and 10");
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
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
        isSolved: forumTopics.isSolved,
        activityAt,
        matchRank,
      })
      .from(forumTopics)
      .innerJoin(forumTopicTitleRevisions, and(
        eq(forumTopicTitleRevisions.topicId, forumTopics.id),
        eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
      ))
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(forumPostRevisions, and(
        eq(forumPostRevisions.postId, forumPosts.id),
        eq(forumPostRevisions.id, forumPosts.currentRevisionId),
      ))
      .leftJoin(forumTopicTags, eq(forumTopicTags.topicId, forumTopics.id))
      .leftJoin(forumTags, eq(forumTags.key, forumTopicTags.tagKey))
      .where(eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id)
      .having(sql`bool_or(${titleMatch}) or bool_or(${tagMatch}) or bool_or(${postMatch})`)
      .orderBy(desc(matchRank), desc(activityAt), desc(forumTopics.id))
      .limit(limit);

    const tagsByTopic = await this.readTagsForTopics(rows.map(({ id }) => id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      replyCount: Math.max(0, row.postCount - 1),
      isSolved: row.isSolved,
      tags: tagsByTopic.get(row.id) ?? [],
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

  async readHelpSolutionsNeedsAttention(filters: ForumHelpSolutionsFilters = {}): Promise<ForumHelpSolutionsPage | undefined> {
    return this.readHelpSolutionsPage({ mode: "attention" }, filters);
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
        ),
      )
      .where(and(
        eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
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

    const rows = await this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorName: user.name,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(currentBestAnswer, and(
        eq(currentBestAnswer.topicId, forumTopics.id),
        eq(currentBestAnswer.id, forumTopics.bestAnswerPostId),
      ))
      .where(and(
        eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
        eq(forumTopics.isSolved, false),
        ne(forumTopics.authorId, userId),
      ))
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        currentBestAnswer.solutionModerationStatus,
        currentBestAnswer.solutionOutdatedReason,
        currentBestAnswer.solutionOutdatedReasonKind,
      )
      .orderBy(desc(matchCount), desc(activityAt), desc(forumTopics.id))
      .limit(HELP_SOLUTIONS_FOR_ME_LIMIT);

    const topicIds = rows.map(({ id }) => id);
    const tagsByTopic = await this.readTagsForTopics(topicIds);
    const duplicatesByTopic = await this.readHelpDuplicatePresentations(topicIds);
    return {
      ...category,
      questions: rows.map((row) => ({
        id: row.id,
        title: row.title,
        authorName: row.authorName,
        replyCount: Math.max(0, row.postCount - 1),
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
      })),
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

    const questionQuery = this.database
      .select({
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorName: user.name,
        postCount: sql<number>`count(distinct ${forumPosts.id})::int`,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(currentBestAnswer, and(
        eq(currentBestAnswer.topicId, forumTopics.id),
        eq(currentBestAnswer.id, forumTopics.bestAnswerPostId),
      ))
      .where(
        filter.mode === "solved"
          ? and(
              eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
              eq(forumTopics.isSolved, true),
            )
          : filter.mode === "open" || filter.mode === "attention"
            ? and(
                eq(forumTopics.sectionId, HELP_SOLUTIONS_SERVICE_SECTION_ID),
                eq(forumTopics.isSolved, false),
              )
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
      )
      .groupBy(
        forumTopics.id,
        forumTopicTitleRevisions.id,
        user.name,
        currentBestAnswer.solutionModerationStatus,
        currentBestAnswer.solutionOutdatedReason,
        currentBestAnswer.solutionOutdatedReasonKind,
      )
      .having(
        filter.mode === "active"
          ? sql`count(distinct ${forumPosts.id}) > 1`
          : filter.mode === "attention"
            ? sql`count(distinct ${forumPosts.id}) <= 1`
            : sql`true`,
      )
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
    return {
      ...category,
      questions: rows.map((row) => ({
        id: row.id,
        title: row.title,
        authorName: row.authorName,
        replyCount: Math.max(0, row.postCount - 1),
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
      })),
    };
  }

  private async readHelpDuplicatePresentations(
    topicIds: readonly string[],
  ): Promise<Map<string, { duplicateOf: ForumHelpDuplicateReference; duplicateDisputed: boolean }>> {
    if (topicIds.length === 0) return new Map();
    const originalTopic = alias(forumTopics, "help_duplicate_original_topic");
    const originalTitle = alias(forumTopicTitleRevisions, "help_duplicate_original_title");
    const pendingAppeal = alias(forumHelpDuplicateAppeals, "help_duplicate_pending_appeal");
    const rows = await this.database
      .select({
        duplicateTopicId: forumHelpDuplicateRelationships.duplicateTopicId,
        originalTopicId: forumHelpDuplicateRelationships.originalTopicId,
        originalTitle: originalTitle.originalContent,
        pendingAppealId: pendingAppeal.id,
      })
      .from(forumHelpDuplicateRelationships)
      .innerJoin(originalTopic, eq(originalTopic.id, forumHelpDuplicateRelationships.originalTopicId))
      .innerJoin(originalTitle, and(
        eq(originalTitle.topicId, originalTopic.id),
        eq(originalTitle.id, originalTopic.currentTitleRevisionId),
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
        duplicateOf: { id: row.originalTopicId, title: row.originalTitle },
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
      .leftJoin(forumTopics, eq(forumTopics.sectionId, forumSections.id))
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
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
        authorName: user.name,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .where(and(
        eq(forumSections.categoryId, id),
        ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
      ))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, user.name)
      .as("category_section_topic_activity");

    const rankedTopics = this.database
      .select({
        sectionId: topicActivity.sectionId,
        id: topicActivity.id,
        title: topicActivity.title,
        authorName: topicActivity.authorName,
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
        authorName: rankedTopics.authorName,
        activityAt: rankedTopics.activityAt,
      })
      .from(rankedTopics)
      .where(lte(rankedTopics.activityRank, 6))
      .orderBy(asc(rankedTopics.sectionId), asc(rankedTopics.activityRank));

    const latestBySection = new Map<string, ForumSectionTopicSummary[]>();
    for (const topic of latestTopics) {
      const list = latestBySection.get(topic.sectionId) ?? [];
      list.push({
        id: topic.id,
        title: topic.title,
        authorName: topic.authorName,
        activityAt: topic.activityAt,
      });
      latestBySection.set(topic.sectionId, list);
    }

    const pinnedActivity = this.database
      .select({
        sectionId: forumTopics.sectionId,
        id: forumTopics.id,
        title: forumTopicTitleRevisions.originalContent,
        authorName: user.name,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .where(and(
        eq(forumSections.categoryId, id),
        ne(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID),
      ))
      .groupBy(
        forumTopics.id,
        forumSections.id,
        forumTopicTitleRevisions.id,
        user.name,
        forumTopicPins.pinnedAt,
      )
      .as("category_section_pin_activity");

    const rankedPinned = this.database
      .select({
        sectionId: pinnedActivity.sectionId,
        id: pinnedActivity.id,
        title: pinnedActivity.title,
        authorName: pinnedActivity.authorName,
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
        authorName: rankedPinned.authorName,
        activityAt: rankedPinned.activityAt,
      })
      .from(rankedPinned)
      .where(lte(rankedPinned.pinRank, pinnedTopicsPerSection))
      .orderBy(asc(rankedPinned.sectionId), asc(rankedPinned.pinRank));

    const pinnedBySection = new Map<string, ForumSectionTopicSummary[]>();
    for (const topic of pinnedTopics) {
      const list = pinnedBySection.get(topic.sectionId) ?? [];
      list.push({
        id: topic.id,
        title: topic.title,
        authorName: topic.authorName,
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
        authorName: user.name,
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
      .leftJoin(forumPosts, eq(forumPosts.topicId, forumTopics.id))
      .leftJoin(forumTopicPins, eq(forumTopicPins.topicId, forumTopics.id))
      .where(eq(forumTopics.sectionId, id))
      .groupBy(forumTopics.id, forumTopicTitleRevisions.id, user.name, forumTopicPins.topicId)
      .orderBy(asc(forumTopics.createdAt), asc(forumTopics.id));
    const tagsByTopic = await this.readTagsForTopics(topics.map((topic) => topic.id));
    return {
      id: section.id,
      name: section.name,
      category: { id: section.categoryId, name: section.categoryName },
      topics: topics.map((topic) => ({
        id: topic.id,
        title: { id: topic.revisionId, originalContent: topic.originalContent, sourceLocale: topic.sourceLocale },
        authorName: topic.authorName,
        postCount: topic.postCount,
        createdAt: topic.createdAt,
        isPinned: topic.isPinned,
        tags: tagsByTopic.get(topic.id) ?? [],
      })),
    };
  }

  async readTopicPage(id: string): Promise<ForumTopicPage | undefined> {
    const [topic] = await this.database
      .select({
        id: forumTopics.id, sectionId: forumSections.id, sectionName: forumSections.name,
        categoryId: forumCategories.id, categoryName: forumCategories.name, authorId: forumTopics.authorId,
        authorName: user.name, createdAt: forumTopics.createdAt, revisionId: forumTopicTitleRevisions.id,
        originalContent: forumTopicTitleRevisions.originalContent, sourceLocale: forumTopicTitleRevisions.sourceLocale,
        isSolved: forumTopics.isSolved, bestAnswerPostId: forumTopics.bestAnswerPostId,
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
      .where(eq(forumTopics.id, id));
    if (!topic) return undefined;
    const tags = await this.readTagsForTopics([id]);
    const duplicatePresentation = (await this.readHelpDuplicatePresentations([id])).get(id);
    const posts = await this.database
      .select({
        id: forumPosts.id, topicId: forumPosts.topicId, authorId: forumPosts.authorId,
        parentPostId: forumPosts.parentPostId,
        authorName: user.name, createdAt: forumPosts.createdAt, revisionId: forumPostRevisions.id,
        originalContent: forumPostRevisions.originalContent, sourceLocale: forumPostRevisions.sourceLocale,
        solutionModerationStatus: forumPosts.solutionModerationStatus,
        solutionOutdatedReason: forumPosts.solutionOutdatedReason,
        solutionOutdatedReasonKind: forumPosts.solutionOutdatedReasonKind,
      })
      .from(forumPosts)
      .innerJoin(user, eq(user.id, forumPosts.authorId))
      .innerJoin(forumPostRevisions, and(
        eq(forumPostRevisions.postId, forumPosts.id),
        eq(forumPostRevisions.id, forumPosts.currentRevisionId),
      ))
      .where(eq(forumPosts.topicId, id))
      .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));
    return {
      id: topic.id, sectionId: topic.sectionId, authorId: topic.authorId, authorName: topic.authorName,
      isSolved: topic.isSolved, bestAnswerPostId: topic.bestAnswerPostId,
      needsDetails: topic.needsDetails,
      duplicateOf: duplicatePresentation?.duplicateOf ?? null,
      duplicateDisputed: duplicatePresentation?.duplicateDisputed ?? false,
      isPinned: topic.isPinned,
      createdAt: topic.createdAt,
      title: { id: topic.revisionId, originalContent: topic.originalContent, sourceLocale: topic.sourceLocale },
      section: { id: topic.sectionId, name: topic.sectionName, category: { id: topic.categoryId, name: topic.categoryName } },
      tags: tags.get(id) ?? [],
      posts: posts.map((post) => ({
        id: post.id, topicId: post.topicId, authorId: post.authorId, parentPostId: post.parentPostId,
        authorName: post.authorName, createdAt: post.createdAt,
        solutionModerationStatus: post.solutionModerationStatus as HelpSolutionModerationStatus | null,
        solutionOutdatedReason: post.solutionOutdatedReason,
        solutionOutdatedReasonKind: post.solutionOutdatedReasonKind as HelpSolutionOutdatedReasonKind | null,
        body: { id: post.revisionId, originalContent: post.originalContent, sourceLocale: post.sourceLocale },
      })),
    };
  }

  private async readTagsForTopics(topicIds: readonly string[]): Promise<Map<string, ForumTag[]>> {
    if (topicIds.length === 0) return new Map();
    const rows = await this.database
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
          })
          .from(forumTopics)
          .where(inArray(forumTopics.id, lockedIds))
          .orderBy(asc(forumTopics.id))
          .for("update");
        if (topics.length !== 2) {
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
          })
          .from(forumTopics)
          .where(eq(forumTopics.id, input.topicId))
          .for("update");
        if (!lockedTopic) throw new ForumEntityNotFoundError("topic does not exist");
        if (lockedTopic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
          throw new ForumStateConflictError("Help signals are only available for Help & solutions questions");
        }
        topic = lockedTopic;
      }

      // Keep the same lock order as reply writes: topic row(s) first, then
      // the per-user write mutex used by the signal cooldown.
      await enforceHelpSignalWriteCooldown(tx, input.actorId, this.writePolicy);

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
          })
          .from(forumPosts)
          .where(and(
            eq(forumPosts.topicId, input.topicId),
            eq(forumPosts.id, targetPostId),
          ))
          .for("update");
        if (!answer) throw new ForumStateConflictError("current selected solution does not exist");
        if (
          (input.kind === "needs-review" && answer.status !== null)
          || (input.kind === "solution-outdated" && answer.status === "outdated")
        ) {
          throw new ForumStateConflictError("requested solution moderation state is already authoritative");
        }
      }

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

  async withdrawHelpSignal(signalId: string, topicId: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
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
        const [signal] = await tx
          .select({
            id: forumHelpSignals.id,
            status: forumHelpSignals.status,
          })
          .from(forumHelpSignals)
          .where(eq(forumHelpSignals.id, signalId))
          .for("update");
        if (!signal) throw new ForumEntityNotFoundError("Help signal does not exist");
        if (signal.status !== "pending") {
          throw new ForumStateConflictError("Help signal is no longer pending");
        }
        await tx
          .update(forumHelpSignals)
          .set({
            status: "rejected",
            resolvedByUserId: actorId,
            resolvedAt: sql`statement_timestamp()`,
          })
          .where(eq(forumHelpSignals.id, signalId));
        return "rejected" as const;
      });
    }

    return this.database.transaction(async (tx) => {
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
        })
        .from(forumTopics)
        .where(inArray(forumTopics.id, topicIds))
        .orderBy(asc(forumTopics.id))
        .for("update");

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
        .where(eq(forumHelpSignals.id, signalId))
        .for("update");
      if (!signal) throw new ForumEntityNotFoundError("Help signal does not exist");
      if (signal.status !== "pending") {
        throw new ForumStateConflictError("Help signal is no longer pending");
      }

      const topic = topics.find((row) => row.id === signal.topicId);
      let applicable = Boolean(topic && topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID);
      if (kind === "duplicate") {
        applicable = applicable
          && topics.length === 2
          && topics.every((row) => row.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID);
      }

      const resolvedAt = sql`statement_timestamp()`;
      const supersedeCurrent = async () => {
        await tx
          .update(forumHelpSignals)
          .set({
            status: "superseded",
            resolvedByUserId: actorId,
            resolvedAt,
          })
          .where(eq(forumHelpSignals.id, signalId));
        return "superseded" as const;
      };

      if (!applicable || !topic) return supersedeCurrent();

      if (kind === "needs-details") {
        if (topic.needsDetails) return supersedeCurrent();
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
          .for("update");
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
          return "superseded";
        }
        await tx.insert(forumHelpDuplicateRelationships).values({
          id: crypto.randomUUID(),
          duplicateTopicId: signal.topicId,
          originalTopicId,
          confirmedByUserId: actorId,
        });
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
      return "accepted";
    });
  }

  async setHelpSolutionModeration(
    topicId: string,
    status: HelpSolutionModerationStatus | null,
    outdatedReason: string | null,
    actorId: string,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({
          sectionId: forumTopics.sectionId,
          isSolved: forumTopics.isSolved,
          bestAnswerPostId: forumTopics.bestAnswerPostId,
        })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("solution moderation is only available for Help & solutions questions");
      }
      if (!topic.isSolved) {
        throw new ForumStateConflictError("solution moderation requires a solved Help & solutions question");
      }
      if (!topic.bestAnswerPostId) {
        throw new ForumStateConflictError("solution moderation requires a selected best answer");
      }
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
        })
        .from(forumTopics)
        .where(inArray(forumTopics.id, lockedIds))
        .orderBy(asc(forumTopics.id))
        .for("update");
      if (topics.length !== 2) throw new ForumEntityNotFoundError("duplicate question or original question does not exist");
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

      await tx.insert(forumHelpDuplicateRelationships).values({
        id: crypto.randomUUID(),
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
    });
  }

  async removeHelpDuplicate(topicId: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("duplicate relationships are only available for Help & solutions questions");
      }
      const [relationship] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .for("update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");

      const resolvedAt = sql`now()`;
      await tx.update(forumHelpDuplicateAppeals)
        .set({ status: "accepted", resolvedByUserId: actorId, resolvedAt })
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ));
      await tx.update(forumHelpDuplicateRelationships)
        .set({ removedByUserId: actorId, removedAt: resolvedAt })
        .where(eq(forumHelpDuplicateRelationships.id, relationship.id));
    });
  }

  async appealHelpDuplicate(topicId: string, actorId: string, explanation: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId, authorId: forumTopics.authorId })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
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
        .for("update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");
      const [pending] = await tx
        .select({ id: forumHelpDuplicateAppeals.id })
        .from(forumHelpDuplicateAppeals)
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ))
        .for("update");
      if (pending) throw new ForumStateConflictError("duplicate appeal is already pending");

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
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx
        .select({ id: forumTopics.id, sectionId: forumTopics.sectionId })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
      if (topic.sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumStateConflictError("duplicate appeals are only available for Help & solutions questions");
      }
      const [relationship] = await tx
        .select({ id: forumHelpDuplicateRelationships.id })
        .from(forumHelpDuplicateRelationships)
        .where(and(
          eq(forumHelpDuplicateRelationships.duplicateTopicId, topicId),
          isNull(forumHelpDuplicateRelationships.removedAt),
        ))
        .for("update");
      if (!relationship) throw new ForumStateConflictError("question is not a confirmed duplicate");
      const [appeal] = await tx
        .select({ id: forumHelpDuplicateAppeals.id })
        .from(forumHelpDuplicateAppeals)
        .where(and(
          eq(forumHelpDuplicateAppeals.relationshipId, relationship.id),
          eq(forumHelpDuplicateAppeals.status, "pending"),
        ))
        .for("update");
      if (!appeal) throw new ForumStateConflictError("duplicate appeal is not pending");

      const resolvedAt = sql`now()`;
      await tx.update(forumHelpDuplicateAppeals)
        .set({ status: resolution, resolvedByUserId: actorId, resolvedAt })
        .where(eq(forumHelpDuplicateAppeals.id, appeal.id));
      if (resolution === "accepted") {
        await tx.update(forumHelpDuplicateRelationships)
          .set({ removedByUserId: actorId, removedAt: resolvedAt })
          .where(eq(forumHelpDuplicateRelationships.id, relationship.id));
      }
    });
  }

  async markTopicSolved(topicId: string, actorId: string, scope: SolutionManagementScope = "own"): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [topic] = await tx.select({
        authorId: forumTopics.authorId,
        sectionId: forumTopics.sectionId,
        isSolved: forumTopics.isSolved,
      }).from(forumTopics)
        .where(eq(forumTopics.id, topicId)).for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
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
        })
        .from(forumTopics)
        .where(eq(forumTopics.id, topicId))
        .for("update");
      if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
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
      if (
        topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID
        && topic.bestAnswerPostId !== postId
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

  async reviseTopicTitle(topicId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    return this.database.transaction(async (tx) => {
      await tx.insert(forumTopicTitleRevisions).values({ ...revision, topicId, authorId });
      const updated = await tx.update(forumTopics)
        .set({ currentTitleRevisionId: revision.id })
        .where(and(eq(forumTopics.id, topicId), eq(forumTopics.currentTitleRevisionId, expectedRevisionId)))
        .returning({ id: forumTopics.id });
      if (updated.length === 0) throw new ConcurrentRevisionError("topic title current revision changed");
      return revision;
    });
  }

  async revisePostBody(postId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    return this.database.transaction(async (tx) => {
      await tx.insert(forumPostRevisions).values({ ...revision, postId, authorId });
      const updated = await tx.update(forumPosts)
        .set({ currentRevisionId: revision.id })
        .where(and(eq(forumPosts.id, postId), eq(forumPosts.currentRevisionId, expectedRevisionId)))
        .returning({ id: forumPosts.id });
      if (updated.length === 0) throw new ConcurrentRevisionError("post body current revision changed");
      return revision;
    });
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
  await tx.select({ id: user.id }).from(user).where(eq(user.id, authorId)).for("update");
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
  // Signal submissions use the same bounded write policy, but keep their
  // cooldown independent from normal topic/reply authoring.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, actorId)).for("update");
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
