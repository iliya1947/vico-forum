import { OwnerAccountLifecycleForbiddenError, OwnerAccountLifecycleTargetMissingError, OwnerAccountLifecycleConflictError, OwnerAccountLifecycleInvariantError, OwnerAccountLifecycleCommitUncertainError, validateOwnerAccountDeactivationInput, operationId } from "./owner-account-lifecycle-contract";
import type { DeactivateOwnerAccountInput, OwnerAccountDeactivationResult, OwnerAccountLifecycleCommand } from "./owner-account-lifecycle-contract";
export * from "./owner-account-lifecycle-contract";
import type { Client, Pool } from "pg";
import { isBoundOwner } from "../app/authorization/owner";
import { assertActiveAccountForMutation, readAccountState, type AccountState } from "./account-state";

type DeactivatedState = Extract<AccountState, { status: "deactivated" }>;
type LifecycleEvent = {
  id: string; kind: string; monitor_key: string; entity_type: string | null;
  entity_id: string | null; actor_user_id: string | null; target_user_id: string | null;
  correlation_id: string | null; state_matches: boolean | null;
};
async function occurrenceKey(actorId: string, operationId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(JSON.stringify(["account.deactivated", actorId, operationId])));
  return "sa05:" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

// Compare timestamps against the locked native tuple in SQL, including any
// sub-millisecond discrepancy that a JavaScript Date would otherwise truncate.
const eventSelect = `select e.id,e.kind,e.monitor_key,e.entity_type,e.entity_id,
  e.actor_user_id,e.target_user_id,e.correlation_id,
  (e.occurred_at=u.deactivated_at and e.actor_user_id=u.deactivated_by_user_id
    and u.retain_at_least_until=date_trunc('milliseconds',u.retain_at_least_until)
    and e.payload=jsonb_build_object('state','deactivated','retainAtLeastUntil',
      to_char(u.retain_at_least_until at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) as state_matches
  from owner_events e cross join "user" u where u.id=$1 and e.source='account'`;
function eventSemantics(event: LifecycleEvent, actorId: string, targetId: string): boolean {
  return event.kind === "account.deactivated" && event.monitor_key === "accounts.users"
    && event.entity_type === "user" && event.entity_id === targetId
    && event.actor_user_id === actorId && event.target_user_id === targetId;
}
function result(state: DeactivatedState, changed: boolean, eventId: string | null): OwnerAccountDeactivationResult {
  return { targetUserId: state.userId, state: "deactivated", changed,
    deactivatedAt: state.deactivatedAt.toISOString(), retainAtLeastUntil: state.retainAtLeastUntil.toISOString(), eventId };
}

/** Mandatory append on the caller's transaction. The ordering lock is acquired last. */
async function appendDeactivationEvent(transaction: Pick<Client, "query">,
  input: DeactivateOwnerAccountInput, state: DeactivatedState, key: string): Promise<string> {
  const id = crypto.randomUUID();
  const payload = JSON.stringify({ state: "deactivated", retainAtLeastUntil: state.retainAtLeastUntil.toISOString() });
  await transaction.query("select pg_advisory_xact_lock(1447641935,2)");
  const saved = await transaction.query<{ id: string }>(`insert into owner_events
    (id,occurred_at,source,occurrence_key,kind,monitor_key,entity_type,entity_id,
     actor_user_id,target_user_id,correlation_id,payload)
    values($1,$2,'account',$3,'account.deactivated','accounts.users','user',$4,$5,$4,$6,$7::jsonb)
    returning id`, [id, state.deactivatedAt, key, input.targetId, input.actorId, input.operationId, payload]);
  // A uniqueness/insert failure must roll back; it is never accepted via ON CONFLICT.
  if (saved.rowCount !== 1 || saved.rows[0]?.id !== id) throw new OwnerAccountLifecycleInvariantError();
  return id;
}

/** Native command: trusted binding and active actor are enforced even on direct replay/no-op calls. */
export class PostgresOwnerAccountLifecycleCommand implements OwnerAccountLifecycleCommand {
  constructor(private readonly pool: Pick<Pool, "connect">, private readonly ownerBinding: unknown) {}

