# Neon and Hyperdrive operations

## Назначение

Этот документ описывает уже существующий Neon/Hyperdrive foundation и правила его
использования. Он **не является обязательным gate для каждого feature PR**.

До Stage 6 default development path — local/CI PostgreSQL. Реальный Hyperdrive используется
для задач, которым действительно нужны его pooling/caching/network semantics, и для
pre-release/release external integration.

## Current localization capability boundary

Production Worker получает `HYPERDRIVE` binding существующего localization path.
`vico_forum_runtime` имеет только необходимые read-only privileges:

```text
public.locales
public.ui_translations
public.ui_translation_bundles
```

Role не должен иметь schema ownership/`CREATE`, table ownership, `INSERT`, `UPDATE`,
`DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, migration или admin capability.
`DATABASE_URL` не является Worker secret/variable.

Stage 5A использует `ui_translation_bundles` как первый read для canonical non-English
locale/namespace. Это остаётся той же request-scoped read-only capability: на bundle miss
допустим fallback-read `ui_translations`, а canonical English DB не читает. Новых grants или
отдельного connection pool для runtime-read slice не требуется.

Новые forum/auth/translation write-capabilities не добавляются в этот role механически.
Они проектируются по фактическим runtime operations на Stage 6 external integration.

## Stage 6 reviewed web capability contract

После schema-first acceptance through `0020` repository фиксирует две отдельные HTTP runtime
capabilities:

1. `localization-read` — существующие `HYPERDRIVE` + environment-specific localization role,
   только `SELECT` на `locales`, `ui_translations`, `ui_translation_bundles`;
2. `web` — отдельная cache-disabled capability для Better Auth, forum, dynamic authorization и
   persisted forum-content presentation.

Production role names остаются environment-specific inputs. Current production evidence использует
`vico_forum_runtime` через `RUNTIME_DATABASE_ROLE` и уже provisioned `vico_forum_web` через
protected `WEB_RUNTIME_DATABASE_ROLE`. Exact web relation grants, shared runtime privilege
verification и server-side `lock_timeout=2s` / `statement_timeout=5s` defaults приняты, но usable
web credential, отдельный web Hyperdrive и Worker routing ещё не созданы.

Reviewed web relation ACL:

```text
user, session, account, verification, rate_limit
  SELECT, INSERT, UPDATE, DELETE

forum_categories, forum_sections
  SELECT

forum_topics, forum_posts
  SELECT, INSERT, UPDATE

forum_topic_title_revisions, forum_post_revisions
  SELECT, INSERT

forum_topic_title_translations, forum_post_body_translations
  SELECT

authz_roles
  SELECT, INSERT, UPDATE, DELETE

authz_role_permissions
  SELECT, INSERT, DELETE

authz_user_roles
  SELECT, INSERT, UPDATE

authz_user_permission_overrides
  SELECT, INSERT, UPDATE, DELETE

authz_mutation_lock
  SELECT, UPDATE
