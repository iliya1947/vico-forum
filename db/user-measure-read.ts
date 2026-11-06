import type { Pool, PoolClient } from "pg";
import { PostgresAuthorizationRepository } from "./authorization-repository";
import { assertUserMeasureAuthority, requireUserMeasureOwnerId } from "./user-measure-authority";
import { UserMeasureNotFoundError, UserMeasureConflictError } from "./user-measures";
import type { UserMeasureRestrictionId } from "../app/admin/user-measure-restrictions";

export type UserMeasureDisplayStatus = "active" | "expired" | "lifted";
export type UserMeasureAppealDisplayStatus = "pending" | "rejected" | "accepted" | "moot";
export type MeasureHistoryAction =
  "measure.created" | "measure.changed" | "measure.lifted" | "measure.appealResolved";
export interface UserMeasureSummary {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  liftedAt: string | null;
  version: number;
  initialReason: string;
  latestChangeReason: string | null;
  status: UserMeasureDisplayStatus;
  restrictions: UserMeasureRestrictionId[];
  usedAppeals: number;
  pendingAppeal: boolean;
}
export interface UserMeasureAppealView {
  id: string; ordinal: number; body: string; status: UserMeasureAppealDisplayStatus;
  createdAt: string; resolvedAt: string | null;
  explanation: string | null; remedy: "change" | "lift" | null;
}
export interface UserMeasureTimelineState {
  version: number; restrictions: UserMeasureRestrictionId[];
  expiresAt: string | null; lifted: boolean;
}
export interface UserMeasureTimelineEvent {
  action: MeasureHistoryAction; occurredAt: string; reason: string | null;
  before: UserMeasureTimelineState | null; after: UserMeasureTimelineState;
  outcome: "accepted" | "rejected" | null; remedy: "change" | "lift" | null;
}
export interface UserMeasureDetail extends UserMeasureSummary {
  appeals: UserMeasureAppealView[];
  timeline: UserMeasureTimelineEvent[];
}
export interface UserMeasureTargetView {
  id: string; name: string; measures: UserMeasureSummary[];
}

interface MeasureRow {
  id: string; created_at: Date; expires_at: Date | null; lifted_at: Date | null;
  version: number; initial_reason: string; latest_change_reason: string | null;
  status: UserMeasureDisplayStatus; used_appeals: number; pending_appeal: boolean;
}
interface AppealRow {
  id: string; ordinal: number; body: string; status: UserMeasureAppealDisplayStatus;
  created_at: Date; resolved_at: Date | null;
  reviewer_explanation: string | null; remedy: "change" | "lift" | null;
}
interface HistoryRow {
  action: MeasureHistoryAction; occurred_at: Date; reason: string | null;
  before_version: string | null; after_version: string;
  before_restrictions: UserMeasureRestrictionId[] | null;
  after_restrictions: UserMeasureRestrictionId[] | null;
  before_expiry: string | null; after_expiry: string | null;
  before_lifted: string | null; after_lifted: string | null;
  outcome: "accepted" | "rejected" | null; remedy: "change" | "lift" | null;
}

/**
 * A purpose-built allowlist projection. Never return user_measures.*, appeal reviewer_user_id,
 * admin_history actor_id/actor_label, or raw context to the subject's route data.
 */
export class PostgresUserMeasureReader {
  constructor(private readonly pool: Pool, private readonly ownerUserId: string | undefined) {}

  async ownList(subjectId: string): Promise<UserMeasureSummary[]> {
    return this.read(client => this.listForSubject(client, subjectId));
  }

  async ownDetail(subjectId: string, measureId: string): Promise<UserMeasureDetail> {
    return this.read(async client => {
      const belongs = await client.query<{ id: string }>(
        "select id from user_measures where id=$1 and target_user_id=$2",
        [measureId, subjectId],
      );
      if (!belongs.rows[0]) throw new UserMeasureNotFoundError("measure not found");
      return this.detailForMeasure(client, measureId);
    });
  }

  /** Independent blocks.manage authority grants no broad user directory snapshot. */
  async adminTarget(actorId: string, targetId: string): Promise<UserMeasureTargetView> {
    return this.adminRead(actorId, targetId, async client => {
      const users = await client.query<{ id: string; name: string }>(
        'select id,name from "user" where id=$1', [targetId],
      );
      if (!users.rows[0]) throw new UserMeasureNotFoundError("target not found");
      return { id: users.rows[0].id, name: users.rows[0].name,
        measures: await this.listForSubject(client, targetId) };
    });
  }

  async adminDetail(actorId: string, measureId: string): Promise<UserMeasureDetail & { targetUserId: string; targetName: string }> {
    return this.adminRead(actorId, null, async client => {
      // The actual authority guard is performed inside adminRead after the target pointer.
      const row = await client.query<{ target_user_id: string; name: string }>(
        `select m.target_user_id, u.name from user_measures m
          join "user" u on u.id=m.target_user_id where m.id=$1`, [measureId],
      );
      if (!row.rows[0]) throw new UserMeasureNotFoundError("measure not found");
      return {
        ...(await this.detailForMeasure(client, measureId)),
        targetUserId: row.rows[0].target_user_id,
        targetName: row.rows[0].name,
      };
    }, measureId);
  }

