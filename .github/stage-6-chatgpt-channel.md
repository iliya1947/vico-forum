# Stage 6 ChatGPT coordination channel

> Служебный non-merge документ канала ChatGPT. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- Актуальный `main`: `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`
  (`Docs: align current state with Stage 6 (#129)`).
- Stage 4 forum core и Stage 5 translations/background jobs завершены в repository/local-CI path.
- Текущий продуктовый этап — Stage 6 pre-release external integration.
- Служебный PR Codex Stage 6 — #121; его актуальный head при этой проверке:
  `381759b1b27ab1fbdfb6ad814a640cabf456ea73`.
- Ранее outstanding observation о deployed-проверке dynamic role/user permission management
  в #121 исправлено: актуальные scope и completion criteria явно включают эту проверку.

## Scope канала

Этот PR используется только для технического диалога и результатов работы ChatGPT по Stage 6.
Изменения продукта и mergeable fixes выполняются отдельными PR. Этот PR не изменяет
инфраструктуру, production data, secrets или deployment.

## Source of truth

Работа Stage 6 сверяется с актуальным `main`, `AGENTS.md`, `PROJECT.md`,
`PROJECT_STATE.md`, `ROADMAP.md` и относящимися профильными контрактами. External API,
platform и exact-version assumptions перед применением проверяются по актуальной официальной
документации.

## Read-only external preflight — продолжение 2026-09-26

По следующему шагу из актуального PR #121 выполнена доступная из ChatGPT read-only проверка без
external mutations и без чтения secret values.

### GitHub

- Актуальный repository baseline подтверждён на `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`.
- Текущий GitHub connector намеренно не предоставляет sensitive endpoint families, включая
  secrets APIs. Поэтому наличие/имена GitHub Environment secrets/variables через доступный
  connector честно подтвердить нельзя; secret values не запрашивались.
- Публично доступная часть GitHub preflight уже зафиксирована Codex в #121; новых repository
  mutations в рамках этой проверки не выполнялось.

### Neon

- Подключённый Neon connector доступен, но connection не scoped к конкретному project.
- Read-only вызов project/branch metadata без `project_id` отклонён с явным требованием передать
  target Neon project ID.
- В repository search по `NEON_PROJECT_ID` target project ID не найден.
- Поэтому migration login identity, application ownership, memberships и runtime-role design input
  пока не подтверждены. Для продолжения достаточно project ID; пароль/connection string/secret
  material не нужны и не должны передаваться.

### Cloudflare

- В текущем наборе подключённых инструментов ChatGPT Cloudflare control-plane connector отсутствует.
- Поэтому фактические production branch/auto-deploy state, preview topology и bindings из
  Cloudflare account здесь не подтверждены. Repository documentation не подменяет это external
  evidence.


### Neon evidence после получения target project ID

Target подтверждён пользователем как Neon project `late-cell-18916701`, branch
`br-square-flower-b2q6a3sy`. Read-only control-plane/catalog проверки дали:

- project name `vico-forum`, PostgreSQL 17, region `aws-eu-central-1`;
- указанная branch называется `production`, является primary/default и находится в state `ready`;
- database `vico_forum` принадлежит `vico_forum_owner`;
- существуют роли `vico_forum_owner`, `vico_forum_migrator`, `vico_forum_runtime`;
- SQL session connector выполняет read-only query как `vico_forum_owner`;
- PostgreSQL catalog: migrator/runtime не superuser, не CREATEDB/CREATEROLE; owner имеет
  CREATEDB/CREATEROLE и состоит в `neon_superuser`, `vico_forum_migrator`,
  `vico_forum_runtime`;
- `vico_forum_migrator` владеет schema `drizzle` и текущими принятыми public relations
  localization/Better Auth subset; runtime не владеет public relations;
- Neon role metadata возвращает для `vico_forum_migrator` `authentication_method=no_login`,
  тогда как PostgreSQL catalog на той же production branch возвращает `rolcanlogin=true`.
  Это зафиксировано как control-plane/catalog discrepancy для технического разбора, без mutation.

Эта проверка не применяла migrations, не меняла roles/grants/resources и не читала passwords или
connection strings. Точный migration credential path и полный runtime grants contract ещё не
считаются подтверждёнными только из наличия ролей.

### Neon read-only preflight — завершённая доступная проверка

