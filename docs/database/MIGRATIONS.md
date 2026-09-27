# Database migrations

## Назначение

Этот документ разделяет два разных процесса:

1. **development migration** — schema evolution для active local/CI разработки;
2. **external rollout** — применение уже reviewed schema в pre-release/production-like
   PostgreSQL перед runtime deployment, который от неё зависит.

Обычная разработка не должна превращаться в production rollout только из-за появления
новой таблицы или migration.

## Development baseline

- PostgreSQL schema changes коммитятся как reviewed forward SQL в `drizzle/` и применяются
  через Drizzle migration history. Production schema changes не используют `drizzle-kit push`.
- `pnpm db:check` проверяет migration metadata.
- `pnpm db:test` воспроизводит полную migration history на disposable PostgreSQL 17 и может
  выполняться только против локальной test DB, имя которой заканчивается на `_test`.
- Pull-request CI защищает accepted migration history и проверяет current schema/tests.
- Во время active pre-release feature-разработки новая migration может быть merged вместе с
  runtime/domain code, если change не выкатывается автоматически во внешний runtime и local/CI
  проверки доказывают согласованность schema + code.
- Новая migration **не обязана немедленно применяться в Neon** только для того, чтобы
  продолжать разработку следующего feature PR.

`DATABASE_URL` является server/admin development input. Он не коммитится, не логируется и
не попадает в browser/Worker bundle.

## Immutable accepted history

После попадания migration в `main` её SQL и соответствующий Drizzle snapshot считаются
accepted history и не переписываются. Исправления делаются новой forward migration.

PR CI отклоняет:

- modification/deletion/rename accepted `drizzle/*.sql`;
- modification/deletion/rename accepted `drizzle/meta/*_snapshot.json`;
- rewrite/delete существующих entries в `drizzle/meta/_journal.json`;
- non-monotonic/duplicate appended journal entries;
- новый SQL без matching journal entry и наоборот.

`drizzle-kit check` и clean-database integration suite остаются отдельными проверками:
history guard защищает прошлое, а Drizzle/tests проверяют текущую итоговую schema.

## External schema-dependent rollout

Только когда новая schema действительно должна стать доступной во внешнем
pre-release/production runtime, действует schema-first ordering:

```text
reviewed migration on main/release revision
→ target-environment migration workflow
→ target DB verification
→ migration evidence
→ runtime rollout that depends on the new schema
```

Первое появление target-environment schema и runtime, который уже требует эту schema,
нельзя выкатывать одним неразделимым external deployment step. Это rollout constraint, а
не запрет разрабатывать schema и runtime совместно локально/в CI.

Если application release после migration неудачен, rollback application code должен
сохранять совместимость с уже применённой schema. Production recovery — forward repair или
проверенный backup restore; автоматические destructive down migrations не являются baseline.

## Current production migration workflow state

Workflow **Production database migration** запускается вручную через `workflow_dispatch`,
ограничен `refs/heads/main`, serializes production DB migrations и проверяет exact checked-out
`github.sha`.

Stage 6 восстановил dedicated least-privilege migration credential и отдельно доказал
external execution identity как exact `vico_forum_migrator` через manual read-only workflow из
`main`. Production migration workflow после этого больше не содержит
`PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION`: database-owner connection всегда rejected, а
migration connection должна совпадать с application owner role.

Workflow использует две разные fail-closed verification phase вокруг `db:migrate`:

1. **pre-migration**: target ledger обязан быть exact prefix checked-in migrations по паре
   `created_at + Drizzle SHA-256 hash` и не может быть короче known-applied target prefix
   `0000`–`0003`; extra/reordered/rewritten/divergent history rejected. До write также проверяются PostgreSQL 17/UTF-8, dedicated migrator, stable
   `0000`–`0003` schema/data invariants и существующий localization least-privilege contract.
2. **post-migration**: ledger обязан точно совпасть с complete checked-in migration history по
   `created_at + Drizzle SHA-256 hash`, а target schema —
   с repository-owned full structural manifest `0000`–`0020`. Manifest покрывает 27 public
   application tables, columns/types/nullability/defaults, PK/unique/FK/check/index contract,
   manual deferrable forum foreign keys, а также correctness-critical trigger/function definitions
   и trigger enablement; ownership/ACL invariants проверяются уже на полном наборе application tables.

Stage 6 manual migration attempt `36265351353` на exact `main`
`53181e30253061614c43f6b1682eaa0ec958e2d3` прошёл metadata/preflight, но `db:migrate`
остановился до pending migration SQL. Pinned `drizzle-orm 0.45.2` PostgreSQL migrator перед
чтением ledger безусловно выполняет `CREATE SCHEMA IF NOT EXISTS drizzle`; PostgreSQL 17 требует
для этого database-level `CREATE`. Dedicated `vico_forum_migrator` этой capability не имел.
После failure ledger и public application schema остались на known-applied `0000`–`0003`;
retry не выполнялся.

Repository verifier поэтому дополнительно требует:

