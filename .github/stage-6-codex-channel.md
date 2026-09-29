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

### PR #135 merged; production migration dispatch gate

PR #135 подтверждён merged в GitHub `main` как
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`; merged head был
`e59bfc79dfde7c57c6200218a93ccfbbb7d67e28`. Актуальные `PROJECT.md`, `PROJECT_STATE.md`,
`PROJECT_HISTORY.md`, `ROADMAP.md`, `docs/database/MIGRATIONS.md` и
`docs/database/HYPERDRIVE.md` перечитаны полностью.

Все repository и capability prerequisites для следующего schema-first migration attempt теперь
закрыты: exact dedicated identity и effective/direct non-grantable database `CREATE` доказаны,
pre/post verifier phase и full ledger/schema manifest находятся в `main`, documentation evidence
синхронизировано. Pending migrations остаются `0004`–`0020`.

Следующий допустимый шаг — только после нового явного разрешения пользователя выполнить один новый
manual dispatch workflow `Production database migration` на exact `main`
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`. Это должен быть новый dispatch, а не rerun failed
run `36265351353`.

Разрешаемый contract:

1. перед dispatch повторно подтвердить, что GitHub `main` остаётся exact указанным SHA и workflow
   definition не изменился;
2. выполнить ровно один `workflow_dispatch` на branch `main`;
3. workflow обязан пройти metadata validation и fail-closed preflight до любых pending writes;
4. при success применить pending `0004`–`0020`, затем требовать successful postflight exact full
   ledger/manifest/ACL contract и bounded workflow summary evidence;
5. при любом failure остановиться без rerun, manual SQL repair, deploy или additional grant;
6. не выполнять Worker deployment, Hyperdrive/runtime grants, OAuth/bootstrap, Queues/providers
   или другие external Stage 6 операции;
7. после завершения передать Codex exact run ID, attempt, head SHA, job/step conclusions и bounded
   migration evidence. Даже successful workflow ещё требует отдельного reviewed evidence-sync PR
   до schema-dependent runtime rollout.

Эта запись не запускает workflow. Production migration остаётся external forward schema mutation
и требует явного разрешения пользователя через coordination cycle.

### Production migrations `0004`–`0020` applied successfully

Последнее обновление служебного PR ChatGPT #122 на head
`3d4947528164bfa207fae639812b15ec21eb5f20` проверено независимо через GitHub Actions API и
repository state. Новый authorized `Production database migration` run `36270353184`, attempt 1,
выполнен на exact `main` `b172264e4b0db1fe68dead7d7f25b49a573eb0cd` и завершён `success`.

Все значимые workflow steps successful: metadata validation, preflight, `Apply migrations`,
postflight full production verification и runtime evidence emission. Это новый dispatch, не rerun
failed run `36265351353`. Postflight success означает exact complete `0000`–`0020`
timestamp+hash ledger, full structural manifest и privilege contract в target environment.

Bounded evidence:

```json
{
  "workflowRunId": 36270353184,
  "migrationSha": "b172264e4b0db1fe68dead7d7f25b49a573eb0cd",
  "journalSha256": "35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9",
  "requiredMigrationTag": "0020_translation_generation_permission"
}
```

Journal SHA-256 независимо вычислен из exact workflow-head `drizzle/meta/_journal.json` и
совпадает; newest journal entry — `0020_translation_generation_permission`. После run не
выполнялись retry, manual SQL, additional grants, deploy, Hyperdrive/runtime provisioning,
OAuth/bootstrap либо Queue/provider operations.

Актуальный `main` всё ещё содержит прежний repository-owned runtime migration evidence для
`0002`. Следующий safe step — отдельный mergeable migration-evidence PR из current `main`:

1. обновить `.github/runtime-migration-evidence.json` ровно значениями bounded evidence выше;
2. обновить `PROJECT_STATE.md`: target migration history/schema `0000`–`0020` и repository-owned
   evidence теперь подтверждены; historical run/SHA не дублировать; runtime rollout ещё не
   выполнен;
3. обновить `PROJECT_HISTORY.md` exact run/attempt/SHA/journal hash, successful preflight,
   migration, postflight и отсутствие иных external operations;
4. обновить `docs/database/MIGRATIONS.md`: production target и accepted evidence теперь покрывают
   `0020`, schema-first gate закрыт, но это не означает runtime deployment;
5. не менять migration SQL, verifier/workflows, application code или dependencies и не выполнять
   external mutations;
6. CI обязан выполнить repository evidence verifier против GitHub run и exact journal ancestry.

После independent whole-PR review и merge Codex заново сверяет `main` и определяет следующий
runtime capability/bootstrap gate. До этого deployment и runtime provisioning запрещены.

### Независимая полная проверка PR #136

Последнее обновление служебного PR ChatGPT #122 на head
`34fc1e49b2524d021b9d0cfe16d02e3a5256b7db` и migration-evidence PR #136 проверены независимо.
PR основан на exact `main` `b172264e4b0db1fe68dead7d7f25b49a573eb0cd`; reviewed head —
`412ef3720577c27bfd990b5fef6fd2b32141a157`.

Полная проверка подтвердила:

- diff ограничен четырьмя согласованными evidence/source-of-truth файлами и не меняет migration
  SQL, verifier/workflows, application code или dependencies;
- `.github/runtime-migration-evidence.json` точно фиксирует run `36270353184`, migration SHA,
  journal SHA-256 и required tag `0020_translation_generation_permission`;
- journal на evidence SHA и PR head содержит 21 entry, заканчивается `0020`, его SHA-256 равен
  `35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9`, а evidence SHA является
  ancestor PR head;
- `PROJECT_STATE.md` корректно фиксирует accepted complete `0000`–`0020` schema/evidence без
  historical identifiers и без ложного утверждения о runtime deployment;
- `PROJECT_HISTORY.md` содержит exact historical run/attempt/SHA/hash и границы выполненной
  операции; `docs/database/MIGRATIONS.md` согласованно отделяет schema-first evidence gate от
  будущего runtime rollout;
- dependency-free evidence unit tests successful; GitHub CI run `36272112776` на exact head
  полностью successful: `checks=success`, `database=success`;
- никаких external mutations PR не выполняет.

Локальный live evidence verifier дошёл до GitHub API fetch, но Node network был недоступен в
текущем окружении (`ENETUNREACH`); это environment limitation, а не defect PR. Exact тот же live
verifier успешно выполнен в GitHub `checks`, а run metadata дополнительно проверена read-only API.

Новых current-Stage defects, source-of-truth contradictions или scope expansion не обнаружено.
Финальный технический вывод: PR #136 на head
`412ef3720577c27bfd990b5fef6fd2b32141a157` готов к merge пользователем. После merge Codex должен
проверить новый `main` и определить первый bounded schema-dependent runtime capability/bootstrap
gate; до этого deployment и runtime provisioning не выполнять.

### PR #136 merged; runtime capability design audit

PR #136 подтверждён merged в GitHub `main` как
`61b9e809cb39d2f554bf052e00d0bf6f0f66ec53`; merged head был
`412ef3720577c27bfd990b5fef6fd2b32141a157`. Актуальный `main` и все относящиеся project,
migration, Hyperdrive, authorization и translation source-of-truth документы перечитаны полностью.
Schema-first gate и repository-owned evidence теперь закрыты through `0020`; runtime rollout ещё
не выполнен.

Следующий безопасный шаг — не provisioning, а bounded repository-only audit фактических database
capabilities. Он нужен до выбора PostgreSQL roles и Hyperdrive bindings, поскольку документы прямо
запрещают механически расширять существующий read-only localization role, а infrastructure DB
roles нельзя смешивать с application authorization roles.

Audit contract для ChatGPT:

1. проверить весь production runtime composition и entrypoints: web/auth/session, authorization
   resolution/admin mutations, forum reads/writes, localization registry/UI/content reads,
   translation planning/execution/publication, Queue consumers и reconciliation paths;
2. для каждого independently deployable execution path составить exact matrix
   `operation → tables/sequences/functions → SELECT/INSERT/UPDATE/DELETE/USAGE/EXECUTE`, включая
   transaction, row-lock и trigger side effects;
3. зафиксировать фактическую Cloudflare binding topology в code/config/types и отделить уже
   существующий read-only `HYPERDRIVE` path от ещё не provisioned write paths;
4. определить минимальные capability boundaries и возможное число runtime DB roles/bindings только
   как технические варианты, явно выделив architecture choices, которые нельзя решить по текущим
   source contracts;
5. проверить preview/private-data exposure: какие bindings могут быть доступны preview и какие
   write paths должны быть отсутствующими/fail closed до явного provisioning;
6. определить repository verifier/test changes, которые смогут доказать proposed grants на
   disposable PostgreSQL до external creation;
7. проверить официальную документацию exact current Cloudflare Hyperdrive/Workers binding model и
   PostgreSQL 17 privilege semantics для затрагиваемых capabilities;
8. записать результаты только в служебный PR ChatGPT #122. Пока не создавать mergeable
   implementation PR, не менять code/config/dependencies и не выполнять Neon/Cloudflare/OAuth/
   Queue/provider/deployment mutations.

После независимой сверки audit result Codex зафиксирует конкретный минимальный role/binding contract
и первый mergeable verifier/provisioning-preparation PR. Это отделяет design evidence от
труднообратимого external provisioning.

### Runtime capability audit result and first verifier PR

Последнее обновление служебного PR ChatGPT #122 на head
`f8f21a485429ac3230eb3de2307ee8eebd899627` проверено независимо по актуальному `main`, runtime
composition и database repositories. Audit корректно выявил, что current Worker использует один
generic `HYPERDRIVE` connection для всех adapters, хотя external role за ним остаётся только
localization read-only; content generation action при этом fail-closed disabled.

Матрица операций подтверждена для Better Auth, forum, dynamic authorization, localization,
deferred generation planning, background execution/publication и maintenance paths. В частности,
PostgreSQL 17 действительно требует `UPDATE` вместе с `SELECT` для используемых `FOR UPDATE` /
`FOR SHARE` locks; current code напрямую не читает `authz_permissions`; runtime sequence,
function-`EXECUTE`, `TRIGGER`, `REFERENCES`, schema/database `CREATE` privileges не нужны.

Архитектурное решение для первого runtime boundary — **Option A**:

- сохранить существующие `HYPERDRIVE` + `vico_forum_runtime` как localization-only read capability;
- добавить одну отдельную cache-disabled web capability для единого текущего HTTP Worker:
  Better Auth + forum + dynamic authorization + forum content-presentation reads;
- не выдавать web capability translation planning/task/publication privileges, пока generation
  action disabled и Queue/background runtime не provisioned;
- background translation и maintenance capabilities проектировать позже как отдельную execution
  boundary;
- не дробить auth/forum/authz на несколько origin pools внутри одного Worker: это не изолирует
  Worker compromise, но добавляет binding/pool/operational complexity. Cross-domain least privilege
  достигается meaningful HTTP-vs-background boundary.

Первый mergeable provisioning-preparation PR должен быть repository-only и иметь scope:

1. добавить named runtime capability contract для `localization-read` и `web`, сохраняя
   environment-specific PostgreSQL role names как inputs (`RUNTIME_DATABASE_ROLE` для existing
   localization role и новый `WEB_RUNTIME_DATABASE_ROLE`);
2. web ACL exact union:
   - Better Auth `user`, `session`, `account`, `verification`, `rate_limit` —
     `SELECT/INSERT/UPDATE/DELETE`;
   - `forum_categories`, `forum_sections` — `SELECT`;
   - `forum_topics`, `forum_posts` — `SELECT/INSERT/UPDATE`;
   - `forum_topic_title_revisions`, `forum_post_revisions` — `SELECT/INSERT`;
   - `forum_topic_title_translations`, `forum_post_body_translations` — `SELECT`;
   - `authz_roles` — `SELECT/INSERT/UPDATE/DELETE`;
   - `authz_role_permissions` — `SELECT/INSERT/DELETE`;
   - `authz_user_roles` — `SELECT/INSERT/UPDATE`;
   - `authz_user_permission_overrides` — `SELECT/INSERT/UPDATE/DELETE`;
   - `authz_mutation_lock` — `SELECT/UPDATE`;
   - никаких direct grants на `authz_permissions`, task/budget/UI localization tables;
3. verifier должен для обоих roles требовать intended LOGIN, no dangerous attributes,
   memberships/ownership/grant options, schema `USAGE` without `CREATE`, no database `CREATE`, no
   unexpected relation/column/sequence/function/default/PUBLIC privileges;
4. disposable PostgreSQL 17 tests должны применить exact grants и выполнить representative
   positive probes, включая row-lock operations, плюс negative cross-domain write/DELETE/DDL probes;
5. добавить отдельный manual main-only read-only production runtime privilege verification path,
   не связывая его с production migration workflow; external run выполняется только после будущего
   отдельного provisioning authorization;
6. обновить `docs/database/HYPERDRIVE.md`, `docs/database/MIGRATIONS.md` и `PROJECT_STATE.md` только
   как planned/reviewed contract, не утверждая, что role, grant, binding или deployment выполнены;
7. не менять пока Worker binding topology/runtime wiring, migration SQL или dependencies и не
   выполнять Neon/Cloudflare provisioning, deploy либо другие external mutations.

Role deadlines и exact new Hyperdrive binding name/ID относятся к последующему reviewed runtime
wiring + external calibration step; их нельзя молча унаследовать от localization read path.

### Независимая полная проверка PR #137

Последнее обновление служебного PR ChatGPT #122 на head
`9329a8dab98ff680226de48f59a29968933aaa1c` и provisioning-preparation PR #137 проверены
независимо. PR основан на exact `main` `61b9e809cb39d2f554bf052e00d0bf6f0f66ec53`;
reviewed head — `5108799e4ad47f829ac6e9ff17b2ad945a384f77`.

Полная проверка всех девяти changed files подтвердила:

- named `localization-read` и `web` contracts точно соответствуют согласованной relation/privilege
  matrix и не включают deferred translation planning/background capabilities;
- snapshot/assertion fail closed проверяет distinct LOGIN roles, effective database `CONNECT`,
  отсутствие effective/direct database `CREATE`, dangerous attributes, memberships, ownership,
  grant options и неожиданных schema/relation/column/sequence/function/default/PUBLIC privileges;
- исправления clean-database ACL defaults, optional safe PUBLIC schema USAGE и effective CONNECT
  присутствуют на current head; ранние automated review findings закрыты;
- disposable PostgreSQL 17 probe защищён `*_test` guard, применяет exact grants, выполняет positive
  table/row-lock probes и negative cross-domain/write/delete/DDL probes;
- manual `Production runtime privilege verification` отделён от migration workflow, main-only,
  read-only, использует protected `production-db` Environment и ещё не запускался;
- docs/state называют contract planned и не утверждают external role/grant/binding/deployment;
- Worker runtime wiring, migrations и dependencies не изменены; external mutations отсутствуют.

Локально successful: syntax checks трёх scripts и 13/13 pure contract tests. GitHub CI run
`36301325287` на exact head полностью successful: `checks=success`, `database=success`, включая
clean PostgreSQL 17 runtime privilege probes, full tests/build и Workers smoke.

Новых current-Stage defects, source-of-truth contradictions или scope expansion не обнаружено.
Финальный технический вывод: PR #137 на head
`5108799e4ad47f829ac6e9ff17b2ad945a384f77` готов к merge пользователем. External PostgreSQL role/
grant creation, Hyperdrive provisioning, verifier dispatch и deployment до post-merge сверки `main`
не выполнять.

### PR #137 merged; database ACL verifier correction before provisioning

PR #137 подтверждён merged в GitHub `main` как
`01e74b5ddbe6f339acfe7e60a75d85592b422674`; merged head был
`5108799e4ad47f829ac6e9ff17b2ad945a384f77`. Актуальный `main`, runtime verifier workflow и
относящиеся source-of-truth документы проверены заново.

Post-merge проверка обнаружила один current-gate defect до external role provisioning. Runtime
contract требует effective database `CONNECT` и запрещает database `CREATE`, но snapshot читает
direct database ACL только с фильтром `privilege_type = 'CREATE'`. Поэтому direct runtime
`CONNECT WITH GRANT OPTION`, direct `TEMPORARY` либо другой неожиданный database grant останется
невидимым, хотя общий least-privilege contract запрещает grant options и лишние capabilities.
GitHub Environment verifier мог бы принять такой role.

External PostgreSQL role/grant creation пока заблокирован. Нужен ограниченный corrective
repository PR из current `main`:

1. snapshot должен читать explicit/effective database ACL rows для `CONNECT`, `CREATE` и
   `TEMPORARY` у обоих runtime roles и `PUBLIC`, сохраняя safe handling `datacl IS NULL` через
   `acldefault('d', datdba)`;
2. effective `CONNECT=true` остаётся обязательным для обоих runtime roles, effective/direct
   `CREATE` остаётся запрещённым;
3. direct runtime database ACL допускает только optional non-grantable `CONNECT`; direct
   `TEMPORARY`, любой grant option и иная database privilege rejected;
4. `PUBLIC` допускает только hard-wired-equivalent non-grantable `CONNECT`/`TEMPORARY` либо их
   отсутствие; `CREATE`, grant options и иные privileges rejected;
5. unit tests должны покрыть direct CONNECT allowed, CONNECT grantable rejected, runtime TEMP
   rejected, PUBLIC grantable/unexpected/CREATE rejected и `datacl IS NULL` snapshot path;
6. disposable PostgreSQL probe и manual read-only workflow должны использовать исправленный exact
   contract; migration workflow, capability relation matrix и Worker code не менять;
7. docs/state уточнить как reviewed verifier correction без утверждения о provisioning;
8. не выполнять role creation, GRANT, workflow dispatch, Hyperdrive provisioning или deployment.

После full review/CI и merge correction Codex снова определит bounded external `vico_forum_web`
role/grant operation. До этого текущий production runtime verifier не запускать.

### Независимая полная проверка PR #138

Последнее обновление служебного PR ChatGPT #122 на head
`a2f18229db0261bb59694504c3de33d6fbd4463a` и corrective PR #138 проверены независимо.
PR основан на exact `main` `01e74b5ddbe6f339acfe7e60a75d85592b422674`; reviewed head —
`2f35e41fd0da4aad4a9f549e73f7cb3a459f3c3f`.

Полная проверка всех пяти changed files подтвердила:

- snapshot теперь читает все database ACL rows для runtime roles и `PUBLIC`, включает
  `privilege_type`, сохраняет `datacl IS NULL` fallback через `acldefault('d', datdba)` и больше
  не фильтрует только `CREATE`;
- runtime role допускает только optional direct non-grantable `CONNECT`; grantable `CONNECT`,
  direct `TEMPORARY`, `CREATE` и иные database privileges rejected;
- `PUBLIC` допускает только non-grantable hard-wired-equivalent `CONNECT` / `TEMPORARY` либо их
  отсутствие; `CREATE`, grant options и unexpected privileges rejected;
- existing effective `CONNECT=true` и effective `CREATE=false` checks сохранены;
- unit coverage включает все согласованные positive/negative cases и static snapshot SQL check;
- shared contract автоматически применяется disposable PostgreSQL probe и manual production
  runtime verifier; workflows, relation capability matrix, Worker code и migrations не изменены;
- docs/state корректно описывают reviewed verifier boundary без заявления о provisioning.

Локально successful: syntax check и 18/18 runtime privilege contract tests. GitHub CI run
`36302230154` на exact head полностью successful: `checks=success`, `database=success`, включая
исправленные PostgreSQL 17 probes, full tests/build и Workers smoke.

Новых current-Stage defects, source-of-truth contradictions или scope expansion не обнаружено.
Финальный технический вывод: PR #138 на head
`2f35e41fd0da4aad4a9f549e73f7cb3a459f3c3f` готов к merge пользователем. External role/grant,
runtime verifier dispatch, Hyperdrive provisioning и deployment до post-merge сверки запрещены.

### PR #138 merged; bounded web database role provisioning gate

PR #138 подтверждён merged в GitHub `main` как
`4cef0297bb41ff3a18ee0ad82315aef940146596`; merged head был
`2f35e41fd0da4aad4a9f549e73f7cb3a459f3c3f`. Актуальный `main`, corrected runtime verifier,
workflow и database source-of-truth документы проверены. Runtime verifier ещё не запускался.

Следующий gate — одна явно разрешаемая owner-controlled external provisioning transaction для
environment-specific web role `vico_forum_web`, затем read-only evidence. Этот gate не создаёт
Hyperdrive и намеренно не выдаёт usable password: credential будет отдельно сгенерирован/rotated
только в будущем Hyperdrive provisioning gate, без передачи секрета через Git/PR/chat.

Bounded contract:

1. preflight подтвердить exact `main` `4cef0297bb41ff3a18ee0ad82315aef940146596`, database
   `vico_forum`, session/current user и database owner exact `vico_forum_owner`, отсутствие role
   `vico_forum_web` и неизменный existing localization role contract;
2. в одной transaction создать `vico_forum_web LOGIN PASSWORD NULL` с
   `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`;
3. сохранить owner administrative control только как membership
   `vico_forum_web TO vico_forum_owner WITH ADMIN TRUE, INHERIT FALSE, SET FALSE`;
4. выдать direct non-grantable `CONNECT` на database `vico_forum`, `USAGE` на schema `public` и
   exact reviewed relation ACL из merged `runtimeCapabilityContracts.web`; никаких default,
   column, sequence, function, ownership, schema/database CREATE/TEMPORARY либо grant-option grants;
