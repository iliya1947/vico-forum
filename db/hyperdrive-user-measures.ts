import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { PostgresUserMeasuresRepository, UserMeasuresService,
  type CreateUserMeasureInput, type ChangeUserMeasureInput, type LiftUserMeasureInput,
  type SubmitUserMeasureAppealInput, type ResolveUserMeasureAppealInput } from "./user-measures";
import { PostgresUserMeasureReader } from "./user-measure-read";
import type { UserMeasureCapability } from "../app/measures/request-context";

export class UserMeasuresUnavailableError extends Error {}

function unavailable(error: unknown) {
  return isPostgresAvailabilityFailure(error) ||
    isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error);
}

/** One bounded PostgreSQL pool per operation, including fresh active-session permission resolution. */
export function createHyperdriveUserMeasures(connectionString: string, ownerUserId?: string): UserMeasureCapability {
  async function run<T>(operation: (reader: PostgresUserMeasureReader, service: UserMeasuresService) => Promise<T>) {
    const pool = createWebPool(connectionString);
    try {
      return await operation(
        new PostgresUserMeasureReader(pool, ownerUserId),
        new UserMeasuresService(new PostgresUserMeasuresRepository(pool, ownerUserId)),
      );
    } catch (error) {
      if (unavailable(error)) throw new UserMeasuresUnavailableError("User measures unavailable", { cause: error });
      throw error;
    } finally {
      bestEffortDiscardClient(pool);
    }
  }
  return {
    ownList: subjectId => run(reader => reader.ownList(subjectId)),
    ownDetail: (subjectId, measureId) => run(reader => reader.ownDetail(subjectId, measureId)),
    adminTarget: (actorId, targetId) => run(reader => reader.adminTarget(actorId, targetId)),
    adminPendingAppeals: (actorId, page) => run(reader => reader.adminPendingAppeals(actorId, page)),
    adminDetail: (actorId, measureId) => run(reader => reader.adminDetail(actorId, measureId)),
    create: (input: CreateUserMeasureInput) => run((_, service) => service.create(input)),
    change: (input: ChangeUserMeasureInput) => run((_, service) => service.change(input)),
    lift: (input: LiftUserMeasureInput) => run((_, service) => service.lift(input)),
    submitAppeal: (input: SubmitUserMeasureAppealInput) => run((_, service) => service.submitAppeal(input)),
    resolveAppeal: (input: ResolveUserMeasureAppealInput) => run((_, service) => service.resolveAppeal(input)),
  };
}
