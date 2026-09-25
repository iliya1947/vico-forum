import { canonicalizeTranslationLocale } from "../app/localization/locale";
import {
  ConcurrentRevisionError,
  ForumAuthorizationError,
  ForumEntityNotFoundError,
  ForumStateConflictError,
  type CreatePostInput,
  type CreateTopicInput,
  type CreateTopicWithInitialPostInput,
  type DrizzleForumRepository,
  type ForumRevisionContent,
  type SolutionManagementScope,
} from "./forum-repository";

export class InvalidForumContentError extends Error {}

export type SourceLocaleCorrectionScope = "own" | "any";

export class ForumService {
  constructor(private readonly repository: DrizzleForumRepository) {}

  createCategory(input: { id: string; name: string }) {
    requireText(input.id, "category id");
    requireText(input.name, "category name");
    return this.repository.createCategory(input);
  }

  createSection(input: { id: string; categoryId: string; name: string }) {
    requireText(input.id, "section id");
    requireText(input.categoryId, "category id");
    requireText(input.name, "section name");
    return this.repository.createSection(input);
  }

  createTopic(input: CreateTopicInput) {
    validateEntity(input.id, input.authorId);
    requireText(input.sectionId, "section id");
    const titleRevision = normalizeRevision(input.titleRevision);
    return this.repository.createTopic({ ...input, titleRevision });
  }

  createPost(input: CreatePostInput) {
    validateEntity(input.id, input.authorId);
    requireText(input.topicId, "topic id");
    const bodyRevision = normalizeRevision(input.bodyRevision);
    return this.repository.createPost({ ...input, bodyRevision });
  }

  createTopicWithInitialPost(input: CreateTopicWithInitialPostInput) {
    validateEntity(input.id, input.authorId);
    requireText(input.sectionId, "section id");
    validateEntity(input.initialPost.id, input.initialPost.authorId);
    if (input.initialPost.topicId !== input.id || input.initialPost.authorId !== input.authorId) {
      throw new InvalidForumContentError("initial post must belong to the new topic and author");
    }
    return this.repository.createTopicWithInitialPost({
      ...input,
      titleRevision: normalizeRevision(input.titleRevision),
      initialPost: { ...input.initialPost, bodyRevision: normalizeRevision(input.initialPost.bodyRevision) },
    });
  }

  reviseTopicTitle(topicId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    validateEntity(topicId, authorId);
    requireText(expectedRevisionId, "expected revision id");
    return this.repository.reviseTopicTitle(topicId, expectedRevisionId, normalizeRevision(revision), authorId);
  }

  revisePostBody(postId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    validateEntity(postId, authorId);
    requireText(expectedRevisionId, "expected revision id");
    return this.repository.revisePostBody(postId, expectedRevisionId, normalizeRevision(revision), authorId);
  }

  async correctTopicTitleSourceLocale(input: {
    topicId: string;
    expectedRevisionId: string;
    sourceLocale: string;
    actorId: string;
    scope: SourceLocaleCorrectionScope;
  }) {
    validateEntity(input.topicId, input.actorId);
    requireText(input.expectedRevisionId, "expected revision id");
    validateSourceLocaleCorrectionScope(input.scope);
    const sourceLocale = normalizeCorrectedSourceLocale(input.sourceLocale);
    const topic = await this.repository.readTopic(input.topicId);
    if (!topic) throw new ForumEntityNotFoundError("topic does not exist");
    if (topic.title.id !== input.expectedRevisionId) {
      throw new ForumStateConflictError("topic title current revision changed");
    }
    assertSourceLocaleCorrectionAuthorized(topic.authorId, input.actorId, input.scope);
    if (topic.title.sourceLocale === sourceLocale) return;
    try {
      return await this.repository.reviseTopicTitle(
        input.topicId,
        input.expectedRevisionId,
        { id: crypto.randomUUID(), originalContent: topic.title.originalContent, sourceLocale },
        input.actorId,
      );
    } catch (error) {
      if (error instanceof ConcurrentRevisionError) {
        throw new ForumStateConflictError("topic title current revision changed");
      }
      throw error;
    }
  }

