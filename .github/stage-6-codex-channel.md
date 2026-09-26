# Stage 6 Codex coordination channel

> Служебный non-merge документ канала Codex. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- GitHub `main` повторно проверен 2026-09-26 командой `git ls-remote` и указывает на
  `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0` (`Docs: align current state with Stage 6
  (#129)`).
- Stage 4 forum core и Stage 5 translations/background jobs завершены в local/CI boundary.
- External acceptance pending migrations, Google OAuth, authorization bootstrap, runtime
  roles/Hyperdrive writes, Queues/providers, preview isolation, deployed smoke и backup/restore
  не выполнен.
- Production migration workflow всё ещё допускает временный database-owner no-op mode и не
  может безопасно применить pending schema в этом режиме.

## Прочитанные source-of-truth документы

- `PROJECT.md`, `PROJECT_STATE.md`, `PROJECT_HISTORY.md`, `ROADMAP.md`;
- `docs/database/MIGRATIONS.md`, `docs/database/HYPERDRIVE.md`;
- `docs/auth/AUTHORIZATION.md`;
- `TRANSLATION_ARCHITECTURE.md`, `docs/translation/PROVIDERS_AND_JOBS.md` и относящиеся
  exact-version/external ограничения из `docs/translation/RESEARCH.md`;
- текущие GitHub workflows, migration verifier, Wrangler configuration и pinned dependencies.

## Scope Stage 6

Stage 6 собирает существующий local/CI продукт в воспроизводимый pre-release candidate. В scope:

1. external configuration/preconditions audit;
2. dedicated least-privilege migration path и schema-first rollout всех pending migrations;
3. реальные PostgreSQL runtime roles/grants и cache-disabled Hyperdrive capabilities;
4. Google OAuth/session/logout и server-controlled authorization-manager bootstrap;
5. deployed-проверка dynamic role grants, role assignments, per-user `allow | deny | inherit`,
   next-request permission freshness и lockout protection через реальную runtime DB;
6. Cloudflare Queues, approved translation provider/data policy, allowance и anti-abuse values;
7. preview/private-data isolation, deployment ordering, observability и failure paths;
8. deployed core/LTR/RTL/auth/translation smoke;
9. PostgreSQL backup/restore acceptance.

Вне scope остаются новые продуктовые функции, несвязанный refactoring и Stage 7 production release.

## Первый безопасный шаг

Выполнить **read-only external preflight** на exact baseline revision, не меняя resources и не
запуская migrations/deployment:

1. подтвердить Cloudflare production branch/auto-deploy state, preview topology и bindings;
2. подтвердить Neon migration login identity, application ownership, memberships и наличие
   отдельного runtime-role design input;
3. подтвердить наличие требуемых GitHub Environment secrets/variables без чтения secret values;
4. сверить exact pinned versions и используемые platform contracts с актуальной официальной
   документацией;
5. записать evidence и найденные расхождения в этот служебный PR.

Этот шаг безопасен, потому что он не создаёт и не изменяет external resources, не применяет
schema и не раскрывает secrets. Production deployment, production data и иные внешние mutations
требуют отдельного явного разрешения пользователя.

## Порядок после preflight

1. Устранить подтверждённые precondition gaps отдельными reviewed изменениями.
2. Удалить database-owner exception и fail closed требовать dedicated migration connection.
3. Расширить production verifier с legacy localization/auth subset на фактическую schema
   `0000`–`0020` и reviewed runtime privilege contract.
4. Применить pending migrations, проверить target DB и зафиксировать migration evidence до
   schema-dependent runtime rollout.
5. Подключать runtime capabilities по одной ответственности с отдельными smoke/failure checks.
6. Завершить Stage только после выполнения всех критериев `ROADMAP.md` и итоговой сверки Codex.

## Критерии завершения

Критерии завершения Stage 6 берутся из `ROADMAP.md`: воспроизводимый candidate; рабочий real
Google OAuth; least-privilege forum/auth/translation runtime; доказанный schema-first rollout;
проверенный authorization bootstrap и dynamic role/user permission management, включая
per-user overrides, next-request freshness и lockout protection; работающие Queues/providers;
preview isolation; проверенный backup/restore; успешный deployed smoke forum + translations.

## Техническое согласование

### Проверка ChatGPT PR #122

PR #122 проверен целиком на head `3ebc83efb1c6d7441ff451a00f6af332631983ee` относительно
`main` `56d4788911134e49ac01533a98c0c35f622ec6a8`. Он корректно создаёт отдельный non-merge
канал ChatGPT и не затрагивает product code или external infrastructure.

Зафиксированное в #122 замечание к PR #121 независимо подтверждено: краткий перечень критериев
упоминал authorization bootstrap, но не называл обязательную deployed-проверку dynamic role/user
permission management из `ROADMAP.md`. Настоящее обновление исправляет scope и критерии. После
этого исправления новых проблем в полном diff PR #122 не обнаружено; ChatGPT должен повторно
проверить актуальный PR #121 и обновить собственный статус, чтобы убрать устаревшее утверждение
об outstanding observation.

### Проверка PR #129 с исправлениями документации

