import { sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { UserMeasureRestrictionId } from "../app/admin/user-measure-restrictions";

type ForumTransaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

export class UserMeasureRestrictedError extends Error {
  constructor(readonly restriction: UserMeasureRestrictionId) {
    super("user measure prohibits this action");
    this.name = "UserMeasureRestrictedError";
  }
}

/**
 * Authoritative transaction-local admission. Overlapping measures are independent:
 * one enabled child restriction on any active measure is sufficient to deny.
 * DB clock determines natural expiry, and lifted measures have no effect.
 */
export async function assertNoActiveUserMeasureRestriction(
  tx: Pick<ForumTransaction, "execute">,
  subjectId: string,
  restriction: UserMeasureRestrictionId,
): Promise<void> {
  const result = await tx.execute<{ restricted: boolean }>(sql`
    select exists (
      select 1
      from user_measures as measure
      join user_measure_restrictions as child on child.measure_id = measure.id
      where measure.target_user_id = ${subjectId}
        and child.restriction_key = ${restriction}
        and child.enabled = true
        and measure.lifted_at is null
        and (measure.expires_at is null or measure.expires_at > clock_timestamp())
    ) as restricted
  `);
  if (result.rows[0]?.restricted === true) throw new UserMeasureRestrictedError(restriction);
}

/**
 * Equivalent native pg boundary for existing authorization and AP-10 measure
 * transactions, which already hold the serialized authz mutation lock.
 * Never opens another client or changes raw authority/manager accounting.
 */
export async function assertNoActiveUserMeasureRestrictionPg(
  client: Pick<PoolClient, "query">,
  subjectId: string,
  restriction: UserMeasureRestrictionId,
): Promise<void> {
  const result = await client.query<{ restricted: boolean }>(`
    select exists (
      select 1 from user_measures as measure
      join user_measure_restrictions as child on child.measure_id = measure.id
      where measure.target_user_id = $1
        and child.restriction_key = $2
        and child.enabled = true
        and measure.lifted_at is null
        and (measure.expires_at is null or measure.expires_at > clock_timestamp())
    ) as restricted
  `, [subjectId, restriction]);
  if (result.rows[0]?.restricted === true) throw new UserMeasureRestrictedError(restriction);
}
