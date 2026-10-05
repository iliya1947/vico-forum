export interface HomepageSectionSummary {
  id: string;
  name: string;
  topicCount: number;
  messageCount: number;
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