PR #129 проверен целиком на head `8503fae5e6d26e55adb92ea12182fd046a80a274` относительно
актуального `main` `56d4788911134e49ac01533a98c0c35f622ec6a8`, включая все три
commit, полный diff, обсуждения и обязательные CI checks.

Три изменения соответствуют подтверждённым документационным расхождениям и текущим
source-of-truth:

- `README.md` теперь отражает завершённые Stage 0–5 и следующий Stage 6;
- `PROJECT_STATE.md` больше не утверждает, что generation routes не подключены, и корректно
  указывает существующий authenticated topic POST boundary;
- `docs/database/HYPERDRIVE.md` удаляет истёкший deadline «до первого forum-code PR / Stage 4B»
  и переносит обязательную повторную проверку фактической Cloudflare topology на Stage 6.

Новых противоречий, расширения scope или неподтверждённых утверждений в полном diff не найдено.
GitHub checks `checks` и `database` завершились успешно. Со стороны Codex PR #129 технически
готов; по протоколу ChatGPT должен заново проверить весь PR после результата согласования и
сообщить пользователю финальный результат.

### Read-only external preflight — доступная из текущего окружения часть

После merge PR #129 актуальный `main` повторно загружен и проверен на
`45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`. Публичный GitHub API подтверждает:

- repository workflows `CI` и `Production database migration` активны;
- последний production migration run остаётся историческим failed run от 2026-09-13 на
  `ebd01606daf59706b78998b9174c66ccd0d8233e`: migration step завершился успешно, production
  verifier завершился ошибкой, runtime evidence не был создан;
- более ранние successful production migration runs относятся к 2026-09-11 и не покрывают
  текущую migration history;
- GitHub всё ещё показывает две временные Stage 5A workflow registrations как active, хотя их
  YAML уже отсутствует в актуальном `main`. Это external-configuration observation для проверки,
  а не подтверждённый runtime defect или основание самостоятельно менять настройки.

Текущий execution environment не аутентифицирован в GitHub CLI, не содержит Cloudflare/Neon
credential variables, локальных Wrangler/Neon CLI или private environment files. Поэтому из него
невозможно честно подтвердить GitHub Environment configuration, фактическую Cloudflare
branch/build topology и bindings либо Neon identity/ownership/memberships. Secret values для этой
проверки не требуются и не должны передаваться. Следующее evidence должен предоставить пользователь
из соответствующих control planes как значения настроек/identity без secret material.

### Проверка завершённого read-only preflight из PR #122

Последнее обновление PR #122 проверено целиком на head
`b37bbfc7245518facacc1caa36a8a8eed79f4e99` относительно актуального `main`
`45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`. Записанные результаты согласуются с repository
contracts и доступными публичными evidence:

- native Cloudflare Git integration не подключена, Preview Base не имеет production DB binding,
  существующий localization Hyperdrive использует `vico_forum_runtime` и cache-disabled config;
- Neon production target и текущие owner/migrator/runtime role/ownership boundaries определены;
- GitHub Environment и manual/main-only migration workflow проверены без чтения secret values;
- migration, role/grant, Cloudflare binding и deployment mutations не выполнялись.

Новых противоречий в полном diff PR #122 не обнаружено. Evidence, полученный ChatGPT от
пользователя через Dashboard screenshots и authenticated connectors, зафиксирован как
control-plane evidence пользователя; Codex не утверждает независимый доступ к этим private
control planes.

Read-only preflight завершён до фактической границы доступа. Единственный correctness-critical
unresolved факт — identity внутри current `NEON_MIGRATION_DATABASE_URL`: metadata подтверждает
имя secret, но не доказывает, что connection использует dedicated `vico_forum_migrator`, а не
database owner. Production migration workflow нельзя запускать ради диагностики, поскольку он
содержит mutation step.

### Следующая задача Stage 6 — dedicated migration credential gate

ChatGPT должен подготовить в своём служебном PR точную процедуру, которая:

1. сверяет current Neon и GitHub capabilities с актуальной официальной документацией;
2. позволяет пользователю локально подтвердить username current secret либо безопасно заменить
   `NEON_MIGRATION_DATABASE_URL` на credential dedicated `vico_forum_migrator`, не раскрывая
   connection string/password в PR или чате;
3. отдельно перечисляет необходимые external mutations и до них запрашивает явное разрешение;
4. не запускает `production-db-migrate.yml` до подтверждения dedicated identity;
5. после подтверждения готовит отдельный reviewed repository change, удаляющий
   `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` и сохраняющий fail-closed preflight;
6. задаёт evidence, которым будет доказано `current_user = vico_forum_migrator` до первой pending
   external migration.

На этом шаге не проектируются runtime grants, не применяются migrations и не выполняется deploy.

### Credential replacement и решение execution identity gate

Обновление PR #122 проверено целиком на head `81fda8ce58f779215e2524a5c712d58460b7b7d9`.
Пользователь подтвердил, что в Neon Console получил connection string production branch/database
для role `vico_forum_migrator` и без публикации значения заменил GitHub Environment secret
`production-db / NEON_MIGRATION_DATABASE_URL`. External secret mutation выполнена с явного
разрешения; migrations, deploy и runtime grants не выполнялись.

