# Block G — Database & migrations security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. **G1 — Migration history integrity завершён: PASS, 0 current-scope findings.**
3. **G2 — Schema-level security invariants завершён: 1 current-scope finding — `DB-SEARCHPATH-01 Low/P3`.**
4. **G3 — Runtime least privilege завершён: 1 additional current-scope finding — `DB-ACL-USER-DELETE-01 Low/P3`.**
5. Repository migration history: `0000–0063`; externally accepted migration evidence: `0000–0020`.
6. Отставание external target от repository history само по себе **не finding**: Stage 6 external integration paused, а current source-of-truth разрешает repository/local-CI schema evolution без немедленного Neon rollout.
7. Следующий bounded slice — **G4 Migration / privilege workflow gates**.
8. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
9. Production/Neon/Cloudflare mutation в Block G не разрешена и не выполняется.

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
