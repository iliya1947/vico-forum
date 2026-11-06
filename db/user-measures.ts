import type { Pool, PoolClient } from "pg";
import { validateUserMeasureRestrictions, type UserMeasureRestrictionId } from "../app/admin/user-measure-restrictions";
import { appendUserMeasureHistory, type UserMeasureHistoryState } from "./admin-history";
import { PostgresAuthorizationRepository } from "./authorization-repository";
import { assertNoActiveUserMeasureRestrictionPg } from "./user-measure-policy";
import { assertUserMeasureAuthority, assertUserMeasureAdminRestrictionsAuthority,
  requireUserMeasureOwnerId, UserMeasureForbiddenError } from "./user-measure-authority";

export class InvalidUserMeasureInputError extends Error {}
export class UserMeasureNotFoundError extends Error {}
export class UserMeasureConflictError extends Error {}

export interface CreateUserMeasureInput {
  id: unknown; actorId: unknown; targetUserId: unknown;
  reason: unknown; restrictions: unknown; expiresAt: unknown;
}
export interface ChangeUserMeasureInput {
  measureId: unknown; operationId: unknown; actorId: unknown;
  expectedVersion: unknown; reason: unknown;
  restrictions: unknown; expiresAt: unknown;
}
export interface LiftUserMeasureInput {
  measureId: unknown; operationId: unknown; actorId: unknown;
  expectedVersion: unknown; reason: unknown;
}

export interface SubmitUserMeasureAppealInput {
  id: unknown; measureId: unknown; actorId: unknown; body: unknown;
}
export interface ResolveUserMeasureAppealInput {
  measureId: unknown; appealId: unknown; operationId: unknown; actorId: unknown;
  expectedVersion: unknown; outcome: unknown; explanation: unknown; remedy: unknown;
  restrictions: unknown; expiresAt: unknown;
}
export interface UserMeasureAppealSubmissionResult {
  id: string; measureId: string; ordinal: number;
}
export interface UserMeasureAppealResolutionResult {
  appealId: string; measureId: string; outcome: "accepted" | "rejected";
  version: number; remedy: "change" | "lift" | null;
}
type AppealOutcome = "accepted" | "rejected";
type AppealRemedy = "change" | "lift" | null;
interface ValidatedAppealSubmission {
  id: string; measureId: string; actorId: string; body: string;
}
interface ValidatedAppealResolution {
  measureId: string; appealId: string; operationId: string; actorId: string;
  expectedVersion: number; outcome: AppealOutcome; explanation: string;
  remedy: AppealRemedy; restrictions: UserMeasureRestrictionId[] | null;
  expiresAt: string | null; fingerprint: string;
}
interface LockedAppeal {
  id: string; measure_id: string; subject_user_id: string; ordinal: number;
  body: string; status: "pending" | "rejected" | "accepted" | "moot";
}
interface AppliedTransition {
  changed: boolean; before: UserMeasureHistoryState; after: UserMeasureHistoryState;
}

export interface MeasureCreateResult { id: string; version: 1 }
export interface MeasureTransitionResult { id: string; version: number; changed: boolean }

interface ValidatedCreate {
  id: string; actorId: string; targetUserId: string; reason: string;
  restrictions: UserMeasureRestrictionId[]; expiresAt: string | null; fingerprint: string;
}
interface ValidatedChange {
  measureId: string; operationId: string; actorId: string; expectedVersion: number;
  reason: string; restrictions: UserMeasureRestrictionId[]; expiresAt: string | null; fingerprint: string;
}
interface ValidatedLift {
  measureId: string; operationId: string; actorId: string;
  expectedVersion: number; reason: string; fingerprint: string;
}
interface LockedMeasure {
  id: string; target_user_id: string; issuer_authority_floor: number;
  version: number; expires_at: Date | null; lifted_at: Date | null;
}
interface LockedTarget { id: string; name: string }

/** Distinct client-supplied UUID is the create-operation idempotency identity. */
export class UserMeasuresService {
  constructor(private readonly repository: PostgresUserMeasuresRepository) {}

