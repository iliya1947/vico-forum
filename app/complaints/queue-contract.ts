import type { ComplaintReason } from "../../db/complaints-domain";

export const DEFAULT_COMPLAINT_REASON_PRIORITY = {
  spam: 1, harassment: 2, threats: 3, "fraud-phishing": 3,
  "malicious-content": 3, "personal-data": 3, impersonation: 2, other: 1,
} as const satisfies Record<ComplaintReason, number>;
export const COMPLAINT_QUEUE_PAGE_SIZE = 25;
export const COMPLAINT_ACTIVITY_SECONDS = 90;
export type ComplaintPriority = 1 | 2 | 3;
export interface ComplaintQueueCase {
  id: string; version: number; state: "open"; kind: "post" | "topic-title";
  topicId: string; postId: string | null; revisionId: string;
  topicTitle: string; topicLocale: string; excerpt: string; sourceLocale: string;
  topicDirection?: "ltr" | "rtl" | "auto"; excerptDirection?: "ltr" | "rtl" | "auto";
  reasons: Partial<Record<ComplaintReason, number>>; reportCount: number;
  firstReportedAt: string; lastReportedAt: string;
  automaticPriority: ComplaintPriority; priorityOverride: ComplaintPriority | null; priority: ComplaintPriority;
  activeElsewhere: boolean;
}
export interface ComplaintQueuePage {
  cases: ComplaintQueueCase[]; total: number; page: number; hasMore: boolean;
}
export interface ComplaintPriorityCommand {
  caseId: string; operationId: string; expectedVersion: number; priority: number | null;
}

export type ComplaintPriorityWeights = Record<ComplaintReason, ComplaintPriority>;
export interface ComplaintPrioritySettings { version: number; weights: ComplaintPriorityWeights }
export interface ComplaintPrioritySettingsCommand { expectedVersion: number; weights: ComplaintPriorityWeights }
