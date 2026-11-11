# Block G — Database & migrations security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. **G1 — Migration history integrity завершён: PASS, 0 current-scope findings.**
3. Repository migration history: `0000–0063`; externally accepted migration evidence: `0000–0020`.
4. Отставание external target от repository history само по себе **не finding**: Stage 6 external integration paused, а current source-of-truth разрешает repository/local-CI schema evolution без немедленного Neon rollout.
5. Следующий bounded slice — **G2 Schema-level security invariants**.
6. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
7. Production/Neon/Cloudflare mutation в Block G не разрешена и не выполняется.

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