  async create(input: CreateUserMeasureInput): Promise<MeasureCreateResult> {
    const id = uuid(input.id, "measure id");
    const actorId = identity(input.actorId, "actor id");
    const targetUserId = identity(input.targetUserId, "target id");
    const reason = explanation(input.reason);
    const restrictions = restrictionSet(input.restrictions);
    const expiresAt = instant(input.expiresAt);
    const fingerprint = await digest(["create", id, actorId, targetUserId, reason, restrictions, expiresAt]);
    return this.repository.create({ id, actorId, targetUserId, reason, restrictions, expiresAt, fingerprint });
  }

  async change(input: ChangeUserMeasureInput): Promise<MeasureTransitionResult> {
    const measureId = uuid(input.measureId, "measure id");
    const operationId = uuid(input.operationId, "operation id");
    const actorId = identity(input.actorId, "actor id");
    const expectedVersion = version(input.expectedVersion);
    const reason = explanation(input.reason);
    const restrictions = restrictionSet(input.restrictions);
    const expiresAt = instant(input.expiresAt);
    const fingerprint = await digest(["change", measureId, operationId, actorId, expectedVersion, reason, restrictions, expiresAt]);
    return this.repository.change({ measureId, operationId, actorId, expectedVersion, reason, restrictions, expiresAt, fingerprint });
  }

  async lift(input: LiftUserMeasureInput): Promise<MeasureTransitionResult> {
    const measureId = uuid(input.measureId, "measure id");
    const operationId = uuid(input.operationId, "operation id");
    const actorId = identity(input.actorId, "actor id");
    const expectedVersion = version(input.expectedVersion);
    const reason = explanation(input.reason);
    const fingerprint = await digest(["lift", measureId, operationId, actorId, expectedVersion, reason]);
    return this.repository.lift({ measureId, operationId, actorId, expectedVersion, reason, fingerprint });
  }

  /** Caller passes the authenticated session subject; no admin capability is needed. */
  async submitAppeal(input: SubmitUserMeasureAppealInput): Promise<UserMeasureAppealSubmissionResult> {
    return this.repository.submitAppeal({
      id: uuid(input.id, "appeal id"),
      measureId: uuid(input.measureId, "measure id"),
      actorId: identity(input.actorId, "actor id"),
      body: explanation(input.body),
    });
  }

  async resolveAppeal(input: ResolveUserMeasureAppealInput): Promise<UserMeasureAppealResolutionResult> {
    const measureId = uuid(input.measureId, "measure id");
    const appealId = uuid(input.appealId, "appeal id");
    const operationId = uuid(input.operationId, "operation id");
    const actorId = identity(input.actorId, "actor id");
    const expectedVersion = version(input.expectedVersion);
    const outcome: AppealOutcome = input.outcome === "accepted" ? "accepted" :
      input.outcome === "rejected" ? "rejected" : invalidAppealDecision();
    const explanationText = explanation(input.explanation);
    const remedy: AppealRemedy =
      outcome === "rejected" ? null :
      input.remedy === "lift" ? "lift" : input.remedy === "change" ? "change" : invalidAppealDecision();
    if (outcome === "rejected" && input.remedy !== null) {
      throw new InvalidUserMeasureInputError("rejected appeal has no remedy");
    }
    if (remedy !== "change" && (input.restrictions !== null || input.expiresAt !== null)) {
      throw new InvalidUserMeasureInputError("only change remedy accepts restrictions and expiry");
    }
    const restrictions = remedy === "change" ? restrictionSet(input.restrictions) : null;
    const expiresAt = remedy === "change" ? instant(input.expiresAt) : null;
    const fingerprint = await digest([
      "appeal.resolve", measureId, appealId, operationId, actorId, expectedVersion,
      outcome, explanationText, remedy, restrictions, expiresAt,
    ]);
    return this.repository.resolveAppeal({
      measureId, appealId, operationId, actorId, expectedVersion, outcome,
      explanation: explanationText, remedy, restrictions, expiresAt, fingerprint,
    });
  }

}

export class PostgresUserMeasuresRepository {
  constructor(private readonly pool: Pool, private readonly ownerUserId: string | undefined) {}