  private async adminRead<T>(
    actorId: string, targetId: string | null, task: (client: PoolClient) => Promise<T>, measureId?: string,
  ): Promise<T> {
    const ownerId = requireUserMeasureOwnerId(this.ownerUserId);
    return this.read(async client => {
      const lock = await client.query("select id from authz_mutation_lock where id=1 for update");
      if (lock.rowCount !== 1) throw new UserMeasureConflictError("authorization lock missing");
      let subject = targetId;
      if (measureId) {
        const rows = await client.query<{ target_user_id: string }>(
          "select target_user_id from user_measures where id=$1", [measureId],
        );
        if (!rows.rows[0]) throw new UserMeasureNotFoundError("measure not found");
        subject = rows.rows[0].target_user_id;
      }
      if (!subject) throw new UserMeasureNotFoundError("target not found");
      const authorization = new PostgresAuthorizationRepository(this.pool, ownerId);
      const [actor, target] = await Promise.all([
        authorization.resolveUser(actorId, client),
        authorization.resolveUser(subject, client),
      ]);
      assertUserMeasureAuthority({
        actorId, targetUserId: subject, ownerUserId: ownerId,
        actorRawPermissions: new Set(actor.effectivePermissions),
        targetRawPermissions: new Set(target.effectivePermissions),
      });
      return task(client);
    }, false);
  }

  private async listForSubject(client: PoolClient, subjectId: string): Promise<UserMeasureSummary[]> {
    const rows = await client.query<MeasureRow>(`select m.id,m.created_at,m.expires_at,m.lifted_at,
      m.version,m.initial_reason,m.latest_change_reason,
      case when m.lifted_at is not null then 'lifted'
        when m.expires_at is not null and m.expires_at <= clock_timestamp() then 'expired'
        else 'active' end as status,
      (select count(*)::int from user_measure_appeals a where a.measure_id=m.id) as used_appeals,
      exists (select 1 from user_measure_appeals a where a.measure_id=m.id
        and a.status='pending' and m.lifted_at is null
        and (m.expires_at is null or m.expires_at>clock_timestamp())) as pending_appeal
      from user_measures m where m.target_user_id=$1 order by m.created_at desc,m.id desc`, [subjectId]);
    return Promise.all(rows.rows.map(async row => this.summary(client, row)));
  }

  private async summary(client: PoolClient, row: MeasureRow): Promise<UserMeasureSummary> {
    const restrictions = await client.query<{ restriction_key: UserMeasureRestrictionId }>(
      `select restriction_key from user_measure_restrictions where measure_id=$1 and enabled
        order by restriction_key`, [row.id],
    );
    return {
      id: row.id, createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at?.toISOString() ?? null, liftedAt: row.lifted_at?.toISOString() ?? null,
      version: row.version, initialReason: row.initial_reason,
      latestChangeReason: row.latest_change_reason, status: row.status,
      restrictions: restrictions.rows.map(x => x.restriction_key),
      usedAppeals: row.used_appeals, pendingAppeal: row.pending_appeal,
    };
  }

  private async detailForMeasure(client: PoolClient, measureId: string): Promise<UserMeasureDetail> {
    const list = await client.query<{ target_user_id: string }>(
      "select target_user_id from user_measures where id=$1", [measureId],
    );
    if (!list.rows[0]) throw new UserMeasureNotFoundError("measure not found");
    const summaries = await this.listForSubject(client, list.rows[0].target_user_id);
    const summary = summaries.find(x => x.id === measureId);
    if (!summary) throw new UserMeasureNotFoundError("measure not found");
    const appeals = await client.query<AppealRow>(`select a.id,a.ordinal,a.body,a.created_at,a.resolved_at,
      a.reviewer_explanation,a.remedy,
      case when a.status='pending' and (m.lifted_at is not null or
        (m.expires_at is not null and m.expires_at <= clock_timestamp())) then 'moot'
        else a.status end as status
      from user_measure_appeals a join user_measures m on m.id=a.measure_id
      where a.measure_id=$1 order by a.ordinal`, [measureId]);
    const events = await client.query<HistoryRow>(`select action,occurred_at,reason,
      context #>> '{before,version}' as before_version,
      context #>> '{after,version}' as after_version,
      context #> '{before,restrictions}' as before_restrictions,
      context #> '{after,restrictions}' as after_restrictions,
      context #>> '{before,expiresAt}' as before_expiry,
      context #>> '{after,expiresAt}' as after_expiry,
      context #>> '{before,lifted}' as before_lifted,
      context #>> '{after,lifted}' as after_lifted,
      context->>'outcome' as outcome,context->>'remedy' as remedy
      from admin_history where target_type='user-measure' and target_id=$1 order by position`, [measureId]);
    return {
      ...summary,
      appeals: appeals.rows.map(a => ({
        id:a.id,ordinal:a.ordinal,body:a.body,status:a.status,
        createdAt:a.created_at.toISOString(),resolvedAt:a.resolved_at?.toISOString()??null,
        explanation:a.reviewer_explanation,remedy:a.remedy,
      })),
      timeline: events.rows.map(e => ({
        action:e.action, occurredAt:e.occurred_at.toISOString(),reason:e.reason,
        before:e.before_version === null ? null : {
          version:Number(e.before_version),
          restrictions:e.before_restrictions ?? [],
          expiresAt:e.before_expiry, lifted:e.before_lifted === "true",
        },
        after:{
          version:Number(e.after_version),
          restrictions:e.after_restrictions ?? [],
          expiresAt:e.after_expiry,lifted:e.after_lifted === "true",
        },
        outcome:e.outcome,remedy:e.remedy,
      })),
    };
  }

  private async read<T>(operation: (client: PoolClient) => Promise<T>, readonly = true): Promise<T> {
    const client = await this.pool.connect();
    let begun = false;
    try {
      await client.query(readonly ? "begin isolation level repeatable read read only" : "begin");
      begun = true;
      const result = await operation(client);
      await client.query("commit");
      begun = false;
      return result;
    } catch (error) {
      if (begun) { try { await client.query("rollback"); } catch { /* keep original error */ } }
      throw error;
    } finally {
      client.release();
    }
  }
}