5. post-provision read-only snapshot должен полностью совпасть с merged contract для
   `vico_forum_runtime` + `vico_forum_web`; при mismatch rollback/stop без дополнительных fixes;
6. только после exact DB snapshot установить protected GitHub Environment variable
   `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web` без изменения secrets;
7. выполнить один manual read-only `Production runtime privilege verification` dispatch на exact
   `main`; при failure остановиться без retry или исправлений;
8. не создавать/изменять Hyperdrive, password/credential, Worker bindings, role deadlines,
   deployment, OAuth, Queue/provider resources или другие external capabilities;
9. передать в PR #122 bounded evidence: pre/post role/ACL summary без секретов, variable name/value,
   workflow run ID/attempt/head SHA и job/step conclusions.

После successful evidence потребуется отдельный repository evidence-sync PR до Hyperdrive
provisioning. Эта запись сама external operations не выполняет; требуется явное разрешение
пользователя через coordination cycle.

### First web-role provisioning attempt rolled back; corrected one-shot contract

Последнее обновление служебного PR ChatGPT #122 на head
`a63cf24476252642f0f7fb8de4efe3e5b8006635` проверено. Authorized transaction прошла preflight,
но failed до commit на лишнем explicit membership `GRANT`: PostgreSQL 17 вернул
`ADMIN option cannot be granted back to your own grantor`. Вся transaction rolled back.

Post-failure read-only evidence подтверждает: `vico_forum_web` отсутствует, role/grants не
сохранены, GitHub variable не создан, runtime verifier не запускался, Hyperdrive/credential/
deployment не изменялись. Предыдущее разрешение consumed; retry не выполнялся.

Root cause независимо подтверждён официальной PostgreSQL 17 role semantics. Когда non-superuser с
`CREATEROLE` создаёт role, PostgreSQL автоматически выполняет эквивалент
`GRANT created_role TO creator WITH ADMIN TRUE, SET FALSE, INHERIT FALSE`, причём grantor —
bootstrap superuser. Именно это уже соответствует merged verifier contract; повторный explicit
grant от creator не нужен и недопустим.

Исправленный bounded operation отличается только удалением explicit owner-membership statement:

1. заново выполнить полный preflight из предыдущего gate и подтвердить, что role по-прежнему
   отсутствует, а `main` остаётся `4cef0297bb41ff3a18ee0ad82315aef940146596`;
2. одной transaction создать passwordless `vico_forum_web` с теми же safe attributes;
3. read-only/in-transaction assertion должен подтвердить автоматически созданное owner membership
   exact `ADMIN TRUE, INHERIT FALSE, SET FALSE`; не выдавать и не изменять membership вручную;
4. применить тот же exact non-grantable database/schema/relation ACL и полный in-transaction
   contract assertion; commit только при exact match;
5. затем установить `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web` и выполнить один manual read-only
   production runtime verifier dispatch на exact `main`;
6. при любом failure остановиться без retry/fix; все прежние запреты Hyperdrive/password/Worker/
   deployment/OAuth/Queue/provider operations сохраняются;
7. передать bounded pre/post/workflow evidence без секретов через PR #122.

Это новая one-shot external authorization boundary; сама запись ничего не выполняет.

### Corrected provisioning retry rolled back; exact effective/direct ACL distinction

Последнее обновление служебного PR ChatGPT #122 на head
`21902a0810d83736234c614d2a3c4cfd8416d5c5` проверено. Второй authorized attempt снова failed
до commit и полностью rolled back. `vico_forum_web`, GitHub variable и verifier run отсутствуют;
других external changes не было.

Failure произошёл не из-за merged repository contract и не из-за GRANT matrix. Custom
in-transaction assertion ошибочно потребовал effective `TEMPORARY=false`. Production database
сохраняет accepted non-grantable PUBLIC `TEMPORARY`, поэтому любой role получает effective
`TEMPORARY=true` через PUBLIC. Merged verifier намеренно допускает этот PostgreSQL default и
запрещает только **direct** runtime `TEMPORARY`, grant options и direct/effective `CREATE`.

Следующая исправленная one-shot operation должна использовать merged contract буквально:

1. повторить preflight и подтвердить unchanged exact `main`, owner/session/database, отсутствие
   `vico_forum_web` и exact existing localization role;
2. создать passwordless role и exact grants одной transaction, без explicit membership GRANT;
3. membership assertion: automatic owner row exact `ADMIN TRUE, INHERIT FALSE, SET FALSE`;
4. database assertions:
   - effective `CONNECT=true`;
   - effective `CREATE=false`;
   - direct web ACL — ровно optional/non-grantable `CONNECT` (в этой операции он выдан);
   - direct web `TEMPORARY`/`CREATE` и любые grant options отсутствуют;
   - **не** требовать effective `TEMPORARY=false`; accepted PUBLIC non-grantable
     `CONNECT`/`TEMPORARY` остаются допустимыми;
5. остальные role/schema/relation/column/sequence/function/default/ownership assertions — exact
   merged `runtimeCapabilityContracts.web`; commit только при полном match;
6. после commit установить protected variable и выполнить один manual read-only verifier dispatch;
7. при failure остановиться без retry/fix; прежние запреты credentials/Hyperdrive/Worker/deploy/
   OAuth/Queue/providers сохраняются;
8. передать bounded evidence через PR #122.

Два предыдущих разрешения consumed безопасными rolled-back attempts. Эта запись определяет новую
отдельную one-shot authorization boundary и сама external operation не выполняет.

### Third provisioning attempt rolled back; external retries paused for deterministic diagnosis

Последнее обновление служебного PR ChatGPT #122 на head
`48d6d27565b2a49c882831095abc9732e6926db0` проверено. Третий authorized attempt прошёл
role/database/membership/schema assertions, но failed до commit на custom `Relation ACL mismatch`.
Transaction полностью rolled back: `vico_forum_web`, GitHub variable и runtime verifier run
отсутствуют; localization role и другие external resources не изменены.

Три consecutive safe rollbacks показывают, что repository contract/CI probe и ad-hoc operational
assertion расходятся. Новый external retry запрещён до deterministic reproduction. Нельзя угадывать
missing/excess grant или ослаблять merged exact ACL по сообщению без observed diff.

Следующий bounded diagnostic task для ChatGPT выполняется только repository/local/read-only:

1. записать в PR #122 exact SQL statements и exact relation assertion query/normalization,
   использованные третьей попыткой, без connection data или secrets;
2. восстановить exact expected relation ACL из merged `runtimeCapabilityContracts.web`, включая
   quoted `user` и relation kind/privilege/grantability representation;
3. извлечь из сохранённого tool response observed in-transaction rows и structured expected-vs-
   observed diff; если rows не были сохранены, прямо это зафиксировать и не обращаться снова к
   production;
4. воспроизвести **тот же operational SQL + assertion**, а не существующий более общий probe, на
   disposable PostgreSQL 17 после complete migrations `0000`–`0020`;
5. сравнить reproduction с `.github/scripts/verify-runtime-privilege-probes.mjs` и shared
   `readRuntimeCapabilityPrivilegeSnapshot` для выявления drift в grant list, catalog query,
   relation-kind naming, sorting или assertion scope;
6. определить, является ли defect repository script/test gap или только ошибкой external
   operational assertion. Возможное исправление пока не вносить и новый mergeable PR не создавать
   до независимой сверки Codex;
7. не выполнять Neon SQL, GitHub variable/workflow mutation, Hyperdrive/password/Worker/deploy или
   другие external operations.

После получения exact diagnostic evidence Codex определит один общий corrective cycle. Все
предыдущие one-shot authorizations consumed; production runtime verifier не запускать.

### Relation ACL diagnosis reviewed; rollback-only production diagnostic required

Последнее обновление служебного PR ChatGPT #122 на head
`c2b9b48b9a0edbb3af54762c4f85ae204be311c7` проверено. Static comparison подтвердил полное
совпадение merged contract, operational GRANT list и custom expected CTE: по 50 normalized pairs,
missing=0, excess=0. Existing repository PostgreSQL 17 probe прошёл, но он не исполняет exact
grouped production SQL + custom `EXCEPT` assertion. Actual in-transaction rows третьего attempt
не были сохранены, поэтому root cause доказанно не установлен.

Нельзя разрешать ещё один commit attempt или менять repository contract без observed catalog diff.
Следующий safe step — одна явно разрешённая **rollback-only diagnostic transaction** в том же
production-like Neon target. Она не является provisioning retry и не может commit.

Diagnostic contract:

1. повторить read-only preflight: exact `main`, owner/session/database, role absent, existing
   localization/PUBLIC ACL unchanged;
2. `BEGIN`, выполнить exact third-attempt `CREATE ROLE` + grouped GRANT SQL без custom assertions;
3. прочитать actual rows тем же catalog query, а также shared-verifier shape
   `schema.name.kind.privilege.grantable`, и вычислить structured arrays `missing`, `excess`,
   `grantable`, включая grantor/grantee/kind в diagnostic payload;
4. завершить transaction намеренным exception с компактным JSON payload либо явным `ROLLBACK`
   после гарантированного возврата payload; **COMMIT запрещён при любом результате**;
5. post-check подтвердить отсутствие `vico_forum_web` и неизменность permanent ACL;
6. не устанавливать GitHub variable, не dispatch-ить verifier и не выполнять Hyperdrive/password/
   Worker/deploy/OAuth/Queue/provider operations;
7. записать exact diagnostic payload и SQL в PR #122 без connection data/secrets.

Только после этого Codex классифицирует production-specific catalog behavior либо assertion bug и
определит один проверяемый corrective path. Эта запись сама diagnostic transaction не выполняет и
требует нового явного user authorization.

### Rollback-only diagnostic result; split-authority provisioning contract

Последнее обновление служебного PR ChatGPT #122 на head
`af631cb6fa15b3561377947023fb6822a6655ed7` проверено. Rollback-only diagnostic успешно получил
missing evidence и не сохранил external changes. Expected relation ACL — 50 pairs, actual — 0;
automatic owner membership корректно присутствовало. Post-rollback role снова отсутствует.

Root cause подтверждён: все 18 target relations принадлежат `vico_forum_migrator`, тогда как SQL
исполнялся как database owner `vico_forum_owner`. Owner не имеет grant option на эти relation
privileges; PostgreSQL GRANT выдал warnings и не добавил ACL rows. Repository verifier корректен как
end-state verifier, но CI admin probe не моделирует production split authority.

Не следует расширять owner grant options, временно менять ownership/memberships или давать
`CREATEROLE` migrator. Минимальный corrective path — staged provisioning двумя уже принятыми
identities, с passwordless/unbound role и обязательным compensating cleanup при failure.

Новый bounded external contract:

1. preflight: exact unchanged `main`, target database/branch, обе execution identities, role absent,
   existing localization/migrator/owner invariants;
2. **owner phase** (`vico_forum_owner`): transaction создаёт passwordless safe-attribute
   `vico_forum_web`, проверяет automatic owner membership, выдаёт direct non-grantable database
   `CONNECT` и schema `USAGE`, проверяет только owner-authorized boundary и commit;
3. role после owner phase остаётся unusable externally: password NULL, no Hyperdrive/binding;
4. **object-owner phase** через existing protected `vico_forum_migrator` credential: отдельная
   transaction выдаёт exact 50 relation grants, читает structured actual diff через shared catalog
   shape, требует missing/excess/grantable = 0 и commit;
5. post-phase read-only full merged runtime privilege contract должен пройти для localization + web;
6. при любом failure после owner commit выполнить единственное compensating owner action
   `DROP ROLE vico_forum_web`, которое удаляет dependent ACL; затем доказать role absence и unchanged
   baseline. Не предпринимать in-place fixes или retry;
7. только после successful full snapshot установить protected
   `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web` и выполнить один manual read-only production runtime
   verifier dispatch на exact `main`;
8. не менять credentials/password, ownership, grant options, memberships, defaults, Hyperdrive,
   Worker, deadlines, deployment, OAuth, Queue/provider resources;
9. записать phase identities/conclusions, exact ACL summary, cleanup status (если применимо), GitHub
   variable и workflow evidence в PR #122 без secrets.

Это не atomic cross-role transaction, поэтому безопасность обеспечивается passwordless/unbound
intermediate role, exact phase assertions и заранее разрешённым compensating DROP. Diagnostic
authorization consumed; новый staged gate требует отдельного явного разрешения пользователя.

### Split-authority preflight blocked; reviewed migrator execution path required

Последнее обновление служебного PR ChatGPT #122 на head
`a9d0c298de1e751699bd06cc834c1db6308e801b` проверено. Split-authority preflight подтвердил exact
production ownership и grant authority, но ни одной mutation не выполнил: current Neon SQL tool
всегда исполняется как `vico_forum_owner` и не может использовать existing protected migrator
connection; `SET ROLE` корректно запрещён accepted `SET FALSE` membership.

Authorization не была использована: web role/ACL/variable/workflow/Hyperdrive отсутствуют. Нельзя
ослаблять membership или переносить ownership ради ограничения инструмента. Следующий safe step —
repository-owned manual provisioning path для relation grants под уже существующим
`NEON_MIGRATION_DATABASE_URL`, аналогично остальным protected workflows.

Нужен отдельный mergeable PR из current `main` со scope:

1. добавить script для **relation-grant phase**, который импортирует
   `runtimeCapabilityContracts.web` и не дублирует ACL list;
2. script должен требовать `DATABASE_URL`, `RUNTIME_DATABASE_ROLE`, `WEB_RUNTIME_DATABASE_ROLE` и
   explicit confirmation token; проверять exact `current_user = vico_forum_migrator`, что он
   является единственным owner всех expected web relations, а target web role уже существует;
3. до write проверить owner-phase prerequisites: passwordless role attributes/membership,
   effective/direct database ACL и schema `USAGE` без `CREATE`; не создавать role и не менять эти
   grants;
4. внутри одной transaction выдать exact relation grants, затем вызвать shared snapshot + full
   `assertRuntimeCapabilityPrivilegeContract` для localization/web и commit только при exact match;
   на любой ошибке rollback;
5. добавить manual main-only workflow в protected `production-db` Environment, serialized общей
   `production-db-migrations` concurrency group, с pinned actions, bounded job timeout и existing
   `NEON_MIGRATION_DATABASE_URL` + role variables; confirmation input обязан fail closed;
6. workflow merge сам ничего не запускает. Owner phase, protected variable setup и dispatch остаются
   отдельными explicitly authorized operations после merge;
7. unit tests должны доказать exact SQL derivation из contract, confirmation/identity/ownership/
   prerequisite failures, transaction rollback и no secret logging; disposable PostgreSQL 17 CI
   должен выполнить successful relation-grant phase и forbidden-drift failure;
8. обновить `PROJECT_STATE.md`, `docs/database/HYPERDRIVE.md`, `docs/database/MIGRATIONS.md` только
   как planned execution mechanism; не утверждать external provisioning;
9. не менять Worker/runtime bindings, migrations, dependencies, existing privilege matrix и не
   выполнять external mutations.

После independent review/merge этого PR Codex заново авторизует owner phase → protected variable →
new migrator provisioning workflow → read-only verifier sequence. До этого provisioning запрещён.

### Passwordless observability boundary resolved for provisioning workflow

Последнее обновление служебного PR ChatGPT #122 на head
`d26cac0dd3c16fb0f590b8959cff416fe8bd7b92` проверено. ChatGPT корректно остановил repository
implementation до изменений: exact migrator identity не может достоверно проверить passwordless
state через `pg_roles`, потому что PostgreSQL 17 маскирует `rolpassword`; `pg_authid`/`pg_shadow`
правомерно недоступны. Расширять catalog privileges нельзя.

Решение: passwordlessness является **owner-phase command/evidence invariant**, а не условием,
повторно наблюдаемым migrator. Owner создаёт role exact statement с `PASSWORD NULL`; до Hyperdrive
gate usable credential не существует. Migrator workflow проверяет только доступные ему independent
catalog invariants и требует явное operator confirmation, что reviewed owner phase завершена.

Scope mergeable relation-provisioning PR уточняется:

1. убрать невозможное чтение/утверждение `rolpassword` из migrator script и не называть masked
   `pg_roles.rolpassword` evidence;
2. сохранить checks exact current user, safe visible role attributes, automatic owner membership,
   database/schema prerequisites, exact object ownership и target role existence;
3. workflow `workflow_dispatch` должен иметь обязательный confirmation input с exact reviewed token,
   например `owner-phase-password-null-confirmed`; mismatch fail closed до DB connection/write;
4. docs и workflow UI явно объясняют: token подтверждает отдельное owner-phase evidence, но не
   является database-derived password check;
5. script по-прежнему derivе-ит grants только из `runtimeCapabilityContracts.web`, выполняет их
   transactionally под exact migrator и вызывает shared full end-state assertion до commit;
6. tests покрывают отсутствующий/неверный confirmation, отсутствие role/prerequisites, wrong
   current user/ownership, rollback и successful disposable PostgreSQL path; они не имитируют
   password observability;
7. остальные условия предыдущего PR scope сохраняются: protected main-only workflow, shared
   concurrency, no external execution, no Worker/migration/dependency/capability-matrix change;
8. `PROJECT_STATE.md`/database docs фиксируют разделение owner evidence и migrator-observable
   verification без заявления, что provisioning выполнен.

Это устраняет ложное требование, не ослабляя credential boundary. ChatGPT может создать mergeable
PR с уточнённым contract; external owner phase и workflow dispatch остаются запрещены до его
independent review/merge.

### Независимая полная проверка PR #139

Последнее обновление служебного PR ChatGPT #122 на head
`6f67d34123d064bad449a13dab36dd2905524448` и split-authority provisioning PR #139 проверены
независимо. PR основан на exact `main` `4cef0297bb41ff3a18ee0ad82315aef940146596`;
reviewed head — `2b4f7ee33c3f011a8d997eac34f9a18f53f9350d`.

Полная проверка всех восьми changed files подтвердила:

- GRANT statements derive-ятся только из shared `runtimeCapabilityContracts.web`, включая safe
  identifier quoting, и relation matrix не дублируется;
- exact confirmation token rejected до DB connection; passwordlessness корректно остаётся
  owner-phase evidence, а не ложным `pg_roles` assertion;
- prerequisites fail closed проверяют exact migrator current user, visible safe role attributes,
  единственное automatic owner membership, exact database/schema ACL и migrator ownership всех
  expected table relations;
- relation grants выполняются одной transaction, после чего shared complete runtime snapshot/
  assertion должен пройти до commit; любой failure вызывает rollback;
- manual workflow main-only, protected `production-db`, serialized общей migration concurrency,
  имеет bounded timeout и использует existing migration secret + environment role variables;
- disposable PostgreSQL 17 probe моделирует split authority и подтверждает successful path и
  rollback без relation grants при forbidden prerequisite drift;
- docs/state не утверждают external provisioning; Worker bindings, migrations, dependencies и
  runtime capability matrix не изменены; external operations отсутствуют.

GitHub CI run `36312334101` на exact head полностью successful:
`checks=success`, `database=success`, включая provisioning unit suite, existing runtime probes,
новый split-authority PostgreSQL 17 probe, full tests/build и Workers smoke. Локальные syntax checks
successful; локальный unit runner не стартовал из-за отсутствующего installed `pg` package в
isolated worktree, что является environment limitation и покрыто successful CI.

Новых current-Stage defects, source-of-truth contradictions или scope expansion не обнаружено.
Финальный технический вывод: PR #139 на head
`2b4f7ee33c3f011a8d997eac34f9a18f53f9350d` готов к merge пользователем. Owner phase, GitHub
variable, provisioning workflow dispatch и read-only verifier до post-merge сверки запрещены.

### PR #139 merged; post-merge reconciliation и следующий external gate

PR #139 смержен пользователем. Актуальный GitHub `main` — merge commit
`d4c82a3729e9cdda89b6122ea1438dfb53150a12`; его tree
`197f730fcd9666211f26c173d7777b48771d4346` точно совпадает с независимо проверенным tree head
`2b4f7ee33c3f011a8d997eac34f9a18f53f9350d`. Merge не внёс дополнительных файлов или изменений.
Последнее доступное обновление служебного PR ChatGPT #122 остаётся на проверенном head
`6f67d34123d064bad449a13dab36dd2905524448`; нового технического расхождения с merged `main` нет.

Source-of-truth после merge подтверждает фактическое состояние: repository-owned split-authority
relation-provisioning path готов, но external `vico_forum_web`, relation ACL, protected
`WEB_RUNTIME_DATABASE_ROLE`, Hyperdrive binding и Worker wiring отсутствуют. Следующая операция уже
является production database mutation и поэтому не выводится из факта merge или общей команды
«продолжить Stage 6»: требуется отдельное явное разрешение пользователя.

Следующий bounded gate после такого разрешения — **только owner phase**:

1. ChatGPT сверяет exact `main` SHA, target database/branch и прежние owner/migrator/localization
   invariants; отсутствие `vico_forum_web` и web relation ACL обязательно;
2. через owner-controlled production connection одной transaction создаёт `vico_forum_web` как
   `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD NULL`;
3. выдаёт только direct non-grantable database `CONNECT` и schema `USAGE`, подтверждает automatic
   owner membership и owner-authorized boundary, затем commit;
4. фиксирует identity/conclusion, password-null command evidence и compact ACL summary в PR #122
   без connection data или secrets;