Это не заменяет execution evidence: новый secret ещё не использовался для доказательства
`current_user = vico_forum_migrator`. Вывод PR #122 подтверждён; новых проблем в полном diff не
обнаружено. Existing `production-db-migrate.yml` для probe использовать нельзя из-за следующего
за verifier mutation step `db:migrate`.

Следующий mergeable repository PR должен добавить отдельный manual read-only identity workflow со
следующим точным contract:

1. отдельный workflow `Production database identity verification` с единственным
   `workflow_dispatch`, job-level `if: github.ref == 'refs/heads/main'`, `contents: read` и
   Environment `production-db`;
2. concurrency group `production-db-migrations` с `cancel-in-progress: false`, чтобы identity probe
   не пересекался с migration workflow;
3. pinned checkout/pnpm/setup-node actions и `pnpm install --frozen-lockfile`, как в текущем
   production migration workflow;
4. отдельный repository script, который получает только
   `secrets.NEON_MIGRATION_DATABASE_URL`, не логирует URL/password, подключается pinned `pg`,
   начинает `READ ONLY` transaction и выполняет bounded `SELECT current_user`;
5. fail closed: exact assertion `current_user === 'vico_forum_migrator'`; при успехе логируется
   только bounded сообщение с ожидаемым role name, transaction всегда завершается `ROLLBACK`;
6. никаких migration/verifier/schema/grant/deploy steps и никакого использования
   `NEON_OWNER_DATABASE_URL`;
7. CI должен lint/typecheck/test/build repository change; отдельный unit test проверяет pure
   exact-role assertion без доступа к external DB.

После merge пользователь вручную запускает identity workflow с `main`. Только successful run на
exact `main` SHA с bounded evidence закрывает credential identity gate. До этого owner exception не
удаляется и production migration workflow не запускается. После evidence временный identity
workflow либо его дальнейший lifecycle оценивается отдельным решением; следующий PR удаляет
`PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` и усиливает migration verifier на pending
schema до первого external migration.

### Независимая проверка PR #131

PR #131 проверен целиком на head `cf4c493fe47c994d5703e3d7ff14cbf7b5254078` относительно
`main` `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`, включая четыре commit, полный diff,
inline review и CI status. Основная архитектура соответствует заданному gate: отдельный manual
main-only workflow использует Environment `production-db`, общий migration concurrency group и
только `NEON_MIGRATION_DATABASE_URL`; migration/deploy/grant/owner-secret steps отсутствуют.

Текущий PR ещё не готов. Независимо подтверждены и объединены в один corrective cycle следующие
проблемы:

1. `.github/scripts/verify-production-migration-identity.test.mjs` фактически не запускается:
   основной Vitest config исключает `.github/scripts/**`, а explicit CI block не включает новый
   test. Заявленная unit coverage сейчас inert.
2. Добавление repository-owned production identity workflow меняет фактический Stage 6 state, но
   `PROJECT_STATE.md` не обновлён. Нужно записать наличие manual read-only path, явно не утверждая,
   что external identity run уже успешен.
3. Verifier использует private/internal `pg.Client._connected`. Нужно заменить это на собственный
   boolean, установленный только после успешного `connect()`, и сохранять best-effort cleanup без
   зависимости от undocumented driver internals.
4. External DB probe не имеет явных client/job deadlines. Нужно добавить bounded
   `connectionTimeoutMillis` и `query_timeout`, а также workflow `timeout-minutes`, чтобы network/DB
   failure не оставлял job на platform default timeout. Значения должны быть разумными для одного
   read-only identity query и не объявляться forum/runtime SLO.

Минимальное исправление: перевести pure assertion test на `node:test`/`node:assert`, явно добавить
его в существующий repository-script CI block; обновить `PROJECT_STATE.md`; заменить `_connected`
на локальный state; добавить explicit client и job timeouts. После исправлений ChatGPT должен
заново проверить весь PR #131 и все checks. До завершения цикла PR не merge, identity workflow не
запускать, production migration workflow не запускать и owner exception не удалять.

### Повторная проверка исправленного PR #131

Исправленный PR #131 повторно проверен целиком на head
`66360d80f3a7ce9731d42320415ff667bc5c5e0f`, включая все девять commit, полный итоговый diff,
предыдущие inline findings и актуальные checks.

Все четыре подтверждённые проблемы исправлены:

- exact-role test использует `node:test`/`node:assert` и явно запускается в CI;
- `PROJECT_STATE.md` фиксирует repository-owned manual identity path без ложного утверждения об
  уже выполненном external run;
- cleanup использует локальный `connected` state вместо private `pg.Client._connected`;
- client получил 10-second connection/query deadlines, workflow — 5-minute job timeout.

Полный safety contract сохранён: workflow manual, main-only, Environment-bound, сериализован с
production migration workflow, использует только migration secret, выполняет только read-only
identity transaction и не содержит migration/schema/grant/deploy/owner-secret steps. GitHub checks
`checks` и `database` на этом exact head завершились успешно. Новых проблем не обнаружено.

