import type { RouterContextProvider } from "react-router";
import { USER_MEASURE_RESTRICTION_IDS, type UserMeasureRestrictionId } from "../admin/user-measure-restrictions";
import { UserMeasuresUnavailableError } from "../../db/hyperdrive-user-measures";
import { userMeasuresForRequest } from "./request-context";

/**
 * Request-scoped signed-in presentation only. On an AP-10 read outage keep public
 * reading available, but do not offer fresh writes; the authoritative writer
 * still checks PostgreSQL independently and denies on restriction/unavailability.
 */
export async function measureRestrictionsForPresentation(
  context: RouterContextProvider, subjectId: string,
): Promise<ReadonlySet<UserMeasureRestrictionId>> {
  try {
    return new Set(await userMeasuresForRequest(context).activeRestrictions(subjectId));
  } catch (error) {
    if (error instanceof UserMeasuresUnavailableError) return new Set(USER_MEASURE_RESTRICTION_IDS);
    throw error;
  }
}