  async create(input: ValidatedCreate): Promise<MeasureCreateResult> {
    return this.withAuthorityTransaction(async (client, ownerId) => {
      const target = await this.lockTarget(client, input.targetUserId);
      const issuerLevel = await this.authority(client, ownerId, input.actorId, target.id);

      // A committed create is a replay even after natural expiry or explicit lift.
      const prior = await client.query<{
        target_user_id: string; issuer_user_id: string; create_fingerprint: string;
      }>(`select target_user_id, issuer_user_id, create_fingerprint
          from user_measures where id = $1 for update`, [input.id]);
      if (prior.rows[0]) {
        const existing = prior.rows[0];
        if (existing.target_user_id !== target.id || existing.issuer_user_id !== input.actorId ||
            existing.create_fingerprint !== input.fingerprint) {
          throw new UserMeasureConflictError("measure id belongs to a different create request");
        }
        return { id: input.id, version: 1 };
      }
      await assertNoActiveUserMeasureRestrictionPg(client, input.actorId, "admin.usersAccess");
      assertUserMeasureAdminRestrictionsAuthority(issuerLevel, input.restrictions);

      await this.requireFutureExpiry(client, input.expiresAt);
      await client.query(`insert into user_measures
        (id, target_user_id, issuer_user_id, issuer_authority_floor, create_fingerprint, initial_reason, expires_at)
        values ($1,$2,$3,$4,$5,$6,$7::timestamptz)`,
      [input.id, target.id, input.actorId, issuerLevel, input.fingerprint, input.reason, input.expiresAt]);
      for (const restriction of input.restrictions) {
        await client.query(`insert into user_measure_restrictions(measure_id,restriction_key)
          values ($1,$2)`, [input.id, restriction]);
      }
      await appendUserMeasureHistory(client, input.actorId, {
        action: "measure.created", targetType: "user-measure", targetId: input.id, targetLabel: target.name,
        reason: input.reason,
        context: { targetUserId: target.id, before: null,
          after: state(1, input.restrictions, input.expiresAt, false) },
      });
      return { id: input.id, version: 1 };
    });
  }

  async change(input: ValidatedChange): Promise<MeasureTransitionResult> {
    return this.transition(input, "measure.changed");
  }

  async lift(input: ValidatedLift): Promise<MeasureTransitionResult> {
    return this.transition(input, "measure.lifted");
  }


  /** Submitted-appeal identity is exact to a measure; quota remains even after resolution. */
  async submitAppeal(input: ValidatedAppealSubmission): Promise<UserMeasureAppealSubmissionResult> {
    return this.withLockedTransaction(async client => {
      const { target, current } = await this.lockMeasure(client, input.measureId);
      if (target.id !== input.actorId) throw new UserMeasureForbiddenError();
      const prior = await client.query<LockedAppeal>(
        "select id, measure_id, subject_user_id, ordinal, body, status from user_measure_appeals where id=$1 for update",
        [input.id],
      );
      if (prior.rows[0]) {
        const existing = prior.rows[0];
        if (existing.measure_id !== current.id || existing.subject_user_id !== input.actorId ||
            existing.body !== input.body) {
          throw new UserMeasureConflictError("appeal ID is already committed with different input");
        }
        return { id: input.id, measureId: current.id, ordinal: existing.ordinal };
      }
      await this.assertActive(client, current);
      const quota = await client.query<{ submitted: number; max_ordinal: number | null; pending: boolean }>(
        `select count(*)::int as submitted, max(ordinal) as max_ordinal,
          coalesce(bool_or(status = 'pending'), false) as pending
          from user_measure_appeals where measure_id=$1`, [current.id],
      );
      const slots = quota.rows[0];
      if (!slots || slots.submitted >= 3 || slots.pending || (slots.max_ordinal ?? 0) >= 3) {
        throw new UserMeasureConflictError("appeal quota exhausted or another appeal is pending");
      }
      const ordinal = (slots.max_ordinal ?? 0) + 1;
      const inserted = await client.query(
        `insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body)
          values ($1,$2,$3,$4,$5)`, [input.id, current.id, input.actorId, ordinal, input.body],
      );
      if (inserted.rowCount !== 1) throw new UserMeasureConflictError("appeal insert failed");
      return { id: input.id, measureId: current.id, ordinal };
    });
  }

