/**
 * Snapshot of every request-scoped context registered by the current Worker.
 * The associated test compares this list against workers/app.ts and
 * initializeAuthContext, so additions fail instead of falling through a
 * permissive "all capabilities succeeded" preview adapter.
 *
 * This is a contract inventory, NOT a claim that P2 has provided every value.
 */
export const P2_WORKER_CONTEXTS = [
  "requestAttemptCollectorContext",
  "forumReaderContext",
  "forumWriterContext",
  "forumAttachmentStoreContext",
  "privateAttachmentBucketContext",
  "registryLoaderContext",
  "uiTranslationStoreContext",
  "contentTranslationPresentationContext",
  "adminForumContext",
  "adminUsersContext",
  "adminHistoryContext",
  "authorizationOwnerContext",
  "registrationSettingsContext",
  "userLocaleWriterContext",
  "userPrivacyContext",
  "ownerSystemMonitoringContext",
  "ownerSa02MonitoringContext",
  "ownerNativeMonitoringContext",
  "ownerDataMonitoringContext",
  "ownerFilesMonitoringContext",
  "ownerLocalizationMonitoringContext",
  "ownerProfileContext",
  "ownerAccountLifecycleContext",
  "authorizationContext",
  "userMeasureContext",
  "complaintSubmissionContext",
  "complaintQueueContext",
  "complaintReviewContext",
  "complaintAppealContext",
  "contentGenerationAdmissionContext",
  "contentGenerationActionContext",
  "ownerIntegrationsMonitoringContext",
  "ownerOverviewMonitoringContext",
] as const;

export const P2_AUTH_CONTEXTS = ["authRuntimeContext", "authSessionContext"] as const;

export type P2ProductionContextName =
  | (typeof P2_WORKER_CONTEXTS)[number]
  | (typeof P2_AUTH_CONTEXTS)[number];

/** Only these are bound by the initial P2-B1 public read factory. */
export const P2_B1_CONFIGURED_CONTEXTS = [
  "forumReaderContext",
  "registryLoaderContext",
] as const satisfies readonly P2ProductionContextName[];