```

`user.UPDATE` также нужен существующему forum cooldown mutex через `SELECT ... FOR UPDATE`.
При текущем Worker composition content generation остаётся disabled, поэтому web capability
намеренно **не** получает direct grants на `authz_permissions`, translation task/generation-head
tables, request-budget counters либо UI localization tables.

Обе runtime capabilities требуют:

- LOGIN и effective database `CONNECT`;
- no SUPERUSER / CREATEDB / CREATEROLE / REPLICATION / BYPASSRLS;
- no inherited role membership; existing managed database-owner inbound admin control допустим
  только в той же non-inheriting/non-SET форме, которую уже принимает production DB contract;
- no schema/table/sequence/view ownership;
- `public.USAGE` без `CREATE`;
- complete database ACL snapshot по `CONNECT` / `CREATE` / `TEMPORARY`: runtime role может
  иметь только optional direct non-grantable `CONNECT`; direct `TEMPORARY`, `CREATE`, grant
  option или иная database capability запрещены;
- `PUBLIC` database ACL допускает только hard-wired-equivalent non-grantable
  `CONNECT` / `TEMPORARY` либо их отсутствие; `CREATE` и grant options запрещены;
- no grant options, column ACL, sequence grants или direct function grants;
- никаких custom default grants runtime roles; для `PUBLIC` сохраняется только уже принятая
  hard-wired-equivalent function `EXECUTE` / type `USAGE` default semantics, без
  relation/sequence/schema defaults.

Repository verifier/provisioning preparation:
- `.github/scripts/runtime-privileges.mjs` хранит named capability contracts и читает полный
  database ACL через `aclexplode(COALESCE(datacl, acldefault('d', datdba)))`, поэтому default
  `datacl IS NULL` и explicit runtime grants проверяются одной fail-closed границей;
- `.github/scripts/verify-runtime-privilege-probes.mjs` применяет exact grants к disposable
  PostgreSQL 17 и выполняет positive/negative SQL probes;
- manual main-only relation-provisioning workflow использует existing protected migration
  connection как exact `vico_forum_migrator`, проверяет observable owner-phase prerequisites и
  derive-ит все table GRANT statements только из `runtimeCapabilityContracts.web`;
- passwordlessness не читается migrator из `pg_roles`: owner phase создаёт role exact
  `PASSWORD NULL`, а provisioning workflow до DB connection требует reviewed confirmation token
  `owner-phase-password-null-confirmed`; token — operator evidence, не DB-derived password check;
- relation GRANTs выполняются одной transaction и перед commit проходят shared full runtime
  privilege assertion; CI отдельно моделирует successful split-authority path и rollback при
  prerequisite drift;
- manual main-only `Production runtime privilege verification` после отдельного external
  provisioning выполняет read-only catalog verification обоих roles.

Current production sequence уже прошла owner phase, migrator-owned exact relation grants и
successful read-only runtime privilege verification для `vico_forum_runtime` и
`vico_forum_web`. Migration workflow при этом остаётся независимым от наличия web role:
runtime privilege verification — отдельная post-schema acceptance boundary.

Fresh auth/session/permission и read-after-write paths должны использовать cache-disabled
Hyperdrive. Cloudflare допускает несколько Hyperdrive configurations/bindings для одной
application; exact web binding name/ID и forum/auth deadline defaults выбираются в отдельном
runtime-wiring step и этим contract не задаются.

### One-time web credential bootstrap preparation

Repository содержит manual main-only workflow
`.github/workflows/production-web-credential-bootstrap.yml` для единственного bootstrap usable
credential уже принятой SQL-created `vico_forum_web`. Workflow использует protected
`NEON_OWNER_DATABASE_URL`, `WEB_RUNTIME_DATABASE_ROLE` и временный Environment secret
`WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP`; merge сам по себе ничего во внешней БД не меняет.

Перед password mutation workflow fail closed проверяет exact production owner/session/database,
safe role attributes/membership, принятые `2s/5s` defaults, полный localization/web ACL contract,
direct/unpooled Neon owner target и disabled bind-parameter values in error logging. Cleartext
password не включается в SQL: runner локально строит PostgreSQL SCRAM-SHA-256 verifier, а server
получает verifier параметром через transaction-local setting. После commit выполняется отдельный
bounded login как `vico_forum_web`; failure/ambiguous outcome без retry возвращает credential в
`PASSWORD NULL`.

Этот workflow является временным bootstrap mechanism. До отдельного explicit authorization
запрещено создавать bootstrap secret или dispatch-ить workflow. Successful credential bootstrap
сам по себе также не создаёт Hyperdrive/binding/deploy. После accepted Hyperdrive evidence временный
secret удаляется, а lifecycle bootstrap workflow/script рассматривается отдельным cleanup PR.

Official reference:

```text
https://developers.cloudflare.com/hyperdrive/concepts/query-caching/
```

## Development path

Cloudflare официально поддерживает local Hyperdrive development через
`localConnectionString` или environment variable
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING_NAME>`. В этом режиме Worker code
работает локально и подключается прямо к указанной DB; Hyperdrive pooling/query caching не
участвуют.

