import { sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { PoolClient } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  USER_MEASURE_ADMIN_PERMISSION_FAMILIES, USER_MEASURE_ADMIN_RESTRICTIONS,
  type UserMeasureRestrictionId,
} from "../app/admin/user-measure-restrictions";
import { BLOCK_MANAGE_PRIVILEGED_PERMISSION } from "./user-measure-authority";

type ForumTransaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

const administrativeRestrictions = new Set<string>(USER_MEASURE_ADMIN_RESTRICTIONS);
const rawAdministrativePermissions = [...new Set(Object.values(USER_MEASURE_ADMIN_PERMISSION_FAMILIES).flat())];
const pgDialect = new PgDialect();

export class UserMeasureRestrictedError extends Error {
  constructor(readonly restriction: UserMeasureRestrictionId) {
    super("user measure prohibits this action");
    this.name = "UserMeasureRestrictedError";
  }
}

/**
 * Shared authoritative EXISTS for Drizzle and native pg transactions. Administrative
 * families must use the target's current raw RBAC level, not its sanction-filtered
 * permissions. One statement sees grants/overrides and measures in the same DB snapshot.
 * Ordinary participation restrictions remain unconditional while their measure is active.
 */
function activeRestrictionQuery(
  subjectId: string, restriction: UserMeasureRestrictionId, ownerUserId?: string,
): SQL {
  const floorFilter = administrativeRestrictions.has(restriction) ? sql`
    and measure.issuer_authority_floor > (
      with raw_permissions as (
        select rp.permission_key
        from "user" u
        left join authz_user_roles ur on ur.user_id = u.id
        join authz_roles r on r.id = coalesce(
          ur.role_id, (select id from authz_roles where slug = 'user')
        )
        join authz_role_permissions rp on rp.role_id = r.id
        where u.id = ${subjectId}
        union
        select o.permission_key from authz_user_permission_overrides o
        where o.user_id = ${subjectId} and o.effect = 'allow'
        except
        select o.permission_key from authz_user_permission_overrides o
        where o.user_id = ${subjectId} and o.effect = 'deny'
      )
      select case
        when ${ownerUserId ?? ""} <> '' and ${subjectId} = ${ownerUserId ?? ""} then 3
        when exists (select 1 from raw_permissions
          where permission_key = ${BLOCK_MANAGE_PRIVILEGED_PERMISSION}) then 2
        when exists (select 1 from raw_permissions
          where permission_key = any(${rawAdministrativePermissions}::text[])) then 1
        else 0
      end
    )
  ` : sql``;

  return sql`
    select exists (
      select 1
      from user_measures as measure
      join user_measure_restrictions as child on child.measure_id = measure.id
      where measure.target_user_id = ${subjectId}
        and child.restriction_key = ${restriction}
        and child.enabled = true
        and measure.lifted_at is null
        and (measure.expires_at is null or measure.expires_at > clock_timestamp())
        ${floorFilter}
    ) as restricted
  `;
}

/**
 * Authoritative transaction-local admission. Overlapping measures are independent:
 * one applicable enabled child restriction on any active measure is sufficient to deny.
 */
export async function assertNoActiveUserMeasureRestriction(
  tx: Pick<ForumTransaction, "execute">,
  subjectId: string,
  restriction: UserMeasureRestrictionId,
  ownerUserId?: string,
): Promise<void> {
  const result = await tx.execute<{ restricted: boolean }>(
    activeRestrictionQuery(subjectId, restriction, ownerUserId),
  );
  if (result.rows[0]?.restricted === true) throw new UserMeasureRestrictedError(restriction);
}

/** Native pg uses the exact same parameterized SQL as the Drizzle direct writers. */
export async function assertNoActiveUserMeasureRestrictionPg(
  client: Pick<PoolClient, "query">,
  subjectId: string,
  restriction: UserMeasureRestrictionId,
  ownerUserId?: string,
): Promise<void> {
  const query = pgDialect.sqlToQuery(activeRestrictionQuery(subjectId, restriction, ownerUserId));
  const result = await client.query<{ restricted: boolean }>(query.sql, query.params);
  if (result.rows[0]?.restricted === true) throw new UserMeasureRestrictedError(restriction);
}
