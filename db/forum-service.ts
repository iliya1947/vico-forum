import { canonicalizeTranslationLocale } from "../app/localization/locale";
import type {
  CreatePostInput,
  CreateTopicInput,
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
