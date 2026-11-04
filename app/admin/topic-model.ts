import type { ForumTopicPage } from "../../db/forum-repository";

type SourcePost = ForumTopicPage["posts"][number];

export interface AdminTopicPost {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  parentPostId: string | null;
  createdAt: string;
  editedAt: string | null;
  body: SourcePost["body"];
  solutionModerationStatus: SourcePost["solutionModerationStatus"];
  solutionOutdatedReason: SourcePost["solutionOutdatedReason"];
  attachments: NonNullable<SourcePost["attachments"]>;
}

/** Explicit private admin projection; never serialize the full public reader result. */
export interface AdminTopic {
  id: string;
  title: ForumTopicPage["title"];
  section: ForumTopicPage["section"];
  authorName: string;
  isPinned: boolean;
  isSolved: boolean;
  bestAnswerPostId: string | null;
  needsDetails: boolean;
  duplicateOf: ForumTopicPage["duplicateOf"];
  duplicateRelationshipId: string | null;
  posts: AdminTopicPost[];
}

export function projectAdminTopic(topic: ForumTopicPage, canManageHelpDuplicate: boolean): AdminTopic {
  return {
    id: topic.id,
    title: topic.title,
    section: topic.section,
    authorName: topic.authorName,
    isPinned: topic.isPinned,
    isSolved: topic.isSolved,
    bestAnswerPostId: topic.bestAnswerPostId,
    needsDetails: topic.needsDetails,
    duplicateOf: topic.duplicateOf,
    duplicateRelationshipId: canManageHelpDuplicate ? topic.duplicateRelationshipId ?? null : null,
    posts: topic.posts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      authorName: post.authorName,
      authorImage: post.authorImage ?? null,
      parentPostId: post.parentPostId,
      createdAt: new Date(post.createdAt).toISOString(),
      editedAt: post.editedAt ? new Date(post.editedAt).toISOString() : null,
      body: post.body,
      solutionModerationStatus: post.solutionModerationStatus,
      solutionOutdatedReason: post.solutionOutdatedReason,
      attachments: post.attachments ?? [],
    })),
  };
}