5. на любом assertion/SQL failure выполняет rollback; если failure обнаружен после commit — только
   заранее согласованный compensating owner `DROP ROLE vico_forum_web` с evidence отсутствия role и
   неизменности baseline, без in-place исправлений или retry;
6. после successful owner phase **останавливается**: protected GitHub variable не устанавливает,
   migrator provisioning workflow, read-only verifier, Hyperdrive/password/Worker/deploy/OAuth/
   Queue/provider operations не запускает.

После evidence owner phase Codex отдельно проверит результат и только затем определит следующий
gate: protected variable + один migrator provisioning workflow dispatch. До явного разрешения
пользователя owner phase и все последующие external actions запрещены.

### Owner-phase inheritance contradiction исправлено; mutation не выполнялась

Последнее обновление служебного PR ChatGPT #122 на head
`eefc1d4081cb8f09322ffb24a2053bc659a320d6` проверено. ChatGPT корректно остановился до database
connection/mutation: предыдущая запись Codex ошибочно требовала `INHERIT`, тогда как merged
`.github/scripts/provision-production-web-relations.mjs` fail closed требует target web role
`NOINHERIT`, а database source-of-truth запрещает inherited runtime membership.

Расхождение подтверждено независимо. Это дефект инструкции Codex, а не PR #139 или merged
repository contract. Исправление выше заменяет единственный ошибочный attribute на `NOINHERIT`;
остальной bounded owner-phase contract не меняется. ChatGPT подтвердил отсутствие `CREATE ROLE`,
database/schema grants, compensating `DROP`, GitHub variable, workflow dispatch, verifier и прочих
external operations. Предыдущее разрешение не было использовано production mutation.

Исправленный owner-phase gate:

1. exact role attributes: `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
   NOBYPASSRLS PASSWORD NULL`;
2. только direct non-grantable database `CONNECT`, schema `USAGE` без `CREATE` и automatic
   database-owner inbound admin membership с `inherit_option=false`, `set_option=false`;
3. все прежние preconditions, transactional assertions, rollback/compensating cleanup и evidence
   requirements сохраняются;
4. после successful owner phase обязательна остановка до независимой проверки Codex.

Поскольку предыдущая явная авторизация ссылалась на ошибочно описанную owner phase и операция не
начиналась, исправленный production mutation gate требует нового явного разрешения пользователя.
До него external actions запрещены.

### Corrected owner phase successful; следующий migrator relation-grant gate

Последнее обновление служебного PR ChatGPT #122 на head
`fd827aceb174dad17ab10dd00eb4d30a41a89e79` проверено. Owner phase выполнена на exact GitHub
`main` `d4c82a3729e9cdda89b6122ea1438dfb53150a12` и exact production branch/database после read-only
preflight. Evidence согласуется с merged contract:

- `vico_forum_web` создан как `LOGIN NOINHERIT` с disabled dangerous attributes и exact
  `PASSWORD NULL` command evidence;
- присутствует только automatic inbound owner admin membership с `ADMIN TRUE`,
  `INHERIT FALSE`, `SET FALSE`;
- direct database ACL — только non-grantable `CONNECT`; schema ACL — только non-grantable
  `public.USAGE`; effective database `CREATE=false`;
- web relation/column/function/default privileges и owned objects отсутствуют;
- все 18 target relations остаются owned exact `vico_forum_migrator`, localization baseline не
  изменён;
- transaction committed successfully; cleanup не требовался; protected variable, workflows,
  Hyperdrive, Worker и другие operations не выполнялись.

Противоречий с repository verifier или database source-of-truth не обнаружено. Intermediate role
остаётся passwordless/unbound и без relation privileges, поэтому owner-phase evidence принято.

Следующий bounded gate требует нового явного разрешения пользователя и включает только:

1. в protected GitHub Environment `production-db` установить variable
   `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`, не изменяя secrets или другие variables;
2. на exact неизменном `main` один раз dispatch-ить workflow
   `Provision production web relation grants` с exact input
   `owner_phase_confirmation=owner-phase-password-null-confirmed`;
3. дождаться terminal conclusion и записать run ID, exact SHA, job/step conclusions и безопасный
   ACL summary в PR #122 без secrets;
4. при success остановиться: `Production runtime privilege verification`, Hyperdrive/password,
   Worker/deploy/OAuth/Queue/provider operations не запускать;
5. при failure не retry-ить и не вносить ad-hoc fixes; выполнить заранее согласованный owner
   compensating `DROP ROLE vico_forum_web`, доказать отсутствие role/ACL и удалить только что
   установленную `WEB_RUNTIME_DATABASE_ROLE`, затем остановиться с evidence.

До нового явного разрешения protected variable mutation и workflow dispatch запрещены.

### GitHub control-plane execution blocker; дальнейшая координация через ChatGPT

Последнее обновление служебного PR ChatGPT #122 на head
`3e09bab1340cd1fa51a7a25f9bb8268fce62b494` проверено. ChatGPT корректно сверил exact `main`,
merged workflow и accepted owner-phase intermediate state, затем остановился до mutation:
доступный connector умеет читать/rerun существующие Actions runs, но не умеет создавать Environment
variables или новый `workflow_dispatch`. GET-only fallback не является допустимым write path.

Независимая проверка текущей Codex environment дала тот же результат: GitHub write token отсутствует;
public API подтверждает, что workflow ID `368254678` в
`.github/workflows/production-web-relation-provision.yml` активен. Repository redesign, rerun старого
workflow или ослабление protected Environment ради ограничения инструментов запрещены. Это
control-plane limitation, а не defect repository contract.

Авторизованный gate не начат и authorization не consumed: variable не изменена, workflow не
dispatch-ился, Neon mutation/cleanup и последующие runtime operations отсутствуют. Единственный
доступный безопасный execution path требует двух owner-controlled GitHub UI/API операций:

1. в Environment `production-db` создать/update variable exact
   `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`, не меняя secrets или другие variables;
2. из Actions на exact `main` `d4c82a3729e9cdda89b6122ea1438dfb53150a12` один раз запустить
   `Provision production web relation grants` с exact input
   `owner_phase_confirmation=owner-phase-password-null-confirmed`;
3. не запускать повторно при failure и не запускать runtime verifier/Hyperdrive/Worker/deploy;
4. после terminal conclusion передать ChatGPT только короткий запрос проверить run и записать
   evidence в PR #122; при failure ChatGPT выполняет уже авторизованный compensating cleanup и
   фиксирует доказательство role/ACL absence. Секреты, URL подключения и значения secret fields не
   передавать. Автоматический retry и ad-hoc correction запрещены.

Correction по каналу выполнения: Codex не должен поручать пользователю эти control-plane операции
напрямую. В соответствии с решением пользователя все такие действия координируются в чате с
ChatGPT; PR #121 передаёт только contract и ограничения, а короткий handoff просит ChatGPT проверить
последнее обновление и продолжить Stage 6. Если connector ChatGPT не способен выполнить write,
именно ChatGPT должен организовать следующий user-assisted control-plane шаг и затем записать
результат в PR #122. Codex не дублирует operational instructions пользователю в ответе.

### Migrator relation grants successful; следующий read-only verifier gate

Последнее обновление служебного PR ChatGPT #122 на head
`255ab205b981f35a04e4a36e23bfea9b63e71c50` проверено независимо. GitHub API подтверждает exact
workflow evidence:

- workflow `.github/workflows/production-web-relation-provision.yml`, ID `368254678`;
- run `36316236607`, run/attempt `1/1`, event `workflow_dispatch`;
- exact `main` SHA `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- job `108611362591` и все исполнявшиеся steps завершились `success`, rerun отсутствует;
- exact relation-grant step завершился `success`.

Дополнительный read-only production catalog post-check из PR #122 согласуется с shared contract:
safe `LOGIN NOINHERIT` web role, exact automatic owner membership, только direct non-grantable
database `CONNECT` и schema `USAGE`, relation pairs expected/actual `50/50`, missing/excess/
grantable `0/0/0`; localization ACL не изменён. Никаких признаков widening, partial commit или
repository/source-of-truth contradiction нет. Provisioning evidence принято.

Следующий отдельно разрешаемый gate — ровно один manual dispatch workflow
`Production runtime privilege verification` на том же exact `main`. Workflow main-only,
read-only, protected `production-db`, serialized общей migration concurrency, использует existing
`NEON_MIGRATION_DATABASE_URL`, `RUNTIME_DATABASE_ROLE` и уже установленный
`WEB_RUNTIME_DATABASE_ROLE`; input отсутствует. Требуемое evidence: run ID, exact SHA, attempt,
job/step conclusions и safe verifier summary в PR #122.

После terminal conclusion обязательна остановка независимо от результата. Retry, credential/
password creation, Hyperdrive, Worker wiring/deploy, OAuth, authorization bootstrap, Queue/provider
operations запрещены. Control-plane coordination остаётся за ChatGPT; Codex передаёт только
короткий запрос проверить PR #121 и продолжить Stage 6.

### Production runtime privilege verifier successful; runtime-wiring preflight

Последнее обновление служебного PR ChatGPT #122 на head
`ec959ffc3b51e16823902f62fd3f0cd0d280a5cb` проверено независимо. GitHub API подтверждает:

- workflow `.github/workflows/production-runtime-privileges.yml`, ID `368160001`;
- run `36318081404`, run/attempt `1/1`, event `workflow_dispatch`;
- exact `main` SHA `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- job `108616489607` и каждый executed step завершились `success`, rerun отсутствует;
- verifier terminal summary подтвердил localization role `vico_forum_runtime` и web role
  `vico_forum_web`; secrets/connection string не раскрыты.

Node/action и future `pg` SSL-mode warnings не являются defect текущего gate: run successful и
контракт privileges проверен. Их следует учитывать в отдельном future maintenance cycle, но не
расширять ими текущий Stage 6 runtime rollout. Production runtime privilege gate принят.

Следующий безопасный шаг — **только bounded read-only runtime-wiring preflight в ChatGPT**, без
создания credential/Hyperdrive, config/code changes или deploy:

1. на exact current `main` полностью проверить Worker composition и распределить каждый active
   database adapter между accepted `localization-read` и `web` capabilities; особо проверить
   content translation presentation и generation-status paths, чтобы ни один adapter не оказался
   подключён к role без требуемых ACL;
2. read-only проверить фактические Cloudflare Worker/Build branches, preview topology, существующий
   `HYPERDRIVE` binding/config и caching state, не раскрывая IDs/credentials сверх безопасного
   evidence; production write/private-data capability не должна попасть в preview;
3. по официальной документации exact current Wrangler/Hyperdrive определить поддерживаемый способ
   отдельного cache-disabled web binding, credential rotation/update и environment-specific config;
4. определить web origin role defaults/deadlines по фактическим forum/auth/authz queries, не
   наследуя автоматически localization `500/1500/2000ms`;
5. выдать конкретный минимальный порядок следующих reviewed steps: repository wiring-preparation
   PR, password/credential mutation, Hyperdrive provisioning/update, binding config, deploy/smoke;
   отделить то, что требует external authorization;
6. записать findings и предлагаемый contract только в PR #122. Не создавать mergeable PR до
   независимой сверки Codex и не выполнять Cloudflare/Neon/GitHub mutations.

Этот read-only audit не повторяет уже закрытую ACL-проверку: его цель — доказать binding topology,
adapter routing, preview isolation и deadlines до первого web credential/Hyperdrive mutation.

### Runtime-wiring preflight reviewed; fresh Cloudflare topology remains Gate 0

Последнее обновление служебного PR ChatGPT #122 на head
`6096efce2836dadf38755ced87fb4cd10fd2070c` и весь five-part preflight проверены независимо по
current `main`, Worker composition, database adapters, accepted ACL contracts и database source of
truth.

Подтверждено:

- existing `HYPERDRIVE` должен остаться localization-only для registry и UI translation reads;
- future cache-disabled web capability должна обслуживать Better Auth, forum, dynamic
  authorization и persisted forum-content translation presentation;
- generation-status adapter читает четыре task/generation relations, отсутствующие в обеих
  accepted HTTP capabilities; пока generation action disabled, он должен быть fail-closed и не
  routed ни через одну из них, без ACL widening;
- exact Wrangler `4.130.0`/Hyperdrive model поддерживает отдельную cache-disabled configuration,
  несколько bindings и per-binding local overrides; reuse/widening localization pool не требуется;
- initial web calibration profile `connection=3s`, `lock=2s`, `statement=5s`, `query=7s` сохраняет
  корректный порядок deadlines и разумно соответствует текущим bounded auth/forum/authz paths, но
  остаётся initial profile до real-path measurement;
- `PROJECT_STATE.md` теперь фактически stale: external web role/grants/protected variable и
  successful verifier уже существуют, тогда как web credential, role deadline defaults,
  Hyperdrive/binding/routing/deployment всё ещё отсутствуют.

Один sequencing refinement обязателен до external credential gate: создание usable web password и
нового Hyperdrive нельзя оставлять как бессрочно разнесённые независимые состояния. После
repository preparation потребуется единая отдельно авторизованная bounded choreography:
credential + role defaults → новый cache-disabled Hyperdrive → safe metadata evidence; при failure
до usable Hyperdrive должен существовать заранее проверенный credential-null/rotation recovery,
который не удаляет accepted role/ACL. Exact secret-transfer и recovery contract определяется после
Cloudflare topology evidence, не сейчас.

Текущий **Gate 0** остаётся единственным следующим шагом и полностью read-only: ChatGPT должен
организовать authenticated evidence фактического Cloudflare `vico-forum` control plane:

1. Workers Builds production branch/trigger и auto-deploy state;
2. preview enablement/branch filters и какие bindings/resources/secrets доступны preview;
3. deployed Worker versions/routes и соответствие checked-in config без раскрытия secrets;
4. existing localization `HYPERDRIVE` binding/config presence, origin role identity и query-cache
   state;
5. dashboard-only drift относительно `wrangler.jsonc`.

Если auto-deploy активен либо preview наследует production private/write capability, preflight
останавливается и фиксирует exact safe finding без mutations. До Gate 0 evidence запрещены
mergeable wiring-preparation PR, password/deadline changes, Hyperdrive provisioning, binding config
и deploy. Технические details остаются в PR #121; дальнейшую control-plane координацию выполняет
ChatGPT и записывает sanitized evidence в PR #122.

### Cloudflare Gate 0 accepted; первый repository preparation PR

Последнее обновление служебного PR ChatGPT #122 на head
`2de409dc74b8d0e2d8218f00c2b65d2f8c33e364` проверено. Owner-provided read-only Cloudflare UI
evidence образует согласованный полный snapshot:

- native Git Builds disconnected, поэтому merge в `main` не является automatic deployment;
- active production Worker остаётся на старом accepted commit и 100% traffic, что соответствует
  намеренному lag до Stage 6 rollout;
- Production имеет только `HYPERDRIVE -> vico-forum-registry`; origin role exact
  `vico_forum_runtime`, database `vico_forum`, query caching disabled;
- Previews Base имеет zero bindings и zero runtime variables/secrets;
- production и preview `workers.dev` URLs enabled, но custom domains/routes отсутствуют;
- никакие Cloudflare settings не изменялись.

Evidence согласуется с checked-in topology и ранее зафиксированным external state. Preview URL сам
по себе не является defect: при zero bindings/secrets он не получает production private/write
capability. Gate 0 принят; перед будущим deploy topology всё равно перепроверяется как mutable
control-plane state.

ChatGPT может создать первый mergeable **repository-only preparation PR** из exact current `main`.
Обязательный scope:

1. синхронизировать `PROJECT_STATE.md`, `PROJECT_HISTORY.md` и database runbooks с принятыми фактами:
   web role/grants/protected variable/runtime verifier готовы; credential, role defaults, new
   Hyperdrive, binding/routing и deploy ещё отсутствуют;
2. добавить единый reusable web PostgreSQL client/pool configuration boundary с caller deadlines
   `connectionTimeoutMillis=3000` и `query_timeout=7000`; Better Auth, forum и authorization
   factories должны использовать одну definition, без session `SET` и без server defaults в code;
3. оставить external server defaults `lock_timeout=2s`, `statement_timeout=5s` только planned
   contract в docs, не выполнять DB mutation и не объявлять calibration accepted;
4. убрать production Worker injection Hyperdrive-backed generation-status reader, пока generation
   action disabled: при ошибочном вызове path должен fail closed через отсутствующую capability, а
   не обращаться к task tables под localization/web role; ACL не расширять;
5. добавить focused unit/source contract tests для exact web client options, использования shared
   factory всеми тремя adapter families и dormant generation-status boundary;
6. сохранить текущий один binding `HYPERDRIVE`, его ID и local override без изменений; не добавлять
   `WEB_HYPERDRIVE`, placeholder ID или second local override до создания real resource;
7. не менять public/domain contracts, dependencies, migrations, runtime ACL matrix, provider/Queue/
   OAuth/bootstrap scope; не выполнять Cloudflare/Neon/GitHub mutations или deploy.

CI gate: lint, typecheck, tests, build, database suite и existing single-binding Workers smoke.
После создания PR ChatGPT записывает base/head, полный diff scope и CI status в PR #122; Codex
выполнит независимую полную проверку до merge. Credential/role-default/Hyperdrive choreography до
merge и post-merge сверки запрещена.

### Независимая полная проверка PR #140 — требуется исправление

Последнее обновление служебного PR ChatGPT #122 на head
`cb9134058fa03b857888c0a132893c76babec3c5` и весь PR #140 проверены на exact head
`a41f59d000f56f9cdbe66b44ab64f29461de69b6` против base/current `main`
`d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

Проверены все 11 changed files и полный source-of-truth scope. Code соответствует bounded task:
shared `3000/7000ms` web Client/Pool boundary используется Better Auth, forum и authorization;
dependency-injection seams сохранены; production Worker больше не inject-ит generation-status DB
reader при disabled action; единственный `HYPERDRIVE`, migrations, dependencies, ACL matrix и
external state не изменены. GitHub CI run `36326348303` на exact head successful:
`checks=success`, `database=success`; все executed steps passed.

Найдена одна current-Stage документационная ошибка, также отражённая inline review comment в PR:
`PROJECT_STATE.md` → `Ближайший маршрут`, item 1 всё ещё поручает **подготовить** repository-only
web runtime boundary — добавить shared deadlines и fail-closed generation-status composition —
хотя сам PR #140 уже выполняет эти изменения. После merge source of truth направлял бы следующий
цикл повторять завершённую работу вместо external credential/default choreography. Это нарушает
требование фиксировать фактическое состояние тем же change set.

Требуемое исправление на текущей ветке PR #140:

1. переписать item 1 как уже реализованное repository state, без pre-claim CI/merge/deploy;
2. сделать первым future action отдельно согласуемую bounded external choreography
   `web credential + role defaults → cache-disabled web Hyperdrive → safe metadata evidence`;
3. сохранить следующие binding/routing PR и deploy gates отдельными;
4. не менять code/tests или расширять scope без новой подтверждённой проблемы.

После исправления ChatGPT обязан заново проверить весь PR целиком и обновить PR #122 exact head/CI
evidence. Текущий вывод: **PR #140 пока не готов к merge**. External credential/default/Hyperdrive
operations также запрещены.

### Повторная независимая полная проверка исправленного PR #140

Последнее обновление служебного PR ChatGPT #122 на head
`8635acc573a4c94c125c9cbba58605732645a32f` и исправленный PR #140 повторно проверены целиком.
Текущий exact head PR #140 — `74332a7b665bafd6100ffac157da307e2cc3cf91`; base/current `main`
остаётся `d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

Correction от предыдущего reviewed head меняет только `PROJECT_STATE.md`: repository preparation
теперь корректно описана как уже присутствующая **в change set** без ложного pre-claim merge,
external acceptance или deploy; первым future action указана отдельно разрешаемая credential /
role-default / cache-disabled Hyperdrive choreography, затем отдельные binding/routing и deploy
gates. Подтверждённая проблема закрыта.

Полный повторный review всех 11 files подтвердил прежний вывод по остальному scope:

- shared web Client/Pool caller deadlines exact `3000/7000ms`, `max: 1` сохранён для authorization;
- Better Auth, forum и authorization используют shared boundary, injection seams не удалены;
- disabled production generation-status DB capability не inject-ится и ACL не расширены;
- current single `HYPERDRIVE`, ID/local override, migrations, dependencies, CI topology, runtime ACL
  matrix и external state не изменены;
- state/history/runbooks различают accepted role/grants/verifier от отсутствующих credential,
  server defaults, new Hyperdrive, binding/routing и deployment.

GitHub CI run `36327163142` на exact corrected head завершился `success`; jobs
`checks=success` (`108642023850`) и `database=success` (`108642023679`), все executed steps passed.
PR open, non-draft, mergeable и не merged. Новых current-Stage defects, contradictions или unrelated
scope expansion не обнаружено.

Финальный технический вывод: **PR #140 на head
`74332a7b665bafd6100ffac157da307e2cc3cf91` готов к merge пользователем**. До merge и следующей
post-merge сверки credential/default/Hyperdrive external choreography запрещена.

### PR #140 merged; credential/Hyperdrive choreography design gate

PR #140 смержен пользователем. Актуальный GitHub `main` — merge commit
`6f262bf4374440e36096fd315a9c3ff4f42eba27`; его tree
`7f22d218ba9647471dcf822defc3e9d5ab542dc4` точно совпадает с независимо проверенным tree head
`74332a7b665bafd6100ffac157da307e2cc3cf91`. Merge не внёс дополнительных изменений.

