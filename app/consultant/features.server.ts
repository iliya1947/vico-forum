/** Runtime catalog keys remain server-only. Shared DTOs import only the erased type. */
export const CONSULTANT_FEATURES = ["search","help","sections","tags","popular","unanswered","bookmarks","filters","language","account","privacy","profile","notifications","unread","settings","watch","report","best-answer","hidden-content","signals","complaint-review","complaint-appeals","attachment-security","admin-overview","admin-forum","admin-users","admin-measures","admin-roles","admin-history","complaint-priorities","administrator-preferences","forum-roles","super-admin","select-best-answer","save-topic","translation-help","help-ask"] as const;
export type ConsultantFeature = typeof CONSULTANT_FEATURES[number];
export function isConsultantFeature(value: unknown): value is ConsultantFeature {
  return typeof value === "string" && (CONSULTANT_FEATURES as readonly string[]).includes(value);
}