  /** Review shares exact-measure CAS with ordinary change/lift, never an independent remedy. */
  async resolveAppeal(input: ValidatedAppealResolution): Promise<UserMeasureAppealResolutionResult> {
    return this.withAuthorityTransaction(async (client, ownerId) => {
      const { target, current } = await this.lockMeasure(client, input.measureId);
      const issuerLevel = await this.authority(
        client, ownerId, input.actorId, target.id, current.issuer_authority_floor,
      );
      const result = await client.query<LockedAppeal>(
        `select id, measure_id, subject_user_id, ordinal, body, status
           from user_measure_appeals where id=$1 and measure_id=$2 for update`,
        [input.appealId, input.measureId],
      );
      const appeal = result.rows[0];
      if (!appeal || appeal.subject_user_id !== current.target_user_id) {
        throw new UserMeasureNotFoundError("appeal does not belong to this measure");
      }
      const prior = await this.committedOperation(client, input.measureId, input.operationId);
      if (prior) {
        if (prior.actor_id !== input.actorId || prior.action !== "measure.appealResolved" ||
            prior.context.fingerprint !== input.fingerprint ||
            prior.context.appealId !== input.appealId ||
            !Number.isSafeInteger(prior.context.after?.version)) {
          throw new UserMeasureConflictError("appeal review ID conflicts with a committed operation");
        }
        return { appealId: input.appealId, measureId: current.id,
          outcome: input.outcome, version: prior.context.after!.version as number, remedy: input.remedy };
      }
      await assertNoActiveUserMeasureRestrictionPg(client, input.actorId, "admin.usersAccess");
      if (appeal.status !== "pending") throw new UserMeasureConflictError("appeal has already been resolved");
      await this.assertActive(client, current);
      if (current.version !== input.expectedVersion) {
        throw new UserMeasureConflictError("measure version changed during review");
      }

      let before: UserMeasureHistoryState;
      let after: UserMeasureHistoryState;
      if (input.outcome === "rejected") {
        before = await this.measureState(client, current);
        after = before;
        const updated = await client.query(
          `update user_measure_appeals set status='rejected', reviewer_user_id=$2,
            resolved_at=clock_timestamp(), reviewer_explanation=$3, remedy=null
            where id=$1 and status='pending'`,
          [appeal.id, input.actorId, input.explanation],
        );
        if (updated.rowCount !== 1) throw new UserMeasureConflictError("appeal no longer pending");
      } else {
        const transition: ValidatedChange | ValidatedLift = input.remedy === "change"
          ? {
              measureId: current.id, operationId: input.operationId, actorId: input.actorId,
              expectedVersion: input.expectedVersion, reason: input.explanation,
              restrictions: input.restrictions!, expiresAt: input.expiresAt, fingerprint: input.fingerprint,
            }
          : {
              measureId: current.id, operationId: input.operationId, actorId: input.actorId,
              expectedVersion: input.expectedVersion, reason: input.explanation, fingerprint: input.fingerprint,
            };

        // Mark accepted before the shared lift primitive makes other pending appeals moot.
        // A later CAS/History failure rolls this status back in the same transaction.
        const updated = await client.query(
          `update user_measure_appeals set status='accepted', reviewer_user_id=$2,
            resolved_at=clock_timestamp(), reviewer_explanation=$3, remedy=$4
            where id=$1 and status='pending'`,
          [appeal.id, input.actorId, input.explanation, input.remedy],
        );
        if (updated.rowCount !== 1) throw new UserMeasureConflictError("appeal no longer pending");
        const applied = await this.applyLockedTransition(
          client, current, input.actorId, issuerLevel, transition, input.remedy!, true,
        );
        before = applied.before;
        after = applied.after;
      }

      await appendUserMeasureHistory(client, input.actorId, {
        action: "measure.appealResolved", targetType: "user-measure", targetId: current.id,
        targetLabel: target.name, reason: input.explanation,
        context: {
          targetUserId: target.id, operationId: input.operationId, fingerprint: input.fingerprint,
          before, after, appealId: input.appealId, outcome: input.outcome,
          ...(input.remedy ? { remedy: input.remedy } : {}),
        },
      });
      return { appealId: input.appealId, measureId: current.id,
        outcome: input.outcome, version: after.version, remedy: input.remedy };
    });
  }