Repository preparation теперь фактически находится в `main`: docs/state синхронизированы, shared
web caller deadlines и fail-closed disabled generation composition приняты. External state после
merge не изменился: `vico_forum_web` остаётся passwordless, server role defaults отсутствуют, новый
web Hyperdrive/binding/routing/deploy не выполнены.

Следующий safe step — ещё не mutation, а bounded operational-design task в ChatGPT. До запроса
явной авторизации ChatGPT должен записать в PR #122 один executable choreography contract:

1. exact identities/target и read-only preflight для production role/database и Cloudflare account;
2. PostgreSQL owner transaction только для database-specific role defaults
   `lock_timeout=2s`, `statement_timeout=5s`, с post-check сохранности accepted role/ACL;
3. способ создать usable strong credential так, чтобы password никогда не попадал в chat, PR,
   shell history, workflow log или repository; определить owner/user UI boundary передачи secret
   непосредственно из Neon в Cloudflare;
4. создание нового cache-disabled Hyperdrive resource с proposed stable name `vico-forum-web`,
   origin user exact `vico_forum_web`, database `vico_forum`, без mutation existing
   `vico-forum-registry` и без Worker binding/config update;
5. safe metadata evidence: resource name/ID, origin role/database, caching disabled и connection
   health без host/password; password verifier не заявлять observable;
6. explicit failure boundaries и compensating recovery: до successful Hyperdrive evidence usable
   credential должен быть возвращён в `PASSWORD NULL` либо безопасно rotated/revoked; если resource
   уже создан, определить delete/retain decision и доказать отсутствие unintended binding;
7. остановка после evidence: не менять `wrangler.jsonc`, не добавлять `WEB_HYPERDRIVE`, не deploy,
   не выполнять OAuth/bootstrap/Queue/provider operations;
8. разделить действия, которые ChatGPT способен выполнить инструментом, от owner-assisted UI steps;
   Codex не поручает control-plane operations пользователю напрямую.

Task пока только проектирует проверяемую choreography по current official Neon/Cloudflare behavior.
Не выполнять password/default/Hyperdrive mutations и не создавать mergeable PR. После независимой
сверки Codex зафиксирует exact authorization boundary.

### Credential/default/Hyperdrive choreography accepted; exact next gate

Последнее обновление служебного PR ChatGPT #122 на head
`9b76d246c23984f581259ab3b5f0aeccb6dcef98` проверено независимо против current `main`, PostgreSQL
17, current Neon role/connection guidance и current Cloudflare Hyperdrive behavior. Contract
технически согласован со следующими обязательными уточнениями границы:

- choreography не является atomic cross-control-plane transaction; безопасность обеспечивают
  exact preflight, passwordless starting state, отсутствие binding и заранее авторизованная
  compensation;
- database-specific defaults применяются owner transaction и проверяются через
  `pg_db_role_setting`; при любом незавершённом gate они возвращаются к exact preflight state;
- Neon password reset применяется только к exact branch role `vico_forum_web`; generated secret
  переносится владельцем напрямую Neon UI → Cloudflare UI и нигде больше не раскрывается;
- Cloudflare получает direct/unpooled Neon origin, потому что pooling выполняет Hyperdrive;
- success означает созданный **unbound** resource exact `vico-forum-web` с caching disabled и
  passed connectivity/safe metadata evidence; это ещё не Worker wiring или deploy acceptance;
- при failure после password creation первым действием становится `PASSWORD NULL`/equivalent
  credential revocation, затем cleanup defaults/resource; accepted role/grants не удаляются;
- automatic retry, fallback на pooled origin, изменение `vico-forum-registry` и создание binding
  запрещены.

Следующий точный Stage 6 gate — одна отдельно явно разрешаемая **bounded external choreography**:

1. read-only exact target/drift preflight;
2. owner transaction: database-specific `lock_timeout=2s`, `statement_timeout=5s` + post-check;
3. owner-assisted secret-safe password reset/copy для exact `vico_forum_web`;
4. создать один новый cache-disabled Hyperdrive `vico-forum-web` на direct Neon origin;
5. проверить и записать только safe metadata, accepted ACL/defaults и отсутствие Worker binding;
6. success → обязательная остановка; failure → один compensating recovery без retry и остановка.

Authorization должна явно покрывать и success path, и описанную compensation; общая команда
«продолжить Stage 6» её не заменяет. Control-plane взаимодействие координирует ChatGPT. До такого
разрешения запрещены defaults/password/Hyperdrive mutations. После successful evidence также
запрещены `wrangler.jsonc`, `WEB_HYPERDRIVE`, routing, deploy и последующие Stage 6 gates до новой
проверки Codex.

### Part 2 connector failure reviewed; exact manual owner-default gate

Последнее обновление служебного PR ChatGPT #122 на head
`94152b1a5f8d9b0d729f685b8dbf0cb8ce725038` проверено. Part 1 exact-target preflight passed и
подтвердил unchanged accepted role/ACL/Cloudflare topology. Перед Part 2 Neon connector установил
correct owner identity/database, но write call был rejected до confirmed SQL execution с
`401 supplied credentials do not pass authentication`. Automatic retry не выполнялся; последующий
read-only check подтвердил empty `pg_db_role_setting`. Password/Hyperdrive/binding operations не
начинались, compensation не требовалась.

Failure классифицирован как authentication limitation конкретного connector write path, а не
database drift, SQL contract defect или partial mutation. Повторять тот же connector call,
ослаблять role boundary, добавлять owner secret в GitHub либо использовать migrator connection
запрещено.

Следующий точный gate сужается до **Part 2 only** и требует новой явной авторизации:

1. ChatGPT координирует owner-assisted выполнение reviewed transaction в Neon SQL Editor на exact
   production branch/database; Codex напрямую control-plane шаг пользователю не поручает;
2. transaction до write fail closed проверяет exact `current_user=session_user=vico_forum_owner`,
   `current_database()=vico_forum`, exact safe `vico_forum_web` attributes и отсутствие existing
   database-specific settings;
3. выполняются только
   `ALTER ROLE vico_forum_web IN DATABASE vico_forum SET lock_timeout = '2s'` и
   `ALTER ROLE vico_forum_web IN DATABASE vico_forum SET statement_timeout = '5s'`;
4. до commit exact catalog assertion требует только эти две settings; любой SQL/assertion failure
   приводит к rollback без retry;
5. отдельный read-only post-check подтверждает exact settings и неизменность role attributes,
   membership, database/schema ACL и 50 relation privilege pairs;
6. после evidence обязательна остановка. Password reset, Hyperdrive creation, binding/routing,
   deploy и иные mutations не входят в этот gate.

Если UI transaction завершилась неоднозначно, не повторять: сначала read-only catalog
reconciliation. Success evidence записывается в PR #122 без connection details. Предыдущая общая
authorization остановилась на failure и не является разрешением нового manual execution path;
ChatGPT должен запросить отдельное явное разрешение пользователя на этот Part 2-only gate и его
rollback/reconciliation boundary.

### Part 2-only gate accepted; exact credential + Hyperdrive gate

Последнее обновление служебного PR ChatGPT #122 на head
`c88c185124b8fa9ec9ebb27815d5d9ebebe6afc0` проверено. Owner-assisted Neon SQL Editor transaction
на exact production target выполнила только reviewed database-specific defaults и committed once.
Отдельный read-only post-check подтвердил exact `lock_timeout=2s`, `statement_timeout=5s`, отсутствие
других settings и неизменные role attributes, membership, database/schema ACL и exact 50/50
non-grantable relation pairs. Password/Hyperdrive/binding/deploy не выполнялись. Part 2 принят.

Поскольку defaults теперь являются отдельно принятым durable state, последующая credential/
Hyperdrive failure **не должна** сбрасывать их. Следующий точный Stage 6 gate объединяет только
Part 3 + Part 4 и требует новой явной авторизации, включая compensation:

1. read-only preflight подтверждает accepted defaults/ACL, passwordless/no-usable-credential
   starting state, отсутствие resource `vico-forum-web`, отсутствие `WEB_HYPERDRIVE` и unchanged
   `vico-forum-registry`/preview isolation;
2. до reset ChatGPT убеждается, что Neon UI позволяет reset exact branch role `vico_forum_web` и
   выбрать direct/unpooled connection для exact database; если role/reset option недоступны — hard
   stop без SQL/API substitution;
3. владелец по координации ChatGPT выполняет generated password reset в Neon UI и переносит secret
   напрямую в Cloudflare UI без chat/PR/tool/log/clipboard-history disclosure;
4. создаётся ровно один новый Hyperdrive resource `vico-forum-web`: direct Neon origin, database
   `vico_forum`, user `vico_forum_web`, query caching disabled; existing localization resource не
   меняется;
5. success evidence содержит только resource name/ID, safe origin role/database, cache-disabled и
   connectivity conclusion, unchanged localization resource, zero Worker/preview bindings;
6. при любом failure после reset: без retry первым делом вернуть credential в `PASSWORD NULL`,
   затем удалить созданный unbound resource; если delete не проходит — credential остаётся revoked,
   resource доказан unbound и gate останавливается. Accepted defaults/role/grants сохраняются;
7. после success либо compensation обязательна остановка. `wrangler.jsonc`, `WEB_HYPERDRIVE`,
   routing, deploy, OAuth/bootstrap/Queue/provider operations запрещены.

Этот gate не включает repository PR. Control-plane операции координирует ChatGPT; Codex передаёт
только contract через PR #121. Общая команда «продолжить» не заменяет explicit authorization на
Part 3+4 success path и compensation.

### Neon PASSWORD NULL limitation confirmed; Part 3 bootstrap rebuilt

Последнее обновление служебного PR ChatGPT #122 на head
`735eb065e952ff6882e1baef138bdfe8439c9117` проверено. Part 3+4 preflight подтвердил exact target,
accepted defaults/ACL, direct connection selection и отсутствие нового Hyperdrive/binding. Neon UI
один раз отклонил `Reset password` с `cannot update password for role without password`; usable
credential не создан, Cloudflare creation не начинался, compensation не требовалась.

Ограничение подтверждено: Neon `Reset password` вращает существующий managed password, но не
bootstrap-ит SQL-created role в состоянии `PASSWORD NULL`. Повторять reset, использовать API reset,
пересоздавать/переименовывать role либо выдавать `neon_superuser` запрещено. Ранее согласованный UI
reset path отменён.

Secret-safe bootstrap пересобран на официальном PostgreSQL 17 `psql` meta-command
`\\password vico_forum_web`: он интерактивно запрашивает новый password, шифрует его и отправляет
как `ALTER ROLE`, не помещая cleartext в command history/server log. Password генерируется локальным
password manager пользователя и не передаётся ChatGPT. Owner connection также открывается
интерактивно с password prompt, без credential в command line/history.

Новый точный gate по-прежнему объединяет credential bootstrap и immediate Hyperdrive creation,
чтобы не оставлять usable credential бессрочно unbound, и требует новой явной авторизации:

1. read-only preflight плюс проверка availability local trusted `psql` и owner direct connection;
2. интерактивная owner session подтверждает exact `current_user/session_user/database`, затем
   выполняет только `\\password vico_forum_web`; SQL `ALTER ROLE ... PASSWORD 'cleartext'`, `-c`,
   shell/env argument или chat paste запрещены;
3. тот же locally generated password без публикации немедленно вводится прямо в Cloudflare UI при
   создании единственного unbound cache-disabled `vico-forum-web` на direct Neon origin;
4. success evidence и stop остаются прежними: safe metadata, unchanged localization resource,
   zero Worker/preview binding; никаких repo/routing/deploy operations;
5. при любом failure после `\\password`: без retry сначала owner-controlled
   `ALTER ROLE vico_forum_web PASSWORD NULL` через reviewed SQL Editor/interactive session, затем
   удалить созданный unbound resource; accepted defaults/grants сохраняются;
6. ambiguous credential outcome запрещает повтор `\\password`: сначала один connectivity attempt
   в Cloudflare create либо owner-controlled reconciliation; если success не доказан, revoke to
   `PASSWORD NULL` и stop.

ChatGPT сначала проверяет tool prerequisites и координирует owner-assisted local/UI steps; Codex не
передаёт пользователю команды напрямую. Общая команда «продолжить» не является authorization на
пересобранный gate и compensation.

### Web-only credential bootstrap: protected one-time workflow selected

Последнее обновление служебного PR ChatGPT #122 на head
`ef53fc42dfaf462d502719b622ad659b9855a237` проверено. Исторический migrator precedent уточнён
корректно: он доказывает safe secret transfer и identity verification после появления credential,
но не содержит воспроизводимого first-password bootstrap для SQL-created `PASSWORD NULL` role.

Независимая оценка вариантов:

- Neon Reset UI/API неприменимы к `authentication_method=no_login`/`PASSWORD NULL`;
- role recreation/rename разрушает accepted OID-bound ownership/grants/defaults и может добавить
  Neon-managed elevated memberships, поэтому отклонено;
- local `psql \\password` технически secret-safe, но создаёт unverifiable local tool/owner-session
  boundary и хуже воспроизводится для production evidence;
- protected one-time GitHub workflow использует уже существующий `NEON_OWNER_DATABASE_URL`, exact
  `main`, Environment/concurrency controls и позволяет автоматизировать assertions, login proof и
  compensation без раскрытия password.

Выбран последний вариант. До external credential mutation нужен отдельный mergeable
**repository-only bootstrap PR** со scope:

1. manual main-only workflow в `production-db`, shared `production-db-migrations` concurrency,
   bounded timeout, pinned actions и exact confirmation token;
2. inputs только existing owner secret `NEON_OWNER_DATABASE_URL`, protected variable
   `WEB_RUNTIME_DATABASE_ROLE`, temporary secret `WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP`; secret
   создаётся пользователем только после merge и не входит в PR;
3. script fail closed проверяет exact owner/session/database, target role, accepted attributes,
   membership, `2s/5s` defaults, full accepted ACL, direct/unpooled owner target и disabled
   server bind-parameter-on-error logging before mutation;
4. Node core crypto локально выводит valid PostgreSQL SCRAM-SHA-256 verifier из temporary secret;
   cleartext и verifier никогда не логируются;
5. verifier передаётся server-side без включения в logged SQL text: parameterized transaction-local
   custom setting + fixed PL/pgSQL block выполняют dynamic `ALTER ROLE ... PASSWORD` для exact
   constant role; interpolation secret/verifier в client SQL string запрещена;
6. после commit script собирает web connection URL только in-memory из validated direct/unpooled
   owner target + exact web role/password и выполняет bounded read-only login assertion
   `current_user=vico_forum_web`, exact database/defaults;
7. при post-commit/ambiguous failure owner path без retry устанавливает `PASSWORD NULL`, фиксирует
   bounded compensation conclusion и завершает workflow failure; accepted defaults/grants не
   сбрасываются;
8. tests: pure SCRAM derivation/format, no-secret logging contract, wrong confirmation/identity/
   precondition failures, disposable PostgreSQL 17 successful web login и forced post-commit
   compensation; workflow contract test;
9. docs/state называют path temporary planned bootstrap и не утверждают credential/Hyperdrive
   success. Migrations, ACL matrix, dependencies, Worker/binding/routing не меняются.

После independent review/merge: пользователь создаёт temporary secret из locally generated strong
password, один раз dispatch-ит credential workflow, затем при success немедленно создаёт через
ChatGPT-coordinated owner UI unbound cache-disabled Hyperdrive с тем же locally retained password.
После accepted Hyperdrive evidence temporary GitHub secret удаляется, а workflow/script удаляются
отдельным cleanup PR. До review/merge implementation PR никакие secrets или external mutations не
выполнять.

ChatGPT может создать mergeable repository-only bootstrap PR из current `main` и записать exact
base/head/diff/CI evidence в PR #122. Предыдущий local-psql gate отменён.

### Независимая полная проверка PR #141 — дополнительные исправления обязательны

PR #141 полностью проверен на current head `ee8b7ea35fbfb5806ed587ea22ab86f7162e253d`
против exact base/current `main` `6f262bf4374440e36096fd315a9c3ff4f42eba27`, включая все 8
changed files, latest fixes, PR #122 head `4084e370df18454bd4f9fb57c8c45b17091142df`, inline review и
CI run `36338774077` (`checks=success`, `database=success`). Исправления workflow expressions,
logging preflight и applied-default docs частично корректны; SCRAM derivation, parameterized
server-side application, ACL preflight, login proof и normal caught-error compensation реализованы
разумно.

Однако полная проверка выявила три current-Stage проблемы:

1. **Credential может остаться usable после неконтролируемого завершения runner.** Password commit
   происходит до отдельного login proof, а compensation существует только внутри JavaScript
   `catch`. Process crash, job cancellation/timeout или runner loss после `COMMIT` не гарантируют
   выполнение `PASSWORD NULL`; credential остаётся активным бессрочно без accepted evidence. Для
   fail-closed bootstrap password должен первоначально применяться с server-owned bounded
   `VALID UNTIL` lease. После successful Hyperdrive evidence отдельная owner assertion может
   финализировать `VALID UNTIL 'infinity'`; без финализации credential автоматически expires.
2. **One-time workflow фактически допускает повторный dispatch/rerun.** Preflight не может наблюдать
   passwordless state через доступный catalog и потому второй запуск с временным secret бесшумно
   rotate-ит уже принятый credential. Workflow/script должны до DB connection требовать exact first
   `GITHUB_RUN_NUMBER=1` и `GITHUB_RUN_ATTEMPT=1` (либо эквивалентный repository-owned one-shot
   marker) и иметь contract tests. Confirmation token сам по себе one-shot не доказывает.
3. **`PROJECT_STATE.md` остаётся внутренне противоречивым.** Current-state sections правильно
   говорят, что `2s/5s` defaults applied, но список незавершённого Stage 6 всё ещё включает
   `database-role deadline defaults`. Нужно удалить уже выполненную часть, сохранив credential /
   Hyperdrive binding/routing как outstanding.

Required corrective cycle на той же ветке PR #141:

- добавить bounded credential lease и tests для expiry/forced termination-safe semantics;
- определить в docs точную post-Hyperdrive finalize/expiry recovery choreography без pre-claim;
- запретить dispatch/rerun не-first run/attempt до secrets/DB access и покрыть тестами;
- исправить stale `PROJECT_STATE.md` statement;
- затем заново проверить весь PR и exact-head CI. Scope не расширять до external execution,
  Hyperdrive API, binding/routing или deploy.

Текущий вывод: **PR #141 не готов к merge**. Temporary bootstrap secret создавать и workflow
dispatch выполнять запрещено до corrective cycle и повторной независимой полной проверки.

### Финальная независимая полная проверка исправленного PR #141

Последнее обновление служебного PR ChatGPT #122 на head
`9f437aafd45a653ec1a2f63b892d0665761d7bdc` и финальный PR #141 повторно проверены целиком.
Exact head — `d374325dbbc1cf44d08c7974694b609b500af25a`, base/current `main` —
`6f262bf4374440e36096fd315a9c3ff4f42eba27`; PR open, non-draft, mergeable, behind 0.

Все три подтверждённые проблемы закрыты:

- initial SCRAM credential получает server-clock `VALID UNTIL` lease 30 минут; transaction до
  commit проверяет active bounded `rolvaliduntil`, disposable PostgreSQL 17 probe доказывает
  immediate login, expiry rejection и `PASSWORD NULL` compensation;
- отдельный pre-Environment/no-secret guard, bootstrap job condition и script assertion требуют
  exact main, `GITHUB_RUN_NUMBER=1`, `GITHUB_RUN_ATTEMPT=1` до production DB connection; repeat
  dispatch/rerun fail closed;
- `PROJECT_STATE.md` больше не перечисляет уже applied role defaults как outstanding, а docs точно
  разделяют bootstrap lease, post-Hyperdrive owner finalization в `infinity` и expiry cleanup.

Повторный review всех 8 changed files также подтвердил:

- module восстановлен без duplicated/truncated tail, cleartext/verifier не interpolated в client
  SQL/logging, server logging preconditions fail closed;
- preflight требует exact direct Neon owner target, PG17/UTF8/SCRAM settings, owner/web/localization
  identities, accepted membership/defaults и полный ACL contract;
- post-commit web login проверяет exact identity/database/`2s`/`5s`; ordinary failure выполняет
  bounded revocation, а uncontrolled termination ограничен server-owned expiry;
- workflow manual/main-only/protected/serialized с pinned actions и bounded timeout; temporary
  secret отсутствует в repository;
- migrations, dependencies, runtime ACL matrix, Worker bindings/routing, Hyperdrive resources и
  external state не изменены.

Exact-head CI run `36342570162`: attempt 1 имел unrelated existing database serialization flake;
единственный rerun failed job на том же SHA завершил attempt 2 полностью successful. Jobs
`checks=success` (`108685654779`) и `database=success` (`108685653862`), включая credential lease /
expiry / compensation probe. Это CI workflow, не production bootstrap workflow, и не влияет на
one-shot `GITHUB_RUN_NUMBER` будущего отдельного workflow.

Новых current-Stage defects, contradictions или unrelated scope expansion не обнаружено.
Финальный технический вывод: **PR #141 на head
`d374325dbbc1cf44d08c7974694b609b500af25a` готов к merge пользователем**. До merge и post-merge
сверки запрещены temporary secret creation, bootstrap dispatch и credential/Hyperdrive mutations.

### PR #141 merged; exact leased credential + Hyperdrive execution gate

