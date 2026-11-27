/** Shared forum domain errors without database constructors. */
export class ConcurrentRevisionError extends Error {}
export class ForumEntityNotFoundError extends Error {}
export class ForumAuthorizationError extends Error {}
export class ForumStateConflictError extends Error {}
export class ForumTopicClosedError extends ForumStateConflictError {}
export class ForumPublicationReplayConflictError extends ForumStateConflictError {}
export class InvalidForumContentError extends Error {}
export class ForumVisibilityReasonError extends Error {}