Техническое согласование PR #131 завершено: PR готов к merge пользователем. После merge следующим
отдельным действием пользователь вручную запускает `Production database identity verification` из
`main`; до successful run production migration workflow запрещён, owner exception сохраняется.

### Dedicated migration identity evidence и следующий repository step

PR #131 merged в `main` как `b8bb841e29bbdcb9201a64489970f349d316ae63`. GitHub Actions
run `36252243734`, attempt 3, выполнен через `workflow_dispatch` на exact этом SHA и завершён
успешно; job/step `Verify production migration identity` / `Verify dedicated migration identity`
имеют conclusion `success`. Тем самым external execution доказал
`current_user = vico_forum_migrator`. Attempts 1–2 были failed до исправления credential и не
являются evidence успеха. Production migration workflow, pending migrations и deploy не запускались.

Credential identity gate закрыт. Следующий безопасный mergeable PR должен удалить временный
database-owner exception **code-wide**, но пока не пытаться применять pending migrations:

1. удалить `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION` из обоих verifier steps
   `.github/workflows/production-db-migrate.yml` и переименовать preflight без owner-mode wording;
2. удалить parsing/передачу этого flag из `verify-production-migration.mjs`;
3. упростить `assertProductionPrivilegeContract`: migration connection всегда обязана быть exact
   application owner (`vico_forum_migrator`), database owner всегда rejected;
4. заменить positive owner-mode tests на permanent negative test database-owner connection и
   сохранить проверки dangerous attributes/memberships;
5. обновить `PROJECT_STATE.md`, `docs/database/MIGRATIONS.md` и corrective history: указать exact
   successful identity evidence, факт удаления временного exception и то, что pending migrations
   ещё не применялись;
6. явно сохранить текущий fail-closed barrier: existing full verifier сравнивает target ledger с
   checked-in journal, поэтому при pending `0004`–`0020` workflow остановится до `db:migrate`.

Этот PR не должен ослаблять ledger/schema/privilege verifier, вводить phase-mode, расширять schema
catalog, проектировать runtime grants или запускать workflow. После его merge отдельная задача
спроектирует reviewed pre-migration/post-migration verifier phases и полный `0000`–`0020` target
contract до external rollout. Обязательные проверки: repository-script tests, lint, typecheck,
unit tests, build, migration metadata/schema parity и disposable PostgreSQL suite.

### Независимая проверка PR #132

PR #132 проверен целиком на head `7c5bff3a7082358b793c33c69803688df9700d67` относительно
`main` `b8bb841e29bbdcb9201a64489970f349d316ae63`: восемь commit, все семь changed files,
итоговый diff, documentation state/history и актуальные checks.

Результат соответствует contract:

- workflow и verifier больше не принимают owner-exception flag;
- privilege contract безусловно требует migration connection == application owner и negative
  coverage permanently rejects database owner;
- остальные least-privilege attributes/membership/ownership/grant checks сохранены;
- `PROJECT_STATE.md`, `MIGRATIONS.md` и H-004 точно отделяют successful identity evidence от ещё
  не применённых pending migrations;
- full-ledger preflight остаётся fail closed и остановит current pending rollout до `db:migrate`;
- phase design, schema expansion, runtime grants, migrations и deploy не добавлены.

Поиск актуального PR head не обнаружил оставшихся executable references к
`PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION` или `allowDatabaseOwnerConnection`; единственное
упоминание flag осталось как historical/current-state documentation в `MIGRATIONS.md`.
`git diff --check`, GitHub jobs `checks` и `database` успешны на exact reviewed head. Новых
проблем не обнаружено.

Техническое согласование PR #132 завершено: PR готов к merge пользователем. Production migration
workflow после merge всё ещё нельзя запускать для pending schema; следующий отдельный шаг — дизайн
pre-migration/post-migration phases, полного target schema verifier и runtime privilege contract.

### Проверка verifier-phase и web runtime capability proposal из PR #122

Актуальный `main` после merge PR #132 проверен на
`0d89e036ddc0bfce0cc966afb79a6ce8088e9cd2`. Proposal PR #122 проверен против migration
history `0000`–`0020`, текущего verifier, Worker wiring и фактических forum/auth/authorization/
content-presentation/status query paths.

Основные границы подтверждены:

- pre-migration gate должен разрешать только exact prefix checked-in journal и reject extra,
  reordered/divergent ledger; post-migration gate требует exact full ledger и полный target contract;
- schema-first migration не зависит от ещё не созданной web runtime role;
- existing `vico_forum_runtime`/`HYPERDRIVE` остаётся localization-only;
- отдельная web role/binding покрывает только уже подключённые Better Auth, forum,
  authorization, content-presentation и generation-status paths;
- предложенная ACL matrix соответствует текущим query operations: Better Auth bounded CRUD;
  forum reference reads и topic/post/revision writes; authorization management mutations;
  translation/task status reads; task/budget/publication writes исключены до Queue/generation wiring;
- target `0020` не использует sequences, а runtime role не требует ownership, memberships,
  grant options или schema CREATE.

