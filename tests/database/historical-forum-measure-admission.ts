/**
 * Explicit fixture-only admission for tests pinned to migrations predating AP-10.
 * Current-schema/production writers retain the authoritative PostgreSQL check.
 */
export async function historicalForumMeasureAdmission(): Promise<void> {}
