# Block G — Database & migrations security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. **G1 — Migration history integrity завершён: PASS, 0 current-scope findings.**
3. **G2 — Schema-level security invariants завершён: 1 current-scope finding — `DB-SEARCHPATH-01 Low/P3`.**
4. **G3 — Runtime least privilege завершён: 1 additional current-scope finding — `DB-ACL-USER-DELETE-01 Low/P3`.**
5. **G4 — Migration / privilege workflow gates завершён: 1 additional current-scope finding — `DB-RUNTIME-EVIDENCE-01 Low/P3`.**
6. **G5 — Transaction, locking and ambiguous outcomes завершён: PASS, 0 additional current-scope findings.**
7. **G6 — Destructive tooling and target isolation завершён: 1 additional current-scope finding — `DB-TEST-TARGET-01 Low/P3`.**
8. Repository migration history: `0000–0063`; externally accepted migration evidence: `0000–0020`.
9. Само отставание external target от repository history не finding; G4 finding относится к current repository rollout gate, который допускает это отставание как достаточное evidence для current runtime.
10. Следующий bounded slice — **G7 Manifest, evidence and drift detection**.
11. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
12. Production/Neon/Cloudflare mutation в Block G не разрешена и не выполняется.

## G1 — результат

1. **PASS: 0 current-scope findings** на `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Current Drizzle journal содержит ровно 64 entries `idx=0..63`, dialect `postgresql`, unique non-empty tags и strictly increasing safe-integer `when`; duplicate/reordered index/timestamp/tag состояния в current file не обнаружены.
3. Journal ↔ SQL: current root `drizzle/*.sql` даёт ровно 64 migration files, и набор путей точно совпадает с 64 journal tags `0000_tan_johnny_storm` → `0063_owner_attempt_telemetry`; missing/extra migration SQL в проверенном наборе нет.
4. Journal ↔ snapshots: `drizzle/meta/0000_snapshot.json` → `0063_snapshot.json` присутствуют без gaps/extra snapshot paths. Все 64 snapshot IDs unique, `0000.prevId` равен zero UUID, каждый следующий `prevId` точно равен ID предыдущего snapshot; snapshot chain непрерывна до `0063`.
5. PR history guard сравнивает HEAD с merge-base текущего base branch, запрещает modification/deletion/rename accepted root SQL и `*_snapshot.json`, сохраняет accepted journal entries deep-equal, запрещает delete/rewrite, non-contiguous idx, non-increasing timestamps и duplicate tags.
6. Для каждого нового journal entry guard требует exact newly-added root SQL tag и наоборот. Stale/branch-divergent state с extra SQL без journal либо rewritten accepted snapshot/journal не проходит этот boundary после попадания соответствующей history в base.
7. CI дополнительно вызывает unit tests history guard, `verify-migration-history.mjs`, pinned `drizzle-kit check`, schema-parity `drizzle-kit generate` + clean git diff и отдельный disposable PostgreSQL 17 database job.
8. Database integration test source уничтожает только local `localhost/127.0.0.1` DB с pathname `_test`, затем с нуля применяет `./drizzle`; test contract ожидает ровно 64 ledger rows после повторного `migrate()`. В G1 этот test source прочитан, но тесты **не запускались**.
9. Manual SQL additions (включая SQL functions/triggers, которые Drizzle schema snapshot не моделирует полностью) всё равно находятся внутри accepted root migration SQL, поэтому входят в immutability и clean replay boundary. Их semantic security correctness относится к G2, а не G1.
10. Добавленный snapshot без matching journal/SQL напрямую не является runtime authority; current repository такого состояния не содержит. Semantic snapshot/schema consistency дополнительно является предметом `db:check`/schema-parity и последующих G2/G7 проверок.
11. External production ledger `0000–0020` не сравнивался live в G1. **Информация не проверена** для mutable production DB state; при paused Stage 6 это не current G1 defect.

## G2 — результат

1. Verdict: **1 current-scope finding — `DB-SEARCHPATH-01 Low/P3`** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Forum revision identity — PASS: current title/post pointers are composite owner-bound FKs; revision rows reject UPDATE; author/content relations use RESTRICT where retained identity is required.
3. Complaint retained evidence — PASS кроме finding ниже: targets/reports/decisions/notes/events/evidence refs reject UPDATE/DELETE; appeal identity is immutable after creation and only pending→resolved transition is accepted; evidence attachment refs use RESTRICT plus the active-asset gate.
4. Complaint Case identity/update branch — PASS: id/target/predecessor/created-at are immutable after insertion; initial decision is tied back to the owning Case by deferred composite FK; lifecycle/priority checks prevent impossible persisted states.
5. Attachment active-ref function — PASS: `forum_attachment_require_active_ref()` is the only current SECURITY DEFINER trigger function found. It pins `search_path = pg_catalog`, schema-qualifies the target relation through quoted `TG_TABLE_SCHEMA`, parameter-binds attachment ID and therefore does not inherit the caller's relation lookup path.
6. Authorization role identity trigger and immutable forum/complaint triggers do not query attacker-shadowable relations; they only validate OLD/NEW row state. No independent search-path issue was confirmed there.
7. Translation content-task trigger functions use unqualified internal relations, but current `web` runtime capability intentionally has no task/generation write capability and background translation execution remains a later Stage-6 boundary. Absence of hardening there alone is future work, not a G2 current finding.
8. Retention/cascade review did not produce an additional current finding: Owner events/monitor observations and Admin History do not cascade with user deletion; complaint/security evidence and user measures retain RESTRICT identity links; current web capability lacks DELETE on forum topics/posts/sections/categories and retained complaint tables. Ordinary session/profile/presence/read-state cascades match their lifecycle semantics.
9. Tests and DB probes were read as evidence, but **not run** in this G2 audit slice.

### DB-SEARCHPATH-01 — Low/P3

1. Current Complaints contract requires `previous_case_id` to be bound to the same content unit: a same-revision predecessor must be resolved, and a newer revision may point only to the previous Case of the same post or topic title.
2. Migration `0050_complaint_submission.sql` replaced the earlier same-target composite predecessor FK with a simple self-FK on `previous_case_id`. The remaining same-content enforcement is `guard_complaint_case_identity()` on Case INSERT.
3. That trigger function is SECURITY INVOKER, has no function-local `SET search_path`, and queries `forum_complaint_cases` plus two aliases of `forum_complaint_targets` by **unqualified relation names**.
4. PostgreSQL 17 resolves a session temporary schema before identically named permanent relations when unqualified relation names are used. The current runtime privilege contract also accepts the database's PUBLIC `TEMPORARY` capability, and PostgreSQL grants `TEMPORARY` to PUBLIC by default unless revoked.
5. Current repository evidence demonstrates the same primitive intentionally in `tests/database/migrations.test.ts`: a temporary `authz_mutation_lock` shadows the public table for that session. No application runtime search-path pinning was found for the web DB connection.
6. Reachable direct-SQL path under the existing `web` capability: create temporary `forum_complaint_cases` and `forum_complaint_targets` tables with the columns read by the trigger; insert synthetic rows that make an unrelated real predecessor ID appear to belong to NEW.target_id's content; then INSERT into **qualified** `public.forum_complaint_cases` using that real unrelated `previous_case_id`.
7. The real public self-FK still succeeds because it validates only that the predecessor Case ID exists. The trigger's same-content/resolved lookup is satisfied by temporary rows, so the persistent public Case can acquire a predecessor from unrelated content.
8. This violates a current database integrity boundary and can corrupt moderation predecessor/history linkage. Reviewer Case reads expose/use the stored `previousCaseId`; the incorrect relation becomes durable application state.
9. No current public HTTP route, SQL injection, authentication bypass, private-data disclosure or arbitrary code execution path was established. Exploitation requires direct SQL execution with the current `web` DB capability, so severity is **Low/P3**.
10. The defect is current repository/local-CI scope because both the trigger and named web capability are current code-backed contracts. Whether the same path is presently exploitable in deployed production is **Информация не проверена**: production Worker/web binding rollout remains paused Stage 6.
11. This is not a duplicate of Block D Complaints privacy findings: the root cause is PostgreSQL relation-name resolution inside a schema security trigger, and the impact is persisted Case-link integrity.
12. Remediation is **not assigned** in audit. G3 must account for this finding when checking runtime least privilege, without duplicating the same root cause.

## G3 — результат

1. Verdict: **1 additional current-scope finding — `DB-ACL-USER-DELETE-01 Low/P3`** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Named runtime roles are distinct LOGIN capabilities. Shared verifier rejects SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, database ownership, effective database CREATE, outbound inherited memberships and unsafe inbound role membership.
3. Runtime role schema boundary is exact `public.USAGE` without `CREATE`; relation ACL comparison is full end-state equality to the named capability, including grant-option state. Column ACL, sequence grants, direct function grants, runtime default grants and runtime-owned objects are rejected.
4. PUBLIC boundary is also read as end state: no relation/column explicit function privileges; no custom relation/sequence/schema default grants. Database PUBLIC `CONNECT`/`TEMPORARY` hard-wired-equivalent ACL is intentionally tolerated. `TEMPORARY` is already part of G2 `DB-SEARCHPATH-01` causal chain and is **not duplicated** as a second finding here.
5. Disposable PostgreSQL 17 probe source covers positive capability operations/row locks plus cross-domain negatives: localization cannot read web identity or write locales/DDL; web cannot read localization/task/catalog tables, delete forum topics, update immutable title revisions or create public tables.
6. Current destructive relation grants were cross-checked against production code. Attachment draft refs/post refs, pins, online presence and authorization role/grant/override DELETE operations have current code-backed mutation paths. Better Auth current session/verification cleanup requires their DELETE capabilities. No separate destructive-ACL finding was confirmed for those relations.
7. `authz_mutation_lock` UPDATE is not stale: current authorization/user-measure writers use `SELECT ... FOR UPDATE` on the singleton as a serialization mutex; current web role therefore needs the row-lock-capable relation privilege.
8. Current web capability intentionally has broad table-level UPDATE where real Better Auth/forum/authz operations require writes. Column-level least-privilege redesign would add complexity and is not a current defect without an independent reachable abuse path.
9. Legacy editor-draft-era relations (`forum_editor_drafts`, `forum_attachment_edit_snapshots`, `forum_attachment_draft_boundaries`, `forum_attachment_draft_contexts`) are no longer used by current application source, but they begin after externally accepted `0020` and have not been accepted into the paused production web role. Tightening/removing those future grants before a later Stage-6 provisioning is future cleanup, not a current G3 finding by itself.
10. Exact installed dependency is Better Auth `1.7.7`; its exact tagged source was checked for user creation/deletion behavior. OAuth user+account creation uses a database transaction; rollback does not require an explicit user DELETE capability.
11. Tests/probes were read as evidence, but **not run** in this G3 audit slice.

### DB-ACL-USER-DELETE-01 — Low/P3

1. Current repository `web` capability grants `DELETE` on `public.user` together with SELECT/INSERT/UPDATE.
2. Current Vico product has **no physical account deletion feature**. `docs/SETTINGS.md` explicitly excludes account deletion from Account & security/Privacy, and current Super-admin work has only future deactivation semantics; physical deletion is not a current approved operation.
3. Vico `betterAuthOptions()` does not enable `user.deleteUser`. In exact Better Auth `v1.7.7`, `/delete-user` fails at the initial `options.user?.deleteUser?.enabled` gate when that option is absent; only the enabled path invokes `internalAdapter.deleteUser()`.
4. Exact Better Auth `v1.7.7` internal adapter was checked: ordinary user/OAuth creation uses INSERT/transaction rollback; hard `user` DELETE is its explicit `deleteUser()` operation, not a hidden signup rollback requirement. Vico does not configure the optional anonymous/admin/test plugins that invoke that operation.
5. Vico production source search found no application `DELETE FROM user`, Drizzle `.delete(user)` or `deleteUser()` path. Existing tests do delete synthetic users for cleanup, but those tests use disposable/admin test connections rather than the runtime web capability.
6. Therefore `public.user.DELETE` is a real relation-level overgrant beyond the current runtime responsibility.
7. A holder of the web DB credential/capability can physically delete an otherwise deletable user row. PostgreSQL FK cascades can then remove account/session/profile/authorization/presence state; RESTRICT links protect users already referenced by retained forum/moderation data but do not make the capability necessary or harmless for accounts without such references.
8. This conflicts with the current product lifecycle, where account deletion is not implemented and future deactivation is intended to preserve underlying data. It also expands destructive impact of a web DB credential compromise without supporting a current operation.
9. No HTTP route, SQL injection, session bypass or way for an ordinary forum user to directly exercise this database privilege was established. The precondition is direct use/compromise of the web DB capability, which already has substantial read/write authority; incremental impact is therefore **Low/P3**.
10. Repository capability contract definitely contains the overgrant. Historical Stage-6 evidence/docs say the `0000–0020` production web ACL was provisioned with the reviewed full CRUD user grant, but mutable live ACL state was not reread in G3: **Информация не проверена** for the exact current production grant.
11. This is not a duplicate of Block B auth findings: root cause is the database relation privilege matrix, not authentication/session semantics.
12. Remediation is **not assigned** in audit. G4/G7 should treat the repository ACL contract as the authoritative input and must not silently assume this grant is necessary.

## G4 — результат

1. Verdict: **1 additional current-scope finding — `DB-RUNTIME-EVIDENCE-01 Low/P3`** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Production DB mutation/provisioning workflows are manual `workflow_dispatch`, main-only at job admission, use exact `github.sha` checkout and share `production-db-migrations` serialization. DB migration/runtime-privilege/relation-provision jobs name protected Environment `production-db`; Worker rollout isolates its no-secret guard/verify jobs before `production-worker` Environment access.
3. Exact live GitHub Environment protection/approval configuration is mutable external state and was not reread in this audit slice: **Информация не проверена**.
4. Migration identity boundary is fail-closed in repository code: production migration verifier requires the connection to equal the unique application-object owner and rejects database-owner/runtime-owner collapse; the separate identity probe requires exact `vico_forum_migrator` plus effective database CREATE. Relation provisioning independently requires exact `vico_forum_migrator` before grants.
5. Migration preflight requires the target Drizzle ledger to be an exact timestamp+hash prefix of checked-in history and rejects divergent/reordered/extra history. Postflight requires exact complete ledger and current repository structural manifest; current manifest target is `0063_owner_attempt_telemetry`.
6. Relation provisioning derives every GRANT from `runtimeCapabilityContracts.web`, executes one transaction, then runs the shared full end-state runtime ACL assertion before COMMIT. Caller-provided arbitrary SQL is not accepted.
7. Provisioning therefore propagates current `DB-ACL-USER-DELETE-01` because that overgrant is inside the shared contract; this is the same G3 root cause and is **not duplicated** as a G4 finding.
8. GitHub official rerun semantics were checked: a rerun keeps the original `GITHUB_SHA` and `GITHUB_REF`. Production migration rerun therefore stays on the originally reviewed revision; its preflight also rejects a target ledger longer than that old revision's journal, so no DB downgrade/stale-revision overwrite path was established. No separate rerun finding.
9. Tests/contract probes were read as evidence, but **not run** in this G4 audit slice. No external workflow dispatch or production mutation was performed.

### DB-RUNTIME-EVIDENCE-01 — Low/P3

1. Current `.github/runtime-migration-evidence.json` requires only `0020_translation_generation_permission`, backed by successful production migration run `36270353184` at SHA `b172264e4b0db1fe68dead7d7f25b49a573eb0cd`.
2. That evidence SHA is an ancestor of current main by 163 commits. Current repository migration history and `.github/production-schema-manifest.json` now target `0063_owner_attempt_telemetry`.
3. `verify-runtime-migration-evidence.mjs` checks that the evidence SHA is an ancestor, the recorded journal hash matches, the referenced workflow run succeeded on main, and the evidence journal matches current history **only through `requiredMigrationTag`**.
4. The verifier does **not** require `requiredMigrationTag` to equal the current manifest target, newest checked-in migration, or another repository-derived minimum schema requirement for the Worker being rolled out.
5. `production-worker-rollout.yml` therefore accepts the current `0020` evidence while building/testing the current Worker against a disposable database migrated through current history. It does not query the target production schema before Cloudflare upload/promotion.
6. Its production/version smoke covers public locale reads plus unauthenticated `GET /api/auth/get-session`; it does not execute authenticated topic/reply writes.
7. Current core forum writes already depend on post-`0020` schema. `createTopic` and reply paths call `assertNoActiveUserMeasureRestriction`, which queries `user_measures` and `user_measure_restrictions` introduced by migration `0058_user_measures`.
8. Consequently an otherwise authorized current-main Worker rollout can satisfy the repository migration-evidence gate using only historical `0020` evidence and promote code whose ordinary authenticated write path requires `0058`. On a target still at that accepted prefix, topic/reply writes fail on missing relations instead of being prevented before rollout.
9. This violates the stated schema-first migration → evidence → schema-dependent runtime ordering. The local full-schema test does not repair the gap because it proves current code against a fresh current schema, not the external target schema.
10. No authorization bypass or fail-open measure bypass was established; the missing-table path aborts the operation. Primary impact is preventable deployed availability/incompatibility after an explicitly authorized rollout.
11. Stage 6 is currently paused and no rollout was executed. Exact mutable live production schema at this moment is **Информация не проверена**; the finding is in the current repository gate because it can accept evidence below a proven current runtime dependency.
12. Explicit owner authorization/production rollout is required to trigger external impact, and the project is pre-release, so severity remains **Low/P3**.
13. G7 must re-check this same evidence root cause when closing manifest/evidence/drift detection; it must not create a duplicate finding.
14. Remediation is **not assigned** in audit.

## G5 — результат

1. Verdict: **PASS, 0 additional current-scope findings** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Exact installed transaction stack was checked against source: `pg@8.23.0` client-side `query_timeout` can return `Query read timeout` while an already-sent non-pipelined query remains in flight; exact `drizzle-orm 0.45.2` NodePg transaction wrapper executes `BEGIN → work → COMMIT` and on COMMIT error attempts `ROLLBACK`. Therefore a lost/late COMMIT acknowledgement is a real ambiguous-outcome class and was not dismissed as impossible.
3. This ambiguity did **not** produce a confirmed current security finding by itself. Current application writers do not automatically retry an unavailable mutation response, and no path was found that converts the ambiguous result into a second uncontrolled authority/evidence mutation.
4. Authorization management is one atomic PostgreSQL transaction under `authz_mutation_lock`: fresh Owner/permission/AP-10 admission, role/grant/assignment/override mutation and Admin History commit together. Repeated desired-state writes are no-op/idempotent where applicable; repeated create/delete after a committed-but-unacknowledged operation fail by existing identity/existence constraints rather than creating a second authority object. No automatic POST replay exists.
5. Registration policy uses a singleton row lock plus positive `expectedVersion` CAS and atomic Admin History. A stale retry after an already committed update conflicts instead of applying a second transition; Settings explicitly revalidates conflict and does not automatically replay unavailable POSTs.
6. SET-06 privacy uses a single READ COMMITTED transaction, locks the same user row as heartbeat admission, upserts one boolean preference and conditionally removes presence. Saving the same boolean is idempotent; the route does not automatically retry a failed POST.
7. AP-10 user measures have stable measure IDs plus operation IDs/fingerprints and committed-operation lookup. Create/change/lift/appeal retry semantics return the already committed result for an identical replay and reject a mismatched replay; the shared authorization mutex is acquired before measure/authority state.
8. Complaints mutation commands use actor serialization, Case row locks and `operationId + fingerprint` event replay for security-sensitive note/decision/appeal/priority transitions. Existing committed result notifications survive exact replay without duplicate side effects.
9. Forum closure uses topic-row `FOR UPDATE` plus closure-version CAS; publication/edit attachment paths retain the previously verified committed receipt/generation replay semantics from Block F. G5 found no new DB root cause there.
10. Controlled locale mutation is the explicit strong-reconciliation path: SERIALIZABLE + table lock, retries only `40001`/`40P01`, and ambiguous COMMIT is reconciled against semantic pre/post state rather than blindly replayed.
11. SA-02 auth facts/attempt telemetry use stable occurrence identities or bounded slots and explicitly surface uncertain COMMIT instead of blind retry. Owner/System monitoring writes are evidence/telemetry rather than authority-changing application mutations; no current escalation path was found.
12. Lock-order sweep found no current cycle that changes authority/evidence state: authorization/AP-10 paths acquire the shared authz mutex before their target locks; forum history appends only after domain locks; Complaints consistently acquires actor mutex before Case lock; Admin History ordering lock is appended after domain state and no inverse history→domain lock path was found.
13. `AuthorizationRepository.mutate()` can let a failing `ROLLBACK` replace the original transaction error, unlike several newer helpers that preserve the original failure. This is a robustness inconsistency, but no current security impact or fail-open authority path was established; it is **not** a G5 finding.
14. Current source-of-truth states PostgreSQL advisory locks are not accepted for real Hyperdrive runtime coordination. Current `WEB_HYPERDRIVE` production path remains unbound/inactive and Stage 6 is paused, so any future incompatibility of remaining advisory-lock users is Stage-6 acceptance work rather than a current G5 finding by itself.
15. Tests/probes were read as evidence, but **not run** in this G5 audit slice. No external database/Hyperdrive mutation was performed.

## G6 — результат

1. Verdict: **1 additional current-scope finding — `DB-TEST-TARGET-01 Low/P3`** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Current destructive DB tests consistently try to fail closed on a disposable target: repository search for current `drop schema` paths found no such path without an `_test` marker, and representative suites require URL hostname exactly `localhost` / `127.0.0.1` plus a pathname ending in `_test`.
3. Exact pinned dependency chain is `pg@8.23.0` → `pg-connection-string@2.14.0`. Its exact source parses query parameters into connection config **before** applying the URL hostname and explicitly lets a query parameter `host` override the URL hostname; `port` is likewise taken from query config when present.
4. The test guards inspect only WHATWG `new URL(connectionString).hostname` and `.pathname`, then pass the original unmodified connection string to `pg.Client` / `pg.Pool`. Therefore a value such as `postgresql://user:pass@localhost:5432/vico_forum_test?host=external.example` passes the local-host + `_test` guard while node-postgres resolves the actual connection host from the query parameter.
5. `tests/database/migrations.test.ts` then executes `drop schema if exists drizzle cascade; drop schema public cascade; create schema public` in `beforeAll`. An external PostgreSQL target whose database name ends in `_test` can therefore be destructively reset despite the helper's stated local-only boundary.
6. Other isolated-schema DB tests using the same URL-guard pattern inherit the same parser mismatch. This is one root cause and is not duplicated per test file.
7. Standard PR CI and the pre-rollout Worker verification job use repository-fixed loopback `vico_forum_test` URLs and do not inject production DB secrets into the destructive test job. No current untrusted PR input was found that rewrites those `DATABASE_URL` values.
8. `.github/workflows/production-db-migrate.yml` does not invoke `db:test` or another destructive development helper against the live target; it uses protected migration credentials with preflight → `db:migrate` → postflight verification.
9. The generic `pnpm db:migrate` command is not a separate G6 finding: it only operates on the explicitly supplied `DATABASE_URL` and does not independently discover or import the protected production target. The current production path wraps it with the dedicated workflow gates.
10. `DB-TEST-TARGET-01` is current repository scope rather than future Stage-6 hardening because the existing helper explicitly claims to reject non-local targets and that safety check is bypassable today by an accepted connection-string form.
11. Severity is **Low/P3**: exploitation/misuse requires control of the test process environment and an external database named with the accepted `_test` suffix; no public HTTP path, production secret exposure or automatic production targeting was established. The impact, when those preconditions hold, is destructive schema loss.
12. Live production applicability is not required for the finding and was not tested. Exact mutable external targets are **Информация не проверена**.
13. Tests were not executed and no external database mutation was performed in this audit slice.
14. Remediation is **not assigned**. G7 is next.

### DB-TEST-TARGET-01 — Low/P3

1. Root cause: safety validation and connection execution use different parsers/semantics. The guard trusts WHATWG URL host/path, while node-postgres accepts query-level connection overrides.
2. Confirmed bypass: URL host remains `localhost` for the guard, but query `host` changes the host used by `pg`; the database pathname still ends in `_test`, so both guard predicates pass.
3. Confirmed impact: the full migration integration test drops `drizzle` and `public` schemas with `CASCADE` before replaying migrations.
4. Current CI configuration is safe by construction, so this is not evidence of an existing production incident. It is a broken target-isolation guard on a destructive current tool.
5. Fixing it belongs to a separate bounded remediation task; audit does not change implementation.

## Цель

Проверить, что текущая PostgreSQL/Drizzle foundation не позволяет:

1. незаметно переписать или подменить accepted migration history;
2. развернуть runtime на schema, для которой отсутствует обязательная repository-side compatibility/evidence boundary;
3. получить runtime DB capability шире фактически требуемой;
4. обойти security invariants прямым SQL-path из разрешённой runtime capability;
5. превратить timeout/ambiguous transaction outcome в повтор опасной mutation или частично применённое состояние;
6. случайно направить destructive development/test tooling в external/production database.

Block G проверяет **database/migration security**, а не заново application authz, attachment security, Worker topology, secrets lifecycle или production rollout.

## Current Stage boundary

### В current scope

1. Полная checked-in migration history `drizzle/0000–0063`, Drizzle journal/snapshots и current resulting schema.
2. Repository guards против rewrite/delete/reorder accepted migrations.
3. Clean PostgreSQL 17 migration path, schema/manifest parity и DB integration checks.
4. Current schema-level constraints, FKs, triggers/functions и ownership assumptions, которые являются security/correctness boundaries.
5. Named repository runtime capability contracts и SQL privilege probes для localization/web roles.
6. Repository migration/provisioning workflows до момента внешней mutation: branch/SHA/environment/confirmation/evidence gates, identity separation и fail-closed checks.
7. DB transaction/locking/timeout/replay boundaries только там, где root cause находится в PostgreSQL/repository layer и ещё не покрыт более ранним Block.
8. Guards, не позволяющие destructive local/test DB operations безопасно пересечься с production/external target.

### Не считать current finding само по себе

1. Production schema остаётся на externally accepted `0000–0020`, пока Stage 6 paused.
2. Pending `0021–0063` не применены в Neon.
3. Live production runtime role/grant drift, pooled-session state, backup/restore и new migration rollout не перепроверены без Stage 6.
4. Existing external state из `docs/database/*` — historical/current operational evidence, но mutable topology перед новым external action должна проверяться заново.
5. Отсутствие production backup/restore acceptance до возобновления Stage 6 не является current pre-release defect.
6. Новая более строгая DB hardening идея без достижимой current repository/runtime path не является finding.

При необходимости live external утверждения использовать: **«Информация не проверена»**.

## Anti-duplication boundary

1. Authentication/session DB misuse → Block B, если root cause в auth/session semantics.
2. Permission/Owner escalation → Block C, если DB лишь хранит состояние, а root cause в authorization.
3. Admin/Complaint privacy → Block D.
4. Public request bounds/business logic → Block E.
5. Attachment tables/cleanup/content → Block F.
6. Cloudflare routes/bindings/runtime topology → future Block H.
7. Secrets/GitHub supply-chain secret handling → future Block I.
8. Generic abuse/resource exhaustion → future Block K.

Пересечение с другим Block фиксируется как ссылка на прежний finding, а не новый duplicate, если root cause тот же.

## План проверки

### G1 — Migration history integrity

1. Accepted SQL/snapshots/journal immutable contract.
2. Append-only ordering, matching SQL ↔ journal ↔ snapshot.
3. Clean-database replay на PostgreSQL 17 и final schema consistency.
4. Manual SQL migrations/functions/triggers не должны выпадать из history/verification boundary.
5. Current repository head не должен принимать divergent/reordered history как valid.

### G2 — Schema-level security invariants

1. PK/unique/FK/check constraints, deferrable relations и cascade/restrict semantics в security-sensitive domains.
2. Security-definer functions/triggers: fixed search path, identifier/data separation, privilege behavior.
3. Trigger/constraint boundary должен защищать direct SQL path, когда application-only check недостаточен.
4. No unintended ownership/cascade path, который удаляет retained/audit/security evidence или меняет authority.
5. Schema model и migration SQL должны сходиться на current final state; исторические superseded columns сами по себе не finding.

### G3 — Runtime least privilege

1. `localization-read` и `web` named capability contracts соответствуют фактическим repository operations.
2. No unexpected table/column/sequence/function/schema/database privileges или grant options.
3. Runtime role не получает DDL/migration/admin capability.
4. Cross-domain negative probes действительно запрещают операции, которые application runtime не должен выполнять.
5. Direct SQL permissions не должны обходить database-level trigger/constraint security boundaries.

### G4 — Migration / privilege workflow gates

1. Production DB workflows main-only/exact-head/manual/protected-environment boundaries.
2. Dedicated migrator identity отделена от runtime roles; runtime credential не может выполнять migration path.
3. Pre/post migration verification fail closed до/после write.
4. Relation provisioning derives grants из repository capability contract, а не из caller-provided arbitrary SQL.
5. Evidence gate не позволяет schema-dependent runtime rollout опереться на unrelated/stale migration evidence.
6. Этот slice проверяет repository workflow contract; live dispatch/prod mutation не выполняется.

### G5 — Transaction, locking and ambiguous outcomes

1. Security-critical multi-row mutations либо атомарны, либо имеют доказанный reconcile/idempotency path.
2. Lock ordering/row/table/advisory boundaries не оставляют race, который меняет authority/evidence/ref state.
3. Retry ограничен безопасными SQLSTATE/outcome classes; ambiguous COMMIT не blind-retry mutation.
4. Cleanup/disconnect failure не должен заменять уже определённый transaction result.
5. Не дублировать уже закрытые Block C–F transaction findings; новый finding требует отдельного DB root cause.

### G6 — Destructive tooling and target isolation

1. `db:test`, migration tests и other destructive helpers fail closed на non-test/external target.
2. Test DB naming/connection guards нельзя обойти очевидным malformed/alternate connection input.
3. CI disposable database path не использует production secrets/bindings.
4. Local migration/test commands не должны неявно выполнять external rollout.
5. Production workflows не используют destructive development/test helpers против live target.

### G7 — Manifest, evidence and drift detection

1. Repository structural manifest покрывает заявленные correctness/security-critical objects для своего accepted external range.
2. Runtime privilege verifier сравнивает complete end state, а не только наличие ожидаемых grants.
3. Migration→runtime evidence identity: workflow/run/SHA/journal/tag ancestry и coverage.
4. Repository current `0021–0063` не требуется добавлять в external `0000–0020` manifest до реального Stage-6 rollout; проверить только отсутствие ложного заявления, что production уже соответствует repository head.
5. Mutable production drift остаётся **Информация не проверена** без live read-only Stage-6 check.

### G8 — Cross-chain closeout

1. Re-run migration → final schema → runtime grants → representative direct SQL → application DB adapter chain.
2. Свести findings по root cause и убрать duplicates с Blocks B–F.
3. Каждый candidate проверить на current Stage, attacker/capability path и observable security impact.
4. Future Stage-6 operational acceptance отделить от repository defect.
5. Remediation не начинать автоматически.

## Основные current code seams

1. `drizzle/*.sql`
2. `drizzle/meta/_journal.json` и `drizzle/meta/*_snapshot.json`
3. `db/schema.ts`
4. `.github/production-schema-manifest.json`
5. `.github/runtime-migration-evidence.json`
6. `.github/scripts/migration-history.mjs`
7. `.github/scripts/verify-migration-history.mjs`
8. `.github/scripts/verify-production-migration.mjs`
9. `.github/scripts/verify-production-schema-manifest.mjs`
10. `.github/scripts/runtime-privileges.mjs`
11. `.github/scripts/verify-runtime-privilege-probes.mjs`
12. `.github/scripts/verify-runtime-migration-evidence.mjs`
13. `.github/workflows/production-db-migrate.yml`
14. `.github/workflows/production-db-identity.yml`
15. `.github/workflows/production-runtime-privileges.yml`
16. `.github/workflows/production-web-relation-provision.yml`
17. `tests/database/migrations.test.ts`
18. related runtime-privilege / migration-history / production-verifier contract tests.

Список — starting map, не гарантия finding и не разрешение расширять G в unrelated application audit.

## Evidence hierarchy

1. Current `main` code/schema/tests и source-of-truth contracts.
2. Disposable PostgreSQL 17 integration behavior, если выполняется в конкретном G slice.
3. Current repository CI/workflow contracts.
4. Historical external evidence — только для утверждения уже зафиксированного прошлого состояния.
5. Mutable production state — только после отдельной live read-only проверки, если Stage 6 будет явно возобновлён.

Tests/green CI — evidence, но не заменяют causal analysis.

## Критерий Block G finding

Finding фиксируется только если одновременно установлены:

1. конкретная current repository/runtime DB path;
2. нарушенный действующий security/database contract;
3. достижимый actor/capability/input/state;
4. causal chain до security impact;
5. root cause относится к Database/migrations, а не уже существующему finding другого Block;
6. проблема относится к current Stage, а не только paused external rollout.

## Критерий завершения Block G

1. G1–G8 пройдены против зафиксированного stable current-main target либо явно описанного descendant.
2. Migration history, final schema, security-critical DB invariants, runtime ACL contract и repository workflow gates проверены как единая цепочка.
3. Каждый finding имеет causal path, impact, severity и Stage classification.
4. Production/live claims, которые нельзя проверить без Stage 6, помечены **«Информация не проверена»**.
5. Remediation не начинается автоматически: confirmed findings сначала фиксируются и затем получают отдельную bounded correction task только по решению владельца.
