import type { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createWebClient, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { ComplaintsService } from "./complaints-service";
import { DrizzleComplaintsRepository } from "./complaints-repository";
import type { AuthorizationCapability } from "./authorization-service";
import type { ComplaintSubmission } from "../app/complaints/request-context";

export class ComplaintStorageUnavailableError extends Error {}

export function createHyperdriveComplaintSubmission(connectionString: string, authorization: AuthorizationCapability,
  clientFactory: () => Client = () => createWebClient(connectionString)): ComplaintSubmission {
  return {
    async submit(actorId, input) {
      const client = clientFactory();
      try {
        await client.connect();
        await new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)), authorization).submit(actorId, input);
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
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