После проверки актуального production workflow и PostgreSQL catalog уточнена текущая модель:

- current `production-db-migrate.yml` уже выполняет verifier **до** `db:migrate`;
  при `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` он допускает временный owner-mode,
  но pending migrations должны остановиться на preflight до применения;
- production database `vico_forum` owner: `vico_forum_owner`;
- единый application-table owner для текущего набора таблиц:
  `vico_forum_migrator`;
- `vico_forum_owner` имеет membership в `vico_forum_migrator` с
  `ADMIN OPTION=true, INHERIT=false, SET=false`, и аналогичную administrative membership
  в `vico_forum_runtime`;
- Neon connector session работает как database owner `vico_forum_owner`; это не доказывает
  identity GitHub secret;
- исторический workflow #3 (13 Sep) действительно подключался как `vico_forum_owner` и после
  применения тогдашних migrations упал на privilege verification. Current workflow с preflight
  устроен иначе;
- GitHub Environment screenshot подтверждает наличие current secret
  `NEON_MIGRATION_DATABASE_URL`, отдельного `NEON_OWNER_DATABASE_URL` и variable
  `RUNTIME_DATABASE_ROLE=vico_forum_runtime`, но GitHub не раскрывает username secret;
- без исполнения Environment secret нельзя доказать, что текущий
  `NEON_MIGRATION_DATABASE_URL` уже переключён с owner на `vico_forum_migrator`.
  Существующий production workflow для этой цели запускать не следует: он содержит mutation step
  `db:migrate`. Временный PR #130 не был merged и не даёт dispatch workflow из default branch.

Вывод: Neon control-plane/catalog baseline собран. Единственный не подтверждённый факт —
**current identity secret `NEON_MIGRATION_DATABASE_URL`**. Его проверка требует исполнения
GitHub Environment secret; доступный ChatGPT GitHub connector secrets/dispatch произвольного
diagnostic job не предоставляет. Production DB mutation для получения этого факта не выполнялась.

### Cloudflare read-only preflight — 2026-09-26

Пользователь предоставил фактические данные Cloudflare Dashboard; никаких Cloudflare mutations
в этой проверке не выполнялось.

- Production Worker: `vico-forum`, workers.dev route `vico-forum.iliya1947a.workers.dev`.
- Native Workers Builds Git integration сейчас **не подключена**: Settings предлагает
  `Connect to a repository`; следовательно текущий `main` не auto-promotes production через
  этот native Git path.
- Production bindings: один Hyperdrive binding
  `HYPERDRIVE -> vico-forum-registry`.
- Preview Base: connected bindings отсутствуют. Production Hyperdrive capability не выдана
  базовой preview configuration.
- Queue consumers и cron triggers сейчас отсутствуют.
- Production logs включены, invocation logs сохраняются в Workers dashboard; sampling logs 100%.
  Traces выключены; telemetry export destination отсутствует.
- Hyperdrive `vico-forum-registry`: PostgreSQL, database `vico_forum`, user
  `vico_forum_runtime`, port 5432. Origin host относится к production Neon target.
- Hyperdrive query caching явно disabled; Metrics также показал запросы как Cache Disabled и
  cached bytes 0 B.
- Hyperdrive soft maximum connections: 20.
- Repository `wrangler.jsonc` соответствует production binding ID
  `aa1fb9feeff44a23ae12d88eefceb942` и содержит `redact_query_string=true`.

Вывод read-only preflight: текущая external topology сохраняет separation feature merges от
native automatic production deploy; Preview Base не имеет production DB binding; существующий
localization Hyperdrive использует runtime role и cache-disabled configuration. Отсутствующие
Queues/provider credentials и будущие forum/auth/translation write Hyperdrive capabilities —
не пропущенные read-only evidence, а отдельное provisioning/acceptance Stage 6.

### GitHub read-only preflight — 2026-09-26

С учётом уже предоставленного пользователем полного экрана Environment `production-db` и
repository/API проверки подтверждено:

- Environment `production-db` ограничивает deployment branch до `main`;
- Required reviewers и wait timer не настроены; administrators могут bypass configured
  protection rules;
- Environment secrets присутствуют под именами `NEON_MIGRATION_DATABASE_URL` и
  `NEON_OWNER_DATABASE_URL`; значения не читались и не требуются;