  /** Authz lock is held before target identity and exact-measure locks. */
  private async lockMeasure(
    client: PoolClient, measureId: string,
  ): Promise<{ target: LockedTarget; current: LockedMeasure }> {
    const pointer = await client.query<{ target_user_id: string }>(
      "select target_user_id from user_measures where id=$1", [measureId],
    );
    if (!pointer.rows[0]) throw new UserMeasureNotFoundError("measure does not exist");
    const target = await this.lockTarget(client, pointer.rows[0].target_user_id);
    const found = await client.query<LockedMeasure>(
      `select id, target_user_id, issuer_authority_floor, version, expires_at, lifted_at
         from user_measures where id=$1 for update`, [measureId],
    );
    const current = found.rows[0];
    if (!current || current.target_user_id !== target.id) {
      throw new UserMeasureConflictError("measure target changed");
    }
    return { target, current };
  }

  private async assertActive(client: PoolClient, current: LockedMeasure): Promise<void> {
    // DB clock is evaluated after measure FOR UPDATE, not at transaction start.
    const clock = await client.query<{ checked_at: Date }>("select clock_timestamp() as checked_at");
    if (!clock.rows[0] || current.lifted_at ||
        (current.expires_at && current.expires_at.getTime() <= clock.rows[0].checked_at.getTime())) {
      throw new UserMeasureConflictError("measure has already terminated");
    }
  }

  private async measureState(client: PoolClient, current: LockedMeasure): Promise<UserMeasureHistoryState> {
    return state(
      current.version, await this.readRestrictions(client, current.id),
      current.expires_at?.toISOString() ?? null, Boolean(current.lifted_at),
    );
  }

  /** Common CAS/terminal primitive for admin transition and accepted review. No History here. */
  private async applyLockedTransition(
    client: PoolClient, current: LockedMeasure, actorId: string, issuerLevel: number,
    input: ValidatedChange | ValidatedLift, kind: "change" | "lift", requireChange = false,
  ): Promise<AppliedTransition> {
    await this.assertActive(client, current);
    if (current.version !== input.expectedVersion || current.version >= 2147483647) {
      throw new UserMeasureConflictError("measure version changed or exhausted");
    }
    const before = await this.measureState(client, current);
    if (kind === "change") {
      const change = input as ValidatedChange;
      assertUserMeasureAdminRestrictionsAuthority(issuerLevel as 0 | 1 | 2 | 3, change.restrictions);
      if (sameRestrictions(before.restrictions, change.restrictions) && before.expiresAt === change.expiresAt) {
        if (requireChange) throw new UserMeasureConflictError("accepted change must modify the measure");
        return { changed: false, before, after: before };
      }
      await this.requireFutureExpiry(client, change.expiresAt);
      const updated = await client.query(
        `update user_measures set expires_at=$2::timestamptz, latest_change_reason=$3,
           issuer_authority_floor=greatest(issuer_authority_floor,$4), version=version+1
           where id=$1 and version=$5`,
        [current.id, change.expiresAt, change.reason, issuerLevel, current.version],
      );
      if (updated.rowCount !== 1) throw new UserMeasureConflictError("measure version changed");
      await client.query(
        `update user_measure_restrictions set enabled=false
           where measure_id=$1 and restriction_key <> all($2::text[])`,
        [current.id, change.restrictions],
      );
      for (const restriction of change.restrictions) {
        await client.query(
          `insert into user_measure_restrictions(measure_id,restriction_key,enabled)
             values($1,$2,true) on conflict(measure_id,restriction_key)
             do update set enabled=true`,
          [current.id, restriction],
        );
      }
      return { changed: true, before,
        after: state(current.version + 1, change.restrictions, change.expiresAt, false) };
    }

    const lift = input as ValidatedLift;
    const updated = await client.query(
      `update user_measures set lifted_at=clock_timestamp(), lifted_by_user_id=$2,
         lift_reason=$3, issuer_authority_floor=greatest(issuer_authority_floor,$4),
         version=version+1 where id=$1 and version=$5`,
      [current.id, actorId, lift.reason, issuerLevel, current.version],
    );
    if (updated.rowCount !== 1) throw new UserMeasureConflictError("measure version changed");
    await client.query(
      `update user_measure_appeals set status='moot', resolved_at=clock_timestamp()
         where measure_id=$1 and status='pending'`, [current.id],
    );
    return { changed: true, before,
      after: state(current.version + 1, before.restrictions, before.expiresAt, true) };
  }

