import { ComplaintStorageUnavailableError } from "./complaint-storage-error";
import type { Client } from "pg";
import { AccountStateUnavailableError } from "./account-state";
import { drizzle } from "drizzle-orm/node-postgres";
import { createWebClient, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { ComplaintsService } from "./complaints-service";
import { DrizzleComplaintsRepository } from "./complaints-repository";
import { withOwnerUserMeasureAdmission } from "./user-measure-policy";
import type { AuthorizationCapability } from "./authorization-service";
import type { ComplaintSubmission } from "../app/complaints/request-context";

export { ComplaintStorageUnavailableError } from "./complaint-storage-error";

export function createHyperdriveComplaintSubmission(connectionString: string, authorization: AuthorizationCapability,
  clientFactory: () => Client = () => createWebClient(connectionString), ownerUserId?: string): ComplaintSubmission {
  return {
    async submit(actorId, input) {
      const client = clientFactory();
      try {
        await client.connect();
        await new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client), undefined, withOwnerUserMeasureAdmission(ownerUserId)), authorization).submit(actorId, input);
      } catch (error) {
        if (isComplaintStorageUnavailable(error)) {
          throw new ComplaintStorageUnavailableError("complaint storage unavailable", { cause: error });
        }
        throw error;
      } finally { bestEffortDiscardClient(client); }
    },
  };
}

export function isComplaintStorageUnavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 16 && current && (typeof current === "object" || typeof current === "function") && !seen.has(current); depth++) {
    seen.add(current);
    if (current instanceof AccountStateUnavailableError || isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