- direct non-grantable database `CREATE` ACL для exact application owner/migration role;
- отсутствие database `CREATE` у localization runtime role и `PUBLIC`;
- manual identity workflow проверяет и exact `vico_forum_migrator`, и effective
  `has_database_privilege(current_user, current_database(), 'CREATE') = true` внутри
  read-only transaction.

Этот contract только проверяет capability и сам не выполняет `GRANT`, migration retry или deploy.
После merge verifier boundary отдельный bounded owner-controlled grant был выполнен и проверен:
dedicated `vico_forum_migrator` имеет direct non-grantable database `CREATE`, localization
runtime и `PUBLIC` этой capability не получили. Последующий manual read-only identity/capability
workflow на current `main` успешно подтвердил exact migration role и effective database
`CREATE`.

После capability gate пользователь отдельно разрешил один новый manual production migration
dispatch. Он успешно применил pending `0004`–`0020`; post-migration verification подтвердила
exact complete `0000`–`0020` ledger, repository-owned full structural manifest и production
privilege contract. Repository-owned accepted migration→runtime evidence теперь покрывает
`0020_translation_generation_permission`.

Schema-first migration/evidence gate для текущей migration history тем самым закрыт. Это не
означает, что Worker, runtime DB roles/Hyperdrive capabilities, OAuth или translation
Queue/provider runtime уже развёрнуты; schema-dependent runtime rollout остаётся отдельным Stage 6
шагом.

## Production verification contract

Target-environment verifier проверяет стабильные invariants, а не mutable product state.
Текущий contract включает как минимум:

- PostgreSQL 17 и UTF-8;
- phase-aware migration ledger contract: exact `created_at + Drizzle SHA-256 hash` known-applied prefix до write и exact complete history после write;
- repository-owned full target structural manifest для `0000`–`0020`, включая column defaults и correctness-critical triggers/functions, проверяемый CI против clean PostgreSQL 17;
- отсутствие persistent bootstrap/reserved locale rows (`en`, `api`, `assets`);
- отсутствие persistent canonical-English UI translation rows;
- current connection role, application owner и configured runtime role attributes/memberships;
- direct non-grantable database `CREATE` для application owner/migrator при отсутствии этой
  capability у localization runtime и `PUBLIC`;
- application table ownership;
- schema/table/sequence privileges, column ACL/grant options, `PUBLIC` grants и default ACL;
- отсутствие неожиданных cross-domain runtime grants/ownership.

Verifier намеренно не фиксирует mutable locale publication/translation state, aliases,
native names или presentation metadata.

При добавлении forum schema target-environment verifier расширяется только когда эта schema
готовится к external rollout. Обычный Stage 4B development PR не обязан заранее добавлять
production role grants или external catalog acceptance для ещё не выкатываемой schema.

## Runtime privilege model

Runtime capabilities разделяются по реальной ответственности и principle of least privilege.
Existing localization role не расширяется на forum/auth writes.

После schema-first acceptance `0000`–`0020` reviewed repository contract разделяет две HTTP
capabilities:

- `localization-read`: только `SELECT` на `locales`, `ui_translations`,
  `ui_translation_bundles`;
- `web`: Better Auth CRUD, forum read/write, dynamic authorization management и persisted
  forum-content presentation reads по exact ACL matrix из `HYPERDRIVE.md`.

При текущем Worker composition content-generation action остаётся disabled, поэтому web role не
получает task/generation-head/request-budget/UI-translation write capabilities. Background
translation execution/publication и maintenance остаются отдельной будущей Stage 6 execution
boundary.

Production role names environment-specific и не hard-code-ятся в migrations. Repository verifier
получает existing localization role через `RUNTIME_DATABASE_ROLE`, а current provisioned web role
через protected `WEB_RUNTIME_DATABASE_ROLE`; current production value подтверждён как
`vico_forum_web`.

Runtime privilege acceptance отделена от production migration workflow:

1. PR CI проверяет named capability contract и relation-provisioning unit tests;
2. disposable PostgreSQL 17 получает exact proposed grants, выполняет representative positive
   queries/row-locks плюс negative cross-domain, DELETE и DDL probes и отдельно моделирует
   production split authority: database owner создаёт prerequisites, а exact object owner
   `vico_forum_migrator` выполняет relation-grant transaction;
3. external owner phase остаётся отдельной явно разрешаемой operation: passwordless
   `PASSWORD NULL` фиксируется как command/evidence invariant, потому что migrator не имеет и не
   должен получать доступ к password verifier catalogs;
4. protected manual relation-provisioning workflow требует exact confirmation token до DB
   connection, проверяет exact migrator identity, owner-phase DB/schema/membership prerequisites и
   ownership всех web relations, derive-ит GRANT SQL только из shared web capability и перед commit
   запускает shared full end-state verifier;
5. после отдельного external provisioning manual main-only
   `Production runtime privilege verification` read-only проверяет exact roles/ACLs в target DB;
6. только после successful privilege evidence может рассматриваться Worker wiring/deployment.

Current production execution завершила owner phase, exact migrator relation grants и read-only
runtime privilege verification successfully. Это принимает database privilege boundary, но не
создаёт usable web credential, Hyperdrive binding или Worker rollout.

