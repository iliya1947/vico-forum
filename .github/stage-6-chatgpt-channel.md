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