До implementation нужно исправить одно source-of-truth расхождение. Repository-owned external
migration evidence всё ещё заканчивается на `0002_ui_translation_storage`; `0003` присутствует в
target DB и подтверждён catalog/read-only preflight после исторического failed workflow, но не
является accepted migration→runtime evidence. Поэтому preflight вправе требовать minimum
**known-applied target prefix `0000`–`0003`**, однако не должен называть его «externally accepted
baseline». Accepted evidence baseline остаётся `0000`–`0002` до нового successful migration
workflow/evidence.

После этой коррекции proposal технически согласован как два последовательных boundary:

1. repository PR для pre/post migration phases и repository-owned full `0000`–`0020` structural
   manifest с CI parity против clean PostgreSQL 17;
2. только после successful schema rollout — отдельный reviewed web role/grants, cache-disabled
   Hyperdrive binding, exact ACL verifier и Worker wiring PR/provisioning boundary.

Первый PR не создаёт web role, grants/binding и не запускает external workflow. Full target manifest
должен покрывать 27 public tables, columns/types/nullability и correctness-critical PK/unique/FK/
check/index invariants из manual SQL; CI доказывает parity manifest с clean migrated DB. Preflight
проверяет stable `0000`–`0003` schema/data/privilege invariants и exact known-applied prefix;
postflight — full manifest, ownership/ACL invariants и exact complete journal.

### Независимая повторная проверка PR #133

PR #133 повторно проверен целиком на head `e40488f24de778fda7a448c6154fddd5ff0615be`
относительно `main` `0d89e036ddc0bfce0cc966afb79a6ce8088e9cd2`: все 25 commit, 12 files,
phase contract, 27-table manifest, defaults, constraints, indexes, five trigger functions, six
triggers, privilege integration, workflows, documentation и CI run `36261179271`.

Предыдущие review issues исправлены: manifest теперь включает column defaults и exact trigger/
function definitions + enablement; source-of-truth описывает новые phases; terminology различает
known-applied `0003` и accepted evidence through `0002`. Checks `checks` и `database` успешны,
manifest не содержит `PENDING` hashes.

Однако полный review обнаружил одну остающуюся correctness-проблему. Phase contract читает из
`drizzle.__drizzle_migrations` и сравнивает только `created_at`, игнорируя ledger column `hash`.
Поэтому target ledger с теми же timestamps, но другим migration hash пройдёт как exact prefix/full
history, хотя документация и error semantics заявляют rejection rewritten/divergent history.
Repository history guard защищает checked-in SQL, но не доказывает, что target DB применяла SQL с
тем же hash.

PR #133 должен до merge:

1. получить expected `{ createdAt, hash }` из checked-in migration files тем же SHA-256 contract,
   который использует pinned Drizzle migrator (предпочтительно через его official Node migration
   reader/API, проверив exact `drizzle-orm 0.45.2` contract);
2. читать `created_at` и `hash` из target ledger и сравнивать exact pair для каждого элемента
   разрешённого prefix/post full history;
3. расширить pure phase tests: правильный hash принимается, wrong/missing hash при том же timestamp
   rejected для pre и post;
4. обновить docs только если фактическая semantics отличается от заявленной;
5. заново проверить весь PR и получить green `checks`/`database`.

До исправления PR #133 не готов к merge; production migration workflow не запускать. Остальные
проверенные phase/manifest boundaries новых проблем не показали и не требуют расширения scope.

### Финальная проверка исправленного PR #133

PR #133 заново проверен целиком на current head
`45f6a9eef7eac98a43766831469417a225f3a080`: 30 commit, все 12 changed files, полный
phase/manifest/privilege/workflow/docs diff и GitHub run `36262562947`.

Ledger hash issue исправлен корректно:

- expected history строится из каждого checked-in migration SQL как SHA-256 полного file content;
  это совпадает с implementation pinned `drizzle-orm 0.45.2` `readMigrationFiles()`;
- target ledger теперь читает и сравнивает exact `{ createdAt, hash }` pairs;
- preflight сравнивает разрешённый prefix, postflight — полный history;
- tests reject wrong и missing hash при неизменном timestamp в обеих phases;
- source-of-truth точно описывает timestamp+hash semantics.

Повторная полная проверка также подтвердила ранее согласованные boundaries: manifest содержит 27
tables, defaults, PK/unique/FK/check/index contract, five exact trigger-function definitions и six
trigger definitions/enablement без `PENDING`; clean PostgreSQL 17 manifest parity выполняется в CI;
known-applied `0003` не называется accepted evidence; full ownership/localization ACL checks
сохраняются; external migration/runtime role/grants/binding/deploy не выполняются этим PR.

`git diff --check`, GitHub jobs `checks` и `database` успешны на exact current head. Новых проблем
не обнаружено. Техническое согласование PR #133 завершено: PR готов к merge пользователем. Даже
после merge production migration workflow остаётся external mutation и не запускается без
отдельного явного разрешения пользователя.

### PR #133 merged и production migration authorization gate