  private async committedOperation(client: PoolClient, measureId: string, operationId: string): Promise<{
    actor_id: string; action: string; context: {
      fingerprint?: unknown; appealId?: unknown; after?: { version?: unknown };
    };
  } | null> {
    const result = await client.query<{
      actor_id: string; action: string; context: {
        fingerprint?: unknown; appealId?: unknown; after?: { version?: unknown };
      };
    }>(`select actor_id, action, context from admin_history
      where target_type='user-measure' and target_id=$1
        and context->>'operationId'=$2
      order by position desc limit 1`, [measureId, operationId]);
    return result.rows[0] ?? null;
  }

  /** This primitive owns the authority→target→measure→History lock order for both transitions. */
  private async transition(
    input: ValidatedChange | ValidatedLift,
    action: "measure.changed" | "measure.lifted",
  ): Promise<MeasureTransitionResult> {
    return this.withAuthorityTransaction(async (client, ownerId) => {
      const { target, current } = await this.lockMeasure(client, input.measureId);
      const issuerLevel = await this.authority(
        client, ownerId, input.actorId, target.id, current.issuer_authority_floor,
      );

      const replay = await this.committedOperation(client, input.measureId, input.operationId);
      if (replay) {
        if (replay.actor_id !== input.actorId || replay.action !== action ||
            replay.context.fingerprint !== input.fingerprint ||
            !Number.isSafeInteger(replay.context.after?.version)) {
          throw new UserMeasureConflictError("operation ID conflicts with committed History");
        }
        return { id: input.measureId, version: replay.context.after!.version as number, changed: true };
      }
      await assertNoActiveUserMeasureRestrictionPg(client, input.actorId, "admin.usersAccess");

      const applied = await this.applyLockedTransition(
        client, current, input.actorId, issuerLevel, input,
        action === "measure.changed" ? "change" : "lift",
      );
      if (applied.changed) {
        await appendUserMeasureHistory(client, input.actorId, {
          action, targetType: "user-measure", targetId: current.id, targetLabel: target.name,
          reason: input.reason,
          context: { targetUserId: target.id, operationId: input.operationId,
            fingerprint: input.fingerprint, before: applied.before, after: applied.after },
        });
      }
      return { id: current.id, version: applied.after.version, changed: applied.changed };
    });
  }

  private async readRestrictions(client: PoolClient, measureId: string): Promise<UserMeasureRestrictionId[]> {
    const result = await client.query<{ restriction_key: UserMeasureRestrictionId }>(
      `select restriction_key from user_measure_restrictions
        where measure_id=$1 and enabled=true order by restriction_key`, [measureId],
    );
    return result.rows.map(row => row.restriction_key);
  }

  private async lockTarget(client: PoolClient, targetUserId: string): Promise<LockedTarget> {
    const result = await client.query<LockedTarget>(
      'select id,name from "user" where id=$1 for key share', [targetUserId],
    );
    if (!result.rows[0]) throw new UserMeasureNotFoundError("target user does not exist");
    return result.rows[0];
  }

  private async authority(
    client: PoolClient, ownerId: string, actorId: string, targetId: string, issuerFloor?: number,
  ) {
    const authorization = new PostgresAuthorizationRepository(this.pool, ownerId);
    const actor = await authorization.resolveUser(actorId, client);
    const target = await authorization.resolveUser(targetId, client);
    return assertUserMeasureAuthority({
      actorId, targetUserId: targetId, ownerUserId: ownerId,
      actorRawPermissions: new Set(actor.effectivePermissions),
      targetRawPermissions: new Set(target.effectivePermissions),
      ...(issuerFloor === undefined ? {} : { issuerAuthorityFloor: issuerFloor }),
    });
  }