PR #141 смержен пользователем. Актуальный GitHub `main` — merge commit
`2915b1982f8295064b0ad2f7a5aa324d4c923316`; его tree
`760b7dbde2d4682f3c67782b712c57b8bb3cbcf8` точно совпадает с reviewed head
`d374325dbbc1cf44d08c7974694b609b500af25a`. Merge не внёс дополнительных изменений.
Workflow ID `368522905` active; workflow runs отсутствуют (`total_count=0`), поэтому exact
first-run/first-attempt one-shot boundary ещё доступна.

Следующий Stage 6 gate — единая отдельно явно разрешаемая choreography, включая success и cleanup:

1. ChatGPT выполняет read-only preflight exact `main`, zero workflow runs, accepted role/defaults/
   ACL, absence usable credential/new Hyperdrive/`WEB_HYPERDRIVE`, unchanged localization resource
   и preview isolation;
2. владелец по координации ChatGPT локально генерирует/сохраняет strong printable-ASCII password
   24–256 chars и создаёт только temporary Environment secret
   `WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP`; значение не передаётся в chat/PR/tool output;
3. ровно один dispatch `Bootstrap production web credential` с exact confirmation
   `web-credential-bootstrap-confirmed`; дождаться terminal result, никогда не rerun;
4. только после workflow success и пока server lease active создать через Cloudflare UI ровно один
   unbound cache-disabled Hyperdrive `vico-forum-web` на direct Neon origin, database
   `vico_forum`, user `vico_forum_web`, используя локально сохранённый password;
5. после safe Hyperdrive metadata/connectivity evidence и до lease expiry выполнить owner-controlled
   Neon SQL Editor transaction: exact owner/database/role/default/ACL + finite future
   `rolvaliduntil` assertions → только `ALTER ROLE vico_forum_web VALID UNTIL 'infinity'` → exact
   post-check → commit;
6. удалить temporary GitHub Environment secret и записать sanitized evidence в PR #122; success
   означает durable credential + unbound resource, но не binding/routing/deploy acceptance;
7. при workflow failure не rerun: удалить temporary secret, проверить bounded workflow compensation
   conclusion и `rolvaliduntil`; password verifier не объявлять observable, остановиться и открыть
   новый reviewed recovery path;
8. при failure после workflow success: сначала `PASSWORD NULL`, затем удалить созданный unbound
   resource и temporary secret; accepted role/grants/defaults не менять. Ambiguous finalization
   сначала reconciles `pg_roles.rolvaliduntil`: только `infinity` после accepted Hyperdrive evidence
   считается success;
9. после success либо cleanup обязательна остановка. `wrangler.jsonc`, `WEB_HYPERDRIVE`, routing,
   deploy, OAuth/bootstrap/Queue/provider operations запрещены.

30-minute lease требует непрерывного owner-assisted окна; ChatGPT до authorization должен
подтвердить готовность всех UI paths и не начинать gate частично. Общая команда «продолжить» не
заменяет explicit authorization на полный gate и compensation. Codex напрямую control-plane steps
пользователю не поручает.

### Независимая полная проверка PR #142 после завершения CI

Проверены актуальные служебный PR ChatGPT #122 на head
`545529d17b9803da8a138abec04c3b15a8c72e65`, GitHub `main`
`2915b1982f8295064b0ad2f7a5aa324d4c923316` и весь PR #142 на head
`9bcd009721485e1bcb495131c248555970dbeaa9`: все 9 changed files, workflows, diagnostic
implementation, unit/workflow contracts, disposable PostgreSQL probe, CI integration и изменения
`PROJECT_STATE.md` / `docs/database/HYPERDRIVE.md`. PR не выполняет внешний diagnostic,
credential mutation, Hyperdrive operation или deploy.

Архитектурная граница PR корректна:

- read-only workflow получает только owner URL и exact web-role variable, использует protected
  `production-db`, main-only condition и общую migration concurrency;
- rollback probe отделён собственным pre-Environment one-shot guard и только guarded job получает
  temporary password secret;
- mutation probe применяет exact existing SCRAM/finite-lease implementation только внутри
  transaction, не содержит `COMMIT`, явно выполняет `ROLLBACK`, затем повторно проверяет accepted
  preflight и исходный `rolvaliduntil`;
- output ограничен `stage`, bounded `reason` и rollback status; exception message, URL, password,
  verifier и SQL text не выводятся;
- disposable PostgreSQL 17 probe подтверждает read-only path, rollback-only mutation path и
  отсутствие persisted password/expiry; docs точно фиксируют consumed bootstrap и не выдают
  diagnostics за credential acceptance.

Полный review подтвердил один блокирующий corrective set, уже независимо видимый в завершённом CI:

- exact-head run `36386415691`: `database=success`, включая новый rollback-only probe;
  `checks=failure` на ESLint;
- `.github/scripts/diagnose-production-web-credential.mjs` содержит три
  `no-useless-assignment`: сброс `transactionStarted = false` после rollback в двух catch paths и
  начальную запись `initialValidUntil = null`, которая всегда заменяется до чтения;
- это реальные repository/CI defects текущего PR. Они не меняют diagnostic contract, но PR при
  красном required check не готов к merge.

Требуемая узкая correction для ChatGPT: удалить только две бесполезные catch-path записи
`transactionStarted = false`, объявить `initialValidUntil` без бесполезного initializer, затем
заново запустить полный CI. Не менять stage mapping, transaction/rollback semantics, workflows,
one-shot guard, docs или external state. После исправления Codex должен повторно проверить весь
PR #142 на новом head с terminal CI; до этого PR не merge-ить и оба production diagnostic workflow
не dispatch-ить.

Технический вывод: substantive diagnostic/recovery design согласован, иных current-Stage defects
в полном PR не найдено, но **PR #142 пока не готов к merge исключительно из-за трёх подтверждённых
ESLint failures**. Следующий точный Stage 6 gate — repository-only corrective cycle PR #142 и
повторная полная независимая проверка; никакой external diagnostic execution до green merge не
разрешён.

### Финальная независимая проверка исправленного PR #142

Исправленный PR #142 повторно проверен целиком на exact head
`1df49b37105c2ce6390e0ad05c9e9c16ec4e0e18` против неизменившегося GitHub `main`
`2915b1982f8295064b0ad2f7a5aa324d4c923316`. Также проверено последнее обновление служебного PR
ChatGPT #122 на head `69f23f1b9c384bcae99531afabf3e311d7c7164a`. PR #142 open, non-draft,
mergeable=true, mergeable state `clean`, behind main=0.

Corrective commit по сравнению с ранее полностью проверенным head
`9bcd009721485e1bcb495131c248555970dbeaa9` изменяет только
`.github/scripts/diagnose-production-web-credential.mjs` (+1/-3):

- удалены две бесполезные catch-path записи `transactionStarted = false` после уже выполненной
  rollback attempt;
- `initialValidUntil` объявлен без бесполезного `null` initializer;
- stage mapping, transaction lifetime, explicit success-path `ROLLBACK`, rollback failure
  reporting, one-shot guard, secret boundary, workflows, tests и docs не изменены.

Заново сверены все 9 changed files и весь первоначальный technical scope: read-only exact
preflight, rollback-only SCRAM/finite-lease probe без `COMMIT`, post-rollback contract, bounded
non-secret output, protected main-only workflows, pre-Environment one-shot guard, disposable
PostgreSQL 17 probe, CI wiring и factual state/docs update. Исправление не создаёт новой ветви
поведения и закрывает все три подтверждённые lint findings. Новых current-Stage defects,
противоречий или unrelated scope expansion не обнаружено.

Exact-head CI run `36387812143`, attempt 1, terminal success:

- `checks=success` (job `108816840427`): repository contracts, lint, typecheck, tests, build,
  migration metadata и schema parity;
- `database=success` (job `108816840060`): clean PostgreSQL 17 suite, manifests/runtime grants,
  split-authority probes, новый rollback-only diagnostic probe, existing bootstrap compensation,
  Workers build и local Hyperdrive smoke.

Локальный dependency install в текущем Codex environment дополнительно попытался воспроизвести
узкие tests, но registry download был недоступен; это environment limitation, не PR failure.
Repository diff clean по `git diff --check`, а authoritative exact-head CI полностью green.

Финальный технический вывод: **PR #142 на head
`1df49b37105c2ce6390e0ad05c9e9c16ec4e0e18` готов к merge пользователем**. Следующий точный
Stage 6 gate после merge — сверить exact merged `main`, затем сначала выполнить только manual
read-only `Diagnose production web credential preflight`. Rollback-only workflow остаётся
запрещён до анализа read-only evidence и отдельного explicit authorization; merge сам по себе не
разрешает credential mutation, Hyperdrive creation, binding/routing или deploy.

### PR #142 merged; read-only diagnostic gate

Merge пользователя подтверждён через GitHub после финального approval:

- PR #142 закрыт как merged `2026-09-28T06:53:12Z`;
- актуальный `main` — merge commit `ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9`;
- merged head — ранее полностью проверенный
  `1df49b37105c2ce6390e0ad05c9e9c16ec4e0e18`;
- tree merge commit `726949bfc6896601f2219880ce2e6f7d5fd67b62` точно совпадает с tree reviewed
  head; дополнительных merge-time изменений нет;
- последнее обновление служебного PR ChatGPT #122 остаётся на head
  `69f23f1b9c384bcae99531afabf3e311d7c7164a`.

Оба новых workflows опубликованы в `main` и active:

- `Diagnose production web credential preflight`, workflow ID `368843837`, runs отсутствуют;
- `Probe production web credential rollback`, workflow ID `368843839`, runs отсутствуют.

Следующий точный Stage 6 gate для ChatGPT — выполнить **только read-only preflight diagnostic**:

1. сверить dispatch target с exact current `main`
   `ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9`, active workflow ID `368843837` и отсутствие
   предыдущих runs;
2. manual dispatch `Diagnose production web credential preflight` из `main` с exact input
   `web-credential-preflight-diagnostic-confirmed`;
3. дождаться terminal result и записать в служебный PR #122 только sanitized evidence: run ID,
   head SHA, run number/attempt, job conclusion и единственную bounded строку
   `WEB_CREDENTIAL_DIAGNOSTIC stage=<stage> reason=<bounded-code> rollback=<status>`;
4. остановиться после evidence и передать результат Codex для анализа следующего gate.

Этот gate не использует temporary web password, не изменяет credential/role/defaults/grants и не
создаёт Hyperdrive. Rollback-only workflow ID `368843839` запрещено dispatch-ить в этом gate;
также запрещены bootstrap rerun, secret creation, Neon mutation, Hyperdrive/binding/routing и
deploy. Решение о rollback-only probe принимается только после независимого анализа read-only
evidence и отдельного explicit authorization.

### Read-only credential diagnostic succeeded; rollback-only authorization boundary

Последнее обновление служебного PR ChatGPT #122 проверено на head
`17f06ff504815dd567bdc24e642b4a1d4384dd7c`. Заявленное evidence независимо сверено через
GitHub Actions API:

- workflow `Diagnose production web credential preflight`, ID `368843837`;
- run `36389416755`, `workflow_dispatch`, run number `1`, attempt `1`;
- exact head `ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9` (current `main`);
- workflow/job/step `Run bounded read-only diagnostic` — terminal `success`;
- rollback-only workflow ID `368843839` по-прежнему имеет zero runs.

Служебный PR #122 записал bounded result
`WEB_CREDENTIAL_DIAGNOSTIC stage=preflight reason=ok rollback=ok`. GitHub public API не даёт
скачать raw Actions logs без admin authentication, поэтому сама строка сверена по service evidence;
при этом код diagnostic возвращает successful process только после exact preflight assertions и
успешного explicit rollback, а GitHub независимо подтверждает successful bounded step.

Технический вывод read-only gate:

- current exact direct owner/database/session, PostgreSQL 17 logging/SCRAM prerequisites,
  `vico_forum_web` attributes/membership, accepted `2s/5s` defaults и localization/web ACL contract
  проходят сейчас;
- исходный bootstrap failure не относится к current read-only preflight interval;
- остаётся различить `apply-verifier` и последующий in-transaction lease read/assertion;
- read-only gate не создал credential, не использовал temporary password и не изменил external
  state.

Следующий технически обоснованный gate — один separately authorized **rollback-only diagnostic**.
Это внешняя временная password/lease mutation внутри transaction, хотя contract требует rollback
и отсутствие persisted credential, поэтому общая команда «продолжить» не заменяет explicit user
authorization.

После явного разрешения ChatGPT должен:

1. перед dispatch сверить exact current `main`, workflow ID `368843839`, zero prior runs, accepted
   successful read-only evidence и доступность именно reviewed temporary Environment secret без
   раскрытия/вывода его значения; если secret был удалён или его provenance неоднозначен — stop,
   не создавать replacement самостоятельно в рамках этого разрешения;
2. выполнить ровно один first-run/first-attempt dispatch `Probe production web credential rollback`
   с exact confirmation `web-credential-rollback-probe-confirmed`; никогда не rerun;
3. дождаться terminal result и записать только sanitized run/head/job metadata и bounded
   `WEB_CREDENTIAL_DIAGNOSTIC` line в PR #122;
4. независимо от success/failure остановиться, не запускать durable bootstrap и не создавать
   Hyperdrive; удалить temporary Environment secret после сохранения evidence, если его дальнейшее
   хранение не требуется для уже завершённого probe;
5. передать evidence Codex для определения нового durable credential recovery design.

Если preconditions не подтверждены, guard не проходит, rollback имеет status `failed` либо
workflow outcome неоднозначен, gate немедленно останавливается для read-only reconciliation.
Запрещены repeat dispatch/rerun, original bootstrap, durable credential mutation, Hyperdrive,
binding/routing и deploy.

### Rollback-only credential diagnostic succeeded; durable recovery PR boundary

Последнее обновление служебного PR ChatGPT #122 проверено на head
`0d855158b8b85364bb9327689ce621dff93d9ed7c`. GitHub Actions metadata независимо подтверждает:

- workflow `Probe production web credential rollback`, ID `368843839`;
- единственный run `36391075878`, `workflow_dispatch`, run number `1`, attempt `1`;
- exact current `main` `ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9`;
- pre-Environment one-shot guard, rollback-probe job и step
  `Run rollback-only SCRAM lease diagnostic` — terminal `success`;
- matching workflow runs после gate — ровно один; rerun/re-dispatch запрещены.

PR #122 записал bounded result
`WEB_CREDENTIAL_DIAGNOSTIC stage=rollback-probe reason=ok rollback=verified`. По reviewed contract
это доказывает для текущего production context: accepted preflight → verifier derivation → exact
SCRAM + finite lease mutation → active bounded lease read/assertion внутри transaction → explicit
rollback → post-rollback accepted preflight и восстановленный исходный `rolvaliduntil`. Diagnostic
не имеет `COMMIT`, поэтому usable credential не принят и Hyperdrive не создан.

Техническое согласование:

- current read-only preflight и current exact in-transaction mutation/lease interval оба успешно
  воспроизводятся;
- historical root cause failed run `36345841051` восстановить по имеющемуся evidence нельзя;
- нельзя объявлять исходный failure исправленным только на основании diagnostic success;
- однако диагностический gate снимает blocking uncertainty о поддержке exact SCRAM/lease operation
  в текущем Neon/PostgreSQL context и позволяет подготовить новый отдельно reviewed durable
  recovery path;
- consumed original bootstrap и consumed rollback probe никогда не rerun-ятся.

Перед новой credential попыткой reviewed temporary Environment secret, использованный diagnostic
gate, должен быть удалён через координацию ChatGPT и факт удаления записан sanitized в PR #122.
Его значение нельзя переиспользовать для durable recovery. Это cleanup текущего завершённого gate,
не разрешение на новый secret или credential mutation.

Следующий repository-only Stage 6 gate — ChatGPT создаёт отдельный mergeable PR с новым one-shot
**production web credential recovery** path. Требуемый узкий scope:

1. новый manual main-only protected workflow с новым workflow identity/run counter, общей
   `production-db-migrations` concurrency, pre-Environment/no-secret guard и exact recovery
   confirmation token; first run/first attempt enforced и workflow, и script;
2. новый recovery orchestration module может reuse только уже reviewed pure/preflight/SCRAM/login/
   revoke helpers, но должен иметь bounded stage/reason/compensation output, чтобы новый failure не
   схлопывался в generic result;
3. до mutation — exact direct owner target и полный accepted bootstrap preflight; mutation — одна
   transaction с locally derived SCRAM verifier и server-clock finite 30-minute `VALID UNTIL`,
   in-transaction active/bounded lease assertion, затем commit;
4. после commit — exact bounded login как `vico_forum_web` с database + `2s/5s` assertions;
   ordinary failure после mutation обязан выполнить `PASSWORD NULL` compensation и bounded
   reconciliation; uncontrolled termination остаётся ограничен server-owned expiry;
5. workflow не создаёт Hyperdrive, binding/routing и не deploy-ит; temporary secret отсутствует в
   repository и создаётся только в будущем separately authorized continuous execution window;
6. pure unit/workflow contract tests и disposable PostgreSQL 17 probe обязаны покрыть success,
   each bounded failure stage, compensation, no-secret output, one-shot guard и finite-expiry
   safety; CI должен включать их явно;
7. `PROJECT_STATE.md` и `docs/database/HYPERDRIVE.md` обновляются только как recovery preparation:
   current factual external state остаётся `PASSWORD NULL`/no accepted credential/no web
   Hyperdrive; никакой будущий success не записывается заранее.

Этот PR после green CI проходит полный независимый review Codex до merge. Новый secret, dispatch,
durable mutation, Hyperdrive, finalization, binding/routing и deploy этим gate не разрешены.

### Независимая полная проверка PR #143

Проверены актуальные GitHub `main` `ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9`, служебный PR
ChatGPT #122 на head `90067b9c3201180779e16ad37c6f3261c427386e` и весь PR #143 на
head `e4308ca958adbc2bd91ba288abb55074e8040cb1`: все 8 changed files, recovery
orchestration, workflow, pure/workflow tests, disposable PostgreSQL 17 probe, CI wiring и изменения
`PROJECT_STATE.md` / `docs/database/HYPERDRIVE.md`. PR open, non-draft, mergeable=true, но
mergeable state `unstable` из-за failed required check.

Подтверждено соответствие основной recovery architecture согласованной границе:

- новый workflow имеет отдельную identity/run counter, manual main-only dispatch, exact recovery
  token, pre-Environment/no-secret first-run/first-attempt guard, protected `production-db`, shared
  concurrency и pinned actions;
- script независимо повторяет one-shot/input/direct-target checks, exact accepted preflight,
  locally derived SCRAM и 30-minute server-clock lease с in-transaction bounded assertion;
- success требует commit и отдельный exact web login/database/`2s`/`5s` proof;
- caught failure после начала mutation выполняет `PASSWORD NULL` compensation, candidate-login
  rejection reconciliation и повторный accepted preflight; output ограничен bounded
  stage/reason/compensation, исходные exception/URL/password/verifier не выводятся;
- workflow не содержит Hyperdrive/binding/routing/deploy operations; docs не записывают будущий
  recovery success заранее и подтверждают cleanup diagnostic secret;
- tests охватывают все declared recovery stages, one-shot/secret boundary, success, finite expiry
  и forced post-commit failure compensation; database job с этими probes успешен.

Полный review подтвердил один current-Stage blocker:

- exact-head CI run `36398318663`: `database=success`, но `checks=failure` на lint;
- `.github/scripts/recover-production-web-credential.mjs:135` destructure-ит
  `allowNonNeon`, но не использует его в `reconcileCompensatedCredential`, что даёт
  `no-unused-vars`;
- наиболее корректная узкая correction — не просто удалить option, а использовать её для
  независимого `assertDirectOwnerTarget(ownerDatabaseUrl, { expectedDatabase, allowNonNeon })`
  в reconciliation boundary до candidate-login/owner connection. Exported reconciliation тогда
  самостоятельно сохраняет direct-target contract и CI disposable path продолжает явно разрешать
  non-Neon target;
- добавить/уточнить pure test, доказывающий fail-closed invalid reconciliation owner target и
  successful `allowNonNeon: true` test path, затем повторно запустить полный CI.

Других current-Stage defects, documentation contradictions или unrelated scope expansion в полном
PR не найдено. Технический вывод: **PR #143 пока не готов к merge из-за подтверждённого lint/
reconciliation-boundary defect**. После узкой correction ChatGPT должен заново проверить весь PR,
а Codex — выполнить повторную независимую полную проверку exact new head с terminal CI. До green
merge запрещены новый recovery secret, workflow dispatch, credential mutation, Hyperdrive,
finalization, binding/routing и deploy.

### Финальная независимая проверка исправленного PR #143

Исправленный PR #143 повторно проверен целиком на exact head
`f18adc156911853ac30035e2bfe3fa176ac70986` против неизменившегося GitHub `main`
`ab1705aeb737a77aad0ad39d8fc1fb055bae5dc9`. Последнее обновление служебного PR ChatGPT #122
проверено на head `5309c17256277826093cf82aa41776a22bd86b8d`. PR #143 open, non-draft,
mergeable=true, mergeable state `clean`, behind main=0.

Corrective delta от ранее полностью проверенного head
`e4308ca958adbc2bd91ba288abb55074e8040cb1` состоит ровно из двух файлов (+44):

