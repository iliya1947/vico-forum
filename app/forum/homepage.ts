export interface HomepageTopicSummary {
  id: string;
  title: string;
  authorName: string;
  activityAt: string;
}

export interface HomepageSectionSummary {
  id: string;
  name: string;
  topicCount: number;
  messageCount: number;
  pinnedTopics: readonly HomepageTopicSummary[];
  latestTopics: readonly HomepageTopicSummary[];
}

export interface HomepageCategoryOverview {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sectionCount: number;
  topicCount: number;
  messageCount: number;
  sections: readonly HomepageSectionSummary[];
}
