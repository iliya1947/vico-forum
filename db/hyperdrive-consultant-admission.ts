import { assertActiveAccount, AccountStateUnavailableError } from "./account-state";
import { bestEffortDiscardClient, createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";

/** Reuse the native read-only AccountState guard on the current web database.
 * No actor, session credential or account data is returned. No write admission. */
export function createHyperdriveConsultantAdmission(connectionString: string, clientFactory = createWebClient) {
  return async (actorId: string): Promise<void> => {
    const client = clientFactory(connectionString);
    try {
      await client.connect();
      await assertActiveAccount(client, actorId);
    } catch (error) {
      if (error instanceof AccountStateUnavailableError || isPostgresAvailabilityFailure(error)
        || isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error)) {
        throw new AccountStateUnavailableError({ cause: error });
      }
      throw error;
    } finally { bestEffortDiscardClient(client); }
  };
}