- `reconcileCompensatedCredential()` теперь до candidate-login/owner-client access независимо
  вызывает `assertDirectOwnerTarget(ownerDatabaseUrl, { expectedDatabase, allowNonNeon })`;
- focused pure test доказывает default fail-closed rejection non-Neon target до любого downstream
  access и successful проход этой границы только при explicit `allowNonNeon: true` test option;
- recovery stage mapping, transaction/lease/login semantics, compensation policy, workflow guard,
  secret boundary, docs и external state не изменены.

Заново сверены все 8 changed files и полный scope: bounded one-shot recovery orchestration,
direct-owner/preflight contract, SCRAM + finite lease + commit, post-commit exact login,
compensation/reconciliation, no-secret output, protected workflow, pure/workflow tests, disposable
PostgreSQL probes, CI wiring и factual docs. Подтверждённая reconciliation-boundary проблема
закрыта; новых current-Stage defects, contradictions или unrelated expansion не обнаружено.

Exact-head CI run `36405613838`, attempt 1, terminal success:

- `checks=success` (job `108873485908`): repository contracts, recovery tests, lint, typecheck,
  application tests, build, migration metadata и schema parity;
- `database=success` (job `108873486183`): clean PostgreSQL 17 suite, runtime/split-authority/
  diagnostic probes, recovery success/expiry/compensation probe, existing bootstrap compensation,
  Workers build и local Hyperdrive smoke.

Финальный технический вывод: **PR #143 на head
`f18adc156911853ac30035e2bfe3fa176ac70986` готов к merge пользователем**. Merge остаётся только
repository preparation и не разрешает создание recovery secret или запуск workflow. После merge
Codex должен сверить exact merged tree и определить отдельно явно разрешаемое непрерывное
credential recovery → cache-disabled Hyperdrive → owner finalization/compensation окно. До этого
запрещены secret creation, dispatch, credential mutation, Hyperdrive, finalization,
binding/routing и deploy.

### PR #143 merged; continuous recovery choreography readiness gate

Merge пользователя подтверждён через GitHub:

- PR #143 closed/merged `2026-09-28T10:31:47Z`;
- актуальный `main` — merge commit `63e9a7ae4d5c6ef196f0bede93ae7f9f7deab1b0`;
- merged head — полностью проверенный
  `f18adc156911853ac30035e2bfe3fa176ac70986`;
- merge tree `1e0cc717bcfe533b92ff662392337dd84b4b0ebf` точно совпадает с reviewed head tree;
  merge-time drift отсутствует;
- recovery workflow `Recover production web credential`, ID `369003053`, active, runs отсутствуют.

Следующий Stage 6 gate пока только **read-only readiness preflight** под координацией ChatGPT.
Нужно до запроса explicit execution authorization подтвердить и записать sanitized evidence в
служебный PR #122:

1. exact current `main`, active recovery workflow ID `369003053`, zero runs и доступность
   first-run/first-attempt guard;
2. отсутствие нового `WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY` Environment secret; старый
   diagnostic/bootstrap secret удалён и не переиспользуется;
3. current production role остаётся в safe pre-recovery state: exact `vico_forum_web`, accepted
   role attributes/membership/defaults/ACL, candidate credential отсутствует, usable web
   Hyperdrive/`WEB_HYPERDRIVE` отсутствуют;
4. Cloudflare UI готов создать ровно один unbound cache-disabled `vico-forum-web` на direct Neon
   origin, не изменяя existing localization Hyperdrive, bindings, routes или preview topology;
5. Neon owner SQL Editor path готов для immediate post-Hyperdrive finite-lease verification и
   единственного `VALID UNTIL 'infinity'` finalization, а также для `PASSWORD NULL` compensation;
6. владелец и ChatGPT могут непрерывно завершить secret → one-shot recovery → bounded evidence →
   Hyperdrive creation/verification → owner finalization → temporary-secret cleanup в пределах
   30-minute server lease, включая fail-closed cleanup при любой остановке.

Readiness preflight не создаёт secret/resource, не dispatch-ит workflow и не выполняет SQL
mutation. После его результата Codex отдельно определит единое exact authorization boundary со
всем success/compensation choreography. До этого запрещены recovery secret creation, dispatch,
credential mutation, Hyperdrive, finalization, binding/routing и deploy.

### Recovery readiness preflight partially complete; operator-assisted read-only gate

Последнее обновление служебного PR ChatGPT #122 проверено на head
`e798d25785bd0960ccc4c69a724735e5ba81d333`. Независимо повторно подтверждены current `main`
`63e9a7ae4d5c6ef196f0bede93ae7f9f7deab1b0`, active recovery workflow ID `369003053` и zero
runs. Official Cloudflare docs по-прежнему подтверждают отдельное создание PostgreSQL Hyperdrive
configuration и возможность отключить query caching; это platform capability, не evidence
конкретного account state.

Принято sanitized live read-only DB evidence из PR #122: exact owner/database, PG17/logging/SCRAM,
`vico_forum_web` safe attributes/membership, `PASSWORD NULL`, `rolvaliduntil IS NULL`, exact
`2s/5s` defaults и localization/web ACL contract проходят; repository не содержит
`WEB_HYPERDRIVE`. Эти факты закрывают repository/database часть readiness.

Общий readiness gate пока **не закрыт**, потому что available connector не мог независимо видеть:

- current absence `production-db / WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY` secret;
- current Cloudflare account state: отсутствие уже созданного `vico-forum-web`, неизменность
  existing localization Hyperdrive и preview/production bindings/routes;
- фактическую готовность пользователя и ChatGPT пройти без перерыва всё 30-minute success/cleanup
  окно.

Следующий gate остаётся read-only и operator-assisted через ChatGPT. Пользователь должен в UI,
не создавая и не меняя ресурсы:

1. открыть GitHub `production-db` Environment secrets и подтвердить только имя/отсутствие
   `WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY`; значения secrets не раскрывать и список других имён
   не копировать;
2. открыть Cloudflare Hyperdrive/Worker settings и подтвердить отсутствие configuration
   `vico-forum-web` и binding `WEB_HYPERDRIVE`, наличие только принятого localization
   `HYPERDRIVE -> vico-forum-registry`, disabled caching для него и отсутствие preview bindings/
   secrets; ничего не создавать и не редактировать;
3. подтвердить, что Neon SQL Editor owner path и Cloudflare Create Configuration UI доступны, но
   не выполнять SQL и не нажимать create/save;
4. отдельно подтвердить возможность выделить непрерывное окно минимум 30 минут для будущего gate
   с immediate compensation/cleanup, не начиная его;
5. ChatGPT записывает только sanitized yes/no evidence в PR #122 и останавливается.

Только после этого Codex сможет сформировать единое explicit authorization сообщение для
secret → one-shot recovery → evidence → cache-disabled unbound Hyperdrive → owner finalization
или compensation → secret/resource cleanup. Текущий gate не разрешает secret creation, dispatch,
credential mutation, Hyperdrive creation, SQL finalization, binding/routing или deploy.

### Recovery readiness complete; exact continuous execution authorization boundary

Последнее обновление служебного PR ChatGPT #122 проверено на head
`9935c881939277d587d9969e90b5e01803774183`. Operator-assisted evidence закрывает оставшиеся
readiness gaps: recovery secret отсутствует; `vico-forum-web` Hyperdrive и `WEB_HYPERDRIVE`
binding отсутствуют; existing localization Hyperdrive/cache и preview topology неизменны; Neon
owner и Cloudflare create paths доступны; пользователь подтвердил непрерывное 30-minute окно.
Независимая API-сверка снова подтверждает zero runs recovery workflow ID `369003053`.

Следующий gate является одним неделимым externally mutating execution window и требует отдельного
явного разрешения пользователя. Разрешение должно охватывать одновременно success path и все
compensation/cleanup branches; частично начинать gate запрещено.

После exact authorization ChatGPT координирует только следующую choreography:

1. непосредственно перед началом повторно сверить exact current `main`, workflow ID `369003053`,
   zero runs, safe role state (`PASSWORD NULL`, no accepted credential), отсутствие
   `vico-forum-web`/`WEB_HYPERDRIVE` и доступность всех UI paths; любое расхождение — stop;
2. пользователь локально генерирует fresh strong printable-ASCII password 24–256 chars, хранит его
   только локально и создаёт ровно один temporary `production-db` Environment secret
   `WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY`; значение не передаётся в chat/PR/screenshots/logs;
3. выполнить ровно один dispatch `Recover production web credential` из exact current `main` с
   confirmation `web-credential-recovery-confirmed`; дождаться terminal result, никогда не rerun и
   не делать второй dispatch;
4. если workflow не завершился bounded success
   `stage=complete reason=ok compensation=not-required`, не создавать Hyperdrive: проверить
   bounded compensation evidence и read-only safe credential state, при `failed`/ambiguous outcome
   немедленно выполнить owner-controlled `PASSWORD NULL` compensation с exact identity/database/
   role assertions; удалить temporary secret и остановиться;
5. только после bounded success и пока server lease active создать через Cloudflare UI ровно одну
   **unbound**, cache-disabled configuration `vico-forum-web` на direct non-pooler Neon origin,
   database `vico_forum`, user `vico_forum_web`, используя локальный password; existing
   `vico-forum-registry`, Worker bindings/routes и Preview Base не менять;
6. до lease expiry получить sanitized Hyperdrive metadata/connectivity evidence: exact name,
   unique configuration ID, PostgreSQL/direct origin, cache disabled, successful connection, no
   Worker binding. Secret/connection string не записывать;
7. после accepted Hyperdrive evidence выполнить в Neon SQL Editor одну owner-controlled transaction:
   exact current/session user `vico_forum_owner`, database `vico_forum`, target role/defaults/
   membership/ACL assertions и finite future `rolvaliduntil` → только
   `ALTER ROLE vico_forum_web VALID UNTIL 'infinity'` → exact post-check infinity → commit;
8. ambiguous finalization сначала reconciles read-only: только infinity вместе с accepted exact
   Hyperdrive evidence считается success. При любом failure до accepted finalization выполнить
   `PASSWORD NULL`, удалить любой созданный unbound `vico-forum-web` и temporary secret, сохранить
   accepted role/defaults/grants и остановиться;
9. на success удалить temporary GitHub secret, удалить локальную password copy после подтверждения,
   что Hyperdrive сохранён и credential finalized, и записать в PR #122 только sanitized run/
   bounded-result/Hyperdrive/finalization/cleanup evidence;
10. обязательная остановка после success или cleanup. Не добавлять `WEB_HYPERDRIVE` binding, не
    менять `wrangler.jsonc`, routing/preview topology и не deploy-ить.

Это разрешение ещё не дано данным техническим выводом. До явного пользовательского сообщения,
которое ссылается на этот exact boundary, запрещено создавать recovery secret или начинать шаг 3.

### Recovery run failed before DB mutation; validated-input replacement path required

Последнее обновление служебного PR ChatGPT #122 проверено на head
`dbebaecf198446305d10bcd1f5f4c34c3b59ace6`. GitHub Actions API независимо подтверждает:

- recovery workflow ID `369003053`, единственный run `36423327132`;
- exact `main` `63e9a7ae4d5c6ef196f0bede93ae7f9f7deab1b0`, run number `1`, attempt `1`;
- pre-Environment one-shot guard `success`, recovery job/step `failure`;
- workflow теперь consumed; rerun и новый dispatch запрещены.

PR #122 записал bounded result
`WEB_CREDENTIAL_RECOVERY stage=input reason=contract_mismatch compensation=not-required`.
Post-failure live read-only evidence сохранило exact safe state `PASSWORD NULL`,
`rolvaliduntil IS NULL`; Hyperdrive/finalization/binding/routing/deploy не выполнялись, temporary
recovery secret удалён. Поэтому cleanup завершён и дополнительных external mutations не требуется.

Технический вывод:

- failure произошёл после workflow guard, но до owner DB connection и credential mutation;
- guard доказывает main/run/attempt/confirmation, job environment показывал exact web role;
- оставшиеся input assertions включают password presence/24–256 length/printable ASCII без spaces,
  direct owner URL и derived web URL. Password-format mismatch является сильной гипотезой, но
  bounded evidence не различает эти assertions, поэтому root cause остаётся **неподтверждённым**;
- consumed recovery path нельзя исправлять или повторно использовать для production execution;
- ещё одна one-shot попытка без отдельного успешного pre-mutation validation evidence запрещена.

Следующий Stage 6 gate снова repository-only: ChatGPT должен создать отдельный mergeable PR с
двухфазным **validated-input recovery v2** contract.

Required scope:

1. отдельный repeatable manual main-only protected **input/preflight validation workflow**, который
   использует future v2 Environment secret, но выполняет только input/direct-target validation и
   exact DB `BEGIN READ ONLY` bootstrap preflight с explicit rollback; mutation/commit/Hyperdrive
   отсутствуют;
2. bounded validator должен различать safe причины как минимум `password_missing`,
   `password_length`, `password_charset`, `role_mismatch`, `owner_target` и DB preflight stages,
   не выводя password length/value/hash/verifier/URL/error message;
3. validation success выдаёт bounded evidence с exact workflow run ID/head SHA/run attempt и
   `stage=complete reason=ok rollback=verified`; validation можно повторить после замены invalid
   secret, не расходуя recovery-v2 one-shot counter;
4. новый recovery-v2 workflow имеет отдельную identity/run counter и pre-Environment one-shot
   guard, требует exact successful validation run ID как dispatch input и до secrets/DB через
   GitHub API fail closed проверяет: expected validation workflow, conclusion success, exact same
   current main SHA и accepted attempt. Он не должен доверять только введённой строке run ID;
5. после validation success secret запрещено менять; operator evidence подтверждает unchanged
   secret между validation и immediate v2 dispatch. Recovery-v2 всё равно повторяет все input
   assertions до connection, но validation заранее предотвращает расход one-shot на known bad input;
6. recovery-v2 сохраняет уже reviewed 30-minute lease, bounded stages, login proof,
   compensation/reconciliation и uncontrolled-expiry safety; старые consumed workflows не
   меняются для повторного использования;
7. tests покрывают каждую bounded input reason без утечки, validation read-only/rollback contract,
   invalid/missing/wrong-head/failed validation run rejection **до Environment/secrets**, v2
   one-shot boundary и existing recovery success/compensation PostgreSQL probes;
8. docs фиксируют factual failed input-stage run и safe cleanup, не называют password root cause
   доказанным и не обещают future success.

После green CI PR проходит полные reviews ChatGPT и Codex до merge. Сейчас запрещены создание нового
secret, validation dispatch, recovery-v2 dispatch, credential mutation, Hyperdrive, finalization,
binding/routing и deploy.

### Независимая полная проверка PR #144

Проверены актуальный GitHub `main` `63e9a7ae4d5c6ef196f0bede93ae7f9f7deab1b0`, последнее
обновление служебного PR ChatGPT #122 на head
`a547028ed8f884d24eccefdd1bbfdbb12eff9001` и весь PR #144 на exact head
`dca16d4787807876a859249296895a50e13e7f01`: все 11 changed files, validator,
validation-run verifier, recovery-v2 wrapper, оба workflows, pure/workflow tests, CI wiring и
изменения `PROJECT_STATE.md` / `docs/database/HYPERDRIVE.md`. PR open, non-draft,
mergeable=true, mergeable state `clean`, behind main=0.

Полный review подтвердил согласованный validated-input recovery-v2 contract:

- repeatable main-only protected validator различает bounded password/role/owner reasons, выполняет
  exact accepted DB preflight только в `BEGIN READ ONLY`, явно rollback-ит и не содержит mutation/
  commit/Hyperdrive path;
- validation output содержит только run ID, exact head SHA, attempt и bounded stage/reason/rollback;
  password value/length/hash/verifier, URL и raw exception не выводятся;
- recovery-v2 имеет отдельную one-shot identity. Его pre-Environment/no-secret guard до protected
  job получает exact validation run через current-repository GitHub Actions API и проверяет run ID,
  workflow path, `workflow_dispatch`, completed/success, `main`, exact current SHA и attempt 1;
- guard также требует explicit unchanged-secret confirmation; recovery-v2 повторяет static input
  assertions и только затем delegates к уже reviewed lease/login/compensation core;
- workflow permissions ограничены `actions: read`/`contents: read`, API version/endpoint фактически
  принимаются GitHub, actions pinned, shared concurrency и timeouts сохранены;
- consumed workflows не сделаны reusable; docs фактически записывают failed input-stage run,
  safe cleanup и неизвестную root cause без premature success;
- tests покрывают bounded input reasons/no-secret output/read-only rollback, validation-run metadata
  rejection, pre-Environment separation, v2 one-shot assertions и unchanged-secret gate.

Первоначальный reviewed head `6a940c33fc62b558ed36011d6bfc1c9320e77a53` имел только две
`no-useless-assignment` lint ошибки validator catch paths. Финальный correction commit
`dca16d4787807876a859249296895a50e13e7f01` удаляет ровно эти две бесполезные записи в одном
файле; rollback semantics не изменены.

Exact-head CI run `36429909643` terminal green:

- `checks=success` (job `108953116789`): новые pure/workflow contracts, lint, typecheck, tests,
  build, migration metadata и schema parity;
- `database=success` (job `108953117395`): clean PostgreSQL 17 suite, runtime/split-authority/
  diagnostic/recovery probes, Workers build и local Hyperdrive smoke.

Новых current-Stage defects, documentation contradictions или unrelated scope expansion не
обнаружено. Финальный технический вывод: **PR #144 на head
`dca16d4787807876a859249296895a50e13e7f01` готов к merge пользователем**. Merge является только
repository preparation. До post-merge tree/workflow сверки и отдельного authorization запрещены
v2 secret creation, validation dispatch, recovery-v2 dispatch, credential mutation, Hyperdrive,
finalization, binding/routing и deploy.

### PR #144 merged; validated-input v2 validation gate

Merge пользователя подтверждён через GitHub:

- PR #144 closed/merged `2026-09-28T13:46:35Z`;
- актуальный `main` — merge commit `9b4d535221d0ecfa23c1209d34e43edc785a073a`;
- merged head — полностью проверенный
  `dca16d4787807876a859249296895a50e13e7f01`;
- merge tree `c28a4752b021f2b0355bfea9bb6d84ea65baf2f5` точно совпадает с reviewed head tree;
  merge-time drift отсутствует;
- workflow `Validate production web credential input`, ID `369157284`, active, zero runs;
- workflow `Recover production web credential v2`, ID `369157285`, active, zero runs.

Следующий gate разделён от one-shot recovery-v2 и требует отдельного явного разрешения только на
**temporary v2 secret + один repeatable read-only validation dispatch**. Этот gate не разрешает
recovery-v2.

После exact authorization ChatGPT координирует:

1. повторную read-only сверку exact current `main`, active workflow IDs, zero recovery-v2 runs,
   safe production state `PASSWORD NULL`/`rolvaliduntil IS NULL`, отсутствие web Hyperdrive/binding
   и отсутствие existing `WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2`; drift — stop;
2. пользователь локально генерирует fresh password, до загрузки локально проверяет exact contract:
   string length 24–256, каждый символ только printable ASCII `0x21`–`0x7e`, никаких spaces/newline;
   значение нигде не передаётся и не показывается;
3. создать ровно один temporary `production-db` Environment secret
   `WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2` из этого exact value;
4. выполнить один manual dispatch `Validate production web credential input` из exact current
   `main` с confirmation `web-credential-input-validation-confirmed` и дождаться terminal result;
5. записать в PR #122 только run/head/attempt/job metadata и bounded
   `WEB_CREDENTIAL_INPUT_VALIDATION` line;
6. при любом failure не запускать recovery-v2: удалить temporary v2 secret и остановиться для
   анализа. При success secret не менять, не пересохранять и не раскрывать; остановиться с ним в
   Environment до отдельного Codex review/authorization recovery-v2 либо удалить, если exact same
   main/secret execution window больше не может быть гарантировано.

Validation workflow выполняет только static input checks и exact DB `BEGIN READ ONLY` preflight с
explicit rollback. Запрещены recovery-v2 dispatch, credential mutation, Hyperdrive, finalization,
binding/routing и deploy. Данный технический вывод определяет boundary, но сам по себе ещё не даёт
разрешение создать secret или dispatch-ить validation.

## Рабочий канал дальнейших действий

По решению пользователя от 2026-09-26 все дальнейшие operational requests, перечни требуемого
evidence и результаты Stage 6 передаются через служебные PR. Codex записывает технические детали
и следующий запрос в PR #121; пользователь выполняет взаимодействие в чате с ChatGPT и обновляет
служебные PR согласно `AGENTS.md`. В обычных ответах Codex не дублирует длинные инструкции и не
просит пользователя выполнять control-plane шаги непосредственно в текущем чате.

## Исправление credential-bootstrap решения

Предыдущий вывод Codex был ошибочным: мы сосредоточились на недостаточном bounded reason первого
web recovery run и начали строить новый recovery-v2 path, не восстановив сначала уже успешно
использованный в этом же Stage 6 operational precedent для `vico_forum_migrator`.

История PR #122 подтверждает факты этого precedent: первые identity attempts обнаружили connection
string без password; затем без пересоздания роли `vico_forum_migrator` получила login/password
credential, пользователь заменил `NEON_MIGRATION_DATABASE_URL` свежим password-bearing connection
string, и attempt 3 доказал `current_user = vico_forum_migrator`. Однако служебные PR сохранили
результат, но не сохранили точный operator/UI/API sequence, которым был установлен первый password.
Отсутствие этой записи нельзя было трактовать как отсутствие рабочего процесса.