  async deactivate(input: DeactivateOwnerAccountInput): Promise<OwnerAccountDeactivationResult> {
    if (!isBoundOwner(input?.actorId, this.ownerBinding)) throw new OwnerAccountLifecycleForbiddenError();
    const command = validateOwnerAccountDeactivationInput(input);
    const key = await occurrenceKey(command.actorId, command.operationId);
    const client = await this.pool.connect();
    let begun = false, committing = false, discard = false;
    let connectionError: Error | undefined, previousTimeout: string | undefined;
    const onConnectionError = (error: Error) => { connectionError = error; discard = true; };
    client.on("error", onConnectionError);
    try {
      previousTimeout = (await client.query<{ transaction_timeout: string }>("show transaction_timeout")).rows[0]?.transaction_timeout;
      if (typeof previousTimeout !== "string") throw new OwnerAccountLifecycleInvariantError();
      // PG17 starts this timer at BEGIN; SET LOCAL after BEGIN does not start it.
      // Restore the borrowed connection's prior setting before returning it.
      await client.query("set transaction_timeout='5000ms'");
      await client.query("begin"); begun = true;
      await client.query("set local transaction_timeout='5000ms'; set local statement_timeout='2000ms'; set local lock_timeout='750ms'");
      await assertActiveAccountForMutation(client, command.actorId);
      if (command.targetId === command.actorId) throw new OwnerAccountLifecycleForbiddenError();
      await client.query('select id from "user" where id=$1 for no key update', [command.targetId]);
      const target = await readAccountState(client, command.targetId);
      if (target.status === "missing") throw new OwnerAccountLifecycleTargetMissingError();
      const prior = await client.query<LifecycleEvent>(eventSelect + " and e.occurrence_key=$2", [command.targetId, key]);
      let outcome: OwnerAccountDeactivationResult;
      if (prior.rows[0]) {
        const event = prior.rows[0];
        if (!eventSemantics(event, command.actorId, command.targetId) || event.correlation_id !== command.operationId) {
          throw new OwnerAccountLifecycleConflictError();
        }
        if (target.status !== "deactivated" || !event.state_matches) throw new OwnerAccountLifecycleInvariantError();
        outcome = result(target, false, event.id);
      } else if (target.status === "deactivated") {
        // New operation on an inactive target is a no-op, not a new receipt/event.
        // Existing entity index supplies the original retained lifecycle occurrence.
        const original = await client.query<LifecycleEvent>(eventSelect +
          " and e.entity_type='user' and e.entity_id=$1 and e.kind='account.deactivated' order by e.position desc limit 2", [command.targetId]);
        if (original.rows.length > 1) throw new OwnerAccountLifecycleInvariantError();
        const event = original.rows[0];
        if (event && (!eventSemantics(event, target.deactivatedByUserId, command.targetId)
          || !event.state_matches || !operationId(event.correlation_id))) {
          throw new OwnerAccountLifecycleInvariantError();
        }
        outcome = result(target, false, event?.id ?? null);
      } else {
        const saved = await client.query(`with instant as materialized (
            select date_trunc('milliseconds',clock_timestamp()) as at
          ) update "user" set deactivated_at=instant.at,deactivated_by_user_id=$2,
            retain_at_least_until=((instant.at at time zone 'UTC')+interval '1 year') at time zone 'UTC'
          from instant where id=$1 and deactivated_at is null returning id`, [command.targetId, command.actorId]);
        if (saved.rowCount !== 1) throw new OwnerAccountLifecycleInvariantError();
        const state = await readAccountState(client, command.targetId);
        if (state.status !== "deactivated" || state.deactivatedByUserId !== command.actorId) throw new OwnerAccountLifecycleInvariantError();
        await client.query("delete from forum_online_presence where user_id=$1", [command.targetId]);
        if ((await client.query("select user_id from forum_online_presence where user_id=$1", [command.targetId])).rowCount !== 0) {
          throw new OwnerAccountLifecycleInvariantError();
        }
        const eventId = await appendDeactivationEvent(client, command, state, key);
        outcome = result(state, true, eventId);
      }
      committing = true;
      await client.query("commit"); committing = false;
      return outcome;
    } catch (error) {
      const failure = connectionError ?? error;
      if (committing) {
        discard = true;
        throw new OwnerAccountLifecycleCommitUncertainError({ cause: failure });
      }
      if (begun && !discard) {
        try { await client.query("rollback"); } catch { discard = true; }
      } else if (!begun) discard = true;
      throw failure;
    } finally {
      if (!discard && previousTimeout !== undefined) {
        try { await client.query("select set_config('transaction_timeout',$1,false)", [previousTimeout]); }
        catch { discard = true; }
      }
      // A discarded socket can emit its terminal error after the query rejects.
      // Keep its listener until disposal; it is never returned to another borrower.
      if (!discard) client.removeListener("error", onConnectionError);
      client.release(discard);
    }
  }
}
