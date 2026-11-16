/** One allowlisted projection of the original retained SA05 event, reused by
 * global/scoped and attributable-person readers. Never creates a journal row.
 */
export const ACCOUNT_HISTORY_SELECT_SQL = [
  "select 'account-event'::text origin,e.id::text source_id,e.occurred_at at,",
  " e.recorded_at recorded_at,ARRAY['accounts.users']::text[] scopes,",
  " e.kind,e.source,null::text quality,",
  " jsonb_build_object('state',e.payload->>'state',",
  " 'retainAtLeastUntil',e.payload->>'retainAtLeastUntil',",
  " 'actorUserId',e.actor_user_id,'targetUserId',e.target_user_id,",
  " 'entityType',e.entity_type,'entityId',e.entity_id,'operationId',e.correlation_id) details",
  " from owner_events e where e.source='account' and e.kind='account.deactivated'",
  " and e.monitor_key='accounts.users'",
].join("\n");