Для Vico это означает:

```text
local/disposable PostgreSQL 17
→ CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
→ Workers-compatible local runtime
→ app/db integration tests
```

Этот path является default для Stage 4 forum development.

Пример локальной integration среды:

```sh
docker run --rm --detach --name vico-forum-postgres \
  --env POSTGRES_DB=vico_forum_test \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_USER=postgres \
  --publish 5432:5432 postgres:17

until docker exec vico-forum-postgres \
  pg_isready --username postgres --dbname vico_forum_test; do sleep 1; done

DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/vico_forum_test' \
  pnpm db:test

export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=\
'postgresql://postgres:postgres@127.0.0.1:5432/vico_forum_test'
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4173 \
  > /tmp/vico-preview.log 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true; docker stop vico-forum-postgres' EXIT
./scripts/smoke-workers.sh http://127.0.0.1:4173
```

`pnpm db:test` нельзя запускать против Neon: test suite намеренно destructive и принимает
только local DB с именем `_test`.

Official reference:

```text
https://developers.cloudflare.com/hyperdrive/configuration/local-development/
```

## External deployment policy

Ранее native Cloudflare Workers Builds был подключён к GitHub `main`. Для forum-first workflow
ordinary merge в active development `main` не должен автоматически означать production
promotion.

Fresh Stage 6 Gate 0 в Cloudflare UI подтвердил текущее состояние: native Git Builds integration
отключён; live Production Worker намеренно отстаёт от repository `main`; Production содержит
только `HYPERDRIVE -> vico-forum-registry`; `Previews Base` не имеет bindings или runtime
variables/secrets. Production и preview `workers.dev` URLs включены, custom domains/routes
отсутствуют.

Это mutable external state и оно не хранится в Git как authoritative configuration, поэтому перед
будущим deploy topology перепроверяется ещё раз.

Official reference:

```text
https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
```

## External schema/runtime ordering

Когда runtime **реально выкатывается** во внешний pre-release/production environment и
начинает зависеть от новой schema, применяется порядок из `MIGRATIONS.md`:

```text
reviewed migration
→ target DB migration + verification
→ runtime rollout
```

Для ordinary local/CI development Stage 4 этот deployed ordering не требуется.

## Pre-release lifecycle

Существующий deployed environment уже использовался как pre-release production candidate
для infrastructure acceptance до появления реальных пользователей/private data.

Новый roadmap не требует поддерживать его синхронным с каждым forum development commit.
Он снова становится обязательной target environment на Stage 6, когда локально готовый
forum/auth/translation product собирается в единый external candidate.

До Stage 6:

- forum migrations могут существовать только в repository/local CI history;
- production-like Neon schema может отставать от `main`;
- real Hyperdrive smoke не выполняется для каждого feature PR;
- production runtime capability не расширяется только ради future code.

## Preview/private-data boundary

Если preview/non-production build имеет production bindings, это допустимо только пока его
capability фактически read-only и доступные данные публичны.

До любой preview capability с auth/forum writes или private production data preview path
должен быть изолирован отдельными resources/secrets либо отключён.

Stage 6 Gate 0 уже подтвердил zero bindings и zero runtime variables/secrets у
`Previews Base`. Перед real auth/forum write deployment эта mutable topology перепроверяется, и
preview по-прежнему не должен получать production private/write capability без отдельной
изоляции.

## PostgreSQL deadlines

Существующий localization read path использует:

```text
connectionTimeoutMillis = 1000ms
query_timeout            = 2000ms
lock_timeout             = 500ms   (origin role default)
statement_timeout        = 1500ms  (origin role default)
```

Инвариант текущей конфигурации:

```text
lock_timeout < statement_timeout < query_timeout
```

