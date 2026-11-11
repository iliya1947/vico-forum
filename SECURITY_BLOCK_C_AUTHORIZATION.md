# Блок C — Authorization & privilege escalation audit

## Проверенный baseline

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Better Auth даёт только authoritative authenticated `user.id`; application authorization хранится отдельно в PostgreSQL.
3. Единственный Owner — exact server-bound `VICO_OWNER_USER_ID`; email/role/client input/session role claim Owner authority не создают.
4. Effective permissions: non-Owner использует `deny > allow > role grant > deny`; bound Owner получает projection всего текущего `PERMISSION_CATALOG`.
5. Authorization reads обязаны быть snapshot-consistent и fresh на следующий protected request; long-lived permission cache не разрешён.
6. Все шесть authorization-management write families current-release Owner-only и дополнительно проходят fresh `access.authorization.manage`, same-origin, serialized `authz_mutation_lock`, AP-10 restriction/authority checks и atomic History.
7. `access.authorization.manage` у non-Owner даёт только защищённый read-only management subset, не mutation authority.
8. Unknown permission keys не должны становиться executable authority.

## Граница блока

Block C проверяет общий authorization engine и privilege-escalation paths. Он **не** проводит полный повторный аудит конкретных Ordinary Admin/Complaints/Signals/Measures workflows; их domain-specific reads/writes будут отдельным security-блоком. Здесь они рассматриваются только там, где нужны для доказательства общей authz boundary.

## C1 — Owner binding / authority spoofing

Проверить:

1. Missing/blank/whitespace/malformed `VICO_OWNER_USER_ID` не создаёт Owner authority и не даёт fallback другому actor.
2. Email, display name, role slug, raw `admin` role, grants/overrides и client-supplied IDs не могут подменить exact Owner binding.
3. Non-Owner с полным raw catalog или персональным allow на `access.authorization.manage` не получает Owner-only writes.
4. Owner raw deny/role change не ломает утверждённую server-bound Owner projection, но и не снимает resource/lifecycle/Origin constraints.
5. Account/session switch не позволяет сохранить Owner projection от предыдущего user ID.
6. Unknown permission key не становится разрешённым даже для Owner.

## C2 — Effective permission resolution / precedence / freshness

Проверить:

1. `deny > allow > role grant > deny` для non-Owner на реальном DB path.
2. Пользователь без explicit assignment получает только built-in `user` role.
3. Role/grant/override change действует на следующий protected request без logout/login.
4. Request-local cache не переживает request и не смешивает users.
5. Один `resolve()` возвращает internally consistent snapshot; management reads также не смешивают разные DB snapshots.
6. `has()` и `resolve().effectivePermissions` не расходятся для одного committed state.
7. Client/session-stored role or permission data никогда не выбирают authorization result.

## C3 — Authorization-management write escalation / direct bypass

Проверить все шесть write families через route и direct capability/service boundary:

1. create custom role;
2. rename custom role;
3. delete custom role;
4. replace role grants;
5. assign user role;
6. set/remove user override.

Для каждого проверить guest, ordinary user, manager non-Owner, forged actor/target IDs, no-op, direct service call и stale session. Все non-Owner paths должны fail closed до write/History; exact Owner должен всё равно пройти fresh permission, Owner policy, restriction/authority и validation checks.

## C4 — Elevated authority propagation

Проверить `admin.users.blocks.managePrivileged` как дополнительную elevated capability:

1. Grant/revoke elevated permission через role grants.
2. Role assignment к/от elevated role.
3. Per-user allow/deny/inherit elevated permission.
4. Delete elevated custom role.
5. Попытка получить privileged-target authority только через `admin.users.blocks.manage`.
6. Owner projection не превращает persisted elevated state других users в Owner authority.
7. Смена elevated state и AP-10 authority decision сериализуются общей authz boundary без stale privilege window.

Domain-specific measure behavior здесь не переаудируется; проверяется только propagation/privilege-escalation seam.

## C5 — Authorization-state read privacy / IDOR

Проверить:

1. Guest и ordinary user не читают Roles/authorization users.
2. `access.authorization.manage` non-Owner получает только предусмотренный management subset/read-only state.
3. `admin.users.read` отдельно не раскрывает full authorization-management snapshot.
4. Targeted authorization read не позволяет выбрать чужие private данные сверх предусмотренного authorization state.
5. Email/raw identifiers/history-sensitive данные не появляются на route, где соответствующий read permission отсутствует.
6. Owner-only mutation controls/presentation data не считаются boundary и не выдаются как authority client-side.

## C6 — Resource-condition enforcement / service bypass

Проверить общие capability + resource-condition seams:

1. `forum.post.editOwn` — authoritative author, не submitted authorId.
2. `forum.solution.manageOwn` — authoritative topic author.
3. `forum.sourceLocale.correctOwn` — authoritative content author.
4. Any/manage permissions снимают только заявленное ownership-ограничение, не соседние lifecycle/validation guards.
5. Direct route/service/repository invocation не должен превращать permission check в UI-only gate.
6. Stale mounted UI/account switch и forged visible account IDs не выбирают actor.

Конкретные moderation/business rules вне этих generic ownership seams остаются последующим блокам.

## C7 — Freshness / concurrency / mutation serialization

Проверить:

1. Все authorization writes захватывают singleton `authz_mutation_lock` до fresh actor admission.
2. Concurrent grant/override/role changes не позволяют обеим операциям принять несовместимый stale authority state.
3. AP-10 shared authority decisions, которые используют тот же mutex, не создают gap между authz change и privileged-target check.
4. No-op mutation тоже проходит current Owner/fresh/restriction checks.
5. Failed History append откатывает authorization change; rejected/rolled-back write не создаёт History.
6. Delete/assign/grant races не нарушают role-assignment/FK/system-role invariants.
7. Next protected request видит committed state, а незакоммиченный/rolled-back state не становится authority.

## C8 — Failure semantics / request-local cache

Проверить:

1. Classified PostgreSQL/Hyperdrive availability failures → typed unavailable/fail-closed на protected operations.
2. SQL/schema/config/programming/invariant errors не превращаются в ordinary permission=false или silent UI degradation.
3. Optional public presentation может скрыть controls только для classified availability failure; protected action проверяет permission независимо.
4. Cleanup/discard error не заменяет исходный authz result.
5. Request-local cache не кеширует failure/authority между requests или users.
6. Parallel `has()`/resolve calls не создают inconsistent cross-user cache keys.

### Результат C8 — 2026-11-10

1. **AUTHZ-FAIL-01 — Low/P3, current-scope.** Mutation path в `PostgresAuthorizationRepository.mutate()` выполняет `ROLLBACK` в `catch` без best-effort guard. Если исходная authorization/domain/programming/COMMIT error уже возникла, а сам `ROLLBACK` затем падает, наружу выходит rollback error вместо исходной причины.
2. Через production Hyperdrive wrapper availability-shaped rollback error классифицируется как `AuthorizationUnavailableError`; поэтому исходный forbidden/conflict/programming failure может стать controlled `503`. Privilege escalation, protected mutation success или private-data read из этого не доказаны; impact — loss/misclassification of authoritative failure cause и ухудшение observability/incident diagnosis.
3. Read-snapshot path этой проблеме не подвержен: `withReadSnapshot()` уже best-effort подавляет rollback cleanup failure и сохраняет исходную operation/COMMIT error; regression это проверяет.
4. Hyperdrive cleanup через `bestEffortDiscardClient(pool)` сохраняет успешный result и исходный error при sync/async pool cleanup failures.
5. Availability classifier ограничен известными PostgreSQL connection/availability SQLSTATE, transport codes и точными timeout shapes; schema/programming/configuration errors не переводятся в typed unavailable.
6. Optional public presentation catches только `AuthorizationUnavailableError`; unexpected authorization errors продолжают обычный error path. Protected routes/actions fail closed и independently recheck permission.
7. Production authorization cache остаётся request-local: один resolution promise на exact `userId`; разные users имеют разные keys, новый Worker request создаёт новый cache. Rejected promise не переживает request и не превращается в permission allow.
8. Administrative-restriction cache также создаётся заново на Worker request и key'ится family + actor + raw authority level; current code path не показал cross-user authority reuse.
9. Unguarded `PoolClient.release()` теоретически может заменить результат, если сам локальный release бросит исключение, но реалистичный infrastructure trigger в текущем path не доказан; отдельно current finding не фиксируется.
10. Remediation не назначена; finding только зафиксирован для будущего correction stage по отдельной команде владельца.