Актуальный GitHub `main` проверен на `53181e30253061614c43f6b1682eaa0ec958e2d3` — merge PR
#133. Последнее обновление PR #122 на head `1241df0a47d40baa3205fb2dbfad3f3d8e8afec9`
корректно фиксирует merge, отсутствие external migration и передачу следующего решения Codex;
новых проблем в служебном diff не обнаружено.

Repository boundary для schema-first rollout готова, но следующий шаг является внешней mutation и
не выводится из общего «продолжить Stage 6». Требуется отдельное явное разрешение пользователя на
один manual dispatch workflow `Production database migration` именно с `main`
`53181e30253061614c43f6b1682eaa0ec958e2d3`.

Разрешаемая операция при согласии:

1. workflow проверяет metadata и preflight: exact known-applied timestamp+hash prefix through
   `0003`, dedicated migrator, stable baseline и localization least privilege;
2. только при successful preflight применяет pending migrations `0004`–`0020` к production-like
   Neon database `vico_forum`;
3. postflight требует exact full timestamp+hash ledger, full 27-table manifest, data invariants,
   ownership и ACL contract;
4. workflow emit-ит bounded migration evidence; никакой Worker deployment, runtime role/grant,
   Hyperdrive binding или application traffic switch не выполняется.

Это forward external schema mutation. Если preflight или postflight failed, автоматический повтор
либо ручное исправление запрещены до отдельной диагностики. Разрешение привязано к указанному SHA;
при изменении `main` требуется новая сверка и новое разрешение. После successful run отдельный
repository PR фиксирует run ID, exact migration SHA, journal SHA-256 и newest migration `0020` в
runtime evidence/state до любого schema-dependent runtime rollout.

### Failed production migration run `36265351353`

Последнее обновление PR #122 на head `3a721d8ff26f334dec76ac612d29f42f29014df3` и GitHub run
проверены независимо. Authorized run выполнялся на exact approved SHA
`53181e30253061614c43f6b1682eaa0ec958e2d3`: metadata и preflight successful, `db:migrate`
failed, postflight/evidence skipped. Повторный run не выполнялся.

Read-only diagnostics из PR #122 подтверждены source contracts:

- ledger и public schema остались на `0000`–`0003`/baseline; pending migration SQL не начинался;
- pinned `drizzle-orm 0.45.2` `PgDialect.migrate()` безусловно выполняет
  `CREATE SCHEMA IF NOT EXISTS drizzle` до чтения ledger;
- PostgreSQL 17 требует database-level `CREATE` privilege даже для `CREATE SCHEMA IF NOT EXISTS`;
- dedicated `vico_forum_migrator` владеет существующими migration/application objects и имеет
  schema-level `public CREATE`, но не имеет database-level `CREATE` на `vico_forum`.

Root cause подтверждён: migration role имеет корректную identity и object ownership, но pinned
Drizzle bootstrap требует ещё одну реальную migration capability. Это database privilege `CREATE`,
не role attribute `CREATEDB`, не database ownership и не runtime capability.

Техническое решение: не реализовывать custom fork migration runner и не возвращать owner mode.
Dedicated migrator должен получить прямой non-grantable `CREATE ON DATABASE vico_forum`, поскольку
это минимальная capability, фактически требуемая pinned production migration tool на каждом run.
Credential остаётся только в protected GitHub Environment; runtime roles не получают этот grant.

Перед external grant нужен отдельный reviewed repository PR:

1. production privilege snapshot читает database ACL и требует ровно direct non-grantable
   database `CREATE` для application owner/migrator; PUBLIC и localization runtime database CREATE
   rejected;
2. manual identity verifier дополнительно fail closed проверяет effective
   `has_database_privilege(current_user, current_database(), 'CREATE') = true`, сохраняя exact role
   assertion и read-only transaction;
3. tests покрывают missing/grantable/wrong-grantee/PUBLIC/runtime database CREATE и identity
   capability result;
4. `PROJECT_STATE.md`, `MIGRATIONS.md` и history фиксируют failed run, отсутствие applied pending
   schema и требуемую database CREATE capability без утверждения, что grant уже выполнен;
5. никаких GRANT, migration, retry или deploy этот PR не выполняет.

После merge потребуется отдельное явное разрешение пользователя на один owner-controlled
`GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator` без `GRANT OPTION`, затем successful
manual identity/capability workflow evidence на exact `main`. Только после этого Codex заново
оценивает authorization на production migration retry. Текущий failed workflow не rerun-ить.

## Текущий статус

Stage 6 открыт на уровне координации. Внешние изменения пока ограничены явно разрешённым
dedicated migrator login/password credential и GitHub Environment secret; execution identity
доказан successful run, а PR #132 удалил owner exception code-wide. Verifier/runtime proposal
реализован merged PR #133. Следующий gate — явное user authorization на один production migration
dispatch привёл к safe failure до pending SQL из-за отсутствующей database CREATE capability.
Следующий boundary — reviewed capability-verifier PR; retry migrations/deploy запрещён.

### Независимая полная проверка PR #134

