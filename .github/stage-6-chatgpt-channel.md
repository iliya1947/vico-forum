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

### Dedicated credential mutation attempt — 2026-09-26

Пользователь явно разрешил получить новый credential `vico_forum_migrator` и заменить
`production-db / NEON_MIGRATION_DATABASE_URL`.

- Neon connector успешно выполнил dedicated connection-string request для production branch,
  database `vico_forum`, role `vico_forum_migrator`. Credential material в чат/PR не выводился.
- Доступный GitHub connector повторно проверен: sensitive secrets API не поддерживается, а
  Environment-secret write action отсутствует. Поэтому безопасно передать полученное secret
  material напрямую Neon → GitHub средствами текущего toolchain невозможно.
- GitHub secret **не изменён**. Migration workflow, migrations, deploy и runtime grants не
  запускались/не изменялись.
- Gate остаётся закрыт до ручной control-plane замены пользователем: получить connection string
  для `vico_forum_migrator` в Neon Console и сразу сохранить его как
  `production-db / NEON_MIGRATION_DATABASE_URL` в GitHub, не отправляя значение в чат.

### Dedicated migration secret replaced — identity evidence pending

Пользователь в Neon Console выбрал production branch, database `vico_forum`, role
`vico_forum_migrator`, скопировал показанный Neon connection string и без публикации значения
заменил GitHub Environment `production-db` secret `NEON_MIGRATION_DATABASE_URL`.

Это закрывает credential-replacement mutation, но ещё не является execution evidence: GitHub
Actions пока не выполнял подключение новым secret и `current_user` через него не проверялся.

Проверен текущий `.github/workflows/production-db-migrate.yml`: использовать его для identity
probe нельзя, поскольку после verifier он содержит реальный `pnpm db:migrate`. Доступный GitHub
connector не умеет dispatch нового workflow и не предоставляет generic Actions-dispatch write.

Минимальный следующий repository boundary для технического согласования: отдельный
non-migrating identity-check path на `main`, bound to Environment `production-db`, который
подключается только через `NEON_MIGRATION_DATABASE_URL`, выполняет read-only
`SELECT current_user`/эквивалентную fail-closed проверку ожидаемой роли
`vico_forum_migrator`, не печатает connection string/password и не содержит migration/deploy
steps. Такой mergeable repository PR здесь не создан: по AGENTS.md отдельный mergeable PR после
работы Codex создаётся ChatGPT по переданной Codex задаче. Требуется техническое решение Codex о
точном repository change.

До identity evidence production migration workflow не запускать; owner-mode exception не удалён,
migrations/deploy/runtime grants не выполнялись.

### Mergeable identity workflow PR #131

По зафиксированному Codex contract создан отдельный mergeable PR #131. После первого CI run
обнаружен текущий PR-дефект: ESLint не применял Node globals к новому `.mjs` verifier. Дефект
исправлен минимальным расширением существующего ESLint file pattern на
`.github/scripts/**/*.mjs`.

Актуальный head PR #131: `cf4c493fe47c994d5703e3d7ff14cbf7b5254078`.
Повторный CI run #978 завершён `success`; PR mergeable. Полный актуальный diff повторно
проверен: workflow остаётся manual/read-only, использует Environment `production-db`, общий
`production-db-migrations` concurrency gate и только `NEON_MIGRATION_DATABASE_URL`;
verifier выполняет `BEGIN READ ONLY`, bounded `SELECT current_user`, exact assertion
`vico_forum_migrator` и `ROLLBACK`. Migration/schema/grant/deploy/owner-secret steps
отсутствуют. Unit test покрывает exact-role assertion.

External identity evidence этим CI не получено: identity workflow может быть запущен только
после merge PR #131 в `main`. Production migration workflow до successful identity evidence
не запускать.

### PR #131 — corrective cycle завершён

После независимой проверки Codex исправлены все четыре подтверждённые проблемы PR #131:

- pure exact-role test переведён на `node:test` / `node:assert` и явно включён в существующий
  repository-script CI block;
- `PROJECT_STATE.md` фиксирует наличие manual read-only identity path, не объявляя external
  identity evidence выполненным;
- verifier больше не использует private `pg.Client._connected`: cleanup опирается на локальный
  state после успешного `connect()`;
- PostgreSQL client получил `connectionTimeoutMillis=10000` и `query_timeout=10000`, workflow
  получил `timeout-minutes: 5`.

После исправлений весь PR повторно проверен на head
`66360d80f3a7ce9731d42320415ff667bc5c5e0f`. PR mergeable. CI run #982 завершён
`success`: jobs `checks` и `database` успешны; repository-script tests, lint, typecheck,
tests, build, migration metadata/schema parity, PostgreSQL 17 migration suite и Workers smoke
прошли. Новых проблем в полном актуальном diff не обнаружено.

External identity workflow при этом не запускался и identity gate ещё не является закрытым
external evidence.

### Dedicated migration identity evidence — success 2026-09-26

PR #131 merged в `main` как commit
`b8bb841e29bbdcb9201a64489970f349d316ae63`. Manual workflow
`Production database identity verification`, run ID `36252243734`, был выполнен именно
на этом `main` SHA.