Эти значения относятся к маленьким indexed localization reads и не являются универсальными
forum/auth SLO. Новые forum/auth queries не должны автоматически наследовать их как
архитектурную константу; deadlines выбираются по фактическому path и проверяются ближе к
external rollout.

Первый reviewed web runtime profile использует отдельные initial values:

```text
connectionTimeoutMillis = 3000ms   (node-postgres caller)
query_timeout            = 7000ms   (node-postgres caller)
lock_timeout             = 2s       (planned database+role default)
statement_timeout        = 5s       (planned database+role default)
```

Server-side `lock_timeout` / `statement_timeout` уже применены и отдельно проверены для
`vico_forum_web`. Usable credential и real web Hyperdrive пока отсутствуют. Эти значения остаются
initial rollout profile, а не принятым production SLO или real-path calibration; фактическая
runtime acceptance по-прежнему требует измерений через новый cache-disabled web Hyperdrive.

Инвариант web profile:

```text
lock_timeout < statement_timeout < query_timeout
```

Role defaults применяются новым PostgreSQL origin sessions. Administrative catalog check
подтверждает configuration, но не доказывает state уже существующей pooled origin session.

Cloudflare Hyperdrive использует transaction pooling и reset поддерживаемого session state
между borrowers. PostgreSQL advisory locks Hyperdrive не поддерживает; их нельзя использовать
для Hyperdrive acceptance, coordination или runtime locking.

## Real Hyperdrive deadline acceptance — 2026-09-13

Acceptance существующего localization infrastructure выполнен против реального deployed
Hyperdrive path в pre-release production candidate.

Наблюдения:

1. Новые origin sessions показали `lock_timeout = 500ms` и
   `statement_timeout = 1500ms`.
2. Повторные requests подтвердили pooled connection reuse. После controlled transaction-local
   setting changes через `COMMIT` и `ROLLBACK` последующие borrowers снова видели configured
   `500ms` / `1500ms`, без leaked transaction state.
3. Statement сверх server deadline завершился SQLSTATE `57014` примерно за `1571ms`, раньше
   `2000ms` client deadline.
4. Controlled lock contention завершился SQLSTATE `55P03` примерно за `569ms`.
5. Когда server statement deadline намеренно сделали длиннее client deadline, client получил
   `Query read timeout` примерно за `2000ms`. Уникально идентифицируемый backend после этого
   не был найден в `pg_stat_activity`. Из этого **не делается вывод**, какой компонент именно
   прекратил/cancelled backend statement.

Diagnostic harness проверял `pg → Hyperdrive → PostgreSQL` infrastructure semantics, но не
исполнял deployed application request-local circuit breaker. Application circuit-breaker
behavior остаётся покрыт repository tests.

Этого acceptance достаточно как evidence существующего localization foundation. Повторять
его для обычных Stage 4 forum PR не нужно. Повторная real Hyperdrive calibration требуется,
если Stage 6 меняет relevant driver/Hyperdrive/deadline behavior или вводит новый runtime path,
для которого эти semantics критичны.

## Controlled locale writer

Existing controlled locale writer использует короткую `SERIALIZABLE` transaction и
transaction-local:

```text
lock_timeout = 2s
statement_timeout = 10s
```

Serialization/deadlock retries ограничены `40001`/`40P01`; ambiguous commit не blind-retry-ится,
а reconciles semantic state. Exact PostgreSQL `57014 / canceling statement due to statement
timeout` во время `COMMIT` проходит existing ambiguous-outcome reconciliation boundary.

Эта логика относится к locale lifecycle и не должна автоматически копироваться в forum
write services без отдельного анализа.

## Recovery

Если существующий localization registry load деградирует, bootstrap English остаётся
availability fallback, но external deployment acceptance считается failed.

Application rollback сохраняет уже применённую compatible schema; DB recovery выполняется
reviewed forward repair/restore по `MIGRATIONS.md`. Migration/admin credentials никогда не
выдаются Worker runtime для in-band repair.