Последнее обновление служебного PR ChatGPT #122 на head
`c4b0855d44e0ba07699c5633b8d48a70b719259d` и PR #134 на exact head
`1da7025de717721aafb3309882cb12eec9e70b36` проверены независимо относительно base/main
`53181e30253061614c43f6b1682eaa0ec958e2d3`.

Техническая часть PR #134 соответствует согласованному capability-verifier contract:

- snapshot читает explicit current-database `CREATE` ACL через
  `pg_database.datacl -> aclexplode` и требует ровно один direct non-grantable grant для
  application owner/migrator;
- database `CREATE` для localization runtime и `PUBLIC` rejected;
- manual identity workflow сохраняет exact role assertion, bounded connection/query timeouts,
  `BEGIN READ ONLY` и rollback, дополнительно требуя effective database `CREATE`;
- pure tests покрывают missing, grantable, wrong-grantee, runtime/PUBLIC и malformed/false
  identity-capability cases; оба GitHub checks текущего head (`checks`, `database`) successful;
- PR не выполняет `GRANT`, migration retry, deployment либо другую external mutation.

Обнаружено одно current-PR documentation finding. `PROJECT_STATE.md` сам устанавливает, что
история отдельных CI runs и commit SHA хранится в `PROJECT_HISTORY.md`, но новый current-state
пункт дублирует exact run `36265351353` и SHA
`53181e30253061614c43f6b1682eaa0ec958e2d3`. Эти идентификаторы должны остаться в уже обновлённом
`PROJECT_HISTORY.md`; в `PROJECT_STATE.md` следует сохранить только актуальный операционный факт:
первый разрешённый migration attempt остановился до pending SQL из-за отсутствующего database
`CREATE`, target остался на `0000`–`0003`, retry не выполнялся.

Вывод: реализация verifier/capability boundary технически корректна, но PR #134 пока не готов к
merge из-за подтверждённого внутреннего противоречия source-of-truth documentation. Требуется
ограниченная docs correction только в `PROJECT_STATE.md`, после неё — повторная полная проверка
всего PR на новом head. Production migration повторно не запускать; database grant и identity
workflow также не выполнять до merge исправленного verifier PR и следующего отдельного решения.

### Повторная полная проверка исправленного PR #134

Последнее обновление служебного PR ChatGPT #122 на head
`0ca70c6c0f42d5bafb7011a257a03b63e3d82f2f` и исправленный PR #134 на exact head
`8409d770c791bf24a774a2d315baa8d792f3ad86` повторно проверены относительно unchanged main/base
`53181e30253061614c43f6b1682eaa0ec958e2d3`.

Между ранее проверенным head `1da7025de717721aafb3309882cb12eec9e70b36` и текущим head
изменён только `PROJECT_STATE.md`. Historical run ID и exact commit SHA удалены из current-state
документа, при этом актуальные факты о safe failure до pending SQL, baseline `0000`–`0003`,
отсутствующей database `CREATE` capability и запрете автоматического retry сохранены. Exact
идентификаторы остаются в `PROJECT_HISTORY.md` и профильном migration record.

Повторная проверка всего PR подтвердила:

- все восемь changed files остаются в исходном согласованном scope;
- explicit database ACL и effective identity/capability checks по-прежнему fail closed;
- runtime и `PUBLIC` database `CREATE` rejected, direct migrator grant должен быть non-grantable;
- manual identity workflow остаётся read-only и не выполняет provisioning;
- source-of-truth state/history boundary теперь согласован;
- current-head GitHub checks `checks` и `database` successful; локальные dependency-free contract
  tests также successful;
- никаких `GRANT`, identity dispatch, migration retry или deployment PR не выполняет.

Новых current-Stage defects, противоречий документации или scope expansion не обнаружено.
Предыдущее finding закрыто. Финальный технический вывод: PR #134 на head
`8409d770c791bf24a774a2d315baa8d792f3ad86` готов к merge пользователем. Сам merge не разрешает
external grant или migration retry: после merge Codex должен заново проверить current `main` и
отдельно определить следующий Stage 6 gate.

### PR #134 merged; database capability grant gate

