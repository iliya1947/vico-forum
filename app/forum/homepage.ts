export interface HomepageTopicSummary {
  id: string;
  title: string;
  authorName: string;
  activityAt: string;
}

export interface HomepageCategoryOverview {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sectionCount: number;
  topicCount: number;
  messageCount: number;
  pinnedTopics: readonly HomepageTopicSummary[];
  latestTopics: readonly HomepageTopicSummary[];
}

export const HOMEPAGE_COMPACT_PINNED_LIMIT = 3;
export const HOMEPAGE_COMPACT_LATEST_LIMIT = 2;
