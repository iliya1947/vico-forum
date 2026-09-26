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

## Текущий статус

Stage 6 открыт на уровне координации. Внешние изменения пока ограничены явно разрешённым
dedicated migrator login/password credential и GitHub Environment secret; execution identity
доказан successful run. Следующий шаг — отдельный mergeable PR, удаляющий owner exception
code-wide при сохранении fail-closed barrier; PR #132 технически готов к merge,
migrations/deploy остаются запрещены.

## Рабочий канал дальнейших действий

По решению пользователя от 2026-09-26 все дальнейшие operational requests, перечни требуемого
evidence и результаты Stage 6 передаются через служебные PR. Codex записывает технические детали
и следующий запрос в PR #121; пользователь выполняет взаимодействие в чате с ChatGPT и обновляет
служебные PR согласно `AGENTS.md`. В обычных ответах Codex не дублирует длинные инструкции и не
просит пользователя выполнять control-plane шаги непосредственно в текущем чате.