PR #134 подтверждён merged в GitHub `main` как
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`; merged head был
`8409d770c791bf24a774a2d315baa8d792f3ad86`. Актуальный `main` и относящиеся database
source-of-truth документы перечитаны. Repository boundary теперь проверяет и direct
non-grantable database `CREATE` ACL, и effective capability dedicated migration identity.

Следующий gate — одна явно разрешённая owner-controlled external mutation:

```sql
GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator;
```

Операционный contract:

1. перед изменением подтвердить exact database `vico_forum`, database owner/admin execution
   identity и отсутствие effective database `CREATE` у `vico_forum_migrator`;
2. выполнить только указанный direct grant без grant option; не менять ownership, memberships,
   runtime grants, schema/table ACL либо credentials;
3. после изменения read-only проверить explicit ACL: ровно один direct `CREATE` для
   `vico_forum_migrator`, `is_grantable = false`; у `vico_forum_runtime` и `PUBLIC` database
   `CREATE` отсутствует;
4. запустить manual read-only `Production database identity verification` только с exact merged
   `main` и получить successful evidence exact role + effective database `CREATE`;
5. при любом несовпадении остановиться: не исправлять дополнительно и не запускать migration;
6. production migration run `36265351353` не rerun-ить. Новое разрешение на migration retry может
   рассматриваться Codex только после проверки bounded grant и successful identity/capability
   evidence.

Эта запись сама не выполняет external grant или workflow dispatch. Выполнение требует явного
разрешения пользователя, переданного ChatGPT через служебный coordination cycle.

### Database capability gate completed; evidence sync required

Последнее обновление PR #122 на head `f252fb1423bf89665163d16194cf7da482a3fcd9`
проверено независимо. Bounded owner-controlled grant выполнен в согласованном scope:

- pre-grant execution/session role и database owner были exact `vico_forum_owner`;
- `vico_forum_migrator` до grant не имел effective database `CREATE`;
- выполнен только direct `GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator`;
- post-grant snapshot показывает ровно один direct migrator `CREATE`, grantor
  `vico_forum_owner`, `is_grantable = false`;
- localization runtime и `PUBLIC` database `CREATE` не получили;
- ownership, memberships, schema/table ACL, credentials и другие grants не изменялись.

Manual read-only `Production database identity verification` run `36268723861`, attempt 1,
завершился `success` на exact current `main`
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`. Job и step identity/capability verifier successful;
reported role — exact `vico_forum_migrator`. GitHub recent runs подтверждают, что новый production
migration dispatch не выполнялся; последним остаётся failed run `36265351353`.

Capability gate технически закрыт, но актуальный `main` всё ещё утверждает, что grant не выполнен и
identity/capability evidence отсутствует. До migration retry нужен отдельный mergeable evidence-sync
PR из current `main` с минимальным scope:

1. `PROJECT_STATE.md`: заменить устаревшие pre-grant факты на текущее состояние, указать successful
   bounded capability gate без historical run ID/SHA и сделать ближайшим шагом отдельную оценку и
   явное разрешение нового production migration dispatch;
2. `PROJECT_HISTORY.md`: записать exact grant boundary, workflow run `36268723861`, attempt 1,
   exact SHA `4c709d5aa82f6e93ddbad672afc10ad94c5e2efa` и отсутствие migration retry;
3. `docs/database/MIGRATIONS.md`: зафиксировать, что required direct non-grantable capability и
   exact-role/effective-capability evidence получены, но pending `0004`–`0020` не применялись;
4. не менять runtime migration evidence: оно по-прежнему заканчивается на accepted migration
   `0002`, а capability workflow не является migration→runtime evidence;
5. не выполнять migration, grant, deploy или другие external mutations этим PR.

После CI и независимой полной проверки этого PR пользователь выполняет merge. Только затем Codex
сверяет новый `main` и решает, можно ли запросить отдельное явное разрешение на новый production
migration dispatch. Failed run не rerun-ить.

### Независимая полная проверка PR #135

Последнее обновление служебного PR ChatGPT #122 на head
`32e39d3bedb635b59bf928d191deccc8e953c8fc` и evidence-sync PR #135 проверены независимо.
PR #135 основан на exact `main` `4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`; reviewed head —
`e59bfc79dfde7c57c6200218a93ccfbbb7d67e28`.

Полная проверка подтвердила:

- diff ограничен тремя согласованными файлами: `PROJECT_STATE.md`, `PROJECT_HISTORY.md` и
  `docs/database/MIGRATIONS.md`;
- current state больше не содержит устаревшее утверждение о невыполненном grant и корректно
  фиксирует completed bounded direct non-grantable migrator capability gate;
- historical run `36268723861`, attempt 1, и exact SHA хранятся в `PROJECT_HISTORY.md`, но не
  дублируются в `PROJECT_STATE.md`;
- migration source of truth корректно отделяет capability evidence от migration→runtime evidence,
  сохраняет pending `0004`–`0020` и требует отдельного разрешения нового dispatch;
- `.github/runtime-migration-evidence.json` не изменён: base/head blob SHA одинаков и равен
  `60d0667a78d2d6810fd9775785dc8366d59870c0`, accepted baseline остаётся `0002`;
- PR не содержит migration, grant, deploy или другую external mutation;
- GitHub CI run `36269482706` на exact head завершён полностью successfully:
  `checks=success`, `database=success`; PR открыт и mergeable.

Новых current-Stage defects, source-of-truth contradictions или scope expansion не обнаружено.
Финальный технический вывод: PR #135 на head
`e59bfc79dfde7c57c6200218a93ccfbbb7d67e28` готов к merge пользователем. Production migration
до подтверждённого merge и следующей сверки `main` не запускать.

## Рабочий канал дальнейших действий

По решению пользователя от 2026-09-26 все дальнейшие operational requests, перечни требуемого
evidence и результаты Stage 6 передаются через служебные PR. Codex записывает технические детали
и следующий запрос в PR #121; пользователь выполняет взаимодействие в чате с ChatGPT и обновляет
служебные PR согласно `AGENTS.md`. В обычных ответах Codex не дублирует длинные инструкции и не
просит пользователя выполнять control-plane шаги непосредственно в текущем чате.