- Environment variable `RUNTIME_DATABASE_ROLE=vico_forum_runtime` присутствует;
- current `production-db-migrate.yml` — manual `workflow_dispatch`, job дополнительно требует
  `github.ref == refs/heads/main`, использует Environment `production-db`, `contents: read`,
  serialized concurrency и pinned setup actions;
- workflow использует `NEON_MIGRATION_DATABASE_URL` для preflight, migration и post-verification,
  а `NEON_OWNER_DATABASE_URL` этим workflow не используется;
- temporary `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` всё ещё существует и по
  Stage 6 contract должен быть снят до первой новой external schema migration;
- доступный GitHub integration не предоставляет Environment/secrets endpoint и не имеет доступа
  к branch-protection endpoint (403), поэтому текущий branch-protection/ruleset state отдельно
  через этот connector не подтверждён. Для данного read-only preflight это не блокирует уже
  подтверждённый production migration gate: workflow сам manual-only + main-only + Environment-bound.

Единственный существенный unresolved cross-control-plane факт остаётся прежним: username внутри
current `NEON_MIGRATION_DATABASE_URL` нельзя установить чтением GitHub Environment metadata.
Это должно быть проверено/исправлено в dedicated migration-credential шаге Stage 6 до первого
pending external migration, а не обходиться запуском mutation workflow ради диагностики.

### Dedicated migration credential gate — procedure research 2026-09-26

После последнего обновления Codex PR #121 проверены current repository contracts и актуальные
официальные platform capabilities.

Подтверждённый безопасный gate:

1. До подтверждения dedicated identity **не запускать** `production-db-migrate.yml`: workflow
   содержит `db:migrate`, а current owner-mode предназначен только для no-op verification.
2. Neon API имеет read operation `GET /projects/{project_id}/connection_uri`, где явно задаются
   `branch_id`, `database_name` и `role_name`; значит connection URI для production branch,
   database `vico_forum` и role `vico_forum_migrator` можно получить без schema migration.
   URI содержит credential material и не должен попадать в Git, PR, logs или чат.
3. GitHub Environment secret можно заменить in-place в Environment `production-db`; GitHub
   официально поддерживает create/update environment secret, а secret value после сохранения не
   раскрывается. Environment secret доступен только job, который ссылается на этот Environment.
4. Поэтому preferred recovery path: пользователь получает Neon connection URI **именно для
   `vico_forum_migrator`** непосредственно в Neon control plane и сразу записывает его как новое
   значение существующего GitHub Environment secret `NEON_MIGRATION_DATABASE_URL`, не копируя
   значение в PR/чат. Если Neon не может выдать usable URI без password reset/rotation, такая
   rotation является отдельной external credential mutation и требует явного разрешения.
5. Само обновление `NEON_MIGRATION_DATABASE_URL` также является external secret mutation и до
   выполнения требует явного разрешения пользователя.
6. После замены secret evidence identity должен быть получен **до pending migrations** отдельным
   non-migrating execution path, который подключается через Environment secret и выводит только
   bounded result `current_user = vico_forum_migrator` (без URI/password). Existing production
   migration workflow для этой диагностики не используется.
7. Только после такого evidence следующий repository step — отдельное reviewed изменение,
   удаляющее `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` и сохраняющее fail-closed
   migration preflight. Runtime grants, migrations и deploy остаются за пределами этого gate.

Текущие tools подтверждают дополнительное ограничение: Neon connector способен запросить
connection string с explicit `role_name`, но результат содержит privileged password; GitHub
connector этой сессии не предоставляет Environment-secret write endpoint. Поэтому автоматический
secret-to-secret transfer без раскрытия credential текущим toolchain недоступен; безопасная
граница — Neon/GitHub control planes пользователя.

Official references checked:
- Neon API Reference: Retrieve connection URI;
- GitHub Docs: Using secrets in GitHub Actions;
- GitHub Docs: Deployments and environments / Managing environments;
- GitHub REST: environment secret create/update contract.

Никаких external mutations, migrations или deployment в этой подзадаче не выполнено.

## Текущий статус

Dedicated migration credential gate спроектирован до mutation boundary. Следующий шаг требует
явного решения пользователя: разрешить получение dedicated `vico_forum_migrator` credential
и замену `production-db / NEON_MIGRATION_DATABASE_URL` без раскрытия secret material. До этого
production migration workflow не запускается.