Немедленная correction boundary:

1. не запускать validation/recovery-v2 и не создавать новый temporary secret;
2. ChatGPT должен восстановить по исходному пользовательскому чату и доступному control-plane
   evidence точную последовательность, которой credential был выдан `vico_forum_migrator`;
3. сравнить только существенные preconditions двух ролей: способ создания/Neon metadata,
   `LOGIN`, `PASSWORD NULL`, ownership/membership и доступный owner/control-plane path;
4. если precedent применим к `vico_forum_web`, использовать тот же минимальный процесс вместо
   custom recovery workflows; если неприменим — зафиксировать конкретное доказанное различие,
   которое блокирует reuse, до любого нового redesign;
5. не выполнять credential mutation, Hyperdrive creation, binding/routing или deploy без нового
   явного разрешения владельца на уже восстановленный точный процесс.

PR #144 остаётся repository capability, но больше не считается автоматически выбранным следующим
execution path. Причина задержки — пропущенный reuse-анализ существующего успешного precedent, а не
необходимость ещё одного слоя workflow orchestration.

### Независимая проверка восстановленного migrator precedent

Последнее обновление PR #122 проверено на head
`edf6898cf17aa5ae31ea310ee1c7632f12b5f060`. Пользовательское Neon SQL Editor evidence восстановило
пропущенный шаг: первый password существующей роли был установлен командой формы
`ALTER ROLE vico_forum_migrator PASSWORD '<redacted>';`, после чего password-bearing connection
string был сохранён в GitHub Environment и отдельный read-only workflow доказал exact identity.

Применимость к `vico_forum_web` **функционально подтверждена**:

- обе роли являются существующими `LOGIN` roles; исходное web-состояние — `PASSWORD NULL`;
- обе non-superuser roles администрируются `vico_forum_owner` через одинаковое automatic
  `ADMIN=true, INHERIT=false, SET=false` membership;
- owner имеет `CREATEROLE`; PostgreSQL 17 разрешает такому администратору менять password target
  non-superuser role без пересоздания роли и без изменения ownership/grants;
- различие object ownership (migrator владеет application objects, web не владеет ничем) не влияет
  на возможность password assignment;
- Neon reset для exact `PASSWORD NULL` web role уже фактически отклонён, но это не блокирует
  PostgreSQL `ALTER ROLE ... PASSWORD` path, который использовал migrator.

Литеральное повторение plaintext SQL Editor statement при этом не принимается как безопасный
операторский процесс: официальный PostgreSQL 17 contract предупреждает, что cleartext password в
`ALTER ROLE` передаётся серверу открытым текстом и может сохраниться в client history/server log;
предоставленный historical evidence как раз происходит из сохранённой SQL Editor history.

Это не означает, что нужен другой credential mechanism. Merged recovery-v2 реализует тот же
подтверждённый PostgreSQL primitive — `ALTER ROLE vico_forum_web PASSWORD ...` — но передаёт
client-derived SCRAM-SHA-256 verifier вместо cleartext password, добавляет finite 30-minute lease,
login proof и compensation. Rollback-only production probe уже доказал применимость этого exact
SCRAM/lease mutation к текущей web role; первый consumed recovery не дошёл до неё и упал на input
validation.

Итог согласования:

1. восстановленный migrator process доказывает, что first-password bootstrap для существующей
   `vico_forum_web` роли допустим без recreation или Neon reset;
2. recovery-v2 не является альтернативной придуманной password model — это secret-safe execution
   того же `ALTER ROLE` bootstrap с уже проверенными safety boundaries;
3. отдельный repeatable validator из PR #144 должен использоваться только как pre-mutation проверка
   secret/target inputs, а не как начало нового redesign cycle;
4. следующий точный gate остаётся одним temporary v2 secret и одним read-only validation dispatch
   на неизменном `main`; он требует отдельного явного разрешения владельца;
5. при successful validation и unchanged secret следующим шагом будет немедленное отдельное
   разрешение one-shot recovery-v2 + unbound cache-disabled Hyperdrive + owner finalization;
6. новые repository PR или credential mechanisms запрещены без нового подтверждённого дефекта.

Эта проверка не выполняла SQL mutation, secret creation, workflow dispatch, Hyperdrive creation,
binding/routing или deploy.

### Successful validated-input gate принят

Последнее обновление PR #122 проверено на head
`f5737bcc97998b772c6bae7c085284149d5da946`. GitHub Actions evidence независимо подтверждено:

- workflow `Validate production web credential input`, ID `369157284`;
- единственный run `36449688425`, run number/attempt `1/1`, event `workflow_dispatch`;
- exact current `main` `9b4d535221d0ecfa23c1209d34e43edc785a073a`;
- run, main-only guard job, validation job и все выполненные steps завершены `success`;
- bounded result сообщает `stage=complete reason=ok rollback=verified`;
- workflow `Recover production web credential v2`, ID `369157285`, по-прежнему имеет zero runs.

Validation доказала только static secret contract и exact owner/direct-target DB preflight в
read-only transaction с rollback. Credential ещё не изменён, Hyperdrive не создан. Temporary
`WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2` должен оставаться неизменным; его замена или повторное
сохранение аннулирует связь с run `36449688425`.

Следующий точный Stage 6 gate — единое непрерывное **recovery-v2 → unbound Hyperdrive → owner
finalization** execution window. Оно требует нового явного разрешения владельца, включая success и
compensation branches. Общая команда «продолжить Stage 6» не разрешает эти production mutations.

После явного разрешения ChatGPT должен:

1. подтвердить unchanged temporary secret, exact unchanged `main`, zero recovery-v2 runs,
   successful validation run `36449688425` и доступность Neon/Cloudflare control-plane paths;
2. один раз dispatch-ить `Recover production web credential v2` с exact inputs:
   `validation_run_id=36449688425`,
   `secret_unchanged_confirmation=recovery-v2-secret-unchanged-confirmed`,
   `recovery_confirmation=web-credential-recovery-v2-confirmed`;
3. при любом non-success/ambiguous result не выполнять retry или Hyperdrive creation; reconcile
   credential state и обеспечить `PASSWORD NULL`, удалить temporary secret и остановиться;
4. только после bounded recovery success и successful web login proof создать один новый
   **unbound**, direct-origin, cache-disabled Hyperdrive `vico-forum-web` с тем же exact credential;
5. при Hyperdrive creation/connectivity failure удалить новый unbound resource, вернуть web role в
   `PASSWORD NULL`, удалить temporary secret и остановиться; accepted defaults/grants сохраняются;
6. после accepted Hyperdrive metadata/connectivity evidence до 30-minute lease expiry выполнить
   owner-controlled exact preflight и только `VALID UNTIL 'infinity'` finalization;
7. при ambiguous finalization сначала выполнить read-only reconciliation; только exact infinity +
   accepted Hyperdrive считается success, иначе удалить resource, установить `PASSWORD NULL` и
   удалить temporary secret;
8. на success удалить temporary secret и локальную password copy, записать только sanitized
   evidence в PR #122 и остановиться.

Binding, routing, `wrangler.jsonc`, preview topology и deployment не входят в этот gate. Повторный
validation/recovery dispatch и новые repository PR запрещены без нового подтверждённого дефекта.

### Recovery-v2 failure: возврат к рабочему precedent

Последнее обновление PR #122 проверено на head
`7feaeaf7d8ed713b2244a1308cc6196e2d6980f5`. GitHub Actions API независимо подтверждает exact
one-shot run `36450964587`, run number/attempt `1/1`, exact `main`
`9b4d535221d0ecfa23c1209d34e43edc785a073a`: validation-evidence guard завершён `success`, recovery
job завершён `failure`.

Bounded result `stage=commit reason=sqlstate_XX000 compensation=verified` согласуется с merged
script: stages apply-verifier, lease read/assert уже прошли, а исключение возникло на `COMMIT`.
Независимый catalog post-check подтверждает безопасное состояние `PASSWORD NULL` и
`rolvaliduntil IS NULL`; Hyperdrive, binding, routing и deploy не выполнялись. Recovery-v2 consumed,
его retry запрещён. Temporary v2 Environment secret должен быть удалён как уже разрешённый cleanup.

Это является доказанным блокирующим различием между усложнённым path и рабочим precedent:

- rollback-only probe не проверял commit и поэтому не доказывал production viability;
- precomputed SCRAM-verifier transaction дошла до commit и была отклонена Neon с `XX000`;
- historical plaintext `ALTER ROLE vico_forum_migrator PASSWORD ...` в Neon SQL Editor успешно
  commit-нулась и дала usable connection string.

Следовательно recovery-v2 больше не является выбранным execution path. Не создаём recovery-v3,
новый verifier, новый diagnostic workflow или repository PR. Возвращаемся к уже рабочему exact
precedent, применимость которого к `vico_forum_web` ранее подтверждена role-state сравнением.

После удаления temporary v2 secret следующий gate должен быть сформулирован только как повторение
precedent и отдельно явно разрешён владельцем:

1. fresh password создаётся локально и не публикуется;
2. в Neon SQL Editor под exact `vico_forum_owner` выполняется единственная mutation формы
   `ALTER ROLE vico_forum_web PASSWORD '<fresh secret>';`;
3. из Neon получается fresh direct connection string для exact production branch/database/role;
4. тем же credential создаётся один unbound cache-disabled Hyperdrive `vico-forum-web` и
   проверяется connectivity;
5. при любом failure до accepted Hyperdrive выполняется только proven compensation
   `ALTER ROLE vico_forum_web PASSWORD NULL`, удаляется созданный unbound resource и процесс
   останавливается без retry;
6. на success локальная password copy удаляется, фиксируется только sanitized evidence и процесс
   останавливается без binding/routing/deploy.

Риск cleartext SQL Editor history теперь известен и должен быть явно включён в authorization, а
после операции history entry с credential должен быть удалён средствами Neon UI, если такая
операция доступна. Этот риск не является основанием снова заменять доказанно рабочий process новым
непроверенным механизмом.

### Рабочий precedent завершён; переход к repository wiring

Последнее обновление PR #122 проверено на head
`3a9b9a4dee5358813c6cefce4af2288032a82a83`. Принято operator/control-plane evidence:

- failed recovery-v2 cleanup завершён, temporary v2 secret удалён;
- exact standalone `ALTER ROLE vico_forum_web PASSWORD ...` precedent выполнен под owner;
- live catalog post-check подтверждает прежние safe role attributes и usable credential;
- Cloudflare создал отдельный unbound Hyperdrive `vico-forum-web` на direct non-pooled Neon origin,
  database `vico_forum`, user `vico_forum_web`, query caching disabled;
- existing `vico-forum-registry` не изменён; Worker binding, routing и deployment не выполнялись;
- Neon SQL Editor history не предоставляет delete action, поэтому принятый cleartext-history risk
  остаётся фактом выполненного owner-authorized precedent, а не поводом менять credential снова.

External credential/Hyperdrive gate закрыт. Новая credential rotation, recovery или Hyperdrive
recreation не требуется. Следующий безопасный шаг — один mergeable **repository-only binding and
routing PR**, который ChatGPT создаёт из exact current `main`.

Обязательный scope PR:

1. синхронизировать `PROJECT_STATE.md`, `PROJECT_HISTORY.md` и `docs/database/HYPERDRIVE.md` с
   фактом usable web credential и созданного unbound cache-disabled `vico-forum-web`, не утверждая
   binding/deployment acceptance;
2. добавить в `wrangler.jsonc` production binding `WEB_HYPERDRIVE` с exact configuration ID уже
   созданного `vico-forum-web`; placeholder/fake ID запрещён, connection string/credential в Git не
   добавляются;
3. в Worker composition оставить `env.HYPERDRIVE.connectionString` только для registry loader и UI
   translation store;
4. использовать `env.WEB_HYPERDRIVE.connectionString` для Better Auth, forum reader/writer,
   authorization и persisted content-translation presentation;
5. сохранить generation-status/content-generation DB capability disabled/fail-closed; не расширять
   ACL и не подключать translation task/provider/background writes;
6. fail closed при отсутствии любого обязательного binding; не fallback-ить web adapters на
   localization `HYPERDRIVE` и не fallback-ить localization reads на `WEB_HYPERDRIVE`;
7. обновить generated Worker environment types штатной repository-командой и добавить focused
   source/unit contract tests для exact two-binding routing и отсутствия cross-capability fallback;
8. сохранить shared web deadlines `connection=3s`, `lock=2s`, `statement=5s`, `query=7s`, текущие
   migrations, dependencies и runtime privilege matrix без изменений;
9. не выполнять Cloudflare binding mutation, deployment, preview enablement или traffic switch из
   этого PR. Перед deploy отдельно повторно проверить mutable production/Preview Base topology и
   доказать, что preview не получает production `WEB_HYPERDRIVE` write capability.

CI gate: lint, typecheck, full tests/build, database suite и Workers smoke с двумя раздельными
Hyperdrive capabilities. После terminal green CI ChatGPT записывает exact base/head/diff/checks в
PR #122, затем Codex полностью проверяет mergeable PR. До этой проверки deployment запрещён.

### Независимая полная проверка PR #145 — требуется corrective cycle

Последнее обновление PR #122 проверено на head
`ac30d07d57dfb02f2067d98e83152c729cc98e93`. PR #145 полностью проверен на exact head
`b8dd911ef75393b922d665d94509c34003a43c32` против exact base/current `main`
`9b4d535221d0ecfa23c1209d34e43edc785a073a`: все 8 changed files, 10 commits, полный diff,
source-of-truth документы, inline review и terminal CI.

Основной split-binding contract реализован корректно:

- exact real `WEB_HYPERDRIVE` configuration ID добавлен без credential material;
- binding resolver fail closed требует обе capabilities без cross-fallback;
- Better Auth, forum, authorization и content-presentation routed к web connection string;
- registry/UI translations остаются на localization connection string;
- generation DB capability остаётся disabled;
- local Workers smoke получает два независимых override;
- exact-head CI run `36471346759` завершил `checks` и `database` успешно.

Однако два inline findings независимо подтверждены и остаются дефектами текущего head:

1. `createHyperdriveContentTranslationBatchReader(webConnectionString)` использует default
   `createLocalizationClient`, то есть web-routed presentation read сохраняет caller deadlines
   `1s/2s` вместо принятого web profile `3s/7s`. Server `statement_timeout=5s` может не успеть
   отработать, а UI преждевременно деградирует к original content. Нужно заменить default этого
   единственного web-only adapter на `createWebClient` и добавить focused deadline assertion;
   generation-status adapter остаётся disabled и не меняется.
2. Документация противоречива: `docs/database/MIGRATIONS.md` всё ещё дважды утверждает отсутствие
   usable web credential/Hyperdrive, а `PROJECT_STATE.md` включает usable credential в unfinished
   item, хотя соседний current-state текст уже фиксирует существующие credential и unbound
   configuration. Нужно синхронизировать эти current-state sections: credential + unbound
   Hyperdrive существуют; unfinished остаются repository merge, external binding/deployment и
   deployed acceptance.

Других current-Stage defects, scope expansion или external mutations в полном review не найдено.
Green CI не закрывает эти correctness/source-of-truth проблемы, поскольку deadline routing не
проверен существующими tests, а stale строки документации не являются CI invariant.

PR #145 пока **не готов к merge**. ChatGPT должен исправить только указанный corrective set,
заново проверить весь PR и дождаться terminal green CI на новом exact head. До повторной полной
проверки Codex запрещены merge, Cloudflare binding mutation, preview changes и deployment.

### Повторная полная проверка исправленного PR #145

Последнее обновление PR #122 проверено на head
`ea0a4ab88bf79dd2c121121322be44faca7994ee`. Исправленный PR #145 полностью проверен заново на
exact head `9974b2090adf59ec3224a6fc5173a52b85e139c2` против неизменного `main`
`9b4d535221d0ecfa23c1209d34e43edc785a073a`: все 11 changed files, 16 commits, полный final diff,
corrective delta, source-of-truth документы, review threads и exact-head CI.

Оба подтверждённых дефекта закрыты:

- content-translation presentation adapter теперь по умолчанию использует `createWebClient` и
  поэтому exact caller deadlines `connection=3s`, `query=7s`; focused test фиксирует factory и
  значения shared web profile;
- `PROJECT_STATE.md` и `docs/database/MIGRATIONS.md` теперь согласованно различают существующие
  usable credential/unbound cache-disabled Hyperdrive и ещё не выполненные repository merge,
  deployed binding/routing и acceptance.

Повторная проверка остального final scope подтвердила:

- exact real `WEB_HYPERDRIVE` ID, отсутствие credentials и неизменный localization binding;
- fail-closed обязательность обеих capabilities без cross-fallback;
- exact adapter routing: localization registry/UI reads отдельно от Better Auth/forum/authz/
  persisted content presentation;
- disabled generation/background DB capability, неизменные migrations/dependencies/ACL matrix;
- два независимых local Hyperdrive overrides в Workers smoke;
- отсутствие external Cloudflare/Neon/database/deployment mutations.

GitHub API подтверждает: PR open, non-draft, `mergeable=true`, `mergeable_state=clean`; exact-head
CI run `36477873048` terminal green, `checks=success`, `database=success`. Промежуточные lint
failures не являются acceptance evidence и исправлены в final head.

Новых current-Stage defects, documentation contradictions или unrelated scope expansion не
обнаружено. Финальный технический вывод: **PR #145 готов к merge пользователем**. Merge сам по себе
не является deployment authorization. После merge следующий gate — post-merge tree check и
read-only повторная проверка mutable Cloudflare Production/Preview Base topology до любого deploy.

### PR #145 merged; read-only pre-deploy topology gate

Merge подтверждён независимо:

- PR #145 имеет `merged=true`, merge time `2026-09-28T20:38:00Z`;
- актуальный `main` — `743cb3f1c48b17d58c42cdaa6e561512fd4efb94`;
- merge tree `8d1d228ebe0fe3410e1d85057ec475d9c4965a39` точно совпадает с полностью проверенным
  PR head `9974b2090adf59ec3224a6fc5173a52b85e139c2`; merge-time drift отсутствует;
- repository `main` теперь содержит exact split `HYPERDRIVE` / `WEB_HYPERDRIVE` wiring, но merge
  сам по себе не изменил Cloudflare deployment или traffic.

Следующий единственный gate полностью read-only. ChatGPT должен получить и записать sanitized
authenticated Cloudflare evidence непосредственно перед любым deploy:

1. native Git Builds по-прежнему disconnected/auto-deploy отсутствует;
2. текущая Production Worker version/commit и traffic остаются прежними, то есть новый merge ещё не
   deployed;
3. Production bindings до deploy не содержат активный `WEB_HYPERDRIVE`, а существующий
   `HYPERDRIVE -> vico-forum-registry` не изменён;
4. `Previews Base` по-прежнему имеет zero bindings и zero runtime variables/secrets; preview не
   наследует production private/write capability;
5. unbound configuration `vico-forum-web` существует с exact expected ID/name, direct Neon origin,
   database/user и disabled query caching; existing localization configuration неизменна;
6. production/preview routes, workers.dev/custom-domain topology и deployment UI path доступны для
   отдельного bounded deploy gate;
7. сверить dashboard state с merged `wrangler.jsonc`, не раскрывая origin credential/connection
   string и не меняя resources/settings.

До независимой проверки этого evidence запрещены deployment, binding mutation, preview changes,
traffic switch, credential rotation и database mutation. Если topology совпадает, Codex отдельно
определит exact deploy + smoke boundary и запросит новое явное разрешение владельца.

### Pre-deploy evidence minimization decision

Последнее обновление PR #122 проверено на head
`6c47de10831c12411a67e860d3cf227867f4760e`. Принято fresh owner-provided evidence:

- Workers Builds остаётся disconnected, Git-backed auto-deploy отсутствует;
- `vico-forum-web` существует с exact configuration ID
  `a4e99f358a9f4953a7045db8f733974d`, direct production Neon origin, database/user
  `vico_forum` / `vico_forum_web`, masked password и disabled query caching;
- configuration inactive/zero active connections согласуется с отсутствием deployed binding/use.

Повторно запрашивать эти же Builds/Hyperdrive screens перед текущим deploy не требуется: после
evidence не было разрешённых операций, способных изменить их, а repository merge control plane не
меняет. Однако отсутствие разрешённой mutation не доказывает все остальные mutable account
surfaces, и safety-critical preview isolation нельзя выводить только из истории действий.

Минимальный оставшийся read-only evidence set сужается до двух dashboard surfaces:

1. **Production Worker snapshot:** current deployed version/deployment identifier (и commit, если UI
   его показывает), traffic percentage, current active bindings, workers.dev/custom routes. Это
   фиксирует rollback/smoke baseline; повторно открывать Builds и Hyperdrive details не нужно.
2. **Previews Base isolation snapshot:** exact absence bindings и runtime variables/secrets.
   Если `WEB_HYPERDRIVE`, другой production DB binding или private secret присутствует — stop без
   deploy. Общие non-secret build settings сами по себе этот gate не блокируют.

Это не просьба повторять все четыре ранее проверенные Cloudflare области. После этих двух compact
snapshots ChatGPT фиксирует только sanitized yes/no/identifier evidence в PR #122. Codex затем
сразу определяет один bounded deploy + post-deploy smoke/rollback gate; новый preparation PR или
дополнительный topology audit без обнаруженного drift не допускается.

