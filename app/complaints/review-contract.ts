import type { ComplaintOutcome, ComplaintReason } from "../../db/complaints-domain";
import type { ComplaintPriority } from "./queue-contract";

export const COMPLAINT_REVIEW_PAGE_SIZE = 50;
export const COMPLAINT_CONTEXT_PAGE_SIZE = 25;
export interface ReviewPages { reports: number; notes: number; evidence: number; context: number }
export interface ReviewPage<T> { items: T[]; total: number; page: number; hasMore: boolean }
export interface ReviewSource { revisionId: string; originalContent: string; sourceLocale: string; createdAt: string }
export interface ReviewReport {
  id: string; reason: ComplaintReason; explanation: string | null; createdAt: string;
  reporter?: { id: string; name: string };
}
export interface ReviewNote { id: string; body: string; author: { id: string; name: string }; createdAt: string }
export interface ReviewEvidence { id: string; fileName: string; byteSize: number; detectedType: string }
export interface ReviewContextPost {
  id: string; number: number; author: { id: string; name: string };
  createdAt: string; excerpt: string; truncated: boolean; sourceLocale: string;
}
export interface ReviewTopic {
  id: string; title: ReviewSource; authorId: string; sectionId: string;
  isPinned: boolean; isSolved: boolean; bestAnswerPostId: string | null;
  duplicateRelationshipId: string | null; duplicateOf: { id: string } | null;
  bestAnswer: { id: string; solutionModerationStatus: "needs-review" | "outdated" | null; solutionOutdatedReason: string | null } | null;
  pendingHelpDuplicateAppeal: { id: string } | null;
}
export interface ReviewCapability {
  pin: boolean; solution: boolean; duplicate: boolean; sourceLocale: boolean;
  solutionModeration: boolean; identity: boolean;
}
export interface ReviewCase {
  id: string; previousCaseId: string | null; state: "open" | "resolved"; version: number;
  kind: "post" | "topic-title"; targetId: string; topicId: string; postId: string | null;
  reported: ReviewSource; current: ReviewSource;
  currentTopicTitle: ReviewSource; targetPresent: boolean;
  automaticPriority: ComplaintPriority; priorityOverride: ComplaintPriority | null; priority: ComplaintPriority;
  reports: ReviewPage<ReviewReport>; independentReporterCount: number;
  notes: ReviewPage<ReviewNote>; evidence: ReviewPage<ReviewEvidence>;
  context: ReviewPage<ReviewContextPost>; topic: ReviewTopic;
  decision: { id: string; outcome: ComplaintOutcome; reasoning: string; createdAt: string; reviewerName: string } | null;
  permissions: ReviewCapability;
}
export interface ReviewFullPost {
  id: string; topicId: string; number: number; source: ReviewSource;
  author: { id: string; name: string };
}
