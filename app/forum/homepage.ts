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

export interface HomepageOverview {
  categories: readonly HomepageCategoryOverview[];
  referenceTime: string;
}

export const HOMEPAGE_COMPACT_TOPIC_LIMIT = 2;
