export const UNDER_DEVELOPMENT_FEATURES = [
  { id: "notifications", labelKey: "underDevelopmentFeatureNotifications" },
  { id: "registration", labelKey: "underDevelopmentFeatureRegistration" },
  { id: "pinned-topics", labelKey: "underDevelopmentFeaturePinnedTopics" },
  { id: "drafts", labelKey: "underDevelopmentFeatureDrafts" },
  { id: "profiles", labelKey: "underDevelopmentFeatureProfiles" },
  { id: "editor", labelKey: "underDevelopmentFeatureEditor" },
  { id: "online-presence", labelKey: "underDevelopmentFeatureOnlinePresence" },
  { id: "rules", labelKey: "underDevelopmentFeatureRules" },
  { id: "help", labelKey: "underDevelopmentFeatureHelp" },
  { id: "about", labelKey: "underDevelopmentFeatureAbout" },
  { id: "feedback", labelKey: "underDevelopmentFeatureFeedback" },
  { id: "privacy", labelKey: "underDevelopmentFeaturePrivacy" },
] as const;

export type UnderDevelopmentFeatureId = (typeof UNDER_DEVELOPMENT_FEATURES)[number]["id"];

export function isUnderDevelopmentFeatureId(value: string | null | undefined): value is UnderDevelopmentFeatureId {
  return UNDER_DEVELOPMENT_FEATURES.some((feature) => feature.id === value);
}