Runtime verifier требует для обоих roles LOGIN + effective database `CONNECT`, отсутствие
dangerous attributes, inherited memberships/ownership, `public.USAGE` без `CREATE` и полный
database ACL contract. Runtime role допускает только optional direct non-grantable `CONNECT`;
direct `TEMPORARY`, `CREATE`, grant options и иные database privileges rejected. `PUBLIC`
допускает только hard-wired-equivalent non-grantable `CONNECT` / `TEMPORARY` либо их отсутствие;
`CREATE`, grant options и иные database privileges rejected. Snapshot сохраняет safe
`datacl IS NULL` semantics через PostgreSQL `acldefault('d', datdba)`. Также запрещены
unexpected column/sequence/direct-function privileges и unexpected default/PUBLIC grants. PUBLIC
default boundary сохраняет только уже принятую hard-wired-equivalent function `EXECUTE` / type
`USAGE` semantics; runtime roles default grants не получают. Existing managed database-owner
inbound admin control допускается только в уже принятой non-inheriting /
non-SET форме.

Current production уже имеет reviewed web PostgreSQL role и exact relation grants, подтверждённые
shared runtime verifier. Это **не** означает, что usable web credential, cache-disabled Hyperdrive
binding, Worker routing или deployment уже существуют. Migration workflow намеренно остаётся
независимым от web runtime provisioning, поэтому будущая schema migration не связывается с
наличием или rollout web capability.

Runtime-role deadline defaults и exact new Hyperdrive binding name/ID — operational runtime-wiring
configuration, не portable schema. Existing localization defaults/acceptance и reviewed web matrix
описаны в `HYPERDRIVE.md`.

## Migration → runtime evidence

Evidence требуется для **external schema-dependent runtime rollout**, а не для каждого merged
migration commit.

Минимальный evidence chain:

```text
target migration workflow run
→ exact checked-out Git SHA
→ checked-in Drizzle journal identity/history
→ successful target DB verification
→ schema-dependent runtime rollout
```

После успешного target migration workflow repository-owned
`.github/runtime-migration-evidence.json` фиксирует:

- workflow run ID;
- exact migration SHA;
- SHA-256 Drizzle journal;
- newest migration tag, от которой зависит внешний runtime rollout.

Обычный pull-request CI проверяет repository-local migration history и unit/static evidence
contract, но не обращается к GitHub Actions API и не требует актуальный external migration
workflow run.

Live verification workflow identity, `main`, successful completion, ancestry и journal coverage
обязательна на границе фактического **external schema-dependent runtime rollout**.
Скрипт `.github/scripts/verify-runtime-migration-evidence.mjs` и repository-owned evidence
сохраняются для этой границы.

Evidence file не обновляется при каждой development migration. Он фиксирует successful target
migration, выбранную как schema gate для следующего schema-dependent external runtime rollout;
само обновление evidence не утверждает, что runtime уже deployed.

Текущий evidence относится к `0020_translation_generation_permission`: successful Stage 6
production migration уже проверила полный `0000`–`0020` target, а schema-dependent runtime
rollout ещё не выполнен.

## Исторические rollout checkpoints

### Stage 3A

`ui_translations` и `ui_translation_bundles` впервые были добавлены migration-only, затем
применены/проверены в production-like DB, после чего отдельный runtime rollout получил
read-only persistent translation access. Этот rollout остаётся валидной историей уже
развёрнутого localization foundation.

### Stage 4A

Stage 4A добавил Better Auth `1.7.4` core tables и database-backed `rate_limit` как
migration-only foundation. `user.locale` nullable и server-owned, без FK на `locales`, потому
что bootstrap `en` code-owned.

Stage 4A runtime dependency не добавлялась: Better Auth initialization, auth routes, Google
OAuth, auth Hyperdrive/role/grants и Worker auth writes отсутствуют. Поэтому отсутствие
runtime evidence для `0003` не блокирует Stage 4B forum development.

Stage 6 schema-first prerequisite для Better Auth/forum/translation runtime теперь выполнен:
все migrations through `0020` применены/verified, а repository-owned evidence обновлён до
external runtime rollout.

### Stage 6 migration bootstrap capability

Первый разрешённый rollout pending `0004`–`0020` выявил не schema defect, а недостающую
migration-tool capability: dedicated migrator должен иметь database `CREATE`, потому что pinned
Drizzle migrator каждый run выполняет idempotent `CREATE SCHEMA IF NOT EXISTS drizzle`.
После reviewed verifier boundary capability была предоставлена отдельным owner-controlled direct
grant без grant option. Pre/post ACL checks и manual read-only identity/capability workflow
подтвердили exact dedicated migrator и effective database `CREATE`, при этом localization runtime
и `PUBLIC` capability не получили.

Сам capability gate не применял pending migrations и не обновлял migration→runtime evidence.
После отдельного явного разрешения пользователя последующий manual production migration run
успешно применил `0004`–`0020` и прошёл full postflight verification. Repository-owned evidence
для следующего schema-dependent runtime rollout теперь фиксирует этот successful `0020` gate.