  private async requireFutureExpiry(client: PoolClient, value: string | null): Promise<void> {
    if (value === null) return;
    const result = await client.query<{ future: boolean }>(
      "select $1::timestamptz > clock_timestamp() as future", [value],
    );
    if (!result.rows[0]?.future) throw new UserMeasureConflictError("expiry must be future at commit admission");
  }

  private async withAuthorityTransaction<T>(
    operation: (client: PoolClient, ownerUserId: string) => Promise<T>,
  ): Promise<T> {
    // Missing binding disables admin changes, not the subject's own appeal.
    const ownerUserId = requireUserMeasureOwnerId(this.ownerUserId);
    return this.withLockedTransaction(client => operation(client, ownerUserId));
  }

  private async withLockedTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let begun = false;
    try {
      await client.query("begin");
      begun = true;
      const locked = await client.query("select id from authz_mutation_lock where id=1 for update");
      if (locked.rowCount !== 1) throw new UserMeasureConflictError("authorization lock missing");
      const result = await operation(client);
      await client.query("commit");
      begun = false;
      return result;
    } catch (error) {
      if (begun) {
        try { await client.query("rollback"); } catch { /* preserve original failure */ }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function invalidAppealDecision(): never {
  throw new InvalidUserMeasureInputError("invalid appeal decision or remedy");
}
function identity(value: unknown, field: string): string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new InvalidUserMeasureInputError(field + " is invalid");
  }
  return value;
}
function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidUserMeasureInputError(field + " must be UUID");
  }
  return value.toLowerCase();
}
function version(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 2147483647) {
    throw new InvalidUserMeasureInputError("invalid expected version");
  }
  return value as number;
}
function explanation(value: unknown): string {
  if (typeof value !== "string") throw new InvalidUserMeasureInputError("reason must be text");
  const result = value.trim();
  if (!result || result.includes("\0") || Array.from(result).length > 2000) {
    throw new InvalidUserMeasureInputError("reason must contain 1–2000 code points, without NUL");
  }
  return result;
}
function restrictionSet(value: unknown): UserMeasureRestrictionId[] {
  try {
    return validateUserMeasureRestrictions(value).sort();
  } catch {
    throw new InvalidUserMeasureInputError("invalid restriction keys");
  }
}

/** Explicit offset mandatory; never interpret browser-local ambiguous dates on the server. */
function instant(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new InvalidUserMeasureInputError("expiry must be offset-qualified ISO");
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!m) throw new InvalidUserMeasureInputError("expiry must be offset-qualified ISO");
  const [y, mo, d, h, mi, sec] = m.slice(1, 7).map(Number);
  const ms = Number((m[7] ?? "").padEnd(3, "0"));
  const oh = m[10] ? Number(m[10]) : 0;
  const om = m[11] ? Number(m[11]) : 0;
  if (y < 100 || mo < 1 || mo > 12 || d < 1 || d > 31 ||
      h > 23 || mi > 59 || sec > 59 || oh > 14 || om > 59 || (oh === 14 && om !== 0)) {
    throw new InvalidUserMeasureInputError("expiry calendar or offset is invalid");
  }
  const offset = m[8] === "Z" ? 0 : (m[8].startsWith("-") ? -1 : 1) * (oh * 60 + om);
  const timestamp = Date.UTC(y, mo - 1, d, h, mi, sec, ms) - offset * 60000;
  const local = new Date(timestamp + offset * 60000);
  if (!Number.isFinite(timestamp) || local.getUTCFullYear() !== y ||
      local.getUTCMonth() + 1 !== mo || local.getUTCDate() !== d ||
      local.getUTCHours() !== h || local.getUTCMinutes() !== mi ||
      local.getUTCSeconds() !== sec) {
    throw new InvalidUserMeasureInputError("expiry calendar is invalid");
  }
  return new Date(timestamp).toISOString();
}
async function digest(fields: unknown[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(fields));
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
}
function sameRestrictions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);
}
function state(versionValue: number, restrictions: UserMeasureRestrictionId[], expiresAt: string | null, lifted: boolean):
  UserMeasureHistoryState {
  return { version: versionValue, restrictions: [...restrictions], expiresAt, lifted };
}