Первые два attempt выявили malformed migration credential: connection string для
`vico_forum_migrator` не содержал password, поэтому `pg` завершался ошибкой
`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. Причина устранена
без пересоздания роли: существующей least-privilege роли сохранены ownership/grants,
она получила login/password credential, а GitHub Environment secret
`production-db / NEON_MIGRATION_DATABASE_URL` был заменён пользователем свежим
password-bearing connection string. Secret value не публиковался.

Attempt #3 того же workflow run завершён `success`. Step
`Verify dedicated migration identity` завершён `success`, то есть Environment secret
реально подключился к production Neon и exact assertion
`current_user = vico_forum_migrator` прошёл. Таким образом dedicated migration identity
gate теперь имеет external execution evidence.

Эта проверка была read-only. Production migration workflow, pending migrations, deployment,
runtime grants и другие schema/runtime mutations не запускались.

## Текущий статус

Dedicated migration identity подтверждена успешным GitHub Actions run
`36252243734`, attempt #3, на exact `main`
`b8bb841e29bbdcb9201a64489970f349d316ae63`.

По текущему Stage 6 contract production migration workflow пока запускать нельзя:
до первой pending external schema migration требуется отдельное reviewed repository change,
которое убирает временный `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION=true` owner exception
и сохраняет/усиливает fail-closed migration verifier. Следующий технический шаг должен определить
Codex.


### Owner-exception removal PR #132 — 2026-09-26

По последнему contract из служебного PR Codex #121 создан отдельный mergeable PR
[#132](https://github.com/iliya1947/vico-forum/pull/132) из exact `main`
`b8bb841e29bbdcb9201a64489970f349d316ae63`.

Head PR #132: `7c5bff3a7082358b793c33c69803688df9700d67`.

Изменение ограничено согласованной границей:
- `PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION` удалён из обоих verifier steps production migration workflow и из verifier script;
- production privilege contract теперь всегда требует migration connection == application owner и не имеет owner-mode exception;
- positive owner-mode tests заменены permanent negative database-owner coverage; dangerous attributes/memberships проверки сохранены;
- `PROJECT_STATE.md`, `docs/database/MIGRATIONS.md` и corrective H-004 в `PROJECT_HISTORY.md` обновлены фактическим successful identity evidence и состоянием после удаления exception;
- existing full-ledger preflight сохранён без ослабления: pending migrations по-прежнему остановят workflow до `db:migrate`;
- pre/post migration verifier phases, schema-catalog expansion, runtime grants, migrations и deployment не входят в PR.

Полный diff PR #132 повторно проверен после последнего commit. GitHub CI run #988
(`36255852504`) завершён успешно: jobs `checks` и `database` имеют conclusion `success`.
PR открыт, non-draft и mergeable. Никакие production migrations/deploy/runtime-grant mutations
в рамках этой задачи не выполнялись.

Следующий шаг — независимая техническая проверка PR #132 Codex до решения пользователя о merge.


### Post-merge Stage 6 verifier/runtime analysis — 2026-09-26

PR #132 подтверждён merged. Актуальный `main`:
`0d89e036ddc0bfce0cc966afb79a6ce8088e9cd2`.

Перед следующим repository change перечитаны актуальные `PROJECT.md`, `PROJECT_STATE.md`,
`ROADMAP.md`, `docs/database/MIGRATIONS.md`, `docs/database/HYPERDRIVE.md`,
`docs/auth/AUTHORIZATION.md`, translation contracts и текущий migration/runtime code.

Read-only production Neon check подтвердил точную исходную migration boundary:
`drizzle.__drizzle_migrations` содержит ровно четыре journal timestamps, соответствующие
`0000`–`0003`. Следовательно current pending set для checked-in journal — `0004`–`0020`.
В public schema сейчас восемь application tables:
`account`, `locales`, `rate_limit`, `session`, `ui_translation_bundles`,
`ui_translations`, `user`, `verification`; все принадлежат
`vico_forum_migrator`.

Checked-in target snapshot `0020_snapshot.json` содержит 27 public application tables.
Кроме текущих восьми, target добавляет forum domain, dynamic authorization, durable translation
tasks/generation heads, content translations/task metadata и content request-budget counters.
Это фактическая schema boundary, которую следующий post-migration verifier должен уметь
отличать от текущего pre-migration состояния.

Текущий full verifier нельзя просто запускать до `db:migrate`: он требует exact полного ledger.
Для технического согласования следующего change нужны две разные semantics:
- pre-migration gate должен доказать dedicated migrator/role safety и отсутствие divergent/unknown
  migration history, при этом разрешая reviewed pending suffix;
- post-migration gate должен требовать полный exact journal и target schema/ownership invariants.
Точный способ представления target schema contract (явный manifest против checked-in snapshot-derived
manifest) пока не выбран; это предмет следующего технического согласования, а не готовый вывод.

Runtime-capability inventory выявил важную текущую Stage 6 границу. `workers/app.ts` сейчас
передаёт один и тот же `env.HYPERDRIVE.connectionString` в Better Auth, forum reader/writer,
authorization, localization reads, content-translation presentation и generation-status reader.
Но production binding `HYPERDRIVE` по действующему contract остаётся
`vico_forum_runtime` с SELECT только на `locales`, `ui_translations`,
`ui_translation_bundles`. Значит current `main` нельзя выкатывать как forum/auth candidate
с этим единственным production DB capability: это не future-only hardening, а реальная Stage 6
integration boundary.

При этом authenticated content-generation action в Worker всё ещё явно disabled, а real Queue
consumer/provider wiring ещё не существует. Поэтому выдавать production translation-worker write
privileges только ради будущего Queue шага сейчас преждевременно. Следующий runtime-role design
должен отделить уже необходимый web forum/auth/authorization capability от существующего
localization read-only capability; background translation execution privileges следует привязать
к фактическому Queue wiring в соответствующей Stage 6 задаче.

По фактическим web query paths уже известен минимальный класс доступа будущего web capability:
- read Better Auth/forum/authorization/content-presentation/status data;
- Better Auth session/OAuth/rate-limit writes;
- forum topic/reply/solution/source-locale-correction writes;
- authorization management writes только через protected application boundary;
- без schema ownership, CREATE, migration/admin capability и без механического расширения
  существующего localization role.

External mutations, migrations, grants, Hyperdrive provisioning и deployment в этой подзадаче
не выполнялись. Следующая подзадача — сформировать конкретный reviewed contract для
pre/post verifier и web runtime-role/binding boundary, затем передать его Codex на независимую
техническую проверку до implementation PR.


### Proposed verifier phases and web runtime capability contract — 2026-09-26

Эта секция фиксирует результат второй design-подзадачи для технической проверки Codex.
Repository implementation PR пока не создавался, external mutations не выполнялись.

#### 1. Production migration workflow: phase semantics

Следующий repository change должен разделить один нынешний full verifier на две разные
semantics вокруг существующего `pnpm db:migrate`.

**Pre-migration gate** должен быть read-only и fail closed, но разрешать именно reviewed pending
suffix текущего checked-in journal:

- PostgreSQL major `17` и UTF-8;
- exact current migration identity/application owner — dedicated `vico_forum_migrator`, database
  owner rejected;
- dangerous role attributes/memberships/ownership boundaries остаются запрещены;
- target migration ledger обязан быть **точным префиксом** checked-in journal: никакого extra,
  reordered, rewritten или divergent history;
- для текущего production target префикс не может быть короче уже **known-applied target prefix**
  `0000`–`0003`; это защищает от запуска против пустой/не той DB;
- repository-owned accepted migration→runtime evidence baseline при этом остаётся
  `0000`–`0002`; наличие `0003` в target DB подтверждено catalog/read-only evidence, но
  не должно называться externally accepted baseline;
- уже применённый target prefix `0000`–`0003` проверяется существующими stable schema/data
  invariants до write;
- существующий localization runtime role остаётся exact read-only capability:
  schema `public` USAGE без CREATE, SELECT без grant option только на
  `locales`, `ui_translations`, `ui_translation_bundles`; PUBLIC relation/column grants и
  неожиданные default grants по-прежнему rejected.

Такой preflight допускает текущий факт `0000`–`0003` + pending `0004`–`0020`, но не
ослабляет provenance/history safety. Повторный запуск после уже полного rollout также допустим:
полный journal является собственным точным префиксом и `db:migrate` становится no-op.

**Post-migration gate** выполняется только после успешного `db:migrate` и требует:

- exact полный ledger `0000`–`0020` текущего checked-in revision;
- все 27 target public application tables и их stable structural contract;
- application objects принадлежат dedicated migrator/application owner, runtime roles не владеют
  schema/tables/sequences/views;
- migration/application owner по-прежнему least-privilege и distinct от database owner;
- localization runtime ACL не расширен новой forum/auth/translation schema;
- PUBLIC не получил relation/column grants, grant options или schema CREATE;
- существующие immutable data invariants (reserved/bootstrap locale exclusion и persistent
  canonical-English exclusion) сохраняются.

Под “full target schema contract” здесь понимаются не только названия таблиц. Verifier должен
покрывать стабильную структуру accepted `0000`–`0020`: columns/type/nullability и те
PK/unique/FK/check/index invariants, от которых зависит runtime correctness, включая manual SQL
constraints, которых может не быть достаточно вывести только из Drizzle TypeScript schema.
Способ хранения/получения repository-owned target manifest не навязывается. Но CI обязан
доказывать, что verifier contract соответствует clean PostgreSQL 17 после применения всей
checked-in migration history, чтобы production verifier и migrations не расходились вручную.

Migration workflow на этом шаге **не должен** требовать ещё не созданную web runtime role:
schema-first rollout должен иметь возможность успешно завершить migration evidence до
runtime-role provisioning.

#### 2. Отдельная web runtime database capability

Текущий `vico_forum_runtime` и binding `HYPERDRIVE` остаются localization-only и не
расширяются. Для deployed forum/auth candidate нужен отдельный login role и отдельный
cache-disabled Hyperdrive binding.

Базовые role invariants:

- LOGIN;
- no SUPERUSER / CREATEDB / CREATEROLE / REPLICATION / BYPASSRLS;
- no role memberships;
- no schema/table/sequence/view ownership;
- `public`: USAGE, no CREATE;
- no grant options;
- target schema `0020` не содержит sequences, поэтому web capability не требует sequence grants;
- migration/admin credential никогда не передаётся Worker.

Минимальная ACL матрица по фактическим **сейчас подключённым** Worker paths:

**Better Auth domain**
- `user`, `session`, `account`, `verification`, `rate_limit`:
  `SELECT, INSERT, UPDATE, DELETE`.
  Это domain-bounded CRUD для Better Auth database adapter и database rate-limit storage; granular
  endpoint-by-endpoint tightening не требуется как pre-release blocker.

**Forum web domain**
- `forum_categories`, `forum_sections`: `SELECT` only — runtime create-category/section
  capability в Worker сейчас не экспонируется;
- `forum_topics`, `forum_posts`: `SELECT, INSERT, UPDATE`;
- `forum_topic_title_revisions`, `forum_post_revisions`: `SELECT, INSERT`;
- DELETE/TRUNCATE/REFERENCES/TRIGGER не требуются.

**Dynamic authorization domain**
- `authz_permissions`: `SELECT` only;
- `authz_roles`: `SELECT, INSERT, UPDATE, DELETE`;
- `authz_role_permissions`: `SELECT, INSERT, DELETE`;
- `authz_user_roles`: `SELECT, INSERT, UPDATE`;
- `authz_user_permission_overrides`: `SELECT, INSERT, UPDATE, DELETE`;
- `authz_mutation_lock`: `SELECT, UPDATE`;
- code-backed permission catalog не получает runtime INSERT/UPDATE/DELETE.

**Persisted content presentation / generation-status reads**
- `forum_topic_title_translations`, `forum_post_body_translations`: `SELECT`;
- `translation_tasks`, `translation_task_generation_heads`,
  `content_topic_title_translation_tasks`, `content_post_body_translation_tasks`: `SELECT`.

**Явно не входят в web role сейчас**
- `locales`, `ui_translations`, `ui_translation_bundles`: остаются существующей
  localization capability;
- `content_translation_request_budget_counters` и любые task/publication writes: authenticated
  generation runtime в Worker сейчас disabled;
- translation task execution/publication/reconciliation writes: real Queue consumer/provider
  ещё не wired и получит отдельный reviewed capability только в соответствующей Stage 6 задаче.

Worker wiring boundary после provisioning:
- registry/UI-translation reads продолжают использовать существующий localization `HYPERDRIVE`;
- Better Auth, forum reader/writer, authorization, persisted content-translation presentation и
  generation-status reader переходят на новый web Hyperdrive binding;
- один credential больше не обслуживает одновременно localization read-only и forum/auth writes.

После внешнего создания role/grants/Hyperdrive, но **до deployment**, repository-owned read-only
runtime privilege verification должна доказать exact ACL matrix, отсутствие ownership/membership/
grant options/CREATE и separation от migrator/localization role. Это отдельная acceptance boundary
после schema migration, а не условие успешности самого migration workflow.

#### 3. Stage 6 ordering после согласования

Предлагаемая последовательность, не выполняемая этой design-задачей:

`reviewed verifier-phase PR`
→ merge
→ explicit user authorization на production migration
→ migration workflow: preflight → `0004`–`0020` → postflight → evidence
→ reviewed web runtime role/grant + Worker binding change
→ explicit external provisioning
→ runtime privilege verification
→ только затем schema-dependent deployed forum/auth smoke.

Google OAuth, authorization-manager bootstrap, Queue/provider, preview isolation и backup/restore
остаются последующими Stage 6 задачами.

Проверены актуальные официальные contracts: PostgreSQL 17 разделяет schema `USAGE`/CREATE и
table privileges; Cloudflare Hyperdrive Worker binding задаётся отдельным binding name/config ID;
Better Auth Drizzle adapter использует database-backed core auth schema, а configured
`rateLimit.storage = "database"` использует отдельную rate-limit table. Это согласуется с
границами выше и не требует расширения migration role в runtime.


### PR #133 CI retry boundary — 2026-09-26

Head `9549768fc3a38ea05411c87036c9a93997c6c583` получил CI run
`36259414958`. Attempt #1: `checks` success, `database` failure из-за существующего
concurrency test `tests/database/migrations.test.ts` с PostgreSQL SQLSTATE `40001`
(`could not serialize access due to read/write dependencies among transactions`).
Между предыдущим successful database run того же PR и этим head менялись только source-of-truth
docs, поэтому failure не классифицирован как дефект verifier-phases/full-manifest change и код
ради него не менялся.

Выполнен rerun failed jobs того же workflow. Attempt #2: database job полностью success:
clean PostgreSQL 17 suite, production schema manifest parity, Workers build и local Hyperdrive smoke
все прошли. `checks` также success.

Отдельно GitHub Codex review на раннем commit PR #133 оставил три замечания
(column defaults, correctness-critical triggers/functions, documentation state). Они ещё не
считаются исправленными в рамках этой подзадачи; следующий отдельный шаг — независимо проверить
каждое замечание как current-Stage defect и только после технического совпадения вносить изменения.


### PR #133 Codex review reconciliation — 2026-09-26

Независимо проверены три замечания Codex review к раннему commit PR #133
(`2fc990998a`) против текущего head `9549768fc3a38ea05411c87036c9a93997c6c583`.

1. **Column defaults — подтверждённый current-Stage defect.**
   Текущий production schema snapshot/manifest сравнивает column name/type/nullability, но не
   default expressions. Это реально ослабляет post-migration gate: например
   `forum_topics.is_solved` имеет schema default `false`, а `forum_topics.created_at` —
   `now()`; `DrizzleForumRepository.createTopic()` и `createTopicWithInitialPost()` эти поля
   не передают. Потеря или изменение default может сломать production writes, при этом текущий
   manifest verifier такой drift пропустит. Для заявленного full structural manifest это не
   future hardening, а дефект текущей Stage 6 acceptance boundary.

2. **Correctness-critical triggers/functions — подтверждённый current-Stage defect.**
   Manifest сейчас покрывает tables/columns/PK/unique/FK/check/index, но не trigger/function
   contract. Accepted migrations создают DB-level correctness invariants, в частности:
   - `reject_forum_revision_update()` +
     `forum_topic_title_revisions_immutable` /
     `forum_post_revisions_immutable`;
   - `authz_protect_role_identity()` +
     `authz_protect_role_identity_trigger`;
   - content-task binding/delete functions и triggers из `0015`–`0016`, включая
     deferred content-binding constraint trigger.
   Clean PostgreSQL tests уже опираются на эти database invariants (например immutable forum
   revisions). Если trigger/function отсутствует или trigger disabled, текущий postflight может
   принять schema, которая нарушает runtime assumptions. Поэтому это также реальный defect
   current verifier/full-manifest scope.

3. **Documentation state — замечание было корректным на reviewed commit, но уже исправлено.**
   Текущий PR head обновляет `PROJECT_STATE.md` и `docs/database/MIGRATIONS.md`: они уже
   описывают phase-aware pre/post contract, known-applied target prefix `0000`–`0003`,
   full postflight manifest `0000`–`0020` и отдельное user authorization до external
   production migration. В текущем head противоречия, указанного Codex, больше нет.

Итог технического согласования: два code-level замечания Codex совпали с независимой проверкой
ChatGPT и считаются подтверждёнными; documentation замечание закрыто уже внесёнными изменениями.
Следующая отдельная подзадача — исправить только два подтверждённых manifest defect
(defaults + triggers/functions), затем снова прогнать полный PR CI и выполнить whole-PR re-review.


### PR #133 confirmed manifest defects fixed — 2026-09-26

На head PR #133 `e40488f24de778fda7a448c6154fddd5ff0615be` исправлены два
подтверждённых current-Stage defect из Codex review:

- full production schema manifest теперь включает exact presence/identity всех column defaults:
  42 expected defaults зафиксированы SHA-256 от PostgreSQL 17 `pg_get_expr(pg_attrdef...)`,
  а отсутствие default также является частью exact column contract;
- manifest теперь включает exact set и definition identity пяти public trigger functions и шести
  user-defined critical triggers, плюс trigger function binding и `tgenabled` state. Это покрывает
  immutable forum revisions, built-in authz role identity и durable content-task binding/delete
  invariants;
- source-of-truth docs в самом PR обновлены: full manifest contract явно включает defaults и
  correctness-critical triggers/functions.

Использованы PostgreSQL 17 system-catalog boundaries `pg_attrdef`, `pg_trigger`, `pg_proc`,
`pg_get_expr`, `pg_get_triggerdef`, `pg_get_functiondef`. External production DB не
изменялась; значения manifest получены только из clean disposable PostgreSQL 17 CI.

Финальный CI run `36261179271` на exact head
`e40488f24de778fda7a448c6154fddd5ff0615be` завершён полностью успешно:
`checks=success`, `database=success`; schema-manifest parity, clean PostgreSQL 17 suite,
build и local Hyperdrive smoke прошли.

Следующая отдельная подзадача по workflow — whole-PR re-review PR #133 после исправлений.


### PR #133 whole-PR re-review after corrections — neutral Codex handoff

PR #133 повторно проверен целиком на exact head
`e40488f24de778fda7a448c6154fddd5ff0615be` после исправления ранее согласованных
defaults + triggers/functions findings. Финальный CI run `36261179271` имеет
`checks=success` и `database=success`; PR открыт и mergeable.

По протоколу независимой проверки следующий шаг — новый **нейтральный** whole-PR review Codex
на этом exact head. Возможные новые выводы ChatGPT намеренно не раскрываются до независимой
проверки Codex.


### PR #133 ledger hash validation correction — 2026-09-26

Проверено последнее обновление Codex PR #121. Codex whole-PR review подтвердил оставшийся
current-Stage defect: phase verifier сравнивал target `drizzle.__drizzle_migrations` только по
`created_at` и поэтому не мог reject rewritten migration с тем же timestamp и другим `hash`.

Исправление внесено в PR #133, current head
`45f6a9eef7eac98a43766831469417a225f3a080`:

- exact Drizzle ORM `0.45.2` source contract проверен по upstream tag: `readMigrationFiles()`
  вычисляет ledger hash как SHA-256 от полного raw SQL file contents;
- repository verifier теперь вычисляет expected `{ createdAt, hash }` для каждой checked-in
  migration тем же SHA-256 contract;
- target ledger читает одновременно `created_at` и `hash`;
- pre-migration phase требует exact timestamp+hash prefix не короче known-applied `0000`–`0003`;
- post-migration phase требует exact complete timestamp+hash history;
- pure phase tests теперь отдельно reject wrong hash и missing hash при том же timestamp как для
  pre, так и для post;
- `PROJECT_STATE.md` и `docs/database/MIGRATIONS.md` уточнены: exact ledger identity означает
  `created_at + Drizzle SHA-256 hash`.

После последнего commit CI run `36262562947` стартовал автоматически. Targeted repository-script
step `Protect accepted migration history`, который включает обновлённый
`production-migration-contract.test.mjs`, уже завершён `success`; lint также success.
Полный CI и whole-PR re-review намеренно оставлены следующей отдельной подзадачей по принятому
поэтапному процессу.


### PR #133 whole-PR re-review after ledger-hash correction — 2026-09-26

PR #133 заново проверен целиком на exact head
`45f6a9eef7eac98a43766831469417a225f3a080` относительно актуального
`main` `0d89e036ddc0bfce0cc966afb79a6ce8088e9cd2`.

Проверена вся текущая область PR: phase contract/tests, production privilege integration,
full 27-table schema manifest, defaults, constraints/indexes, five trigger functions, six critical
triggers, migration verifier, manifest verifier, CI/production workflows и source-of-truth docs.
Также отдельно подтверждено, что после предыдущего reviewed head изменения затронули только
ledger-contract/tests/verifier и соответствующую terminology в docs.

Ledger-hash correction соответствует exact Drizzle ORM `0.45.2` contract: expected hash —
SHA-256 полного raw migration SQL contents; target `drizzle.__drizzle_migrations` проверяется по
`created_at + hash`. Preflight принимает только exact known-applied prefix, postflight —
exact complete history; wrong/missing hash при неизменном timestamp покрыт pure tests.

Full schema manifest остаётся согласован с `0020_snapshot.json`: 27 public tables / 202 columns,
42 defaults, 27 PK, 12 unique constraints, 26 FK, 94 checks, 13 non-constraint indexes,
5 trigger functions и 6 critical triggers; `PENDING` hashes отсутствуют. CI manifest parity
против clean PostgreSQL 17 успешен.

Final CI run `36262562947` на exact head полностью successful:
- `checks`: history/script tests, lint, typecheck, tests, build, migration metadata и Drizzle
  schema parity — success;
- `database`: clean PostgreSQL 17 migration/integration suite, production schema manifest parity,
  Workers build и local Hyperdrive smoke — success.

Новых current-Stage defects, source-of-truth contradictions или scope expansion в полном re-review
не обнаружено. Ранее согласованные findings (defaults, triggers/functions, docs, ledger hash)
закрыты. PR #133 открыт, mergeable и по текущему техническому циклу готов к merge пользователем.
Production migration workflow этим выводом не запускается и остаётся отдельной external mutation,
требующей явного разрешения пользователя.


### PR #133 merged; handoff back to Codex — 2026-09-26

PR #133 merged в `main` как
`53181e30253061614c43f6b1682eaa0ec958e2d3`. Merge verified read-only через GitHub:
PR #133 closed/merged, current `main` указывает на этот merge commit.

Repository source-of-truth на новом `main` теперь содержит phase-aware production migration
verifier, exact `created_at + Drizzle SHA-256 hash` ledger validation и full `0000`–`0020`
schema manifest boundary. Pending external migrations `0004`–`0020` всё ещё не применялись;
production migration workflow не запускался.

PR #121 на момент проверки ещё заканчивается pre-merge finding про ledger hash validation и не
содержит финальный post-fix review/merge state. По действующему AGENTS.md Codex остаётся primary
technical lead и определяет порядок следующей Stage 6 работы. Поэтому после merge PR #133
ChatGPT не запускает production migration и не выбирает следующий external mutation самостоятельно;
следующий шаг передан обратно Codex для фиксации актуального Stage 6 action.


### Production migration authorization received — 2026-09-26

Пользователь дал отдельное явное разрешение на один manual dispatch workflow
`Production database migration` для exact `main`
`53181e30253061614c43f6b1682eaa0ec958e2d3`.

Перед запуском повторно проверено:
- current GitHub `main` всё ещё exact
  `53181e30253061614c43f6b1682eaa0ec958e2d3`;
- актуальный workflow `.github/workflows/production-db-migrate.yml` по-прежнему
  `workflow_dispatch`, main-only, Environment `production-db`, с preflight → `db:migrate`
  → postflight → bounded evidence;
- разрешение не распространяется на Worker deploy, runtime roles/grants, Hyperdrive bindings
  или иные external mutations.

Ограничение текущего ChatGPT GitHub connector: доступные actions позволяют читать workflow runs/jobs
и повторно запускать существующие failed jobs, но не создают новый `workflow_dispatch`.
Поэтому сам initial dispatch из этой сессии выполнить невозможно без ручного запуска пользователем.
После ручного запуска ChatGPT должен immediately read run/job/step state и продолжить только по
фактическому результату; при failure никакого retry без отдельной диагностики.


### Production migration run #36265351353 failed before pending schema — root cause diagnosed

Authorized manual workflow run `36265351353` executed on exact approved `main`
`53181e30253061614c43f6b1682eaa0ec958e2d3` and completed `failure`.

Observed workflow result:
- metadata validation: success;
- production preflight: success;
- `pnpm db:migrate`: failure;
- postflight/evidence: skipped;
- no retry was performed.

Read-only production diagnostics after the failure confirm:
- Drizzle ledger remains exactly four rows / `0000`–`0003`; no pending ledger entry exists;
- public application tables remain the eight baseline tables only; no forum/authz/translation-task
  tables from `0004+` exist;
- no stray public functions exist;
- existing UI constraints required by later migrations are present;
- `vico_forum_migrator` owns the Drizzle schema/table/sequence, can write the ledger, has
  `CREATE` on schema `public`, and can use `plpgsql`;
- crucially, `vico_forum_migrator` has **no database-level `CREATE` privilege** on
  `vico_forum`.

The root cause is the pinned Drizzle migrator bootstrap itself, before any pending migration SQL:
`drizzle-orm 0.45.2` `PgDialect.migrate()` unconditionally executes

`CREATE SCHEMA IF NOT EXISTS <migrationsSchema>`

before checking the existing migration table/history. PostgreSQL 17 documents that invoking
`CREATE SCHEMA` requires `CREATE` privilege on the current database. The dedicated migrator
intentionally lacks that privilege, so `drizzle-kit migrate` (which delegates to the same
`drizzle-orm/node-postgres` migrator) fails at bootstrap even though the existing `drizzle`
schema is already owned by the migrator.

This is a **current Stage 6 rollout defect**, not future hardening: the reviewed production workflow
cannot apply any pending migration with the current least-privilege role. The failed run did not
reach `0004` and left the target schema/ledger at the pre-run `0000`–`0003` state.

No grant, manual DDL, retry, or workflow rerun has been performed. Remediation requires technical
agreement because granting database-level `CREATE` would broaden the migrator capability, while
changing the migration execution/bootstrap boundary may preserve tighter least privilege. Hand back
to Codex for the next reviewed repository/infrastructure step before any further production write.


### Capability-verifier PR #134 created — 2026-09-26

По зафиксированному Codex contract создан отдельный mergeable PR #134
`Verify production migrator database CREATE capability`.

Base: exact `main` `53181e30253061614c43f6b1682eaa0ec958e2d3`.
Current head: `1da7025de717721aafb3309882cb12eec9e70b36`.

Scope PR:
- production privilege snapshot теперь читает explicit current-database ACL через
  `pg_database.datacl -> aclexplode`;
- contract требует ровно один direct non-grantable `CREATE` ACL для exact application
  owner/migrator;
- database `CREATE` для localization runtime и `PUBLIC` rejected;
- unit coverage включает missing, grantable, wrong-grantee, PUBLIC и runtime cases;
- existing manual migration identity verifier сохраняет exact
  `current_user = vico_forum_migrator` и `BEGIN READ ONLY`, дополнительно fail closed требует
  `has_database_privilege(current_user, current_database(), 'CREATE') = true`;
- identity tests покрывают true и malformed/false capability results;
- identity workflow step переименован в identity+capability, external behavior остаётся
  manual/read-only;
- `PROJECT_STATE.md`, `docs/database/MIGRATIONS.md` и H-004 в `PROJECT_HISTORY.md`
  фиксируют failed run `36265351353`, неизменный target `0000`–`0003`, требуемую database
  CREATE capability и отсутствие выполненного GRANT/retry.

PostgreSQL 17 contract перепроверен по official docs: database `CREATE` разрешает создание
schemas; `CREATE SCHEMA` требует `CREATE` privilege на current database; ACL
`aclexplode` предоставляет grantee/privilege/is_grantable, поэтому direct non-grantable grant
проверяется по explicit database ACL, а identity workflow отдельно проверяет effective capability.

Read-only production check подтвердил текущий pre-grant ACL: database owner и Neon service role
имеют CREATE, `vico_forum_migrator` и `vico_forum_runtime` — нет. Exact SQL reader из PR
также проверен read-only против target и возвращает ожидаемые explicit CREATE ACL rows.

PR #134 открыт и GitHub reports mergeable=true. CI run `36266569855` на exact head полностью
успешен: `checks=success`, `database=success`, включая updated repository-script tests.

Никаких `GRANT`, production migration retry, identity workflow dispatch, deploy или иных
external mutations не выполнялось. Последний Production database migration run остаётся
`36265351353` с conclusion=failure.

Следующий шаг по AGENTS.md — независимый whole-PR review Codex для PR #134.


### PR #134 documentation correction and full re-review — 2026-09-26

Проверено последнее обновление Codex PR #121. Единственное подтверждённое finding к PR #134:
`PROJECT_STATE.md` не должен хранить historical run ID и exact commit SHA, поскольку сам файл
фиксирует только current state/constraints/route, а historical identifiers принадлежат
`PROJECT_HISTORY.md`.

Исправление выполнено строго в указанном scope:
- между reviewed head `1da7025de717721aafb3309882cb12eec9e70b36` и новым head
  `8409d770c791bf24a774a2d315baa8d792f3ad86` изменён только `PROJECT_STATE.md`;
- exact run `36265351353` и SHA `53181e30253061614c43f6b1682eaa0ec958e2d3`
  удалены из `PROJECT_STATE.md`;
- current operational facts сохранены: первый разрешённый migration attempt прошёл
  metadata/preflight, остановился до pending SQL из-за отсутствующей database CREATE capability,
  target остался на `0000`–`0003`, retry не выполнялся;
- exact historical run/SHA сохранены в H-004 `PROJECT_HISTORY.md`;
- другие файлы PR #134 этим correction commit не менялись.

После correction PR #134 заново проверен целиком на exact head
`8409d770c791bf24a774a2d315baa8d792f3ad86` относительно current
`main` `53181e30253061614c43f6b1682eaa0ec958e2d3`.

Повторно проверены все восемь changed files:
- production privilege snapshot/contract читает explicit current-database CREATE ACL и требует
  direct non-grantable CREATE для application owner/migrator;
- database CREATE для localization runtime и PUBLIC rejected;
- tests покрывают missing/grantable/wrong-grantee/runtime/PUBLIC cases;
- manual identity verifier сохраняет exact role assertion, bounded timeouts и READ ONLY transaction,
  дополнительно требует effective current-database CREATE;
- identity tests покрывают true и false/malformed capability;
- workflow остаётся manual/read-only и не выполняет provisioning;
- PROJECT_STATE/MIGRATIONS/HISTORY согласованы по current-state vs history boundary.

Новых current-Stage defects, source-of-truth contradictions или scope expansion в full re-review
не обнаружено. PR #134 открыт и GitHub reports `mergeable=true`.

Final CI run `36267143358` на exact head завершён полностью `success`:
- `checks`: repository-script tests, lint, typecheck, tests, build, migration metadata и
  Drizzle schema parity — success;
- `database`: clean PostgreSQL 17 migrations/constraints, production schema manifest parity,
  Workers build и local Hyperdrive smoke — success.

Никаких GRANT, manual identity workflow dispatch, production migration retry или deployment
не выполнялось.

Следующий шаг по review cycle — вернуть исправленный exact head Codex для подтверждения закрытия
его documentation finding и финального технического статуса PR #134.


### Bounded database CREATE capability gate — grant completed, identity workflow pending

Проверено последнее обновление Codex PR #121. Current `main` перед gate:
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa` (merge PR #134). Capability-verifier contract
и current `PROJECT_STATE.md` / `ROADMAP.md` / `docs/database/MIGRATIONS.md` перечитаны.

Пользователь явно разрешил только один bounded external change:
`GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator`, без grant option.

Pre-grant read-only check:
- current database = `vico_forum`;
- execution/session role = exact database owner `vico_forum_owner`;
- database owner = `vico_forum_owner`;
- `vico_forum_migrator` существует;
- migrator effective database CREATE = false;
- localization runtime effective database CREATE = false;
- explicit database CREATE ACL до изменения содержал только owner и Neon service role;
  migrator/runtime/PUBLIC direct CREATE отсутствовал.

Выполнена ровно одна разрешённая mutation:
`GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator`.

Post-grant read-only check:
- migrator effective database CREATE = true;
- direct CREATE ACL rows for migrator = exactly 1;
- migrator `is_grantable = false`;
- grantor = `vico_forum_owner`;
- localization runtime effective CREATE = false;
- direct CREATE rows for runtime/PUBLIC = 0;
- других grants, ownership/membership/schema/table ACL changes не выполнялось.

После grant current GitHub `main` повторно проверен и остаётся exact
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`.
Current `.github/workflows/production-db-identity.yml` на этом main содержит manual
`workflow_dispatch` и exact read-only identity+effective-CREATE verifier из PR #134.

Ограничение текущего GitHub connector: доступные actions поддерживают чтение workflow
runs/jobs и rerun существующих runs/jobs, но не создают новый `workflow_dispatch`.
Последний identity workflow run остаётся старым successful run на pre-#134 SHA; его rerun
не подходит, потому что contract требует current merged main.

Поэтому gate остановлен строго перед manual identity/capability dispatch. Production migration
retry, deployment, дополнительные GRANT/DDL и другие external mutations не выполнялись.

Следующее единственное пользовательское действие: вручную dispatch
`Production database identity verification` на branch `main`. После запуска ChatGPT должен
прочитать run/job/step evidence и при любом mismatch/failure остановиться без retry.


### Bounded database CREATE capability gate — completed successfully

User-authorized bounded capability gate завершён на current merged `main`
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`.

External mutation выполнена ровно одна:
`GRANT CREATE ON DATABASE vico_forum TO vico_forum_migrator`.

Pre-grant evidence:
- exact database `vico_forum`;
- execution/session role и database owner = `vico_forum_owner`;
- `vico_forum_migrator` existed and had effective database CREATE=false;
- localization runtime had effective database CREATE=false;
- no direct CREATE ACL for migrator/runtime/PUBLIC.

Post-grant evidence:
- migrator effective database CREATE=true;
- exactly one direct CREATE ACL row for `vico_forum_migrator`;
- `is_grantable=false`;
- grantor=`vico_forum_owner`;
- localization runtime effective CREATE=false;
- direct CREATE rows for runtime/PUBLIC = 0.

Manual read-only workflow evidence:
- workflow: `Production database identity verification`;
- run ID: `36268723861`;
- exact head SHA: `4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`;
- attempt: 1;
- job `Verify production migration identity` = success;
- step `Verify dedicated migration identity and capability` = success;
- log evidence: `Migration database identity and CREATE capability verified: vico_forum_migrator`.

Final read-only DB recheck after workflow remained consistent:
- migrator effective CREATE=true;
- exactly one direct non-grantable CREATE ACL;
- runtime effective CREATE=false;
- runtime/PUBLIC direct CREATE rows=0.

Recent manual Actions runs confirm no new `Production database migration` dispatch occurred after
the earlier failed run. No production migration retry, deployment, additional grant, ownership,
membership, schema/table ACL or credential change was performed.

Bounded database capability gate therefore completed successfully. Per Codex coordination contract,
next Stage 6 action must be determined in PR #121 before any migration retry or other external
mutation.


### Evidence-sync PR #135 created — 2026-09-26

Проверено последнее обновление Codex PR #121. По зафиксированному scope создан отдельный
mergeable PR #135 `Sync Stage 6 database capability evidence`.

Base/current `main` на момент создания:
`4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`.

PR head:
`e59bfc79dfde7c57c6200218a93ccfbbb7d67e28`.

Changed files ровно три:
- `PROJECT_STATE.md`;
- `PROJECT_HISTORY.md`;
- `docs/database/MIGRATIONS.md`.

Синхронизировано:
- `PROJECT_STATE.md`: устаревшие pre-grant facts заменены текущим state — bounded direct
  non-grantable database CREATE capability предоставлена dedicated migrator и подтверждена
  successful manual read-only identity/capability workflow; runtime/PUBLIC capability не получили;
  pending `0004`–`0020` остаются неприменёнными; ближайший route теперь требует после merge
  evidence-sync отдельной Codex-сверки и отдельного явного user authorization перед новым
  production migration dispatch. Historical run ID/SHA в PROJECT_STATE не добавлялись.
- `PROJECT_HISTORY.md`: зафиксированы exact bounded grant boundary, workflow run
  `36268723861`, attempt 1, exact SHA
  `4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`, successful exact-role/effective-CREATE evidence
  и отсутствие production migration retry.
- `docs/database/MIGRATIONS.md`: current production migration contract синхронизирован с
  фактически полученной direct non-grantable CREATE capability и successful read-only
  identity/capability evidence; capability workflow явно не считается migration→runtime evidence;
  pending `0004`–`0020` всё ещё не применены и новый migration dispatch требует отдельного
  явного разрешения.

`.github/runtime-migration-evidence.json` не изменён: blob SHA остался
`60d0667a78d2d6810fd9775785dc8366d59870c0`, baseline остаётся
`0002_ui_translation_storage`.

GitHub reports PR #135 open и `mergeable=true`; diff относительно base содержит только эти
три documentation files. CI run `36269482706` стартовал автоматически и на момент этой записи
ещё выполняется.

Никаких migration/migration retry, GRANT, deploy или других external mutations в рамках этого
evidence-sync PR не выполнялось.

Следующий шаг по review cycle — независимая полная проверка PR #135 Codex; merge выполняет
пользователь только после завершения review/CI.


Follow-up: CI run `36269482706` on exact PR #135 head
`e59bfc79dfde7c57c6200218a93ccfbbb7d67e28` завершён `success`. PR остаётся open и
`mergeable=true`.


### Production migration dispatch authorization — pre-dispatch verification complete

User explicitly authorized exactly one **new** manual dispatch of
`Production database migration` on exact `main`
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`. This authorization is not a rerun of failed
run `36265351353`.

Before dispatch, current project/regulatory state was re-read:
- current `main` = exact authorized SHA
  `b172264e4b0db1fe68dead7d7f25b49a573eb0cd`;
- current `.github/workflows/production-db-migrate.yml` blob =
  `48c63ca6fedc845e48fe541e6e31e5a6ade30f44`;
- that workflow blob is unchanged from pre-evidence-sync main
  `4c709d5aa82f6e93ddbad672afc10ad94c5e2efa`;
- workflow remains manual `workflow_dispatch`, main-only, protected `production-db`
  Environment, with metadata validation → fail-closed preflight → `db:migrate` → postflight
  → bounded runtime-evidence summary;
- latest existing production migration run remains failed run `36265351353`; no migration run
  exists yet for authorized SHA.

Current ChatGPT GitHub connector still exposes workflow reads/jobs/logs and rerun of existing
runs/jobs, but **does not expose creation of a new workflow_dispatch**. Using rerun APIs would
violate the user's explicit requirement that this be a new dispatch, not rerun of the old run.

Therefore execution is stopped safely **before** dispatch. No migration, manual SQL, additional
grant, deploy, or other external operation has been performed in this authorization step.

Required next action is one manual GitHub UI dispatch by the user:
`Actions → Production database migration → Run workflow → main → Run workflow`.
After that ChatGPT will inspect the new run, verify exact head SHA/attempt and all step conclusions,
extract bounded migration evidence, and stop without retry/manual repair on any failure.


### Production database migration run completed successfully — 2026-09-26

User-authorized **new** manual dispatch completed successfully.

Workflow evidence:
- workflow: `Production database migration`;
- run ID: `36270353184`;
- run attempt: `1`;
- event: `workflow_dispatch`;
- branch: `main`;
- exact head SHA: `b172264e4b0db1fe68dead7d7f25b49a573eb0cd`;
- overall status/conclusion: `completed / success`;
- job `Migrate production database`: `completed / success`.

All job steps on attempt 1 completed successfully:
1. `Set up job` — success;
2. `Run actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` — success;
3. `Run pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1` — success;
4. `Run actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38` — success;
5. `Run pnpm install --frozen-lockfile` — success;
6. `Validate migration metadata` — success;
7. `Verify production migration preflight` — success;
8. `Apply migrations` — success;
9. `Verify production database` — success;
10. `Emit runtime evidence` — success;
18. setup-node post step — success;
19. pnpm/action-setup post step — success;
20. checkout post step — success;
21. `Complete job` — success.

Relevant job-log evidence:
- Drizzle reported `migrations applied successfully!`;
- postflight reported
  `Production database post-migration schema and privilege verification passed.`;
- bounded evidence step wrote the workflow summary for this run/head.

Migration evidence emitted by the workflow contract:
```json
{"workflowRunId":36270353184,"migrationSha":"b172264e4b0db1fe68dead7d7f25b49a573eb0cd","journalSha256":"35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9"}
```

The journal SHA-256 was independently recomputed from exact
`drizzle/meta/_journal.json` at the workflow head. The same computation was cross-checked against
the previously repository-owned accepted evidence revision and reproduced its known journal hash,
confirming the hashing path. The checked-in journal newest entry at this head is
`0020_translation_generation_permission`, and successful postflight required exact complete
timestamp+hash ledger plus the full `0000`–`0020` schema/privilege manifest.

This was a new dispatch, not a rerun of failed run `36265351353`.
No retry, manual SQL, additional GRANT, deployment, Hyperdrive/runtime grant, OAuth/bootstrap,
Queue/provider operation or other external Stage 6 mutation was performed after the successful
workflow.

Repository-owned `.github/runtime-migration-evidence.json` was not modified by this operational
run and must not be treated as updated until a separate reviewed repository change is explicitly
created and merged. Next Stage 6 action returns to Codex coordination.


### Codex follow-up after successful production migration — next Stage 6 scope confirmed

Latest Codex service-channel update on PR #121 was checked at head
`f24a55deb8c5bb6748ce218297ca52956839f808`.

Codex independently verified the authorized production migration run
`36270353184`, attempt 1, on exact `main`
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd` as successful. The accepted target now has the
complete `0000`–`0020` migration ledger/schema contract, with bounded evidence:

```json
{"workflowRunId":36270353184,"migrationSha":"b172264e4b0db1fe68dead7d7f25b49a573eb0cd","journalSha256":"35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9","requiredMigrationTag":"0020_translation_generation_permission"}
```

Codex-defined next safe task is a separate mergeable migration-evidence PR from current `main`
with exactly this scope:
- update `.github/runtime-migration-evidence.json` to the bounded evidence above;
- update `PROJECT_STATE.md` to current accepted `0000`–`0020` migration/evidence state without
  duplicating historical run/SHA and without claiming runtime rollout;
- update `PROJECT_HISTORY.md` with exact run/attempt/SHA/journal hash, successful
  preflight/migration/postflight, and absence of other external operations;
- update `docs/database/MIGRATIONS.md` so accepted production evidence covers `0020` while
  remaining distinct from runtime deployment;
- do not change migration SQL, verifier/workflows, application code or dependencies;
- perform no external mutation.

CI for that PR must exercise the repository evidence verifier against the GitHub run and exact
journal ancestry. After independent whole-PR review and merge, Codex will determine the next
runtime capability/bootstrap gate.

Per the project decomposition rule, execution stops here after confirming and recording the next
scope. The mergeable evidence PR has not yet been created.


### Migration-evidence PR #136 created and verified — 2026-09-26

Latest Codex service-channel instruction from PR #121 was executed through the mergeable
repository-change boundary.

Created PR #136 `Sync accepted Stage 6 migration evidence` from exact unchanged `main`
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`.

PR head:
`412ef3720577c27bfd990b5fef6fd2b32141a157`.

Changed files are exactly the agreed four:
- `.github/runtime-migration-evidence.json`;
- `PROJECT_STATE.md`;
- `PROJECT_HISTORY.md`;
- `docs/database/MIGRATIONS.md`.

Recorded repository-owned evidence:
- workflow run `36270353184`;
- attempt `1`;
- migration SHA `b172264e4b0db1fe68dead7d7f25b49a573eb0cd`;
- journal SHA-256
  `35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9`;
- required migration tag `0020_translation_generation_permission`.

The production workflow evidence was re-read through GitHub:
- workflow path = exact `.github/workflows/production-db-migrate.yml`;
- event = `workflow_dispatch`;
- branch = `main`;
- head SHA = exact evidence migration SHA;
- run attempt = 1;
- status/conclusion = `completed / success`;
- metadata validation, preflight, `Apply migrations`, postflight and evidence-emission steps
  are all successful.

Journal identity was independently rechecked from exact workflow-head
`drizzle/meta/_journal.json`: SHA-256 recomputes to the recorded
`35f6817042e73655bc965ed26fa729c177f99fbb10903934b1958e78420c32c9`, the journal contains
21 entries and ends at `0020_translation_generation_permission`.

Git ancestry was rechecked: PR #136 is exactly four commits ahead of migration SHA
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`, zero commits behind, and that SHA is the merge
base, so the evidence migration revision is an ancestor of the PR head. The PR does not modify
the Drizzle journal.

Full PR diff was reviewed against the source-of-truth documents. It contains no migration SQL,
workflow/verifier, application-code or dependency changes and keeps schema acceptance distinct
from runtime deployment.

PR CI run `36272112776` on exact head
`412ef3720577c27bfd990b5fef6fd2b32141a157` completed `success`:
- `checks` = success, including repository migration/evidence contract tests, lint, typecheck,
  tests, build, migration metadata and Drizzle schema parity;
- `database` = success, including clean PostgreSQL 17 migration/constraint suite, production
  schema manifest parity, Workers build and local Hyperdrive smoke.

Current GitHub `main` remains exact
`b172264e4b0db1fe68dead7d7f25b49a573eb0cd`; PR #136 is open and mergeable.

No external migration, retry, manual SQL, GRANT, deployment, runtime provisioning,
OAuth/bootstrap or Queue/provider operation was performed by this PR.

Next review-cycle action is a neutral independent whole-PR review by Codex of PR #136. Per the
technical-agreement protocol, any ChatGPT-only possible review observations remain unshared until
that independent Codex review is complete.


### Post-migration repository-only runtime capability audit — 2026-09-27

Последнее обновление Codex service PR #121 проверено на head
`05437b396217b8cd3e73b7ee6ccaff205e37d370`. Current GitHub `main` после merge PR #136 —
exact `61b9e809cb39d2f554bf052e00d0bf6f0f66ec53`.

Scope этой подзадачи ограничен repository-only audit. Код/config/dependencies не менялись,
Neon/Cloudflare/OAuth/Queue/provider/deploy mutations не выполнялись.

#### Проверенные source-of-truth и external contracts

Сверены текущие `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`docs/database/MIGRATIONS.md`, `docs/database/HYPERDRIVE.md`,
`docs/auth/AUTHORIZATION.md`, translation contracts и production DB/runtime entrypoints.

Актуальные primary contracts дополнительно проверены:
- PostgreSQL 17 privileges:
  https://www.postgresql.org/docs/17/ddl-priv.html
- PostgreSQL 17 trigger contract:
  https://www.postgresql.org/docs/17/sql-createtrigger.html
- Cloudflare Hyperdrive binding / caching / pooling:
  https://developers.cloudflare.com/hyperdrive/get-started/
  https://developers.cloudflare.com/hyperdrive/concepts/query-caching/
  https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/
- Cloudflare Worker Previews:
  https://developers.cloudflare.com/workers/previews/
  https://developers.cloudflare.com/workers/previews/configuration/
- Better Auth pinned `1.7.4` release/source and Drizzle adapter:
  https://github.com/better-auth/better-auth/releases/tag/v1.7.4
  source tag `v1.7.4`, `packages/drizzle-adapter/src/drizzle-adapter.ts`.

Relevant verified platform facts:
- PostgreSQL row-locking `SELECT ... FOR UPDATE/SHARE` requires `SELECT` plus `UPDATE`
  privilege on at least one column of the locked relation.
- Target `0020` schema has no sequences. No runtime sequence `USAGE` grant is required by the
  checked-in schema.
- Hyperdrive supports multiple bindings/configurations; reads requiring fresh auth/session/
  permission/read-after-write state should use cache-disabled Hyperdrive.
- current Worker Previews require Wrangler >= `4.135.0`; project is pinned to `4.130.0`.
- Queue consumers cannot target Worker Previews under the current Cloudflare Preview model.

#### 1. Actual repository runtime topology

Current `wrangler.jsonc` contains exactly one DB binding:
`HYPERDRIVE -> aa1fb9feeff44a23ae12d88eefceb942`.

`workers/app.ts` has only a `fetch` handler. It currently passes the same
`env.HYPERDRIVE.connectionString` into:
- Better Auth;
- forum reader/writer;
- authorization resolver/management;
- locale registry/UI translation reads;
- persisted content-translation reads;
- content-generation status reader.

The Worker does **not** currently expose a Queue consumer or scheduled reconciliation handler, and
Wrangler contains no Queue producer/consumer binding.

Authenticated content generation is also explicitly disabled in production composition through
`DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`. Therefore task planning/enqueue writes and
generation-status polling are not part of the currently executable Worker request path.

Existing Stage 6 control-plane evidence remains:
- production `HYPERDRIVE` connects through `vico_forum_runtime`;
- that role is localization read-only;
- Hyperdrive is cache-disabled;
- Preview Base has no connected production DB binding;
- native Cloudflare Git auto-deploy for active `main` is disabled.

Conclusion from repository + recorded control-plane evidence: current `main` cannot be deployed
as a real forum/auth candidate while all DB adapters continue to use the existing single
localization-only credential. A new runtime binding boundary is required before deployed forum/auth
smoke.

#### 2. Exact current request-path DB capability matrix

This matrix describes the **currently executable fetch path with generation still disabled**.

##### Existing localization capability — unchanged

| Operation | Relations | Required table privileges |
| --- | --- | --- |
| locale registry read | `locales` | SELECT |
| persisted UI translation read | `ui_translations` | SELECT |
| persisted UI bundle read | `ui_translation_bundles` | SELECT |

Existing role invariants remain: LOGIN; `public` USAGE only; no schema/database CREATE; no
ownership/memberships/grant options; no unrelated relation privileges.

##### New web capability required for forum/auth deployment

**Better Auth `1.7.4` domain**

The configured adapter schema contains exactly
`user`, `session`, `account`, `verification`, `rate_limit`.
The pinned Drizzle adapter implements generic create/find/update/delete/consume operations and
database rate limiting uses the configured `rate_limit` model. For the library-owned
`/api/auth/*` boundary the practical domain-level ACL is:

| Relations | Privileges |
| --- | --- |
| `user`, `session`, `account`, `verification`, `rate_limit` | SELECT, INSERT, UPDATE, DELETE |

This is intentionally a Better-Auth-domain grant rather than an unverified endpoint-by-endpoint
subset.

**Forum domain**

| Operation | Relations | Privileges |
| --- | --- | --- |
| public hierarchy/topic reads | `forum_categories`, `forum_sections` | SELECT |
| topic/reply/solution current-state read/write | `forum_topics`, `forum_posts` | SELECT, INSERT, UPDATE |
| immutable title/body revision read/create | `forum_topic_title_revisions`, `forum_post_revisions` | SELECT, INSERT |
| forum per-author cooldown mutex | `user` | SELECT + UPDATE required by `FOR UPDATE` |
| persisted content presentation | `forum_topic_title_translations`, `forum_post_body_translations` | SELECT |

No current Worker route requires forum DELETE/TRUNCATE/REFERENCES/TRIGGER privilege.
Repository methods that create categories/sections exist, but no current Worker action exposes
them; runtime INSERT on those tables is therefore not required by the present request path.

**Dynamic authorization domain**

| Relation | Current repository operations | Privileges |
| --- | --- | --- |
| `authz_roles` | read/create/rename/delete custom role | SELECT, INSERT, UPDATE, DELETE |
| `authz_role_permissions` | read/replace grants | SELECT, INSERT, DELETE |
| `authz_user_roles` | read/upsert assignment | SELECT, INSERT, UPDATE |
| `authz_user_permission_overrides` | read/upsert/delete override | SELECT, INSERT, UPDATE, DELETE |
| `authz_mutation_lock` | lock/read/update bootstrap marker | SELECT, UPDATE |
| `user` | resolve/list users and count managers | SELECT |
| `authz_permissions` | no direct current repository query | **no direct runtime table grant required** |

The `authz_mutation_lock FOR UPDATE` requirement is already covered by UPDATE.
The `authz_protect_role_identity` trigger introduces no additional relation access beyond
`authz_roles`.

**Correction to the earlier provisional web matrix in this service channel:** direct SELECT on
`authz_permissions` is not used by current authorization code; the permission universe is
code-backed. Also, task/status relations do not belong in the immediate web ACL while content
generation remains disabled.

#### 3. Generation-planning capability if/when the current request action is enabled

This is implemented code but **not currently wired** in the production Worker. If Stage 6 later
enables the existing request-side planner, the web capability must additionally gain:

| Relation | Required privileges / reason |
| --- | --- |
| `translation_tasks` | SELECT, INSERT, UPDATE |
| `translation_task_generation_heads` | SELECT, INSERT, UPDATE; generation head is row-locked |
| `content_topic_title_translation_tasks` | SELECT, INSERT |
| `content_post_body_translation_tasks` | SELECT, INSERT |
| `content_translation_request_budget_counters` | SELECT, INSERT, UPDATE |
| `forum_topics`, `forum_posts` | SELECT + UPDATE because planners lock current rows |
| `forum_topic_title_revisions`, `forum_post_revisions` | SELECT + UPDATE because planners lock revisions |
| `forum_topic_title_translations`, `forum_post_body_translations` | SELECT + UPDATE because current translation rows are read `FOR UPDATE` |

This is a material privilege expansion. It should not be granted as part of the immediate
forum/auth runtime provisioning while generation is still disabled.

The deferred content-binding trigger on `translation_tasks` reads the matching content task
metadata at transaction commit, so content task DML also relies on SELECT access to the
corresponding metadata table.

#### 4. Background translation execution/publication capability

The code exists in repository/local-CI but there is currently no deployed Queue consumer. A future
background execution role, if one role serves UI + content jobs, needs the union below.

**Task lifecycle / allowance / retry**
- `translation_tasks`: SELECT, UPDATE;
- `translation_task_generation_heads`: SELECT + UPDATE because generation rows are locked;
- `content_topic_title_translation_tasks`,
  `content_post_body_translation_tasks`: SELECT.

**UI translation publication**
- `ui_translations`: SELECT, INSERT, UPDATE;
- `ui_translation_bundles`: INSERT, UPDATE;
- `translation_tasks`: UPDATE;
- `translation_task_generation_heads`: SELECT + UPDATE for namespace/head locking.

**Topic-title content execution/publication**
- `forum_topics`: SELECT + UPDATE for current-row lock;
- `forum_topic_title_revisions`: SELECT + UPDATE for `FOR SHARE`;
- `forum_topic_title_translations`: SELECT, INSERT, UPDATE;
- title task metadata + task/head tables as above.

**Post-body content execution/publication**
- `forum_posts`: SELECT + UPDATE for current-row lock;
- `forum_post_revisions`: SELECT + UPDATE for `FOR SHARE`;
- `forum_post_body_translations`: SELECT, INSERT, UPDATE;
- post task metadata + task/head tables as above.

The UPDATE privilege on immutable revision relations is required by PostgreSQL row-lock semantics,
not because application code updates revision content. Existing immutable-revision triggers still
reject actual UPDATE statements. This coupling must be represented honestly in the privilege
contract if the current locking design is kept.

No checked-in runtime path requires sequence grants. No application query directly invokes custom
stored functions. Trigger functions are existing schema objects and no runtime role needs
TRIGGER/CREATE privilege.

#### 5. Reconciliation / maintenance capability

Current reconciliation code uses durable task state:
- `translation_tasks`: SELECT, UPDATE for reserve/recovery/observability.

Request-budget cleanup additionally requires:
- `content_translation_request_budget_counters`: SELECT, UPDATE (row-lock requirement), DELETE.

Whether this maintenance path shares the background translation role or receives a smaller
separate role is an operational architecture choice; repository contracts do not currently decide
it.

Local `db:reconcile-ui-bundles` is explicitly disposable-`*_test` tooling and is not a
production runtime capability.

#### 6. Trigger side effects relevant to grants

Current `0020` manifest has these correctness-critical trigger classes:
- immutable forum revision UPDATE rejection;
- authorization built-in role identity protection;
- deferred content-task metadata binding checks;
- metadata-delete cleanup of matching translation task.

For currently planned operations:
- authz role UPDATE/DELETE fires only role-identity validation;
- content task INSERT/UPDATE fires deferred metadata-binding validation and therefore needs metadata
  SELECT;
- current runtime paths do not DELETE content task metadata, so the metadata-delete trigger's
  internal task DELETE does not add an immediate DELETE grant requirement;
- revision content is never updated by application logic, but row-locking still forces UPDATE
  privilege for future translation planning/execution roles.

#### 7. Runtime role/binding design options

These are audit-derived options, **not yet an architecture decision**.

**Option A — smallest meaningful pre-release split**
- keep existing localization read-only role/binding unchanged;
- add one cache-disabled **web runtime** role/binding for Better Auth + forum + authorization +
  persisted content presentation;
- keep generation disabled;
- add a separate **background translation** role/binding only when Queue/provider wiring is actually
  implemented; reconciliation may initially share that background role.

This requires only one new DB/Hyperdrive capability for the next forum/auth rollout and preserves a
real execution-boundary split between HTTP request handling and later background translation work.

**Option B — finer request-side split**
- separate Better Auth from forum/authorization, optionally split authorization again;
- bind multiple cache-disabled Hyperdrive configurations to the same Worker.

This narrows accidental cross-domain SQL access, but all bindings still exist in the same Worker
deployment and each Hyperdrive configuration maintains its own origin pool (current Cloudflare
minimum is 5 origin connections per config). The extra role/config count therefore has real
operational cost/complexity and does not isolate a full Worker compromise.

**Option C — one broad role for request + background**
- simplest ACL count but gives the public request Worker translation task/publication privileges
  before that execution path is needed.
- This removes the meaningful HTTP-vs-background boundary and is not required by current code.

The repository does not force a choice between A and B. The strongest current architectural
boundary is HTTP Worker vs future background worker; more granular splitting inside the same HTTP
Worker is an explicit complexity/security trade-off for Codex/user decision.

#### 8. Hyperdrive caching and binding consequences

Auth/session/permissions, task lifecycle, locks and read-after-write flows require fresh reads.
Current Cloudflare documentation explicitly recommends a cache-disabled Hyperdrive configuration
for authentication, sessions, permissions and read-after-write state.

Therefore any new web/background write-capable Hyperdrive candidate must be cache-disabled unless a
specific stale-tolerant read path is intentionally separated.

Multiple Hyperdrive bindings are supported. Binding names should express capability rather than
reuse one generic `HYPERDRIVE`; exact names and environment-specific role names are not chosen by
this audit.

#### 9. Preview/private-data boundary

Repository state:
- current `wrangler.jsonc` has only top-level production `HYPERDRIVE`;
- no repository `previews` block;
- pinned Wrangler is `4.130.0`;
- recorded control-plane preflight says Preview Base has no connected production DB binding and
  native Git auto-deploy is disabled.

Therefore there is **no currently evidenced Preview access to production private DB data**.

Before enabling write-capable previews, one of these must be chosen:
- keep preview DB capabilities disabled; or
- upgrade Wrangler to a version supporting current Worker Previews (current docs require >=
  `4.135.0`) and configure Preview-specific safe resources/bindings, never production DB
  credentials.

Cloudflare currently does not support Queue consumers targeting Worker Previews. Real background
Queue acceptance therefore needs either an isolated non-production Worker/Queue topology or no
Preview consumer path; this choice belongs to the later Queue Stage 6 task.

#### 10. Repository verifier/test changes needed before external provisioning

Current `production-privileges.mjs` models one localization `runtimeRole` and asserts exactly
three SELECT grants. It cannot yet prove the future multi-capability runtime topology.

A reviewed provisioning-prep PR should, before any Neon role/grant creation:

1. represent named runtime **capability contracts** separately from environment-specific role names;
2. make privilege snapshot/contract code accept multiple runtime roles and exact per-role ACL sets;
3. assert for every runtime role:
   - LOGIN as intended;
   - no SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS;
   - no memberships or object ownership;
   - public schema USAGE only, no CREATE;
   - no database CREATE;
   - no grant options;
   - no unexpected relation/column/sequence/function grants;
4. retain exact PUBLIC/default-ACL protections;
5. in disposable PostgreSQL 17 CI, create test roles, apply the proposed GRANT matrix and
   execute representative positive probes under each role, including the actual
   `FOR UPDATE/SHARE` statements that require UPDATE;
6. add negative probes proving forbidden cross-domain writes, DELETEs and DDL fail;
7. keep this runtime-capability verifier separate from the already completed schema migration
   workflow so a future schema migration does not depend on already provisioned runtime roles;
8. after external provisioning, run the same contract read-only against production before Worker
   deployment.

No reason was found to grant runtime roles schema CREATE, ownership, migration capability,
sequence privileges, TRIGGER or REFERENCES.

#### Audit conclusion / next technical decision

The immediate runtime provisioning boundary can be limited to **forum/auth web execution while
content generation remains disabled**. Translation task/planning/background write privileges are
not prerequisites for that first deployed forum/auth candidate.

The main technical choice Codex now needs to resolve is whether the first web runtime capability is
one domain-bounded role (Option A) or split further inside the same Worker (Option B), plus the
exact repository verifier representation for that choice.

No external mutation or mergeable implementation PR was created by this audit.


### Runtime privilege provisioning-preparation PR #137 — implementation + verification

Latest Codex service-channel decision from PR #121 was executed as a repository-only change.

Created mergeable PR #137 `Add Stage 6 runtime privilege verifier` from exact unchanged `main`
`61b9e809cb39d2f554bf052e00d0bf6f0f66ec53`.

Final PR head:
`5108799e4ad47f829ac6e9ff17b2ad945a384f77`.

Changed files are exactly nine:
- `.github/scripts/runtime-privileges.mjs`;
- `.github/scripts/runtime-privileges.test.mjs`;
- `.github/scripts/verify-production-runtime-privileges.mjs`;
- `.github/scripts/verify-runtime-privilege-probes.mjs`;
- `.github/workflows/ci.yml`;
- `.github/workflows/production-runtime-privileges.yml`;
- `PROJECT_STATE.md`;
- `docs/database/HYPERDRIVE.md`;
- `docs/database/MIGRATIONS.md`.

No migration SQL, Worker binding topology/runtime wiring, dependency, production role/grant,
Hyperdrive, deployment, OAuth, Queue/provider or other external mutation was performed.

#### Accepted repository contract implemented

Named capabilities are separate from environment-specific role names:
- existing `localization-read` keeps exact SELECT on
  `locales`, `ui_translations`, `ui_translation_bundles`;
- future `web` covers only current HTTP Better Auth/forum/dynamic-authorization/persisted
  content-presentation operations;
- content generation remains disabled, so web receives no
  `authz_permissions`, translation-task/generation-head/request-budget or UI-localization grants.

The exact web relation matrix matches the Codex-approved scope:
- Better Auth `user/session/account/verification/rate_limit`: SELECT/INSERT/UPDATE/DELETE;
- `forum_categories/forum_sections`: SELECT;
- `forum_topics/forum_posts`: SELECT/INSERT/UPDATE;
- immutable forum revision tables: SELECT/INSERT;
- persisted forum content translation tables: SELECT;
- `authz_roles`: SELECT/INSERT/UPDATE/DELETE;
- `authz_role_permissions`: SELECT/INSERT/DELETE;
- `authz_user_roles`: SELECT/INSERT/UPDATE;
- `authz_user_permission_overrides`: SELECT/INSERT/UPDATE/DELETE;
- `authz_mutation_lock`: SELECT/UPDATE.

Runtime role verifier now checks:
- distinct roles, LOGIN and effective database CONNECT;
- no dangerous role attributes;
- no effective/direct database CREATE;
- no inherited memberships, unsafe inbound memberships or runtime-owned
  schemas/tables/sequences/views/functions;
- exact public-schema USAGE for each runtime role, no schema CREATE;
- exact relation ACLs without grant options;
- no runtime column/direct-function/sequence/default grants;
- no PUBLIC relation/column/direct-function/database-CREATE privileges;
- PUBLIC schema USAGE may be present non-grantable or absent (both safe); any other PUBLIC schema
  privilege is rejected;
- only the already accepted hard-wired-equivalent PUBLIC function EXECUTE/type USAGE default
  semantics are tolerated.

The separate manual `Production runtime privilege verification` workflow is main-only and
read-only. It uses the existing protected `production-db` environment and
`NEON_MIGRATION_DATABASE_URL`, with existing `RUNTIME_DATABASE_ROLE` plus future
`WEB_RUNTIME_DATABASE_ROLE`. It is not coupled to production migration workflow and was not
dispatched in this task.

#### Review/CI defects found and corrected before acceptance

Three current-Stage verifier/test defects were found during PR verification:

1. Static ownership test changed `databaseOwnerRole` without isolating stale fixture
   memberships, so it failed on the wrong assertion. CI run `36301003628` and the initial
   automated Codex review independently identified the same problem. The candidate fixture now
   removes unrelated memberships before testing the database-owner invariant.

2. Clean PostgreSQL can have `pg_database.datacl IS NULL`; using
   `aclexplode('{}'::aclitem[])` fails because the empty ACL array is dimensionless. Runtime
   snapshot now uses effective database defaults through
   `acldefault('d', database.datdba)`.

3. Clean CI database has no PUBLIC schema ACL, while production baseline may expose non-grantable
   PUBLIC USAGE. Runtime verifier originally required PUBLIC USAGE unconditionally. It now accepts
   the stricter absent-PUBLIC-USAGE state or exact non-grantable public.USAGE, while rejecting
   CREATE/other PUBLIC schema privileges.

The initial automated Codex review also identified that LOGIN alone is insufficient for a
Hyperdrive origin identity when database CONNECT is revoked. The final verifier explicitly requires
effective database CONNECT for both runtime roles and has a negative unit case for its absence.

#### Final CI/evidence

Final CI run `36301325287` on exact head
`5108799e4ad47f829ac6e9ff17b2ad945a384f77` completed `success`.

`checks` = success:
- accepted migration-history/static contracts;
- runtime privilege unit contract;
- lint;
- typecheck;
- full tests;
- build;
- migration metadata;
- Drizzle schema parity.

`database` = success:
- clean PostgreSQL 17 migrations/integration suite;
- production schema manifest parity;
- **runtime privilege probes**;
- Workers build;
- local Hyperdrive smoke.

The runtime privilege probe creates disposable test runtime roles, applies the exact proposed ACL,
checks the catalog contract and executes representative positive operations/row locks plus negative
cross-domain, forbidden DELETE/immutable-update and DDL probes. The script refuses non-`*_test`
databases.

Final whole-PR self-review confirms:
- PR remains exactly 9 scoped files;
- base/main is still exact
  `61b9e809cb39d2f554bf052e00d0bf6f0f66ec53`;
- PR is open, non-draft and mergeable, zero commits behind main;
- no current-Stage issue remains from ChatGPT review;
- two automated Codex review comments were made against an earlier head; both findings have been
  addressed, but the latest final head has not yet received the required independent whole-PR
  Codex re-review.

Next review-cycle action: Codex independently re-review the complete current PR #137 at head
`5108799e4ad47f829ac6e9ff17b2ad945a384f77`. Merge remains user-controlled.


### Runtime database-ACL verifier correction PR #138 — implemented and verified

Latest Codex service-channel correction request from PR #121 was executed as a bounded
repository-only change from exact `main`
`01e74b5ddbe6f339acfe7e60a75d85592b422674`.

Created mergeable PR #138 `Correct Stage 6 runtime database ACL verification`.

Final PR head:
`2f35e41fd0da4aad4a9f549e73f7cb3a459f3c3f`.

Changed files are exactly five:
- `.github/scripts/runtime-privileges.mjs`;
- `.github/scripts/runtime-privileges.test.mjs`;
- `PROJECT_STATE.md`;
- `docs/database/HYPERDRIVE.md`;
- `docs/database/MIGRATIONS.md`.

No relation capability matrix, migration SQL, production migration workflow, Worker code,
dependency, production role/grant, workflow dispatch, Hyperdrive provisioning or deployment was
changed/performed.

#### Corrected database ACL contract

The previous runtime snapshot filtered `pg_database.datacl` to `CREATE` only, which could not
detect direct runtime `CONNECT WITH GRANT OPTION`, direct `TEMPORARY`, or other unexpected
database ACL rows.

The shared runtime verifier now:
- reads all ACL rows for both runtime roles and `PUBLIC`;
- preserves `datacl IS NULL` behavior with
  `aclexplode(COALESCE(datacl, acldefault('d', datdba)))`;
- still requires effective `CONNECT=true` for both runtime roles;
- still requires effective `CREATE=false` for both runtime roles;
- permits each runtime role only optional direct non-grantable `CONNECT`;
- rejects runtime direct `TEMPORARY`, `CREATE`, grantable `CONNECT`, grant options and any
  unexpected database privilege;
- permits `PUBLIC` only non-grantable hard-wired-equivalent `CONNECT` /
  `TEMPORARY` or their absence;
- rejects `PUBLIC CREATE`, grant options and any unexpected database privilege.

The production read-only workflow and disposable PostgreSQL probe already consume this shared
snapshot/assertion path, so no workflow or probe wiring change was needed.

Unit coverage now explicitly includes:
- allowed direct non-grantable runtime CONNECT;
- grantable runtime CONNECT rejection;
- runtime TEMPORARY rejection;
- direct/effective runtime CREATE rejection;
- allowed hard-wired-equivalent PUBLIC CONNECT/TEMPORARY or absence;
- PUBLIC grantable CONNECT/TEMPORARY, CREATE and unexpected privilege rejection;
- snapshot query preservation of the `datacl IS NULL -> acldefault('d', datdba)` path and removal
  of the old CREATE-only filter.

#### CI / re-review evidence

GitHub CI run `36302230154` on exact head
`2f35e41fd0da4aad4a9f549e73f7cb3a459f3c3f` completed `success`.

`checks` = success:
- accepted migration-history/static contract tests;
- runtime privilege unit tests;
- lint;
- typecheck;
- full tests;
- build;
- migration metadata;
- Drizzle schema parity.

`database` = success:
- clean PostgreSQL 17 migration/integration suite;
- production schema manifest parity;
- corrected **runtime privilege probes**;
- Workers build;
- local Hyperdrive smoke.

Full current-head diff review confirms:
- exact scope remains five agreed files;
- PR base is exact current `main`
  `01e74b5ddbe6f339acfe7e60a75d85592b422674`;
- PR is open, non-draft and mergeable;
- current `main` has not moved;
- docs/state describe the corrected reviewed verifier boundary without claiming web-role
  provisioning or external acceptance;
- no current-Stage defect or scope expansion was found in ChatGPT whole-PR re-review.

No external operation was executed.

Next review-cycle action is independent Codex whole-PR review of current PR #138. Merge remains
user-controlled; runtime role creation/GRANT, production verifier dispatch and Hyperdrive/runtime
provisioning remain blocked until post-merge Codex re-evaluation.


### Bounded web-role provisioning gate — failed safely, transaction rolled back

User explicitly authorized the bounded external web-role provisioning gate described by Codex
service PR #121.

Before mutation, current repository/control-plane state was rechecked:

- exact GitHub `main`:
  `4cef0297bb41ff3a18ee0ad82315aef940146596`;
- Neon project: `late-cell-18916701` / `vico-forum`;
- production branch: `br-square-flower-b2q6a3sy`, primary/default, ready;
- database: `vico_forum`;
- execution/session role: exact `vico_forum_owner`;
- database owner: exact `vico_forum_owner`;
- `vico_forum_web` absent;
- existing `vico_forum_runtime` remained exact localization-only:
  direct non-grantable database CONNECT, public-schema USAGE, SELECT only on
  `locales`, `ui_translations`, `ui_translation_bundles`, expected owner admin membership,
  no column/function/default ACL or object ownership.

A single Neon SQL transaction was then attempted with the authorized bounded operations:
- `CREATE ROLE vico_forum_web LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS`;
- explicit owner administrative membership;
- exact reviewed database/schema/relation grants;
- fail-closed in-transaction post-provision assertions.

The transaction failed on the explicit membership statement before commit:

`ADMIN option cannot be granted back to your own grantor`.

PostgreSQL 17 role semantics explain the failure: when a non-superuser with `CREATEROLE`
creates a role, PostgreSQL automatically grants the created role back to the creator as
`ADMIN TRUE, SET FALSE, INHERIT FALSE`. The explicit second grant therefore attempts to grant
ADMIN back to the current grantor and is rejected.

Official PostgreSQL 17 references checked:
- https://www.postgresql.org/docs/17/role-attributes.html
- PostgreSQL 17 GRANT-on-roles documentation.

Per the Codex gate rule ("on mismatch/failure rollback/stop without additional fixes"), no retry,
manual repair or alternate SQL was attempted.

Read-only rollback verification after the failure confirmed:
- `vico_forum_web` does **not** exist;
- Neon role list remains only
  `vico_forum_owner`, `vico_forum_runtime`, `vico_forum_migrator`;
- current/session role remains `vico_forum_owner`.

Therefore the failed transaction persisted **no** new role or grants.

Because the DB transaction failed, the subsequent authorized steps were not executed:
- `WEB_RUNTIME_DATABASE_ROLE` GitHub Environment variable was not set;
- `Production runtime privilege verification` was not dispatched;
- no Hyperdrive/password/credential/Worker binding/deployment/OAuth/Queue/provider operation was
  performed.

The previous provisioning authorization is consumed by this failed one-shot attempt under the
explicit no-retry boundary. A new Codex-reviewed bounded operation and new explicit user
authorization are required before another external provisioning attempt.

Technical point for the next coordination cycle: the required owner administrative-control
invariant should be verified after `CREATE ROLE`; in this PostgreSQL 17 execution context,
re-issuing the same owner membership grant is not a valid step.


### Corrected web-role provisioning retry — failed safely, transaction rolled back

User explicitly authorized exactly one corrected repeat of the bounded web-role provisioning gate
defined by Codex PR #121.

Before the attempt, exact state was revalidated:

- GitHub `main` remained
  `4cef0297bb41ff3a18ee0ad82315aef940146596`;
- Neon project `late-cell-18916701`, production branch
  `br-square-flower-b2q6a3sy`, database `vico_forum`;
- current/session/database owner = exact `vico_forum_owner`;
- owner is non-superuser with `CREATEROLE`, so PostgreSQL 17 automatically creates the
  owner membership for a role created by this user as
  `ADMIN TRUE, SET FALSE, INHERIT FALSE`;
- `vico_forum_web` remained absent;
- existing `vico_forum_runtime` remained exact localization-only:
  direct non-grantable CONNECT, public-schema USAGE, SELECT only on
  `locales`, `ui_translations`, `ui_translation_bundles`, expected owner membership.

The one corrected retry used a single transaction and intentionally omitted the explicit
owner-membership `GRANT`. The transaction attempted:
- passwordless safe-attribute `CREATE ROLE vico_forum_web`;
- exact reviewed direct database/schema/relation ACL;
- fail-closed in-transaction contract assertions.

The transaction failed before commit with:

`Effective database privilege mismatch for vico_forum_web`.

No retry or in-place correction was attempted.

Read-only rollback/root-cause evidence after failure:

- `vico_forum_web` does not exist;
- Neon role list is unchanged:
  `vico_forum_owner`, `vico_forum_runtime`, `vico_forum_migrator`;
- PUBLIC database ACL is exact non-grantable `CONNECT` + `TEMPORARY`;
- existing `vico_forum_runtime` has no direct `TEMPORARY`, but
  `has_database_privilege(..., 'TEMPORARY') = true` through PUBLIC.

Therefore the failed in-transaction assertion was stricter than the merged repository contract:
it required effective `TEMPORARY=false` for `vico_forum_web`, while merged
`runtime-privileges.mjs` only forbids **direct** runtime `TEMPORARY` and explicitly permits
non-grantable PUBLIC `TEMPORARY` (or its absence). Under the current production PUBLIC ACL,
effective TEMPORARY is expected even though the runtime role has no direct TEMPORARY grant.

The single transaction rolled back completely; no role or ACL mutation persisted.

Because this authorized retry failed:
- `WEB_RUNTIME_DATABASE_ROLE` was not created/updated;
- `Production runtime privilege verification` was not dispatched;
- no Hyperdrive/password/credential/Worker binding/deployment/OAuth/Queue/provider operation was
  performed.

This explicit one-retry authorization is consumed. A further external attempt requires a new
Codex-reviewed operation and new explicit user authorization. The next operation should keep the
merged repository contract authoritative: check direct runtime database ACL for absence of
TEMPORARY/CREATE/grant options while allowing effective TEMPORARY inherited from accepted PUBLIC
database ACL.


### Third one-shot web-role provisioning attempt — relation assertion failed, full rollback

User explicitly authorized one additional corrected one-shot provisioning attempt defined by the
latest Codex PR #121 entry.

Preflight was repeated before mutation and matched the reviewed boundary:

- exact GitHub `main` remained
  `4cef0297bb41ff3a18ee0ad82315aef940146596`;
- Neon project `late-cell-18916701`, production branch
  `br-square-flower-b2q6a3sy`, database `vico_forum`;
- current/session/database owner = exact `vico_forum_owner`;
- `vico_forum_web` absent;
- existing `vico_forum_runtime` unchanged: direct non-grantable database CONNECT,
  public-schema USAGE, SELECT only on
  `locales`, `ui_translations`, `ui_translation_bundles`, expected owner membership;
- PUBLIC database ACL remained non-grantable CONNECT + TEMPORARY.

PostgreSQL 17 official documentation was rechecked before the attempt:
- databases grant PUBLIC CONNECT and TEMPORARY by default;
- non-superuser CREATEROLE creation automatically grants the new role back to its creator as
  ADMIN TRUE, SET FALSE, INHERIT FALSE.

The authorized transaction then:
- created passwordless `vico_forum_web` with the reviewed safe role attributes;
- intentionally omitted manual owner-membership GRANT;
- applied the reviewed database/schema/relation GRANT statements;
- used the corrected database assertion:
  effective CONNECT=true, effective CREATE=false, exact direct non-grantable CONNECT only,
  with no requirement that effective TEMPORARY be false;
- continued with exact membership/schema/relation/column/function/default/ownership assertions.

The transaction failed before commit with:

`Relation ACL mismatch`.

Per the one-shot boundary, no retry, alternate SQL, manual repair, role cleanup, GRANT adjustment,
GitHub variable change or workflow dispatch was attempted.

Read-only rollback verification after the failure confirmed:

- `vico_forum_web` does not exist;
- role list remains exactly the previous Vico roles:
  `vico_forum_owner`, `vico_forum_runtime`, `vico_forum_migrator`;
- existing localization relation ACL remains exactly SELECT on
  `locales`, `ui_translation_bundles`, `ui_translations`;
- current/session role remains `vico_forum_owner`.

Therefore the transaction persisted no role or grant changes.

Because this attempt failed before commit:
- `WEB_RUNTIME_DATABASE_ROLE` was not set;
- `Production runtime privilege verification` was not dispatched;
- no Hyperdrive/password/credential/Worker binding/deployment/OAuth/Queue/provider operation was
  performed.

This authorization is consumed. The exact cause of the relation-assertion mismatch has not been
mutated around or guessed into production; the next coordination cycle must diagnose it
read-only/repository-side and define any further one-shot attempt before another external
authorization.


### Deterministic diagnosis after third provisioning rollback — repository/local/read-only

Latest Codex service PR #121 paused all production retries and requested deterministic diagnosis
only. No Neon SQL, GitHub Environment/workflow mutation, Hyperdrive/password/Worker/deploy or
other external operation was performed in this diagnostic cycle.

Exact GitHub `main` remained:
`4cef0297bb41ff3a18ee0ad82315aef940146596`.

#### Exact third-attempt operational SQL

The third attempt used the following DDL/GRANT statements before the fail-closed assertion:

```sql
CREATE ROLE vico_forum_web
  LOGIN
  PASSWORD NULL
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE vico_forum TO vico_forum_web;
GRANT USAGE ON SCHEMA public TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."user",
  public.session,
  public.account,
  public.verification,
  public.rate_limit
TO vico_forum_web;

GRANT SELECT ON TABLE
  public.forum_categories,
  public.forum_sections,
  public.forum_topic_title_translations,
  public.forum_post_body_translations
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.forum_topics,
  public.forum_posts
TO vico_forum_web;

GRANT SELECT, INSERT ON TABLE
  public.forum_topic_title_revisions,
  public.forum_post_revisions
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.authz_roles,
  public.authz_user_permission_overrides
TO vico_forum_web;

GRANT SELECT, INSERT, DELETE ON TABLE
  public.authz_role_permissions
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.authz_user_roles
TO vico_forum_web;

GRANT SELECT, UPDATE ON TABLE
  public.authz_mutation_lock
TO vico_forum_web;
```

The exact relation assertion portion that raised `Relation ACL mismatch` was:

```sql
WITH expected(name, privilege) AS (
  VALUES
    ('user','SELECT'),('user','INSERT'),('user','UPDATE'),('user','DELETE'),
    ('session','SELECT'),('session','INSERT'),('session','UPDATE'),('session','DELETE'),
    ('account','SELECT'),('account','INSERT'),('account','UPDATE'),('account','DELETE'),
    ('verification','SELECT'),('verification','INSERT'),('verification','UPDATE'),('verification','DELETE'),
    ('rate_limit','SELECT'),('rate_limit','INSERT'),('rate_limit','UPDATE'),('rate_limit','DELETE'),
    ('forum_categories','SELECT'),
    ('forum_sections','SELECT'),
    ('forum_topics','SELECT'),('forum_topics','INSERT'),('forum_topics','UPDATE'),
    ('forum_posts','SELECT'),('forum_posts','INSERT'),('forum_posts','UPDATE'),
    ('forum_topic_title_revisions','SELECT'),('forum_topic_title_revisions','INSERT'),
    ('forum_post_revisions','SELECT'),('forum_post_revisions','INSERT'),
    ('forum_topic_title_translations','SELECT'),
    ('forum_post_body_translations','SELECT'),
    ('authz_roles','SELECT'),('authz_roles','INSERT'),('authz_roles','UPDATE'),('authz_roles','DELETE'),
    ('authz_role_permissions','SELECT'),('authz_role_permissions','INSERT'),('authz_role_permissions','DELETE'),
    ('authz_user_roles','SELECT'),('authz_user_roles','INSERT'),('authz_user_roles','UPDATE'),
    ('authz_user_permission_overrides','SELECT'),('authz_user_permission_overrides','INSERT'),
    ('authz_user_permission_overrides','UPDATE'),('authz_user_permission_overrides','DELETE'),
    ('authz_mutation_lock','SELECT'),('authz_mutation_lock','UPDATE')
),
actual AS (
  SELECT
    c.relname::text AS name,
    acl.privilege_type::text AS privilege,
    acl.is_grantable
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      c.relacl,
      pg_catalog.acldefault(
        CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,
        c.relowner
      )
    )
  ) acl
  LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r','p','S','v','m','f')
    AND grantee.rolname = 'vico_forum_web'
)
SELECT count(*) INTO bad_count
FROM (
  (
    SELECT name, privilege FROM expected
    EXCEPT
    SELECT name, privilege FROM actual WHERE NOT is_grantable
  )
  UNION ALL
  (
    SELECT name, privilege FROM actual
    EXCEPT
    SELECT name, privilege FROM expected
  )
  UNION ALL
  (
    SELECT name, privilege FROM actual WHERE is_grantable
  )
) diff;

IF bad_count <> 0 THEN
  RAISE EXCEPTION 'Relation ACL mismatch';
END IF;
```

Normalization in that operational assertion is therefore:
- expected identity = `(relation name, privilege)`;
- actual identity = `(relation name, privilege)`;
- `is_grantable=false` is required separately;
- schema is fixed to `public`;
- relation kind, grantor and grantee are not part of the compared tuple after the catalog filter.

#### Exact expected contract comparison

Merged `runtimeCapabilityContracts.web` was expanded independently into normalized
`(relation, privilege)` pairs and compared with both the third-attempt GRANT list and the
third-attempt `expected` CTE.

Result:
- merged contract pairs: **50**;
- operational GRANT pairs: **50**;
- operational assertion expected pairs: **50**;
- contract → operational missing: **0**;
- operational → contract excess: **0**.

So there is no static missing/excess privilege in the written third-attempt grant list or its
expected CTE.

#### Observed in-transaction rows / diff availability

The third-attempt Neon tool call returned only the raised exception text
`Relation ACL mismatch`. The transaction did **not** return or persist the `actual` CTE rows,
`bad_count` constituents, or a structured missing/excess diff before rollback.

Therefore:
- observed in-transaction relation rows are **not available**;
- an observed expected-vs-actual diff cannot honestly be reconstructed after rollback;
- per Codex instruction, no production re-query/retry was performed to recreate them.

The existing rollback evidence remains the only production observation after the failed
transaction: `vico_forum_web` is absent and localization ACL is unchanged.

#### Comparison with repository PG17 probe/shared verifier

Repository CI path is not an exact reproduction of the operational transaction:

1. `verify-runtime-privilege-probes.mjs:createRole()` creates CI roles with
   `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`; it does not specify
   `NOINHERIT` and does not create the production passwordless role shape.
2. CI does not issue direct database `CONNECT`; it relies on effective CONNECT and the shared
   contract permits direct non-grantable CONNECT to be optional.
3. CI `grantCapability()` iterates `runtimeCapabilityContracts.web` and emits one
   `GRANT <privileges> ON TABLE <relation>` per relation. The production operation grouped
   relations with equal privilege sets into fewer GRANT statements.
4. CI then reads the shared catalog snapshot and normalizes relation ACL as
   `schema.name.kind.privilege.grantable=<bool>`.
5. The third operational assertion instead uses a custom query and compares only
   `name + privilege`, with grantability checked separately. It does not compare relation kind,
   schema (beyond fixed `public` scope), grantor or grantee tuple.
6. The successful disposable PostgreSQL 17 CI therefore proves the merged capability contract and
   shared snapshot/assertion path, but it does **not** execute the exact grouped production SQL plus
   the exact custom `EXCEPT` assertion that failed.

The operational normalized expected set is identical to the repository contract, so the failure
cannot currently be attributed to a static grant-list drift.

#### Exact replay limitation

The requested exact local reproduction cannot be executed in the current ChatGPT runtime without
violating the bounded task:

- no local `postgres`, `initdb`, `pg_ctl`, Docker or Podman binary is available;
- no embedded PostgreSQL Python package is installed;
- container network access is disabled, so a PostgreSQL 17 server/package cannot be fetched;
- Codex explicitly prohibited Neon SQL and GitHub workflow/control-plane mutation for this
  diagnostic task.

Accordingly, no substitute remote database or new workflow was used and no simulated result is
presented as a PostgreSQL 17 reproduction.

A pure set-level static replay was performed only as supporting evidence: all 50 expected contract
pairs and all 50 operational pairs are identical, missing=0, excess=0. This is not claimed as the
required PostgreSQL reproduction.

#### Current classification

Current evidence does **not** confirm a defect in `runtimeCapabilityContracts.web` or in the
shared repository privilege verifier:
- the merged relation set and operational written set are identical;
- repository disposable PostgreSQL 17 shared-contract probe is already known successful;
- no production `actual` relation rows were captured.

There is, however, a concrete diagnostic/test-shape gap: the exact production grouped GRANT SQL
and custom relation `EXCEPT` assertion are not exercised by the repository probe. Whether the
third failure is caused by that ad-hoc operational assertion, a production-specific catalog state,
or another PostgreSQL/Neon execution detail cannot be distinguished from the retained evidence.

No corrective repository change or mergeable PR was created. Independent Codex review is required
before choosing the next corrective cycle.


### Rollback-only production diagnostic — exact relation ACL root-cause evidence

User explicitly authorized the single rollback-only diagnostic transaction requested by the latest
Codex PR #121 entry. No provisioning commit, GitHub Environment variable, workflow dispatch,
Hyperdrive/password/Worker/deploy/OAuth/Queue/provider mutation was performed.

Exact repository target before diagnostic:
`main = 4cef0297bb41ff3a18ee0ad82315aef940146596`.

Read-only preflight reconfirmed:
- database/current/session/database-owner = exact `vico_forum` /
  `vico_forum_owner`;
- `vico_forum_web` absent;
- existing `vico_forum_runtime` unchanged:
  direct non-grantable CONNECT, public.USAGE, relation SELECT only on
  `locales`, `ui_translations`, `ui_translation_bundles`;
- PUBLIC database ACL = non-grantable CONNECT + TEMPORARY.

#### Diagnostic transaction shape

The transaction replayed the exact third-attempt operational SQL before the failing assertion:

```sql
CREATE ROLE vico_forum_web
  LOGIN
  PASSWORD NULL
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE vico_forum TO vico_forum_web;
GRANT USAGE ON SCHEMA public TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."user",
  public.session,
  public.account,
  public.verification,
  public.rate_limit
TO vico_forum_web;

GRANT SELECT ON TABLE
  public.forum_categories,
  public.forum_sections,
  public.forum_topic_title_translations,
  public.forum_post_body_translations
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.forum_topics,
  public.forum_posts
TO vico_forum_web;

GRANT SELECT, INSERT ON TABLE
  public.forum_topic_title_revisions,
  public.forum_post_revisions
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.authz_roles,
  public.authz_user_permission_overrides
TO vico_forum_web;

GRANT SELECT, INSERT, DELETE ON TABLE
  public.authz_role_permissions
TO vico_forum_web;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.authz_user_roles
TO vico_forum_web;

GRANT SELECT, UPDATE ON TABLE
  public.authz_mutation_lock
TO vico_forum_web;
```

Instead of the previous pass/fail assertion, the final transaction statement read the actual ACL
with the same catalog basis as the shared verifier:

```sql
SELECT
  n.nspname::text AS schema,
  c.relname::text AS name,
  CASE c.relkind
    WHEN 'S' THEN 'sequence'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'view'
    ELSE 'table'
  END::text AS kind,
  grantee.rolname::text AS grantee,
  grantor.rolname::text AS grantor,
  acl.privilege_type::text AS privilege,
  acl.is_grantable
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(
    c.relacl,
    pg_catalog.acldefault(
      CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,
      c.relowner
    )
  )
) acl
LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
LEFT JOIN pg_catalog.pg_roles grantor ON grantor.oid = acl.grantor
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p','S','v','m','f')
  AND grantee.rolname = 'vico_forum_web';
```

The statement computed `missing`, `excess`, `grantable`, full `actual`,
shared-verifier normalized shape and automatic role membership, then deliberately raised
`P0001` with the compact JSON payload. That intentional exception aborted the complete
transaction; COMMIT was impossible.

#### Exact diagnostic payload

Returned PostgreSQL exception payload:

```json
{
  "expected_count": 50,
  "actual_count": 0,
  "excess": [],
  "grantable": [],
  "actual": [],
  "shared_shape": [],
  "membership": [
    {
      "role": "vico_forum_web",
      "member": "vico_forum_owner",
      "grantor": "cloud_admin",
      "set_option": false,
      "admin_option": true,
      "inherit_option": false
    }
  ],
  "missing": [
    {"name":"account","privilege":"DELETE"},
    {"name":"account","privilege":"INSERT"},
    {"name":"account","privilege":"SELECT"},
    {"name":"account","privilege":"UPDATE"},
    {"name":"authz_mutation_lock","privilege":"SELECT"},
    {"name":"authz_mutation_lock","privilege":"UPDATE"},
    {"name":"authz_role_permissions","privilege":"DELETE"},
    {"name":"authz_role_permissions","privilege":"INSERT"},
    {"name":"authz_role_permissions","privilege":"SELECT"},
    {"name":"authz_roles","privilege":"DELETE"},
    {"name":"authz_roles","privilege":"INSERT"},
    {"name":"authz_roles","privilege":"SELECT"},
    {"name":"authz_roles","privilege":"UPDATE"},
    {"name":"authz_user_permission_overrides","privilege":"DELETE"},
    {"name":"authz_user_permission_overrides","privilege":"INSERT"},
    {"name":"authz_user_permission_overrides","privilege":"SELECT"},
    {"name":"authz_user_permission_overrides","privilege":"UPDATE"},
    {"name":"authz_user_roles","privilege":"INSERT"},
    {"name":"authz_user_roles","privilege":"SELECT"},
    {"name":"authz_user_roles","privilege":"UPDATE"},
    {"name":"forum_categories","privilege":"SELECT"},
    {"name":"forum_post_body_translations","privilege":"SELECT"},
    {"name":"forum_post_revisions","privilege":"INSERT"},
    {"name":"forum_post_revisions","privilege":"SELECT"},
    {"name":"forum_posts","privilege":"INSERT"},
    {"name":"forum_posts","privilege":"SELECT"},
    {"name":"forum_posts","privilege":"UPDATE"},
    {"name":"forum_sections","privilege":"SELECT"},
    {"name":"forum_topic_title_revisions","privilege":"INSERT"},
    {"name":"forum_topic_title_revisions","privilege":"SELECT"},
    {"name":"forum_topic_title_translations","privilege":"SELECT"},
    {"name":"forum_topics","privilege":"INSERT"},
    {"name":"forum_topics","privilege":"SELECT"},
    {"name":"forum_topics","privilege":"UPDATE"},
    {"name":"rate_limit","privilege":"DELETE"},
    {"name":"rate_limit","privilege":"INSERT"},
    {"name":"rate_limit","privilege":"SELECT"},
    {"name":"rate_limit","privilege":"UPDATE"},
    {"name":"session","privilege":"DELETE"},
    {"name":"session","privilege":"INSERT"},
    {"name":"session","privilege":"SELECT"},
    {"name":"session","privilege":"UPDATE"},
    {"name":"user","privilege":"DELETE"},
    {"name":"user","privilege":"INSERT"},
    {"name":"user","privilege":"SELECT"},
    {"name":"user","privilege":"UPDATE"},
    {"name":"verification","privilege":"DELETE"},
    {"name":"verification","privilege":"INSERT"},
    {"name":"verification","privilege":"SELECT"},
    {"name":"verification","privilege":"UPDATE"}
  ]
}
```

This proves the prior `Relation ACL mismatch` was not a one-row normalization drift:
**all 50 expected relation privileges were absent inside the transaction**.
The automatic PostgreSQL 17 owner administrative membership was present exactly as expected.

#### Mandatory post-check and grant-authority evidence

After the intentional rollback, a separate read-only post-check confirmed:
- `vico_forum_web` is absent;
- permanent localization ACL remains unchanged;
- current/session user remains `vico_forum_owner`.

The same post-check also identified the execution-authority boundary that explains the zero-row
ACL result:

- every one of the 18 target web relations is owned by
  `vico_forum_migrator`, not `vico_forum_owner`;
- for every checked target relation and every relevant
  SELECT / INSERT / UPDATE / DELETE privilege,
  `vico_forum_owner` has `WITH GRANT OPTION = false`.

Target relation owners observed:

```text
account                              vico_forum_migrator
authz_mutation_lock                  vico_forum_migrator
authz_role_permissions               vico_forum_migrator
authz_roles                          vico_forum_migrator
authz_user_permission_overrides      vico_forum_migrator
authz_user_roles                     vico_forum_migrator
forum_categories                     vico_forum_migrator
forum_post_body_translations         vico_forum_migrator
forum_post_revisions                 vico_forum_migrator
forum_posts                          vico_forum_migrator
forum_sections                       vico_forum_migrator
forum_topic_title_revisions          vico_forum_migrator
forum_topic_title_translations       vico_forum_migrator
forum_topics                         vico_forum_migrator
rate_limit                           vico_forum_migrator
session                              vico_forum_migrator
user                                 vico_forum_migrator
verification                         vico_forum_migrator
```

Official PostgreSQL 17 GRANT semantics match the observed behavior:
a non-owner can grant only privileges for which it has grant option; when named privileges lack
grant option PostgreSQL can proceed with warnings while granting only the subset actually
grantable. Object owners are always treated as holding all grant options.

References checked:
- PostgreSQL 17 `GRANT` reference / documentation;
- PostgreSQL 17 section 5.8 Privileges.

#### Diagnostic classification for Codex review

Evidence now rules out the previously suspected static relation-set/assertion mismatch:

- merged web contract expected set = 50 pairs;
- operational expected set = 50 pairs;
- diagnostic actual relation ACL = 0 pairs;
- no excess or grantable rows existed;
- automatic role membership was correct;
- target relation ownership/grant authority differs from the database-owner execution role.

The shared repository runtime verifier remains an end-state ACL verifier; the existing disposable
PostgreSQL probe runs under its test/admin execution identity and does not prove that
`vico_forum_owner` can issue production table grants.

A current-Stage operational/provisioning-authority defect is therefore strongly evidenced, but no
corrective repository or production action is taken here. Per independent-review protocol, Codex
must now independently classify the ownership/grant-authority mismatch and define one common
corrective path.

The authorized diagnostic transaction was rollback-only and is consumed.


### Split-authority provisioning gate — stopped safely at execution-identity preflight

User explicitly authorized the split-authority web-role provisioning gate from the latest
Codex PR #121 entry.

No production mutation was executed because the mandatory preflight requirement — availability
of both exact execution identities through the current tooling — is not satisfied.

Exact repository target remained:
`main = 4cef0297bb41ff3a18ee0ad82315aef940146596`.

Read-only Neon preflight confirmed:

- database/current/session/database-owner = exact
  `vico_forum` / `vico_forum_owner`;
- `vico_forum_web` is absent;
- existing `vico_forum_runtime` relation ACL remains exact localization-only SELECT on
  `locales`, `ui_translations`, `ui_translation_bundles`;
- `vico_forum_owner` has the expected automatic administrative memberships for
  `vico_forum_runtime` and `vico_forum_migrator`, both
  `ADMIN TRUE, INHERIT FALSE, SET FALSE`;
- all 18 web target relations are owned by `vico_forum_migrator`;
- `vico_forum_owner` has 0 relevant target-table privileges WITH GRANT OPTION;
- `vico_forum_migrator` has 72/72 SELECT/INSERT/UPDATE/DELETE owner-level grantable capabilities
  across those 18 target relations.

This independently confirms the split-authority design: owner phase must create/control the role
and database/schema ACL, while relation grants must execute as the object owner
`vico_forum_migrator`.

#### Tooling boundary

The currently connected Neon SQL execution tools expose:

- `run_sql(project_id, branch_id, database_name, sql)`;
- `run_sql_transaction(project_id, branch_id, database_name, sql_statements)`.

Neither accepts a PostgreSQL `role_name` or an existing connection string. On this target both
execute as `vico_forum_owner`.

Neon `get_connection_string` can resolve a connection string for a named role, including
`vico_forum_migrator`, but the current ChatGPT toolset has no SQL executor that accepts that
connection string. The local runtime also has no PostgreSQL client/driver available, and project
workflow rules do not permit inventing a new credential transport or repository workflow for this
gate.

Using `SET ROLE vico_forum_migrator` is also not an allowed substitute:
the actual membership is `SET FALSE`, and Codex explicitly required the existing protected
migrator credential rather than changing memberships/authority.

The current GitHub connector likewise exposes repository/workflow evidence reads and existing
rerun operations, but no environment-variable write or new `workflow_dispatch` action usable for
the later gate steps. Therefore those post-provision steps also cannot be truthfully executed from
this chat session.

#### Safety decision

Because object-owner phase cannot be executed under the required identity, the owner phase was
**not started**. This avoids intentionally creating a passwordless intermediate
`vico_forum_web` role only to require compensating cleanup immediately.

Accordingly:
- no `CREATE ROLE`;
- no database/schema/relation `GRANT`;
- no compensating `DROP ROLE`;
- no password/credential retrieval or rotation;
- no GitHub Environment variable change;
- no production runtime verifier dispatch;
- no Hyperdrive/Worker/deploy/OAuth/Queue/provider operation.

The user's split-authority authorization has not been used for a provisioning mutation; execution
is blocked by missing exact-identity/control-plane tooling in this session.

Codex should decide the next reviewed execution mechanism for the already accepted
`vico_forum_migrator` credential (and GitHub variable/dispatch path) without weakening the
split-authority contract.


### Planned migrator relation-grant workflow — passwordless precondition is not observable

Latest Codex PR #121 requested a repository-only mergeable PR for a protected relation-grant
phase executed by the existing `NEON_MIGRATION_DATABASE_URL` / exact
`vico_forum_migrator` identity.

Before changing repository files, the requested production preconditions were checked for
technical observability.

Exact repository target remains:

`main = 4cef0297bb41ff3a18ee0ad82315aef940146596`.

The requested script contract says that, before relation GRANTs, the migrator-connected script
must verify the existing web role is passwordless in addition to checking its safe attributes and
automatic owner membership.

That passwordless check cannot be implemented truthfully under the accepted migrator identity:

1. PostgreSQL 17 `pg_roles` is deliberately a public-safe view of `pg_authid`; its
   `rolpassword` column does not expose password presence and is defined by PostgreSQL source as
   the unconditional literal `'********'::text`.
2. `pg_authid.rolpassword` is authoritative and is NULL when the role has no password, but
   `pg_authid` is intentionally not publicly readable because it contains password verifiers.
3. `pg_shadow.passwd` is likewise protected and not a public inspection path.
4. Read-only production privilege inquiry confirmed:
   - `vico_forum_migrator` SELECT on `pg_catalog.pg_roles` = true;
   - SELECT on `pg_catalog.pg_authid` = false;
   - SELECT on `pg_catalog.pg_shadow` = false.

Official PostgreSQL 17 references checked:
- https://www.postgresql.org/docs/17/view-pg-roles.html
- https://www.postgresql.org/docs/17/catalog-pg-authid.html
- https://www.postgresql.org/docs/17/view-pg-shadow.html
- PostgreSQL REL_17_STABLE `src/backend/catalog/system_views.sql`, where `pg_roles` defines
  `'********'::text as rolpassword`.

Other requested checks are technically implementable with the migrator credential:
- exact `current_user = vico_forum_migrator`;
- target role existence and safe non-password role attributes from `pg_roles`;
- exact automatic owner membership from `pg_auth_members`;
- database/schema owner-phase ACL prerequisites;
- exact ownership of all relations derived from `runtimeCapabilityContracts.web`;
- transactionally derived exact relation GRANT SQL;
- shared end-state snapshot + `assertRuntimeCapabilityPrivilegeContract`;
- rollback on any failure.

But silently treating `pg_roles.rolpassword` as a passwordless proof would be false, and adding
new privileges such as SELECT on `pg_authid`, changing memberships/ownership, or inventing a new
credential/control-plane channel would violate the reviewed Stage 6 boundary.

No implementation branch/PR was created and no external mutation was performed.

This is a current Stage 6 provisioning-mechanism blocker, not future hardening. Codex must choose
and review one explicit replacement for the unobservable passwordless assertion (for example,
making passwordlessness an owner-phase evidence/confirmation invariant while the migrator script
checks all DB-observable prerequisites) before a mergeable relation-grant workflow can honestly
satisfy its contract.


### Split-authority relation-provisioning PR #139 — implemented, CI-clean, awaiting independent Codex review

Latest Codex service PR #121 request was executed as a repository-only mergeable change.

Created PR #139 `Add split-authority web relation provisioning workflow` from exact unchanged
`main`:

`4cef0297bb41ff3a18ee0ad82315aef940146596`.

Final PR head:

`2b4f7ee33c3f011a8d997eac34f9a18f53f9350d`.

PR is open, non-draft, mergeable, eight changed files, and current `main` has not moved.

Changed files are exactly:

- `.github/scripts/provision-production-web-relations.mjs`;
- `.github/scripts/provision-production-web-relations.test.mjs`;
- `.github/scripts/verify-web-relation-provisioning-probes.mjs`;
- `.github/workflows/production-web-relation-provision.yml`;
- `.github/workflows/ci.yml`;
- `PROJECT_STATE.md`;
- `docs/database/HYPERDRIVE.md`;
- `docs/database/MIGRATIONS.md`.

No migration SQL, dependency, Worker/runtime binding, capability matrix, production role/grant,
GitHub variable, workflow dispatch, Hyperdrive provisioning or deployment mutation was performed.

#### Provisioning script contract

`.github/scripts/provision-production-web-relations.mjs` imports the shared
`runtimeCapabilityContracts.web`; the relation grant list is not duplicated.

The script:

- requires `DATABASE_URL`, `RUNTIME_DATABASE_ROLE`, `WEB_RUNTIME_DATABASE_ROLE`;
- requires exact confirmation token
  `owner-phase-password-null-confirmed` before DB connection;
- requires exact `current_user = vico_forum_migrator`;
- requires one existing web role with visible safe attributes:
  LOGIN, NOINHERIT, no SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS;
- requires only the accepted automatic database-owner membership:
  `ADMIN TRUE, INHERIT FALSE, SET FALSE`;
- requires effective database CONNECT=true / CREATE=false;
- requires direct web database ACL to be exactly non-grantable CONNECT;
- requires exact `public.USAGE` and no schema CREATE;
- requires every relation named by the shared web capability to exist as a table/partitioned table
  and be owned by exact `vico_forum_migrator`;
- begins one transaction, generates every relation GRANT directly from
  `runtimeCapabilityContracts.web.relations`, then runs the shared
  `readRuntimeCapabilityPrivilegeSnapshot` +
  `assertRuntimeCapabilityPrivilegeContract`;
- commits only on exact full end-state match and rolls back on any error;
- logs only bounded generic success/failure messages and never logs the connection string.

Passwordlessness is intentionally not read through the migrator connection. PostgreSQL 17
`pg_roles.rolpassword` is masked and the migrator correctly lacks access to `pg_authid` /
`pg_shadow`. Therefore `PASSWORD NULL` remains the reviewed owner-phase command/evidence
invariant. The confirmation token is explicit operator evidence, not a claimed DB-derived password
check.

#### Protected manual workflow

Added `Provision production web relation grants`:

- `workflow_dispatch` only;
- required string input `owner_phase_confirmation`;
- UI description explicitly tells the operator to enter exact
  `owner-phase-password-null-confirmed` only after reviewed owner phase created the role with
  `PASSWORD NULL`;
- main-only job;
- protected `production-db` Environment;
- shared `production-db-migrations` concurrency group, `cancel-in-progress: false`;
- five-minute job timeout;
- pinned checkout/pnpm/node actions matching existing production workflows;
- existing `NEON_MIGRATION_DATABASE_URL` plus
  `RUNTIME_DATABASE_ROLE` / `WEB_RUNTIME_DATABASE_ROLE`;
- workflow merge does not launch it.

No manual production provisioning workflow was dispatched in this task.

#### Test coverage

Unit/static tests verify:

- exact GRANT derivation from the shared web capability, including quoted `user`;
- missing/wrong owner-phase confirmation rejection;
- missing target role rejection;
- wrong execution identity rejection;
- unsafe visible role attributes rejection;
- missing/unsafe automatic owner membership rejection;
- effective/direct database ACL and schema prerequisite drift rejection;
- missing/wrong-owner/wrong-kind target relations rejection;
- commit occurs only after shared full runtime assertion;
- shared end-state failure rolls the transaction back;
- confirmation failure occurs before provisioning;
- success/failure logging does not expose connection strings/secrets.

Disposable PostgreSQL 17 CI separately models production split authority:

- disposable database + public schema are owner-controlled;
- exact web target relations are transferred to `vico_forum_migrator`;
- migrator gets schema USAGE required to address owned relations;
- owner phase creates localization/web roles and web DB/schema prerequisites;
- the relation-grant function is then executed with
  `SET ROLE vico_forum_migrator` only inside disposable CI to model exact `current_user` +
  object ownership;
- the real shared runtime verifier must accept the final localization + web state;
- a separate drift role with forbidden direct TEMPORARY is rejected before relation writes and
  retains zero relation privileges after rollback.

Production does not use CI `SET ROLE`; the protected workflow uses the already accepted
migration credential.

#### CI findings fixed during verification

Initial CI exposed only defects in the new test/fixture implementation, not a change to the
production capability contract:

1. lint found an unused prerequisite-reader parameter; removed;
2. first disposable PG17 probe modeled a public schema not controlled by the test owner, so owner
   setup could not grant schema USAGE; fixture corrected to model owner-controlled public schema;
3. second probe correctly showed the test migrator could not address `public.*` relations without
   schema USAGE; disposable fixture now grants migrator public.USAGE.

No production script privilege boundary was broadened to make those fixture failures pass.

#### Final verification

Final CI run:

`36312334101`

on exact PR head:

`2b4f7ee33c3f011a8d997eac34f9a18f53f9350d`

completed fully successful.

`checks` = success:

- accepted migration/static contracts including new provisioning unit suite;
- lint;
- typecheck;
- full test suite;
- build;
- migration metadata;
- Drizzle schema parity.

`database` = success:

- clean PostgreSQL 17 migration/integration suite;
- production schema manifest parity;
- existing runtime privilege probes;
- **split-authority web relation provisioning probe**;
- Workers build;
- local Hyperdrive smoke.

#### Whole-PR re-review

Full current-head diff was re-reviewed after CI.

One current-Stage documentation defect was found and corrected before the final head:
`PROJECT_STATE.md` originally described the nearest route as “review/merge this current PR”,
which would become stale immediately after merge. It now records the durable post-merge state:
repository split-authority mechanism ready → Codex rechecks exact main/production preconditions →
owner phase / protected variable / one migrator workflow / read-only verifier remain separately
authorized external operations.

Final whole-PR review finds no remaining current-Stage defect or scope expansion.

Current evidence:

- base/main still exact
  `4cef0297bb41ff3a18ee0ad82315aef940146596`;
- final head
  `2b4f7ee33c3f011a8d997eac34f9a18f53f9350d`;
- PR #139 open, non-draft, mergeable;
- exact eight-file scope;
- final CI `36312334101` fully green;
- no PR review comments/reviews yet;
- no external provisioning action executed.

Next review-cycle action: Codex independently review the complete current PR #139 at final head.
Merge remains user-controlled. Owner phase, protected `WEB_RUNTIME_DATABASE_ROLE`, production
relation-provision workflow dispatch and read-only runtime verifier remain prohibited until the
post-merge coordination cycle explicitly authorizes them.


### Bounded owner phase — blocked before mutation by merged contract contradiction

User explicitly authorized only the bounded owner phase described in the latest Codex PR #121
entry and requested an immediate stop after evidence is recorded here.

Fresh repository state before any external mutation:

- exact GitHub `main`:
  `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- PR #139 is merged into that main;
- current source-of-truth still describes external web PostgreSQL role/grants as not provisioned.

No Neon mutation was executed.

Reason: the latest Codex owner-phase instruction contradicts the merged provisioning contract.

Latest Codex PR #121 owner-phase instruction requires creation of `vico_forum_web` as:

`LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD NULL`.

But merged `main`
`.github/scripts/provision-production-web-relations.mjs` fail-closed prerequisite explicitly
requires:

```js
assert.equal(role.rolinherit, false, "Target web role must be NOINHERIT");
```

The related database source-of-truth also states that both runtime capabilities require
“no inherited role membership” and that the accepted database-owner inbound admin membership is
non-inheriting/non-SET.

Therefore executing the latest owner phase literally with `INHERIT` would create a role that the
already reviewed and merged migrator provisioning workflow necessarily rejects before relation
writes. Choosing `NOINHERIT` instead would mean silently overriding the latest Codex instruction.

Under current `AGENTS.md` contradiction handling, ChatGPT must not choose between contradictory
current instructions/source-of-truth independently.

Accordingly this authorized owner phase was **not started**:

- no `CREATE ROLE vico_forum_web`;
- no database CONNECT grant;
- no schema USAGE grant;
- no compensating DROP;
- no GitHub variable mutation;
- no relation-provision workflow dispatch;
- no read-only runtime verifier;
- no Hyperdrive/Worker/deploy/OAuth/Queue/provider operation.

The authorization has not been consumed by a production mutation. Codex must reconcile the role
inheritance flag first, after which a new/clarified bounded owner-phase instruction can be executed.


### Corrected bounded owner phase — successful; stopped before next gate

User explicitly authorized only the corrected bounded owner phase with `NOINHERIT`, then required
ChatGPT to stop after recording evidence here.

Fresh repository target before mutation:

- exact GitHub `main`:
  `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- merged split-authority provisioning mechanism from PR #139 present in `main`;
- Neon project `late-cell-18916701`;
- production branch `br-square-flower-b2q6a3sy`, primary/default, PostgreSQL 17;
- database `vico_forum`.

Read-only preflight confirmed:

- current/session/database owner = exact `vico_forum_owner`;
- `vico_forum_web` absent;
- existing `vico_forum_runtime` unchanged:
  direct non-grantable database CONNECT, public.USAGE, SELECT only on
  `locales`, `ui_translation_bundles`, `ui_translations`;
- web relation ACL count = 0;
- all 18 expected web target tables remain owned by exact `vico_forum_migrator`;
- public schema owner is PostgreSQL `pg_database_owner`, so current database owner retains schema
  owner authority without changing schema ownership.

One owner-controlled transaction then executed exactly the bounded owner phase:

```sql
CREATE ROLE vico_forum_web
  LOGIN
  PASSWORD NULL
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE vico_forum TO vico_forum_web;
GRANT USAGE ON SCHEMA public TO vico_forum_web;
```

Before commit, in-transaction fail-closed assertions required:

- exact execution identity/database owner;
- exact visible web-role attributes, including `NOINHERIT`;
- exactly one automatic inbound owner administrative membership:
  member `vico_forum_owner` → role `vico_forum_web`,
  `ADMIN TRUE, INHERIT FALSE, SET FALSE`;
- effective database CONNECT=true and CREATE=false;
- exact direct web database ACL = one non-grantable CONNECT;
- exact web schema ACL = one non-grantable `public.USAGE`;
- zero web relation, column, function and default privileges;
- zero web-owned schema/relation/function objects;
- unchanged localization relation baseline.

The transaction completed successfully and committed.

Passwordlessness evidence is the exact reviewed owner-phase command above with
`PASSWORD NULL`. As already documented, this is command/evidence state rather than a claimed
migrator-readable `pg_roles` password check.

Read-only post-commit evidence:

- database/current/session owner:
  `vico_forum` / `vico_forum_owner` / `vico_forum_owner`;
- web role:
  - `LOGIN=true`;
  - `NOINHERIT` (`rolinherit=false`);
  - `NOSUPERUSER`;
  - `NOCREATEDB`;
  - `NOCREATEROLE`;
  - `NOREPLICATION`;
  - `NOBYPASSRLS`;
- automatic membership:
  `vico_forum_owner -> vico_forum_web`,
  grantor `cloud_admin`,
  `ADMIN TRUE, INHERIT FALSE, SET FALSE`;
- effective web database:
  CONNECT=true, CREATE=false;
  TEMPORARY=true only through accepted PUBLIC database semantics, not as a direct web grant;
- direct web database ACL:
  `CONNECT, grantable=false` only;
- web schema ACL:
  `public.USAGE, grantable=false` only;
- web relation ACL count = 0;
- web-owned object count = 0;
- localization baseline remains unchanged:
  direct non-grantable CONNECT, public.USAGE, SELECT only on
  `locales`, `ui_translation_bundles`, `ui_translations`.

No compensating cleanup was required.

Per the user's explicit stop boundary, nothing after owner phase was executed:

- `WEB_RUNTIME_DATABASE_ROLE` was not created/updated;
- migrator relation-provisioning workflow was not dispatched;
- production runtime verifier was not dispatched;
- no Hyperdrive/password credential creation/rotation/Worker binding/deploy/OAuth/Queue/provider
  operation was performed.

The bounded owner-phase authorization is consumed successfully. The production intermediate role is
now intentionally passwordless/unbound with no relation privileges, awaiting independent Codex
review and a separately authorized next gate.


### Protected variable + migrator workflow gate — blocked by GitHub connector capability before mutation

User explicitly authorized the next bounded gate requested by Codex:

1. set protected Environment variable
   `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`;
2. dispatch exactly once
   `Provision production web relation grants` on exact current `main` with
   `owner_phase_confirmation=owner-phase-password-null-confirmed`;
3. on success stop before runtime verifier/Hyperdrive/Worker/deploy;
4. on failure do not retry; perform only the previously reviewed compensating cleanup.

Fresh repository target was reconfirmed before attempting control-plane work:

- exact `main` =
  `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- merged workflow
  `.github/workflows/production-web-relation-provision.yml` is present;
- workflow requires protected `production-db` Environment,
  existing `NEON_MIGRATION_DATABASE_URL`,
  `RUNTIME_DATABASE_ROLE`,
  `WEB_RUNTIME_DATABASE_ROLE`,
  and exact confirmation input;
- current owner-phase evidence remains the accepted intermediate state:
  passwordless/unbound `vico_forum_web`, NOINHERIT, direct CONNECT + public.USAGE only,
  zero relation privileges.

The connected GitHub toolset was then inspected before any mutation.

Available Actions control-plane operations in this session include:
- read workflow runs/jobs/steps/logs/artifacts;
- rerun an existing workflow/job.

The connector does **not** expose:
- create/update/delete GitHub Environment variables;
- create a new `workflow_dispatch` run.

The generic GitHub fetch action is explicitly GET-only and does not support unlisted/sensitive
administration endpoints, so it cannot be used as a write fallback.

Because both required actions are part of one reviewed bounded gate, and because the workflow
depends on the new Environment variable, ChatGPT did not attempt a partial execution or substitute
another control-plane mechanism.

No external mutation occurred in this turn:

- `WEB_RUNTIME_DATABASE_ROLE` was not changed;
- no new provisioning workflow run was dispatched;
- no rerun of an old workflow was used as a substitute;
- no Neon SQL was executed;
- no compensating DROP was needed;
- no runtime verifier, Hyperdrive, Worker/deploy, OAuth, Queue/provider operation was performed.

The user's authorization has therefore not been consumed by the intended control-plane mutation.
A capable GitHub control-plane execution path is required before this exact gate can proceed.


### Migrator relation-grant gate — successful; exact run and ACL evidence recorded

The user completed the previously authorized owner-controlled GitHub steps:

- protected Environment variable `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`;
- one manual dispatch of `Provision production web relation grants`;
- exact confirmation input `owner-phase-password-null-confirmed`.

GitHub evidence:

- workflow: `.github/workflows/production-web-relation-provision.yml`;
- workflow ID: `368254678`;
- run ID: **`36316236607`**;
- run number: `1`;
- run attempt: `1`;
- event: `workflow_dispatch`;
- branch: `main`;
- exact head SHA:
  `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- status: `completed`;
- conclusion: **`success`**;
- started: `2026-09-27T11:35:44Z`;
- updated/completed: `2026-09-27T11:36:12Z`;
- protected deployment environment: `production-db`.

Exact job:

- job ID: `108611362591`;
- name: `Provision production web relation grants`;
- conclusion: **success**.

All reported job steps completed successfully:

1. Set up job;
2. pinned checkout;
3. pinned pnpm setup;
4. pinned Node setup;
5. `pnpm install --frozen-lockfile`;
6. **Provision exact web relation grants**;
7. post Node setup;
8. post pnpm setup;
9. post checkout;
10. complete job.

No rerun occurred.

The two GitHub UI annotations visible on the successful run are runner/tooling lifecycle notices:
Node.js 20 deprecation for an action runtime and a future `ubuntu-latest` image transition.
They did not fail the current Stage 6 gate and do not indicate a current provisioning-contract
defect. Treat them as future CI-maintenance signals only unless they become active failures in the
current supported runner window.

#### Read-only production ACL post-check

After the successful workflow, ChatGPT performed one read-only Neon catalog check against the
same production target. No SQL mutation was executed.

Observed web role:

- `vico_forum_web`;
- LOGIN=true;
- NOINHERIT (`rolinherit=false`);
- SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS all false.

Observed automatic owner membership:

- `vico_forum_owner -> vico_forum_web`;
- `ADMIN TRUE`;
- `INHERIT FALSE`;
- `SET FALSE`.

Observed owner-phase ACL remains exact:

- direct database ACL:
  `CONNECT, grantable=false` only;
- schema ACL:
  `public.USAGE, grantable=false` only.

Observed relation-grant result:

- expected relation privilege pairs: **50**;
- actual relation privilege pairs: **50**;
- missing pairs: **0**;
- excess pairs: **0**;
- grantable pairs: **0**.

Existing localization capability remains unchanged:

- `locales.SELECT`;
- `ui_translation_bundles.SELECT`;
- `ui_translations.SELECT`;
- all non-grantable.

This confirms that the split-authority relation-grant phase executed successfully under the reviewed
production contract and produced the exact merged web ACL matrix without widening grant options or
disturbing localization ACL.

Per the bounded-gate stop condition, ChatGPT did **not**:

- dispatch `Production runtime privilege verification`;
- create/rotate any web database password or Hyperdrive credential;
- provision/modify Hyperdrive;
- wire Worker bindings;
- deploy;
- configure OAuth;
- create Queue/provider resources;
- perform any retry or ad-hoc correction.

The authorized protected-variable + one-dispatch gate is consumed successfully.

Next action belongs to Codex: independently review this evidence and define the next separately
authorized Stage 6 gate.


### Production runtime privilege verification — successful; gate stopped

The user explicitly authorized exactly one manual dispatch of
`Production runtime privilege verification` on the current `main`.
No retry was performed.

GitHub evidence:

- workflow: `.github/workflows/production-runtime-privileges.yml`;
- workflow ID: `368160001`;
- run ID: **`36318081404`**;
- run number: `1`;
- run attempt: `1`;
- event: `workflow_dispatch`;
- branch: `main`;
- exact head SHA:
  `d4c82a3729e9cdda89b6122ea1438dfb53150a12`;
- status: `completed`;
- conclusion: **`success`**;
- created/started: `2026-09-27T12:10:02Z`;
- completed/updated: `2026-09-27T12:10:29Z`;
- protected deployment environment: `production-db`.

Exact job:

- job ID: `108616489607`;
- name: `Verify production runtime privileges`;
- status: `completed`;
- conclusion: **success**.

All executed job steps completed successfully:

1. Set up job;
2. pinned checkout;
3. pinned pnpm setup;
4. pinned Node setup;
5. `pnpm install --frozen-lockfile`;
6. **Verify production runtime privilege contract**;
7. post Node setup;
8. post pnpm setup;
9. post checkout;
10. complete job.

Verifier log emitted the safe terminal summary:

`Production runtime privilege verification passed for localization role vico_forum_runtime and web role vico_forum_web.`

The workflow environment showed:

- `RUNTIME_DATABASE_ROLE=vico_forum_runtime`;
- `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`;
- `DATABASE_URL` remained masked by GitHub.

No secret value or connection string is recorded here.

The successful verifier therefore provides the repository-owned read-only production acceptance
for the already provisioned localization and web runtime capabilities on the same exact main SHA
used by the relation-grant workflow.

Observed warnings are not classified as current Stage 6 defects:

- `pg` / `pg-connection-string` warned that SSL mode alias semantics will change in a future
  major version; the current connection completed and the privilege verifier passed;
- GitHub Actions warned that one pinned action still targets Node.js 20 and is being forced to run
  on Node.js 24; the current run completed successfully.

These are future dependency/runner maintenance signals, not failures of the current Stage 6 gate.

Per the bounded stop condition, ChatGPT did not perform or request:

- any rerun;
- database credential/password creation or rotation;
- Hyperdrive provisioning or binding changes;
- Worker wiring/deploy;
- Google OAuth configuration;
- authorization bootstrap;
- Queue/provider provisioning;
- other production mutations.

The one-dispatch verifier authorization is consumed successfully.

Next action belongs to Codex: independently review this verifier evidence and define the next
separately authorized Stage 6 gate.


### Runtime-wiring preflight — subtask 1/5: Worker DB adapter capability map

Codex requested a bounded read-only runtime-wiring preflight after successful production runtime
privilege verification. Per project decomposition rules, this entry records only subtask 1:
current Worker composition and capability routing. No Cloudflare topology check, official
Wrangler/Hyperdrive research, deadline selection, repository PR, credential mutation or deploy was
performed yet.

Exact repository target:

`main = d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

#### Current composition

`workers/app.ts` currently obtains exactly one database connection string:

```ts
const connectionString = env.HYPERDRIVE.connectionString;
```

That single connection is currently passed to every request-side PostgreSQL adapter:

- Better Auth runtime;
- forum reader;
- forum writer;
- locale registry loader;
- persistent UI translation store/bundle reader;
- persisted content-translation presentation reader;
- dynamic authorization capability;
- content-generation status reader.

`wrangler.jsonc` likewise exposes only one binding, `HYPERDRIVE`.

This is still the pre-wiring repository composition. It must not be interpreted as evidence that
the newly accepted web role is already connected to the Worker.

#### Exact capability routing derived from current queries

**Keep on accepted `localization-read` capability / existing `HYPERDRIVE`:**

1. `createHyperdriveRegistryLoader`
   - reads `locales`;
   - fits the accepted localization-only relation set.

2. `createHyperdriveUiTranslationStore`
   - reads `ui_translations` and `ui_translation_bundles`;
   - fits the accepted localization-only relation set.

**Route to the accepted cache-disabled `web` capability in the future wiring step:**

3. `createHyperdriveAuthRuntime`
   - Better Auth schema is exactly
     `user`, `session`, `account`, `verification`, `rate_limit`;
   - accepted web ACL has SELECT/INSERT/UPDATE/DELETE on all five.

4. `createHyperdriveForumReader` / `createHyperdriveForumWriter`
   - current repository operations use
     `forum_categories`, `forum_sections`, `forum_topics`, `forum_posts`,
     `forum_topic_title_revisions`, `forum_post_revisions`, and Better Auth `user`;
   - current reads/writes match the reviewed web matrix;
   - the existing per-author cooldown mutex performs `SELECT ... FOR UPDATE` on `user`, matching
     the already reviewed reason for web `user.UPDATE`.

5. `createHyperdriveAuthorization`
   - current repository queries use `user`,
     `authz_roles`, `authz_role_permissions`, `authz_user_roles`,
     `authz_user_permission_overrides`, `authz_mutation_lock`;
   - it does not query the deliberately excluded `authz_permissions` table;
   - its SELECT/INSERT/UPDATE/DELETE operations match the accepted web ACL exactly.

6. `createHyperdriveContentTranslationBatchReader` used by
   `ContentTranslationPresentationService`
   - request-side presentation reads only
     `forum_topic_title_translations` and `forum_post_body_translations`;
   - those two relations are explicitly SELECT-only in the accepted web capability;
   - therefore persisted forum-content **presentation belongs to web**, not to localization-read.

#### Adapter that cannot be assigned to either accepted HTTP capability

7. `createHyperdriveContentGenerationStatusReader`

Its SQL reads all of:

- `translation_task_generation_heads`;
- `translation_tasks`;
- `content_topic_title_translation_tasks`;
- `content_post_body_translation_tasks`.

These relations are intentionally absent from both accepted runtime capability matrices. In
particular, `docs/database/HYPERDRIVE.md` explicitly says the current web capability must not
receive translation task/generation-head grants while content generation remains disabled.

Current main is nevertheless safe from an actual status-table query:

- Worker composition sets
  `contentGenerationActionContext = DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`;
- `app/routes/topic.tsx` computes
  `canGenerateTranslations = permission && contentGenerationActionForRequest(context).enabled`;
- the status reader is called only inside `if (canGenerateTranslations)`;
- with the current Worker composition that condition is always false.

Therefore the status adapter is **injected but operationally dormant**: it receives the current
connection string object, but no PostgreSQL client/query is created through it on the current
disabled-generation request path.

#### Stage classification

No defect was found in the already accepted localization/web ACL matrices.

The current one-binding Worker composition is also not classified as a regression in an already
accepted web deployment: web Worker wiring has not happened yet and Stage 6 is explicitly at the
runtime-wiring boundary.

There is, however, one **current Stage 6 wiring requirement/blocker**:

- the upcoming wiring-preparation change must split localization adapters from web adapters;
- it must **not** simply route `contentGenerationStatusReader` to the new web binding, because the
  web role correctly lacks its four task/generation relations;
- while content generation remains disabled, the wiring must preserve a state in which this
  status path cannot perform DB access under either accepted HTTP runtime role;
- widening the web ACL with task/generation tables merely to satisfy the dormant adapter would
  contradict the reviewed capability contract.

The exact code shape for preserving the disabled status path is intentionally not selected in this
audit; that belongs to the later reviewed repository wiring-preparation design.

Deadline/client-factory behavior is deliberately deferred to preflight subtask 4/5 rather than
mixed into this capability-routing result.

No external mutation and no repository implementation PR was created.

Next preflight subtask after explicit user continuation: read-only Cloudflare Worker/Build branch,
preview topology, existing `HYPERDRIVE` binding and caching-state verification.


### Runtime-wiring preflight — subtask 2/5: repository topology verified; private Cloudflare topology not observable

This entry records only subtask 2 of the bounded read-only runtime-wiring preflight:
Cloudflare Worker/Build branch topology, preview isolation, existing Hyperdrive binding/config and
caching state. No Cloudflare mutation, repository implementation PR, credential operation or deploy
was performed.

Exact repository target remains:

`main = d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

#### Tool/access preflight

The available ChatGPT toolset has no Cloudflare account connector. Plugin-directory lookup for
`Cloudflare Workers Hyperdrive` returned no installable plugin. Therefore this session cannot
authenticate to the user's private Cloudflare control plane.

This matters because the current source-of-truth explicitly says actual Workers Builds branch
settings are external state and are not stored in Git; Stage 6 requires them to be rechecked in the
actual Cloudflare control plane before write/private-data rollout.

Accordingly no claim below treats repository configuration as proof of the current private
Cloudflare dashboard state.

#### Repository-side topology confirmed from current main

`wrangler.jsonc` currently defines:

- Worker name `vico-forum`;
- entry point `./workers/app.ts`;
- one Hyperdrive binding only:
  `HYPERDRIVE`;
- one checked-in Hyperdrive configuration ID for that binding;
- no `env.*` blocks;
- no second web Hyperdrive binding;
- no checked-in routes/custom-domain stanza;
- no checked-in preview-specific Hyperdrive/resource isolation stanza.

The current Worker composition likewise references only:

`env.HYPERDRIVE.connectionString`.

Repository GitHub Actions contain:

- PR-only CI/build/local Hyperdrive smoke;
- manual production database identity/migration/runtime-privilege/provisioning workflows.

There is **no repository GitHub Actions Worker deploy workflow** and no `wrangler deploy` script in
`package.json`.

PR CI uses only the local override
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` against disposable PostgreSQL 17.
That is local test wiring, not external preview/production Cloudflare evidence.

#### What repository source-of-truth says about external state

Current `docs/database/HYPERDRIVE.md` and `PROJECT_STATE.md` state that:

- native Cloudflare Workers Builds had previously been connected to GitHub `main`;
- the recorded project state says that integration for active development `main` was later
  disabled;
- exact external build/branch setting is intentionally not represented in Git and must be
  rechecked in Cloudflare during Stage 6;
- existing deployed localization foundation uses the read-only localization Hyperdrive path;
- the separate cache-disabled web Hyperdrive binding and Worker wiring are not yet accepted;
- before any preview capability gains auth/forum writes or private production data, preview must be
  isolated with separate resources/secrets or disabled.

This repository record is useful history/baseline, but it is **not** fresh Cloudflare
control-plane evidence.

#### Facts that cannot be honestly verified in this session

Without authenticated Cloudflare account access, this subtask cannot currently prove:

1. whether native Workers Builds integration is still disabled today;
2. which production branch, preview branches or branch filters the Cloudflare project currently
   uses;
3. whether preview deployments are enabled and, if so, what bindings/secrets/resources they inherit;
4. whether any currently deployed Worker version is attached to the checked-in `HYPERDRIVE`
   binding ID;
5. the current Hyperdrive configuration's origin username/credential identity;
6. actual Hyperdrive query-cache state/configuration in Cloudflare;
7. whether any dashboard-only binding/config drift exists relative to `wrangler.jsonc`.

Public repository data or a public Worker response cannot establish these private configuration
facts, so no web/public inference was substituted.

#### Stage classification

No repository defect is established by this access limitation.

However, **fresh private Cloudflare topology evidence remains a current Stage 6 gate** before
auth/forum write/private-data deployment, because the project's own preview/private-data boundary
requires it.

The checked-in repository currently has no mechanism that would accidentally deploy the new web
capability through GitHub Actions. The unresolved risk is external dashboard/build topology, not
repository CI.

The future web binding must remain separate from the existing localization binding, and preview
must not inherit production web write/private-data capability unless explicitly isolated and
accepted.

No mergeable PR is justified from this subtask alone. First the actual Cloudflare external state
must be observed through an authenticated control-plane path or equivalent owner-provided evidence.

Next preflight subtask after explicit user continuation: official-documentation verification for
the exact current Wrangler/Hyperdrive version and supported separate cache-disabled web binding /
credential update model. That research can proceed independently of the unresolved private
Cloudflare visibility gap.


### Runtime-wiring preflight — subtask 3/5: official Wrangler/Hyperdrive contract

This entry records only subtask 3 of the bounded read-only runtime-wiring preflight. It verifies the
supported Cloudflare mechanism for a separate cache-disabled web Hyperdrive, credential
create/update/rotation, and environment-specific bindings. No Cloudflare/Neon mutation, repository
implementation PR or deploy was performed.

Exact repository target remains:

`main = d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

Exact repository toolchain:

- `wrangler = 4.130.0`;
- `@cloudflare/vite-plugin = 1.54.6`.

The conclusions below were checked against current official Cloudflare documentation and the
Cloudflare `workers-sdk` source at exact tag `wrangler@4.130.0`.

Official references:

- https://developers.cloudflare.com/hyperdrive/concepts/query-caching/
- https://developers.cloudflare.com/hyperdrive/reference/wrangler-commands/
- https://developers.cloudflare.com/hyperdrive/configuration/rotate-credentials/
- https://developers.cloudflare.com/hyperdrive/configuration/local-development/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/wrangler/environments/
- https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/

#### Separate cache-disabled web configuration is directly supported

Cloudflare explicitly recommends a separate cache-disabled Hyperdrive configuration for freshness-
sensitive reads such as authentication, sessions, permissions and read-after-write paths.

Supported create form:

`wrangler hyperdrive create <name> --connection-string="<...>" --caching-disabled`

Cloudflare also explicitly supports multiple Hyperdrive configurations/bindings from one
application, including multiple configurations targeting the same database.

This matches the already reviewed Vico capability split:

- existing `HYPERDRIVE` remains the localization-read capability;
- future web capability should use a second Hyperdrive configuration with query caching disabled;
- Better Auth, forum writes/reads requiring freshness, authorization, and persisted forum-content
  presentation can be routed through that second binding;
- there is no reason to repurpose or credential-widen the existing localization configuration.

Cloudflare documents that caching is enabled by default and that write operations do not invalidate
cached SELECT results. Therefore the existing project requirement that the web capability be
cache-disabled is not merely conservative: it directly follows the documented consistency model.

#### Exact Wrangler 4.130.0 command support

Cloudflare's exact `wrangler@4.130.0` source confirms that both Hyperdrive `create` and
`update` accept:

- `--connection-string`;
- `--origin-host` / `--origin-port`;
- `--database`;
- `--origin-user`;
- `--origin-password`;
- `--caching-disabled`;
- `--max-age`;
- `--swr`;
- TLS/mTLS options and origin connection-limit options.

Exact `create` also supports an optional binding name and config-file update path. This means the
new external Hyperdrive resource can be created independently and its returned configuration ID can
then be reviewed before repository wiring is merged; automatic config mutation is not required.

Exact `update` performs a partial config patch, so later credential rotation can update the
existing web Hyperdrive either with a full connection string or selected origin fields.

#### Credential creation/rotation semantics

Current Cloudflare guidance supports two rotation models:

1. create a new Hyperdrive configuration with new origin credentials, then move the Worker binding
   to the new config — easiest rollback because the old config remains intact;
2. update the existing Hyperdrive configuration in place with new origin credentials.

Cloudflare documents an important in-place update behavior:

- updating credentials does **not** purge query cache;
- updating credentials does **not** tear down the existing origin connection pool;
- newly established connections use the updated connection information.

Cloudflare now also exposes a pool restart operation. Restart drains existing connections and
forces new ones, but Cloudflare describes it as a break-glass action because in-flight requests can
briefly fail. Therefore a restart is not a default credential-update step.

For Vico's first web setup there is no accepted web Hyperdrive configuration yet. The simplest
supported shape is therefore:

- create/set the future web PostgreSQL credential under a separately authorized DB gate;
- create a **new** cache-disabled web Hyperdrive using that credential;
- bind its returned ID separately in repository wiring;
- leave the existing localization Hyperdrive unchanged.

This avoids any need to mutate or restart the accepted localization pool during initial web
provisioning.

Later rotation policy can independently choose new-config cutover for easiest rollback or in-place
update when appropriate; that decision is not needed to complete the first web wiring.

#### Worker environment / preview implications

Wrangler documents bindings as non-inheritable environment configuration. If Vico introduces named
Cloudflare environments, each environment must explicitly declare its own Hyperdrive bindings;
a top-level production-capable binding must not be assumed to carry safely into a named preview
environment.

With the Cloudflare Vite plugin, `CLOUDFLARE_ENV` selects the Cloudflare environment at dev/build
time. Current official docs note that setting `CLOUDFLARE_ENV` at `vite preview` or
`wrangler deploy` time does not retroactively change the environment selected for the built
artifact.

No named environment layout is selected here because subtask 2 established that the actual private
Cloudflare Build/preview topology is still unobservable from this session. The relevant conclusion
is only that Wrangler has a supported explicit isolation mechanism and Hyperdrive bindings must be
defined per environment if that mechanism is used.

#### Local development with two bindings

Official Hyperdrive local-development behavior is per binding:

`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING_NAME>`.

Thus a future second web binding can receive its own local override while the existing
`HYPERDRIVE` keeps its current override.

In local mode these connection strings bypass Hyperdrive itself, so Hyperdrive query caching and
pooling are not exercised. Real cache-disabled Hyperdrive acceptance therefore remains an external
Stage 6 check rather than something local CI can prove.

#### Stage classification / reviewed implication

No conflict was found between current Cloudflare capabilities and
`docs/database/HYPERDRIVE.md`. The repository's planned two-capability design is supported by the
current platform and exact pinned Wrangler version.

No current-Stage reason exists to:

- widen the localization role;
- reuse the existing localization Hyperdrive with web credentials;
- enable query caching on the web capability;
- restart the accepted localization Hyperdrive;
- introduce a dependency/toolchain upgrade merely to obtain these features.

The remaining unresolved item from subtask 2 is external topology evidence, not platform support.

Next preflight subtask after explicit user continuation: derive web PostgreSQL/client deadlines from
the actual Better Auth/forum/authz request paths rather than copying localization
`500/1500/2000ms` defaults.


### Runtime-wiring preflight — subtask 4/5: initial web PostgreSQL/client deadline profile

This entry records only subtask 4 of the bounded read-only runtime-wiring preflight. It derives an
initial deadline profile from the actual Better Auth/forum/authz request paths and current platform
semantics. No role setting, password, Hyperdrive, Worker, repository implementation or deploy was
mutated.

Exact repository target remains:

`main = d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

Official references checked:

- node-postgres Client configuration:
  https://node-postgres.com/apis/client
- node-postgres Pool configuration:
  https://node-postgres.com/apis/pool
- PostgreSQL `statement_timeout` / `lock_timeout`:
  https://www.postgresql.org/docs/current/runtime-config-client.html
- Cloudflare Hyperdrive connection pooling:
  https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/
- Cloudflare Hyperdrive connection lifecycle:
  https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/
- Cloudflare Hyperdrive limits:
  https://developers.cloudflare.com/hyperdrive/platform/limits/

#### Current code behavior

The accepted localization path already has:

- client `connectionTimeoutMillis = 1000`;
- client `query_timeout = 2000`;
- database+role defaults:
  `lock_timeout = 500ms`,
  `statement_timeout = 1500ms`.

The web adapters currently do **not** apply those localization client settings:

- Better Auth creates plain `new Client({ connectionString })`;
- forum creates plain `new Client({ connectionString })`;
- authorization creates request-local `new Pool({ connectionString, max: 1 })`.

That is correct for the current repository boundary because web Hyperdrive wiring has not yet been
accepted. It becomes a current Stage 6 requirement when the new web binding is wired.

A read-only production catalog check also confirmed:

- `vico_forum_runtime` has database-specific
  `lock_timeout=500ms`, `statement_timeout=1500ms`;
- `vico_forum_web` currently has **no** database-specific role settings.

No DB setting was changed.

#### Actual web query/locking shapes

**Better Auth**

The runtime owns one DB client per auth operation and uses the database-backed Better Auth tables:
`user`, `session`, `account`, `verification`, `rate_limit`.
The schema provides primary/unique/index support for the identity/session/account/verification and
rate-limit keys. These paths need fresh reads and short writes, not localization-tight timeouts.

**Public forum reads**

The public reader executes bounded category/section/topic queries with joins/aggregates over forum
tables and `user`. Topic page loading uses separate topic and post queries. These are still
ordinary request-path SQL, but they are broader than the tiny indexed localization reads.

**Forum writes**

Topic/reply creation intentionally serializes each author's posting through:

`SELECT user ... FOR UPDATE`

and, while holding that row lock, reads the author's latest post and performs the forum inserts in
the same transaction.

Solved/best-answer mutations similarly lock the topic row `FOR UPDATE`.

These critical sections contain only DB work and are designed to be short; there is no external
provider/API work inside them. A `500ms` lock timeout would nevertheless be unnecessarily tight
for legitimate concurrent requests and transient Hyperdrive/origin scheduling.

**Authorization reads**

Per-request authorization resolution uses a repeatable-read read-only snapshot and several
small queries. The management page additionally reads all current users/roles/grants/overrides.
The permission catalog is currently only eight code-backed keys.

**Authorization writes**

Every authorization mutation deliberately serializes on the singleton
`authz_mutation_lock ... FOR UPDATE`. While holding it, the transaction:

- counts managers before;
- verifies the actor's effective permission;
- performs the requested mutation;
- counts managers after;
- may update the singleton state;
- commits.

`replaceRoleGrants` can additionally perform one insert per selected permission. With the current
eight-key catalog this is still bounded and small, but it is materially more work than one
localization lookup.

#### Initial web deadline profile

For the first cache-disabled web Hyperdrive acceptance, use this **initial calibration profile**:

```text
connectionTimeoutMillis = 3000ms
lock_timeout             = 2000ms   (database+role default)
statement_timeout        = 5000ms   (database+role default)
query_timeout            = 7000ms   (node-postgres Client/Pool)
```

Required ordering:

```text
lock_timeout < statement_timeout < query_timeout
```

Rationale:

- **3s connection timeout**: still fails boundedly at the Worker client layer, but gives the
  freshness-sensitive web path more room than the already calibrated tiny localization reads;
- **2s lock timeout**: permits normal short contention on the per-author forum mutex and the
  authorization singleton without allowing an HTTP request to queue behind a lock for a long
  period;
- **5s statement timeout**: gives forum aggregate reads, Better Auth CRUD, authorization snapshot
  reads and bounded management mutations materially more room than localization while still
  killing pathological individual statements well below Hyperdrive's current 60s statement limit;
- **7s client query timeout**: leaves a 2s margin for PostgreSQL's server-side timeout to surface as
  the specific SQLSTATE/message before the client-side read timeout becomes the outer failure.

These are **not production SLO claims**. They are initial safe rollout values derived from current
query shapes and must be measured through the actual new cache-disabled Hyperdrive before final
Stage 6 acceptance. If real p95/p99 or controlled lock tests show a mismatch, adjust from observed
evidence rather than mechanically preserving these numbers.

#### Server vs client placement

Keep the same separation already proven for localization:

- `lock_timeout` and `statement_timeout` as PostgreSQL database+role defaults on the
  `vico_forum_web` origin role;
- `connectionTimeoutMillis` and `query_timeout` in the web node-postgres Client/Pool factory.

This ensures every newly established web origin session receives the server deadlines while all
application-created Clients/Pools have bounded caller-side waits.

Cloudflare Hyperdrive's transaction pooling means server session state is reset between borrowers;
database+role defaults are the stable source for new origin sessions, matching the existing
localization acceptance model.

#### Settings deliberately not added

Do **not** add additional timeout knobs merely for completeness in the first web rollout:

- no copied localization values;
- no global/database-wide `statement_timeout`;
- no `idle_in_transaction_session_timeout` or PostgreSQL 17 `transaction_timeout` yet;
- no per-route timeout matrix;
- no long-running transaction wrappers to preserve session settings.

Current transactions contain no external calls or intentional idle period, and Better Auth's
internal transaction behavior should not be constrained by new server-wide knobs without a
demonstrated need.

#### Failure classification / code implication

Current forum and authorization availability wrappers already classify the exact known
node-postgres connection/query timeout shapes through `postgres-deadlines.ts`.

The upcoming wiring-preparation implementation should therefore introduce one shared web
Client/Pool configuration boundary rather than independently hard-code timeout values in Better
Auth, forum and authorization adapters. Exact code shape remains an implementation choice, but all
three web adapter families must receive the same caller-side profile.

Server-side `55P03` lock timeout and exact `57014` statement timeout are already recognized by
the shared timeout classifier.

#### Stage classification

No already-deployed runtime defect is established: the web capability is not yet Worker-wired.

This is a **current Stage 6 wiring requirement**:

- web client connections must not remain unbounded when the new binding becomes active;
- the web role needs reviewed database-specific lock/statement defaults before deployed acceptance;
- real Hyperdrive calibration is required because local Hyperdrive overrides bypass real pooling
  and network behavior.

No mergeable PR or DB mutation is justified by this subtask alone.

Next preflight subtask after explicit user continuation: combine subtasks 1–4 into the minimal
reviewed Stage 6 ordering, identify the exact repository-preparation PR scope and the external gates
that must remain separately authorized.


### Runtime-wiring preflight — subtask 5/5: minimal reviewed ordering and repository scope

This entry completes the five-part bounded read-only runtime-wiring preflight requested by Codex.
No Cloudflare/Neon/GitHub external mutation, credential operation, deploy or mergeable PR was
performed.

Exact repository target remains:

`main = d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

The ordering below is a ChatGPT technical proposal for independent Codex review; under the project
review protocol it is not yet an accepted implementation instruction.

#### Newly identified current-Stage documentation drift

Current `main` still states in `PROJECT_STATE.md` that external web PostgreSQL role/grants and
protected `WEB_RUNTIME_DATABASE_ROLE` are absent.

That statement is now stale relative to the already accepted Stage 6 evidence:

- `vico_forum_web` exists;
- owner phase committed successfully;
- protected `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web` was set;
- exact 50 web relation privilege pairs were provisioned;
- production runtime privilege verifier run `36318081404` completed successfully for both
  localization and web roles.

What is still genuinely absent is:

- usable web-role password/credential;
- web-role database-specific deadline defaults;
- separate cache-disabled web Hyperdrive;
- web Worker binding/routing;
- deployed web runtime acceptance.

This is a **current Stage 6 source-of-truth drift hypothesis**, not future groundwork. It should be
independently checked by Codex and corrected in the next mergeable documentation/runtime-preparation
change if confirmed. ChatGPT did not edit `main` documentation here.

#### Gate 0 — resolve private Cloudflare topology before any runtime-code merge

Subtask 2 remains the one unresolved evidence gap.

Before merging any runtime-affecting wiring-preparation or binding change, obtain authenticated
read-only Cloudflare evidence for the current `vico-forum` Worker/Build project:

- current production branch/build trigger state;
- whether preview deployments/builds are enabled;
- which bindings/resources preview inherits;
- current deployed `HYPERDRIVE` binding/config presence;
- current localization Hyperdrive caching state;
- whether a dashboard-only configuration differs from checked-in `wrangler.jsonc`.

Reason: the project contract requires ordinary `main` merges not to imply production promotion,
and preview must not receive production web write/private-data capability. Repository history says
native Git integration is disabled, but the project explicitly requires fresh Stage 6 verification
because that private setting is not stored in Git.

If production/preview auto-deploy is active, stop and resolve deployment/preview isolation before
merging runtime code. Do not treat repository history as fresh control-plane proof.

#### Gate 1 — one small repository wiring-preparation PR, no external binding ID

After Gate 0 proves merges cannot unexpectedly promote the Worker, create one mergeable
wiring-preparation PR from exact current `main`.

Minimal scope:

1. **Synchronize factual Stage 6 state**
   - update `PROJECT_STATE.md` and relevant database/runbook history so the accepted web role,
     grants, protected variable and successful runtime verifier are recorded as external facts;
   - continue to state clearly that password, web Hyperdrive, Worker binding and deployed
     acceptance are not complete.

2. **Define the web client deadline boundary**
   - add one shared web PostgreSQL client/pool profile corresponding to the reviewed initial
     calibration:
     `connectionTimeoutMillis=3000ms`,
     `query_timeout=7000ms`;
   - keep server-side `lock_timeout=2s` and `statement_timeout=5s` external role defaults, not
     hard-coded session SETs;
   - tests must verify caller-side ordering/values and preserve the existing exact timeout
     classification semantics.

3. **Make the dormant generation-status boundary fail closed at Worker composition**
   - while `contentGenerationActionContext` remains disabled, the HTTP Worker must not prepare to
     route `createHyperdriveContentGenerationStatusReader` through either accepted HTTP runtime
     capability;
   - do not widen web/localization ACL and do not enable generation.

4. **Prepare tests/structure for two connection capabilities without inventing an external ID**
   - no second Hyperdrive ID is written yet;
   - no Cloudflare resource/binding is created by this PR;
   - no provider/Queue/OAuth/bootstrap scope expansion;
   - adapter public/domain contracts remain unchanged.

The implementation method remains open to Codex. Existing auth/forum/authz/content-presentation
constructors already have injectable Client/Pool boundaries, so a large refactor is not required.

Readiness for this PR:

- full CI green;
- current one-binding local smoke remains green;
- no `WEB_HYPERDRIVE` ID/config is guessed;
- content generation remains disabled;
- documentation no longer claims the already-provisioned web role/grants are absent.

#### Gate 2 — separately authorized production web credential + server deadline defaults

Only after Gate 1 review/merge, perform a new explicit external authorization gate against exact
production role `vico_forum_web`.

The gate should atomically establish:

- a usable generated password/credential for `vico_forum_web`;
- database-specific role defaults for database `vico_forum`:
  `lock_timeout=2s`,
  `statement_timeout=5s`.

Required post-check must prove, without revealing the password:

- role attributes/ACL/membership are otherwise unchanged;
- direct database/schema/relation capability remains the already accepted contract;
- exact database-role settings are present;
- localization role/settings remain unchanged.

Secret material must not be written to service PRs, logs or repository files.

Failure before commit => rollback. Any post-commit recovery/rotation path requires its own reviewed
contract; do not improvise cleanup that drops the already accepted web grants.

#### Gate 3 — separately authorized new cache-disabled web Hyperdrive

After the web credential/defaults are accepted, create a **new** Hyperdrive configuration rather
than mutating the accepted localization configuration.

Proposed safe naming:

- external Hyperdrive resource: a web-specific `vico-forum` name;
- Worker binding name: **`WEB_HYPERDRIVE`**.

No existing repository contract already reserves a different web binding name, so
`WEB_HYPERDRIVE` is a proposal for Codex review, not an accepted name yet.

Required external properties:

- same production Neon database target;
- origin user exact `vico_forum_web`;
- SQL query caching disabled;
- existing localization Hyperdrive remains untouched;
- no credential value exposed in evidence.

Record only safe resource identity/config metadata needed by the subsequent repository wiring PR.

If private Cloudflare topology from Gate 0 shows preview inheritance, this resource must not be made
available to preview/private-data paths until preview is explicitly isolated or disabled.

#### Gate 4 — atomic binding + Worker routing PR

Once the real web Hyperdrive ID exists, perform binding configuration and application routing in
**one mergeable PR**, because splitting a binding from its code routing would create an
unnecessarily incoherent intermediate state.

Proposed routing contract:

**Existing `HYPERDRIVE` / localization-read**
- locale registry;
- persistent UI translation store/bundles.

**New `WEB_HYPERDRIVE` / web**
- Better Auth;
- forum reader/writer;
- dynamic authorization;
- persisted topic-title/post-body translation presentation.

**Neither accepted HTTP binding**
- content-generation status/task path while generation remains disabled.

This PR should also:

- wire the shared web Client/Pool caller deadlines from Gate 1 into Better Auth/forum/authz/content
  presentation;
- add the returned real Hyperdrive ID to `wrangler.jsonc`;
- update local CI with
  `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_WEB_HYPERDRIVE` pointing to the same disposable
  local PostgreSQL 17 test database;
- preserve the existing
  `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`;
- add focused tests proving capability routing/fail-closed generation behavior;
- update `docs/database/HYPERDRIVE.md` / `PROJECT_STATE.md` to distinguish
  repository-wired-but-not-yet-deployed state from external deployment acceptance.

No migration, ACL widening, provider, Queue, OAuth bootstrap or unrelated refactor belongs in this
PR.

#### Gate 5 — explicit deployment + real web Hyperdrive acceptance

Deployment remains a separate external mutation requiring explicit user authorization.

Before deploy:

- recheck exact merged `main`;
- recheck preview isolation/build topology;
- confirm the required Worker secrets/environment needed by the currently merged application are
  present and appropriate for the target candidate.

Do not silently expand this database-wiring gate into Google OAuth setup merely because the Worker
contains Better Auth. If required auth secrets are not ready, stop and let Codex order the separate
OAuth gate before full application deployment.

After deployment, the web runtime acceptance should prove at minimum:

- existing localization reads still use the localization capability;
- public forum reads use the web capability successfully;
- fresh auth/session/authorization DB access works through cache-disabled web Hyperdrive once the
  relevant auth environment is ready;
- controlled forum write + immediate read observes fresh data;
- authorization next-request freshness remains intact;
- origin sessions through the web Hyperdrive observe
  `lock_timeout=2s` / `statement_timeout=5s`;
- caller-side connection/query timeout behavior is bounded;
- controlled short lock contention validates the initial 2s web lock policy;
- no task/generation relation access is available through the web capability;
- preview cannot exercise production web write/private-data capability.

The initial `3s / 2s / 5s / 7s` profile is accepted only after this real path calibration; adjust
from measured evidence if needed.

#### Minimal sequence

Proposed shortest safe order:

1. fresh read-only Cloudflare topology/preview evidence;
2. repository wiring-preparation + factual evidence-sync PR;
3. explicit web credential + DB role deadline-default gate;
4. explicit new cache-disabled web Hyperdrive provisioning;
5. atomic real binding + Worker routing PR using the returned config ID;
6. explicit deploy + real Hyperdrive/runtime smoke/calibration;
7. Codex reviews evidence and only then orders the next Stage 6 slice (OAuth/bootstrap or another
   remaining external gate).

This keeps every irreversible/external action separately authorized, avoids widening the accepted
localization capability, and avoids creating a guessed binding in Git before the external resource
exists.

#### Preflight completion

All five requested read-only preflight subtasks are now complete to the extent allowed by the
available tools.

Resolved:

- adapter-to-capability mapping;
- generation-status mismatch/fail-closed requirement;
- exact current Wrangler/Hyperdrive platform support;
- initial web deadline profile;
- proposed minimal repository/external sequencing.

Still unresolved by tool access:

- fresh authenticated private Cloudflare Build/preview/binding/caching topology.

No mergeable PR should be created from these findings until Codex independently reviews the
completed preflight and either confirms the proposal or records a technical disagreement.


### Cloudflare Gate 0 — evidence 1: native Git Builds integration is disconnected

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum` on the
Production settings screen.

Observed safely from the screenshot:

- Worker: `vico-forum`;
- environment tab shown: `Production`;
- Settings → Builds section shows `Git repository` with action `Connect`;
- therefore no Git repository is currently connected to native Cloudflare Workers Builds for this
  Worker/environment;
- no automatic GitHub `main` build/deploy path is currently established through native Workers
  Builds;
- no setting was changed while collecting this evidence.

This confirms the repository source-of-truth statement that native Cloudflare Git integration is
disabled today, eliminating the risk that merely merging the upcoming repository wiring-preparation
PR would automatically promote it through native Workers Builds.

The same screenshot also shows the `Previews Base` runtime tab exists, but it does **not** by
itself prove whether previews are enabled for external traffic or which bindings/secrets/resources
they receive. That remains unresolved.

Next read-only Cloudflare evidence needed: inspect `Previews Base` and its Bindings/resource
configuration without changing settings.


### Cloudflare Gate 0 — evidence 2: Previews Base has no connected bindings

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum`.

Observed from Settings → Bindings with the `Previews Base` tab selected:

- `Previews Base` currently shows **No connected bindings**;
- therefore no Hyperdrive, Queue, KV/R2/D1 or other binding is presently configured in that
  preview-base binding set;
- no production Hyperdrive binding is visible as inherited into `Previews Base` through this
  configuration;
- no setting was changed while collecting the evidence.

This materially reduces the current preview/private-data risk: the preview-base binding set does
not presently expose the production localization Hyperdrive, and there is no web write binding yet.

This screenshot does not by itself prove whether preview deployments can be created/exposed, nor
does it prove production bindings/config details. Those remain separate read-only checks.

Next evidence needed: Production → Bindings for exact current production binding names/types, then
the production Hyperdrive configuration details/caching state.


### Cloudflare Gate 0 — evidence 3: production binding matches repository configuration

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum`.

Observed from Settings → Bindings with the `Production` tab selected:

- exactly one connected production binding is visible;
- type: `Hyperdrive`;
- binding name: `HYPERDRIVE`;
- target configuration name: `vico-forum-registry`;
- no second web Hyperdrive binding is present;
- no setting was changed while collecting the evidence.

This matches checked-in `wrangler.jsonc`, which currently contains exactly one
`HYPERDRIVE` binding, and confirms there is no dashboard-only second web binding drift at this
point.

Together with the earlier preview evidence:

- Production has the existing localization Hyperdrive binding;
- Previews Base has no connected bindings.

Remaining Gate 0 checks are the configuration details of `vico-forum-registry`: origin role
identity and query-cache state, plus deployment/version/route visibility sufficient to detect
dashboard-only drift.


### Cloudflare Gate 0 — evidence 3: production binding matches checked-in localization topology

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum`.

Observed from Settings → Bindings with the `Production` tab selected:

- one connected production binding is shown;
- type: `Hyperdrive`;
- binding name: `HYPERDRIVE`;
- bound Hyperdrive resource name: `vico-forum-registry`;
- no second web Hyperdrive binding is present in the visible production bindings list;
- no setting was changed while collecting this evidence.

This matches the checked-in `wrangler.jsonc` topology at the binding-name level: current runtime
has one localization Hyperdrive binding named `HYPERDRIVE`. It also confirms that the future web
binding has not been provisioned/wired yet.

The screenshot does not expose the Hyperdrive resource's origin username or query-cache
configuration. Those remain the next read-only Gate 0 evidence items.


### Cloudflare Gate 0 — evidence 4: localization Hyperdrive origin and cache state verified

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Hyperdrive configuration
`vico-forum-registry`.

Observed safely from the Settings page:

- configuration name: `vico-forum-registry`;
- database name: `vico_forum`;
- origin user: `vico_forum_runtime`;
- PostgreSQL port: `5432`;
- password is masked in the UI and was not copied or recorded;
- query caching is explicitly **disabled** for this Hyperdrive configuration;
- configured origin connection soft limit shown by Cloudflare: `20`;
- no setting was changed while collecting this evidence.

The database host was visible in the owner screenshot, but it is intentionally not copied into this
coordination channel because the Stage 6 evidence need is resource identity/capability, not origin
connection detail.

This confirms that the currently deployed production `HYPERDRIVE` binding points to the accepted
localization runtime role and that the existing localization Hyperdrive is cache-disabled. It also
confirms there is no need to mutate or repurpose this accepted configuration for the future web
capability.

Combined Gate 0 evidence now establishes:

- native Cloudflare Git Builds integration is disconnected;
- `Previews Base` has no connected bindings;
- Production has one visible binding, `HYPERDRIVE -> vico-forum-registry`;
- that Hyperdrive targets database `vico_forum` as `vico_forum_runtime`;
- query caching is disabled.

Remaining read-only Gate 0 evidence: current deployed Worker version/deployment route/domain state,
to confirm the live deployment surface and check for dashboard-only drift relative to the
repository config. No external mutation has been performed.


### Cloudflare Gate 0 — evidence 5: active deployment is intentionally behind current main

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum` on the
`Deployments` page.

Observed from the active deployment panel and version/build history:

- active Cloudflare Worker version ID: `78f87645`;
- traffic allocation: `100%`;
- deployment shown as approximately 12 days old;
- active version history row is associated with branch `main` and
  `docs: reprioritize roadmap around forum core (#50)`;
- the corresponding recent-build row shows commit prefix `e26d145`.

GitHub PR #50 independently resolves that deployment source to merged commit:

`e26d145609f942f82209057662ea92422efa99f9`.

Current repository `main` is:

`d4c82a3729e9cdda89b6122ea1438dfb53150a12`.

Therefore the live Worker is deliberately behind current `main`; this is consistent with the now
disconnected native Git Builds integration and with the project policy that ordinary feature merges
must not imply production promotion.

This is not classified as a deployment defect by itself. Stage 6 explicitly expects the external
pre-release candidate to lag repository development until a reviewed runtime rollout is authorized.

The deployment screenshot also supports that an active production Worker exists and currently
receives all production traffic. No deploy, rollback, promote or traffic change was performed.

Remaining Gate 0 read-only evidence: exact current Worker domain/route exposure. After that, the
Cloudflare topology preflight can be closed and returned to Codex for independent review.


### Cloudflare Gate 0 — evidence 6: production and preview workers.dev exposure; no custom routes

Fresh owner-provided Cloudflare dashboard evidence was reviewed for Worker `vico-forum` on the
`Domains` page.

Observed:

- Production Worker URL is enabled on the account `workers.dev` subdomain;
- Preview wildcard Worker URL is also enabled;
- the UI states both URLs are publicly reachable unless Access is enabled;
- no custom domains are configured;
- no custom zone routes are configured;
- no setting was changed while collecting this evidence.

This establishes that preview is an externally reachable surface in principle, even though prior
Gate 0 evidence shows `Previews Base` currently has **no connected bindings** and native Git Builds
is disconnected.

Stage classification:

- preview URL enablement alone is not a current defect;
- it becomes unsafe only if production private/write resources or secrets are made available to a
  preview deployment;
- current binding evidence shows no such preview binding exposure, but preview runtime
  variables/secrets still need one final read-only check before declaring the preview/private-data
  topology fully observed.

Production exposure is currently only the account `workers.dev` URL; there are no custom
domains/routes to account for in the first Stage 6 runtime rollout.

Remaining Gate 0 evidence: `Previews Base` runtime variables/secrets presence/absence. Secret
values must remain masked and must not be copied into service PR evidence.