До получения двух snapshots по-прежнему запрещены deploy, binding/preview mutation, traffic
switch, credential rotation и database mutation.

### Pre-deploy topology accepted; auth configuration readiness next

Последнее обновление PR #122 проверено на head
`4007be81244e2d4fe915a397f4dc7234efb9cb57`. Принято evidence:

- Production остаётся на baseline version `78f87645`, 100% traffic, то есть merged Stage 6 runtime
  ещё не deployed;
- owner явно подтвердил, что `Previews Base` остаётся неизменным и пустым: zero bindings и zero
  runtime variables/secrets;
- fresh Builds/Hyperdrive evidence принято предыдущим решением, а controlled operation history не
  содержит Worker binding/route/preview/deployment mutations.

Противоречащего drift не обнаружено. Read-only topology gate закрыт; дополнительный Cloudflare
topology audit или повторные screenshots сейчас не нужны.

Немедленно deploy-ить всё ещё нельзя по отдельной доказанной причине, не связанной с topology:
merged Worker создаёт Better Auth runtime на каждом request и требует четыре production values —
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Current
source-of-truth прямо фиксирует real Google OAuth configuration/smoke как ещё не выполненный Stage 6
gate. Deploy без подтверждённой auth configuration может сломать даже public request initialization.

Следующий единственный шаг — bounded **read-only auth readiness preflight** через ChatGPT:

1. подтвердить в Cloudflare Production только наличие/отсутствие четырёх required variable/secret
   names без чтения secret values;
2. зафиксировать exact production public base URL, который должен стать `BETTER_AUTH_URL`;
3. подтвердить в Google Cloud наличие Web OAuth client и exact authorized redirect URI
   `<BETTER_AUTH_URL>/api/auth/callback/google` согласно Better Auth `1.7.4` integration contract;
4. подтвердить OAuth consent/testing state, достаточный для bounded owner smoke account;
5. записать только sanitized yes/no, base URL и redirect URI; ничего не создавать и не изменять.

Если все значения уже корректно существуют, Codex сразу определит deploy + auth/session/logout +
public LTR/RTL/database smoke gate. Если отсутствуют, следующий gate будет только exact
Google/Cloudflare configuration mutations и deploy, с явным разрешением владельца; новый repository
PR или новый auth mechanism не нужен.

До preflight запрещены deployment, variable/secret mutation, Google OAuth mutation, traffic switch,
credential rotation и database mutation.

### Auth readiness result; bounded configuration gate

Последнее обновление PR #122 проверено на head
`95cdcd704c38961080141c51bd9b2123e17e81c6`. Read-only evidence устанавливает:

- production public base URL — `https://vico-forum.iliya1947a.workers.dev`;
- exact callback текущего repository route —
  `https://vico-forum.iliya1947a.workers.dev/api/auth/callback/google`;
- real Google OAuth Web client для Vico Forum никогда не создавался;
- controlled Stage 6 history не содержит provisioning четырёх required Cloudflare auth values.

Дополнительная проверка несуществующего client не нужна. Следующий gate является external mutation
и требует отдельного явного разрешения владельца. Он ограничен **auth configuration only** и не
включает deploy.

После разрешения ChatGPT координирует один bounded gate:

1. создать/выбрать Google Cloud project для Vico Forum и настроить OAuth consent для минимальных
   стандартных identity scopes; до release допустим Testing mode с owner smoke account как test
   user;
2. создать один OAuth 2.0 Client ID типа Web application с exact authorized redirect URI
   `https://vico-forum.iliya1947a.workers.dev/api/auth/callback/google` и, если Google UI требует/
   поддерживает origin list, exact origin `https://vico-forum.iliya1947a.workers.dev`;
3. сгенерировать fresh `BETTER_AUTH_SECRET` по официальному Better Auth contract, например
   эквивалентом `openssl rand -base64 32`; значение не публиковать;
4. в Cloudflare Production установить non-secret variable
   `BETTER_AUTH_URL=https://vico-forum.iliya1947a.workers.dev`;
5. установить Production secrets `BETTER_AUTH_SECRET` и `GOOGLE_CLIENT_SECRET`, а
   `GOOGLE_CLIENT_ID` сохранить как variable либо secret согласно доступному Cloudflare UI;
6. выполнить только presence/name post-check и Google redirect/consent metadata check без чтения
   secret values; записать sanitized evidence в PR #122 и остановиться.

При любой ошибке не создавать второй OAuth client и не deploy-ить. Удаление/rotation частично
созданных values выполняется только если это необходимо для возврата к доказанно пустому состоянию;
иначе exact partial state фиксируется для продолжения без дублирования.

После successful configuration Codex отдельно восстановит и проверит рабочий deployment precedent.
Native Workers Builds precedent сейчас доказанно неприменим без изменения policy: integration
disconnected, а постоянный auto-deploy из development `main` запрещён. Только это конкретное
blocking difference допускает выбор bounded manual deployment path; новый mechanism не выбирается
до проверки доступных Cloudflare deployment controls.

До явного разрешения запрещены Google/Cloudflare auth mutations, deployment, traffic switch,
credential rotation и database mutation.

### Auth configuration/deployment boundary conflict подтверждён

Последнее обновление PR #122 проверено на head
`9e84c898aab019e94c9edc57548b69308ca9918a`. Независимая проверка актуальной официальной
Cloudflare документации подтверждает finding ChatGPT:

- Dashboard Variables and Secrets сохраняются только через **Deploy**;
- `wrangler secret put` создаёт новую Worker version и немедленно deploy-ит её;
- `wrangler versions secret put` создаёт version без traffic promotion, но требует отдельного
  versions-based upload/deploy process и не является выполнением исходного auth-only gate;
- repository не содержит Worker deploy workflow/script, а текущая сессия не имеет authenticated
  Cloudflare CLI/control-plane execution path.

Следовательно ранее данное auth-configuration-only разрешение внутренне несовместимо: четыре
Cloudflare values нельзя durable установить, одновременно запрещая создание/deploy Worker version.
ChatGPT правильно остановился до Google/Cloudflare mutations. Это подтверждённый current blocker,
а не причина импровизировать новый recovery/deploy mechanism.

Рабочий deployment precedent проекта — native Workers Builds из GitHub `main`. Он сейчас отключён
по принятой policy, поэтому буквальное постоянное восстановление precedent имеет доказанное
блокирующее различие: снова включит нежелательный automatic promotion будущих development merges.
Перед выбором нового mechanism сначала проверяется, можно ли bounded переиспользовать precedent
только для exact revision и сразу вернуть Builds в disconnected state.

Следующий шаг только read-only и ограничен **deployment-control-path preflight** через ChatGPT:

1. в Cloudflare Builds `Connect` flow без подтверждения connection проверить доступность exact
   repository `iliya1947/vico-forum`, production branch/revision controls, build/deploy command и
   возможность отключить integration сразу после единственного exact-main deploy;
2. в Worker Versions/Deployments UI проверить наличие manual create/upload-version control,
   version URL/test-before-traffic и rollback к baseline version `78f87645`, ничего не создавая;
3. определить, какой уже поддерживаемый control path позволяет в одном owner-authorized окне
   установить четыре auth values, получить exact `main` artifact с двумя Hyperdrive bindings,
   проверить version URL либо немедленно smoke-ить и при failure вернуть 100% traffic на
   `78f87645`;
4. зафиксировать только available/unavailable controls и не вводить новую repository workflow,
   Deploy Hook или permanent Builds integration без доказанной необходимости.

После preflight Codex выберет минимальный путь с приоритетом: bounded reuse existing Builds
precedent → existing manual version controls → только затем новый mechanism при доказанном
отсутствии первых двух. Новый explicit authorization должен едино охватывать Google client,
Cloudflare auth values, exact-version deployment, smoke, rollback и обязательное восстановление
Builds policy.

До этого запрещены Google OAuth client creation, Cloudflare variable/secret changes, version
creation/deployment, traffic switch, Builds connection, credential rotation и database mutation.

### Deployment control path selected: protected GitHub workflow

Последнее обновление PR #122 проверено на head
`1f9394b197f750a2252fcb3064241bc107f599b4`. Preflight независимо согласуется с официальными
Cloudflare controls:

- temporary Builds reuse требует новый push, user-scoped Builds API token или новый Deploy Hook и
  потому не является самодостаточным exact-existing-main precedent;
- Dashboard editor не создаёт repository-faithful React Router artifact;
- manual `wrangler versions upload` является минимальным supported no-traffic version primitive,
  но у владельца нет local clone, а текущая ChatGPT session не имеет Cloudflare execution tool;
- repository-owned protected GitHub Actions execution уже является используемым в Stage 6
  precedent для production DB gates и обеспечивает exact SHA, Environment secrets, CI audit trail
  и one-shot/fail-closed checks.

Первые два preferred deployment paths имеют доказанные blocking differences. Поэтому минимальный
новый mechanism теперь обоснован: отдельный mergeable repository PR с **manual protected Worker
version/deployment workflow**. Это не разрешает его dispatch и не выполняет external mutations.

ChatGPT должен создать PR из exact current `main` со следующим scope:

1. новый manual main-only workflow, protected отдельным Environment `production-worker`, с
   `contents: read`, serialized concurrency и `cancel-in-progress: false`;
2. pre-Environment guard требует exact confirmation и explicit expected SHA, равный `github.sha`;
   rerun автоматически не означает authorization нового traffic switch;
3. pinned checkout/Node/pnpm setup, `pnpm install --frozen-lockfile`, full build и repository smoke
   prerequisites выполняются до Cloudflare upload;
4. exact pinned `wrangler 4.130.0` вызывается из repository dependency, без `latest`, Deploy Hook,
   Builds reconnect или dashboard code editing;
5. Environment contract использует least-privilege `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID` и четыре auth values; secret values не печатаются и не сохраняются как
   artifacts. Temporary secrets file создаётся только в runner temp с cleanup trap;
6. workflow сначала выполняет `wrangler versions upload` exact checked-out artifact с runtime auth
   values и merged two-Hyperdrive config, получает bounded version identifier и **не переключает
   traffic**;
7. version URL availability и exact supported pre-traffic smoke contract должны быть проверены по
   Wrangler/Cloudflare contract. Если version URL недоступен, workflow останавливается после upload
   без promotion, а не ослабляет gate;
8. production promotion является отдельным explicit workflow input/confirmation и допускается
   только для version, созданной в том же authorized run после successful pre-traffic smoke;
9. после promotion выполняется bounded public LTR/RTL/redirect/auth-endpoint/database-read smoke;
   при failure workflow возвращает 100% traffic на exact baseline version `78f87645` и проверяет
   rollback conclusion;
10. interactive Google sign-in/session/logout остаётся operator post-deploy smoke; его failure
    требует owner-controlled rollback к `78f87645`, а не автоматический retry;
11. unit/static workflow tests проверяют main/SHA/confirmation guards, upload-before-promotion,
    secret non-disclosure, exact baseline rollback, no Builds reconnect/Deploy Hook, and no
    database/schema mutation;
12. docs фиксируют preparation only. Никакие Google/GitHub/Cloudflare secrets/environments/tokens,
    versions, deployments или traffic этим PR не создаются.

После green CI и полных reviews отдельно разрешаемый continuous gate сможет охватить: Google OAuth
client → GitHub `production-worker` Environment values → exact-main workflow dispatch → version
smoke → promotion → public/auth operator smoke → rollback при failure. Постоянный auto-deploy
останется отключённым.

До merge и отдельного explicit authorization запрещены OAuth/client creation, Environment/token/
secret provisioning, workflow dispatch, version upload/deployment и traffic mutation.

### Независимая полная проверка PR #146 — требуется corrective cycle

Последнее обновление PR #122 проверено на head
`c516651fbbe5780cbeb712d42a1ea829f44e85cf`. PR #146 полностью проверен на exact head
`51f84287dee7341003aff122832884f4e62fb42a` против current `main`
`743cb3f1c48b17d58c42cdaa6e561512fd4efb94`: все 8 changed files, 13 commits, workflow,
helpers/tests, smoke script, source-of-truth docs, review comments и exact-head CI.

Основной preparation contract реализован корректно:

- manual main-only protected workflow, exact SHA/confirmation/rerun guards и serialized execution;
- migration evidence + disposable PostgreSQL + build/local split-Hyperdrive smoke до Cloudflare;
- pinned Wrangler `4.130.0`, secret-safe runner-temp file и structured version-upload output;
- upload-before-promotion, Version URL GET-only smoke, exact baseline resolution и 100% rollback;
- отсутствие Builds reconnect/Deploy Hook/database mutation и external operations самим PR;
- CI run `36555764982`: `checks=success`, `database=success`.

Один blocking failure-path defect из inline review независимо подтверждён на final head. После
successful promotion workflow выполняет:

`wrangler deployments status ... > "$production_json"`

под `set -euo pipefail` **вне** guarded condition. Если status API/CLI вернёт nonzero, shell немедленно
завершит step до установки `rollout_failed=true` и до rollback block. Новая version может остаться на
100% production traffic, хотя workflow завершится failure. Это нарушает заявленный автоматический
rollback contract и является current Stage 6 defect, а не future hardening.

Минимальный corrective set:

1. направить и failure команды `deployments status`, и failure последующего
   `assert-deployment` через `rollout_failed=true`, чтобы любой post-promotion verification failure
   обязательно достигал baseline rollback block;
2. добавить focused workflow-contract regression test, доказывающий guarded status + assertion до
   rollback decision;
3. не менять upload/promotion/auth/smoke scope, dependencies или docs кроме точного уточнения, если
   оно понадобится для соответствия исправленному failure path;
4. заново выполнить полный CI и повторно проверить весь PR на новом exact head.

Для manual cancellation/runner loss Cloudflare не предоставляет transaction lease: owner всё равно
должен иметь baseline `78f87645` в dashboard как emergency rollback target. Это известная
операционная граница, но она не отменяет обязанность workflow корректно rollback-ить все пойманные
CLI/verification failures.

Других current-Stage defects, documentation contradictions или unrelated scope expansion в полном
review не обнаружено. PR #146 пока **не готов к merge**. External OAuth/Environment/token
provisioning, workflow dispatch, version upload/deployment и traffic mutation остаются запрещены.

### Повторная полная проверка исправленного PR #146

Последнее обновление PR #122 проверено на head
`a21327497ec4098fe34569fe64000afb6118eb88`. Исправленный PR #146 полностью проверен заново на
exact head `39d87024473838ae3d9905018ae81b9b7b3a6fac` против неизменного `main`
`743cb3f1c48b17d58c42cdaa6e561512fd4efb94`: все 8 changed files, полный final diff,
corrective delta, workflow/helpers/tests/smoke/docs и exact-head CI.

Подтверждённый defect закрыт минимально:

- failure `wrangler deployments status` после promotion теперь устанавливает
  `rollout_failed=true` вместо выхода под `set -e`;
- failure exact `assert-deployment` следует тому же пути;
- оба случая гарантированно достигают существующего baseline rollback block;
- focused regression test фиксирует ordering status → assertion → rollback decision.

Повторный review остального scope подтвердил прежний результат: guards, evidence verification,
build/smoke, secret handling, version upload without traffic, pre-traffic smoke, same-run promotion,
baseline resolution/rollback и scope exclusions не ослаблены. Manual cancellation/runner loss
остаётся явно принятой operator emergency-rollback boundary, а не скрытой automatic guarantee.

GitHub API подтверждает PR open, non-draft, `mergeable=true`, `mergeable_state=clean`; exact-head
CI run `36558418160` terminal green: `checks=success`, `database=success`. Локальный pure contract
suite проходит 10/10.

Новых current-Stage defects, documentation contradictions или unrelated scope expansion не
обнаружено. Финальный технический вывод: **PR #146 готов к merge пользователем**. Merge является
только repository preparation и не разрешает OAuth/client, GitHub Environment/token/secret,
workflow dispatch, Worker version/deployment или traffic mutations. После merge требуется
post-merge tree/workflow check до определения единого external execution gate.

### PR #146 merged; unified auth and Worker rollout authorization gate

Merge подтверждён независимо:

- PR #146 имеет `merged=true`, merge time `2026-09-29T11:09:30Z`;
- актуальный `main` — `7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`;
- merge tree `5d03afd1e96f02893bbeea1cb2f35a46709df02f` точно совпадает с reviewed PR head tree;
- workflow `Production Worker rollout`, ID `370069459`, published из default branch и active;
- merge не создал OAuth client, GitHub Environment/secrets, Cloudflare token/version/deployment и
  не изменил production traffic.

Следующий gate является единым continuous external window и требует нового явного разрешения
владельца, которое охватывает success, automatic rollback и manual emergency rollback. Общая команда
«продолжить Stage 6» таким разрешением не является.

После authorization ChatGPT координирует:

1. final read-only check exact unchanged `main`, active workflow, baseline `78f87645` at 100%,
   Builds disconnected, empty Preview Base и existing Hyperdrive state; drift — stop;
2. создать один Google OAuth Web client в prepared consent/testing configuration с exact callback
   `https://vico-forum.iliya1947a.workers.dev/api/auth/callback/google` и owner smoke account;
3. создать least-privilege Cloudflare API token для exact account/Worker version upload,
   versions/deployments read и traffic deployment operations; token value не публиковать;
4. создать protected GitHub Environment `production-worker`, разрешённый только для `main`, и
   установить secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BETTER_AUTH_SECRET`,
   `GOOGLE_CLIENT_SECRET`; variables `BETTER_AUTH_URL=https://vico-forum.iliya1947a.workers.dev`
   и `GOOGLE_CLIENT_ID`; значения secrets не передавать в чат/PR;
5. один раз dispatch-ить workflow на exact `main` с:
   `expected_sha=7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`,
   `upload_confirmation=production-worker-version-upload-confirmed`, `promote=true`,
   `promotion_confirmation=production-worker-promotion-confirmed`;
6. при failure до promotion остановиться без rerun: production traffic остаётся baseline; сохранить
   sanitized failure stage и решить cleanup отдельно без второго client/token/version;
7. при caught failure после promotion принять только verified automatic rollback на exact baseline
   at 100%; при cancellation/runner loss немедленно проверить traffic и owner-controlled вернуть
   `78f87645` на 100% через Dashboard до иных действий;
8. после successful workflow выполнить owner interactive Google sign-in → persisted session →
   authenticated page/action boundary → logout → next-request anonymous verification. При failure
   выполнить manual rollback на baseline без workflow rerun;
9. зафиксировать sanitized workflow/version/traffic/smoke evidence в PR #122 и остановиться. Не
   выполнять authorization-manager bootstrap, Queue/provider provisioning или другие Stage 6 gates.

После success Cloudflare token и GitHub Environment lifecycle оцениваются отдельно; их немедленная
rotation/deletion не включена автоматически, чтобы не сломать воспроизводимый rollback/audit path.
Native Builds остаётся disconnected.

До нового explicit authorization запрещены Google OAuth client, Cloudflare token, GitHub
Environment/secrets, workflow dispatch, Worker version/deployment и traffic mutations.

### Failed rollout run принят; existing-version continuation only

Последнее обновление PR #122 проверено на head
`19e2fbaf45685a98a1b8eb02ca908a7f259798ff`. GitHub Actions API независимо подтверждает единственный
run `36568756602`, run/attempt `1/1`, exact head
`7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`, terminal `failure`:

- authorization guard и полный pre-Cloudflare verify job завершены `success`;
- protected Environment contract и baseline `78f87645` check завершены `success`;
- upload step завершён `failure`; все последующие verify/smoke/promotion steps skipped;
- workflow имеет ровно один run; rerun и новый dispatch запрещены текущим решением.

Принято bounded Cloudflare evidence из PR #122: upload фактически создал unpromoted version
`b11a64f4-3c1d-42a4-adf7-c9202d4fc8f6` с exact двумя Hyperdrive bindings и четырьмя auth binding
names. Failure возник после version creation при discovery Version Preview URL: custom token не смог
выполнить Workers subdomain read (`10000`) и Wrangler указал на недоступный membership-role read.
Promotion не начинался, поэтому rollback не требовался и baseline traffic должен остаться 100%.

Это не основание создавать второй token/version или проектировать rollout-v2. Уже существует exact
reviewed artifact; следующий путь обязан сначала использовать его.

Следующий gate полностью read-only и выполняется через Cloudflare Dashboard/public URL:

1. подтвердить baseline `78f87645` всё ещё обслуживает 100% Production traffic;
2. открыть existing version `b11a64f4-3c1d-42a4-adf7-c9202d4fc8f6` и сверить tag/message exact
   `main`, оба Hyperdrive binding IDs и четыре auth binding names без secret values;
3. получить Dashboard-provided Version URL для **этой же** version, если он доступен, и выполнить
   GET-only `scripts/smoke-production-worker.sh` equivalent: LTR/RTL/locale redirects, public DB
   reads и `/api/auth/get-session`;
4. если Version URL отсутствует или smoke failed, остановиться без promotion, rerun, second version
   или token replacement; записать exact bounded blocker;
5. если smoke successful, зафиксировать sanitized evidence и остановиться. Manual promotion той же
   version + post-deploy/interactive OAuth smoke потребует отдельного явного разрешения.

Недостаточный Cloudflare token и GitHub Environment сохраняются без изменения до решения cleanup,
чтобы не потерять audit evidence. Google OAuth client не дублируется. До read-only проверки
запрещены version deletion, token rotation/replacement, workflow rerun/dispatch, promotion, traffic
mutation, credential rotation и database mutation.
