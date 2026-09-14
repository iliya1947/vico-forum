import { canonicalizeTranslationLocale } from "../app/localization/locale";
import type {
  CreatePostInput,
  CreateTopicInput,
  CreateTopicWithInitialPostInput,
  DrizzleForumRepository,
  ForumRevisionContent,
} from "./forum-repository";

export class InvalidForumContentError extends Error {}

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

  readTopic(id: string) { return this.repository.readTopic(id); }
  readPost(id: string) { return this.repository.readPost(id); }
  readHierarchy(categoryId: string) { return this.repository.readHierarchy(categoryId); }
  markTopicSolved(topicId: string, actorId: string) {
    validateEntity(topicId, actorId);
    return this.repository.markTopicSolved(topicId, actorId);
  }
  selectBestAnswer(topicId: string, postId: string, actorId: string) {
    validateEntity(topicId, actorId);
    requireText(postId, "post id");
    return this.repository.selectBestAnswer(topicId, postId, actorId);
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
