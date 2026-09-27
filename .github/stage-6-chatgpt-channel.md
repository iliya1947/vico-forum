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