  async correctPostBodySourceLocale(input: {
    topicId: string;
    postId: string;
    expectedRevisionId: string;
    sourceLocale: string;
    actorId: string;
    scope: SourceLocaleCorrectionScope;
  }) {
    validateEntity(input.postId, input.actorId);
    requireText(input.topicId, "topic id");
    requireText(input.expectedRevisionId, "expected revision id");
    validateSourceLocaleCorrectionScope(input.scope);
    const sourceLocale = normalizeCorrectedSourceLocale(input.sourceLocale);
    const post = await this.repository.readPost(input.postId);
    if (!post || post.topicId !== input.topicId) {
      throw new ForumEntityNotFoundError("post does not exist in topic");
    }
    if (post.body.id !== input.expectedRevisionId) {
      throw new ForumStateConflictError("post body current revision changed");
    }
    assertSourceLocaleCorrectionAuthorized(post.authorId, input.actorId, input.scope);
    if (post.body.sourceLocale === sourceLocale) return;
    try {
      return await this.repository.revisePostBody(
        input.postId,
        input.expectedRevisionId,
        { id: crypto.randomUUID(), originalContent: post.body.originalContent, sourceLocale },
        input.actorId,
      );
    } catch (error) {
      if (error instanceof ConcurrentRevisionError) {
        throw new ForumStateConflictError("post body current revision changed");
      }
      throw error;
    }
  }

  readTopic(id: string) { return this.repository.readTopic(id); }
  readPost(id: string) { return this.repository.readPost(id); }
  readHierarchy(categoryId: string) { return this.repository.readHierarchy(categoryId); }
  markTopicSolved(topicId: string, actorId: string, scope: SolutionManagementScope = "own") {
    validateEntity(topicId, actorId);
    validateSolutionScope(scope);
    return this.repository.markTopicSolved(topicId, actorId, scope);
  }
  selectBestAnswer(topicId: string, postId: string, actorId: string, scope: SolutionManagementScope = "own") {
    validateEntity(topicId, actorId);
    requireText(postId, "post id");
    validateSolutionScope(scope);
    return this.repository.selectBestAnswer(topicId, postId, actorId, scope);
  }
}

function validateSolutionScope(scope: SolutionManagementScope) {
  if (scope !== "own" && scope !== "any") throw new InvalidForumContentError("solution scope is invalid");
}

function validateSourceLocaleCorrectionScope(scope: SourceLocaleCorrectionScope) {
  if (scope !== "own" && scope !== "any") {
    throw new InvalidForumContentError("source locale correction scope is invalid");
  }
}

function normalizeCorrectedSourceLocale(value: string): string {
  requireText(value, "source locale");
  const sourceLocale = canonicalizeTranslationLocale(value);
  if (!sourceLocale || sourceLocale === "und") {
    throw new InvalidForumContentError(
      "corrected source locale must be a canonicalizable non-und BCP-47 translation locale without formatting extensions",
    );
  }
  return sourceLocale;
}

function assertSourceLocaleCorrectionAuthorized(authorId: string, actorId: string, scope: SourceLocaleCorrectionScope) {
  if (scope === "own" && authorId !== actorId) {
    throw new ForumAuthorizationError("actor cannot correct another author's source locale");
  }
}

function validateEntity(id: string, authorId: string) {
  requireText(id, "entity id");
  requireText(authorId, "author id");
}

function normalizeRevision(revision: ForumRevisionContent): ForumRevisionContent {
  requireText(revision.id, "revision id");
  requireText(revision.originalContent, "original content");
  const sourceLocale = canonicalizeTranslationLocale(revision.sourceLocale);
  if (!sourceLocale) {
    throw new InvalidForumContentError(
      "source locale must be 'und' or one canonicalizable translation locale without formatting extensions",
    );
  }
  return { ...revision, sourceLocale };
}

function requireText(value: string, field: string) {
  if (value.trim().length === 0) throw new InvalidForumContentError(`${field} must not be blank`);
}
