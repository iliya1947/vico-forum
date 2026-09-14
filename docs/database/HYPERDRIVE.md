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

Новые forum/auth/translation write-capabilities не добавляются в этот role механически.
Они проектируются по фактическим runtime operations на Stage 6 external integration.

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

Ранее native Cloudflare Workers Builds был подключён к GitHub `main`. По current Cloudflare
Build Branches contract push в production branch запускает build и deploy command.

Для нового forum-first workflow ordinary merge в active development `main` не должен
автоматически означать production promotion. До первого forum-code PR нужно через current
Cloudflare Branch control выбрать управляемый вариант: отключить production auto-deploy от
active development branch, использовать отдельную release branch или эквивалентно отделить
feature merges от production deployment.

Точное external setting не хранится в Git и должно быть проверено в актуальном Cloudflare UI
перед Stage 4B merge.

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

Stage 6 обязан заново проверить фактическую Cloudflare branch/build topology перед real auth
и forum write acceptance.

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