## C9 — Permission catalog / persistence integrity

Проверить:

1. DB `authz_permissions` соответствует code-backed `PERMISSION_CATALOG`; arbitrary string через UI/API не становится executable permission.
2. Role grants/overrides принимают только known catalog keys.
3. Built-in role identity/slug invariants нельзя сломать обычной management mutation.
4. Custom role deletion с assignments fail closed; FK/cascade semantics не дают orphaned effective authority.
5. Default built-in `user` role lookup не может silently выбрать другую role при повреждённом/дублированном state.
6. Owner projection даёт только catalog keys, а не DB-injected unknown permissions.
7. Authorization tables остаются application-domain boundary; Better Auth Admin/plugin role model не становится альтернативным source of authority.

### Результат C9 — 2026-11-10

1. Verdict: **PASS — 0 confirmed current-scope permission-catalog/persistence-integrity defects**.
2. Current `PERMISSION_CATALOG`, final PostgreSQL `authz_permissions_catalog_check` and seeded `authz_permissions` set are aligned. Existing clean-migration regression compares DB permission rows to `PERMISSION_CATALOG` exactly.
3. Application mutations accept permission inputs only through `isPermissionKey()`; unknown role grants/overrides are rejected before repository writes. PostgreSQL independently blocks unknown permission rows through the catalog CHECK and FK-backed grant/override tables.
4. `authz_roles.slug` is unique and validated. Database trigger `authz_protect_role_identity` prevents changing any role slug or `is_system`, and prevents deleting built-in roles. Application rename/delete paths additionally operate only on non-system roles.
5. Custom-role grants may cascade when an unassigned custom role is deleted, but `authz_user_roles.role_id` uses `ON DELETE RESTRICT`; an assigned role therefore cannot disappear or orphan effective authority. Repository maps FK conflict to `AuthorizationRoleAssignedError`.
6. Default role lookup uses unique slug `user`. The built-in row is seeded as system and protected by the identity trigger; if it is nevertheless missing/corrupted outside the application boundary, resolution fails closed rather than silently choosing another role.
7. Owner projection uses only code-backed `PERMISSION_CATALOG`; `hasPermission()` rejects an unknown permission even for Owner. Persisted unknown permission keys are also DB-forbidden.
8. Better Auth provides identity/session only. Current Better Auth configuration has no Admin plugin or role-based authorization plugin, and Vico does not consume Better Auth role claims as application authority.
9. Direct privileged database modification is a separate database/runtime trust boundary and remains for the Database & migrations security area; no application-level bypass was promoted from that hypothetical path.
10. No C9 finding confirmed.

### Итог Block C — Authorization & privilege escalation

1. Block C C1–C9 completed against main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. **1 current-scope finding total:** `AUTHZ-FAIL-01` Low/P3 — authorization mutation rollback failure can replace/misclassify the original error.
3. No Owner spoofing, direct authorization-write escalation, stale permission-resolution bypass, concurrency authority race, elevated-authority propagation bypass, authorization-state IDOR, resource-condition bypass or catalog/persistence escalation was confirmed.
4. Remediation remains unassigned. Block-C finding is retained for later correction only after explicit owner decision.

## Порядок фактической проверки Block C

1. C1 Owner binding / authority spoofing.
2. C3 Management direct-write escalation.
3. C2 Resolution / precedence / freshness.
4. C7 Concurrency / serialization.
5. C4 Elevated authority propagation.
6. C5 Authorization read privacy / IDOR.
7. C6 Resource-condition/service bypass.
8. C8 Failure/cache semantics.
9. C9 Catalog/persistence integrity.

## Критерий завершения Block C

1. Все generic authorization trust boundaries проверены по actual current-main HTTP/service/DB path.
2. Каждый finding имеет доказанную privilege/authority impact и current-stage classification.
3. Domain-specific Admin/moderation finding не дублируется здесь, если общая authz boundary сама корректна.
4. Findings только фиксируются в #315; remediation/implementation не начинается без отдельной команды владельца.

---
