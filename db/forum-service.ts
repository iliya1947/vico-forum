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
    validateRevision(input.titleRevision);
    return this.repository.createTopic(input);
  }

  createPost(input: CreatePostInput) {
    validateEntity(input.id, input.authorId);
    validateRevision(input.bodyRevision);
    return this.repository.createPost(input);
  }

  reviseTopicTitle(topicId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    validateEntity(topicId, authorId);
    requireText(expectedRevisionId, "expected revision id");
    validateRevision(revision);
    return this.repository.reviseTopicTitle(topicId, expectedRevisionId, revision, authorId);
  }

  revisePostBody(postId: string, expectedRevisionId: string, revision: ForumRevisionContent, authorId: string) {
    validateEntity(postId, authorId);
    requireText(expectedRevisionId, "expected revision id");
    validateRevision(revision);
    return this.repository.revisePostBody(postId, expectedRevisionId, revision, authorId);
  }

  readTopic(id: string) { return this.repository.readTopic(id); }
  readPost(id: string) { return this.repository.readPost(id); }
  readHierarchy(categoryId: string) { return this.repository.readHierarchy(categoryId); }
}

function validateEntity(id: string, authorId: string) {
  requireText(id, "entity id");
  requireText(authorId, "author id");
}

function validateRevision(revision: ForumRevisionContent) {
  requireText(revision.id, "revision id");
  requireText(revision.originalContent, "original content");
  if (revision.sourceLocale === "und") return;
  try {
    const canonical = Intl.getCanonicalLocales(revision.sourceLocale);
    if (canonical.length !== 1 || canonical[0] !== revision.sourceLocale) throw new Error("not canonical");
  } catch {
    throw new InvalidForumContentError("source locale must be 'und' or one canonical BCP-47 tag");
  }
}

function requireText(value: string, field: string) {
  if (value.trim().length === 0) throw new InvalidForumContentError(`${field} must not be blank`);
}
