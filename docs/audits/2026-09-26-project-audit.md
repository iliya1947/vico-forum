# Полный аудит Vico Forum — 2026-09-26

## Объём и baseline

Аудит выполнен против product baseline `56d4788911134e49ac01533a98c0c35f622ec6a8`
(`Docs: close Stage 5 local CI phase (#120)`). Открытые PR, их ветки, diff, review comments,
описания и CI evidence в аудит не включались. Последующие служебные audit-коммиты также не
считались частью проверяемого продукта.

Проверены все 288 tracked paths baseline: 29 Markdown-документов, 190 TypeScript/TSX-файлов,
22 SQL-файла, 9 GitHub scripts, workflows, конфигурация, lockfile, 21 database test file,
Drizzle schema и 21 snapshot/journal generation. Всего baseline содержит 92 165 строк, включая
generated snapshots и lockfile.

Аудит охватывает:

- полное чтение актуальных source-of-truth документов и сверку Stage 0–5 claims;
- архивную документацию как архив, а не как действующий contract;
- request/auth/session, authorization, forum reads/writes, Markdown и SSR boundaries;
- locale resolution, UI/content translation, planning, budgets, provider allowance, durable tasks,
  publication, presentation и degradation semantics;
- PostgreSQL schema, append-only migrations, Drizzle parity и clean-database constraints;
- unit, database, Workers smoke, build, lint и type paths;
- CI/production-migration automation, secrets patterns, dependency advisories и production-license
  inventory.

External Stage 6 acceptance (реальные Google OAuth credentials, deployed Hyperdrive, Queues,
provider binding и production data) не выполнялся: по `PROJECT_STATE.md` и `ROADMAP.md` он ещё не
является подтверждённым состоянием проекта и требует отдельного разрешения/окружения. Это граница
проекта, а не основание объявлять external acceptance успешным.

## Метод

1. Source-of-truth документы прочитаны полностью; claims сопоставлены с route, service, repository,
   schema, migration, test и workflow boundaries.
2. Production-код проверен по trust boundaries: client input, auth/session cookies, permissions,
   origin protection, SQL parameterization, error classification, resource limits, untrusted
   provider output, Markdown rendering, logging/redaction и cleanup.
3. PostgreSQL 17.11 установлен локально; создана disposable `vico_forum_test`, после чего выполнен
   полный database test config и Workers smoke с local Hyperdrive override.
4. Все repository checks повторно выполнены на точной pinned-версии Node `24.21.0` и pnpm `12.3.4`.
5. Для auth-cookie boundary выполнен отдельный database-backed reproduction с Better Auth `1.7.4`.
6. JSON/Markdown links/secrets проверены отдельными repository-wide сканами; dependency graph
   подтверждён через `pnpm audit` и `pnpm why`.

## Findings и степень подтверждения

### AUD-01 — conflicting auth `Set-Cookie` headers — подтверждённое поведение, production impact требует Google OAuth acceptance

`workers/app.ts` до маршрутизации всегда вызывает `initializeAuthContext()`, включая
`/api/auth/*`. Если входящая Better Auth cookie истекла, pre-routing `getSession()` возвращает
очищающие `Set-Cookie`. Затем auth handler может успешно выпустить новую `session_token`, но
`withAuthSessionCookies()` добавляет старые clearing cookies **после** cookies handler response.

Database-backed reproduction на Better Auth `1.7.4` подтвердил порядок final headers:

```text
better-auth.session_token=<new token>; Max-Age=604800; ...
better-auth.session_token=; Max-Age=0; ...
```

Подтверждено именно формирование response с двумя конфликтующими directives одного cookie name.
Предполагаемое следствие: auth callback/sign-in, получивший истёкшую cookie, может создать
server-side session, после чего browser применит clearing directive. Reproduction использовал тот
же Better Auth cookie/session boundary с включённым test-only email/password flow, а не реальный
Google OAuth callback. Поэтому конфликт response headers является текущим дефектом boundary, но
частота и пользовательский impact production Google OAuth остаются непроверенными до Stage 6
acceptance. Severity до этой проверки не фиксируется.

Рекомендуемое направление: auth resource route не должен получать post-handler clearing cookies
из предварительного session lookup либо merge должен разрешать одинаковые cookie names в пользу
auth handler. Нужен regression integration test именно для expired-cookie + successful auth response.

### AUD-02 — forum write boundary не ограничивает размер title/body — hardening gap, не подтверждённый Stage 5 defect

`requiredFormText()` и `ForumService.requireText()` проверяют только непустое значение. PostgreSQL
хранит title/post body как unbounded `text`; database constraints также проверяют только `btrim(...)`
на непустоту. Auth, permission, same-origin и пятисекундный cooldown присутствуют, но authenticated
client может регулярно отправлять platform-sized title/body.

Возможное следствие: непропорциональные DB storage, SSR/Markdown parsing и будущие
translation-planning costs; cooldown ограничивает частоту, но не стоимость одной операции. Однако
проверенные contracts не задают конкретный maximum title/body и не утверждают, что application
limit уже реализован в Stage 5. Поэтому отсутствие limit подтверждено, но считать его дефектом
текущего Stage без отдельного product/security решения нельзя.

Рекомендуемое направление: единые server-owned byte/character limits для topic title и post body,
проверяемые до DB write, с tests на Unicode, Markdown и граничные значения. Client limits могут
дублировать UX, но не заменять server validation.

### AUD-03 — две transitive tooling advisories — advisory подтверждены, exploitability не подтверждена

`pnpm audit --audit-level low` завершился с code 1:

- High: `sharp@0.35.2` через `miniflare@5.20260908.0-alpha`; patched `>=0.35.4`;
- Moderate: `esbuild@0.18.20` через
  `drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils`; patched `>=0.25.0`.

`pnpm why` подтверждает development/build paths; прямых imports из application runtime нет.
Подтверждено присутствие версий, совпадающих с advisory ranges. Эксплуатация в фактических Vico
build/CI inputs не воспроизводилась, поэтому severity advisory нельзя автоматически переносить на
severity проекта. Требуется applicability review; исправление следует делать через проверенное
обновление owning top-level dependencies/resolution, а не неподтверждённый override.

### AUD-04 — три broken relative links в архивных копиях — подтверждённый факт, не подтверждённый defect

- `doc_old/docs/translation/PROVIDERS_AND_JOBS_old_22.9.26_1.md` содержит два неразрешимых link;
- `doc_old/docs/translation/STORAGE_AND_VERSIONING_old_22.9.26_1.md` содержит один.

Все relative links в актуальной документации разрешаются. Архивные ссылки не влияют на active
contracts; проект не фиксирует policy, должны ли перемещённые historical copies оставаться
navigable или сохраняться байт-в-байт. Без такого policy это observation, а не основание для fix.

## Предупреждения без текущего дефекта

- Database suite проходит 189 tests, но `pg@8.23.0` трижды предупреждает, что вызов
  `client.query()` во время уже выполняющегося query будет удалён в pg 9. Это относится к тестовым
  concurrency fixtures и не ломает pinned pg 8, но должно быть устранено до будущего pg 9 upgrade.
- `runForumMutation()` превращает любой непредусмотренный writer exception в generic `503`, тогда
  как более новые boundaries классифицируют availability failures и пробрасывают programming/schema
  errors. Это ухудшает observability, но текущий публичный response остаётся fail-closed; отдельного
  пользовательского Stage 4 contract на раскрытие внутренних ошибок нет.
- Production license inventory содержит только MIT, ISC и Apache-2.0 package declarations. Это
  inventory, не юридическое заключение и не проверка notices/source-offer obligations.

## Успешные проверки

- `pnpm install --frozen-lockfile` — lockfile и supply-chain policy verification passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — Wrangler types, React Router typegen и `tsc -b` passed.
- `pnpm test` — 61 files, 536 tests passed.
- `pnpm build` — client и Workers SSR production bundles built.
- `pnpm db:check` — migration metadata valid.
- `pnpm exec drizzle-kit generate --name=audit-schema-parity` — no schema changes.
- `pnpm db:test` на PostgreSQL 17.11 — 20 files, 189 tests passed.
- Workers smoke с local Hyperdrive override — passed.
- migration-history tests — 5/5 passed.
- production-privilege tests — 14/14 passed.
- runtime-migration-evidence tests — 4/4 passed.
- tracked JSON parse, current Markdown relative links, `git diff --check`, `git fsck` и
  credential-pattern scan — passed; найденные URL являются local/example fixtures.

## Сверка с текущим состоянием

Stage 0–5 repository/local-CI claims в `PROJECT_STATE.md` подтверждены build/test/database evidence.
Content-generation runtime в `workers/app.ts` остаётся намеренно disabled, а external OAuth,
Hyperdrive writes, Queues/providers и deployment acceptance корректно остаются Stage 6. В active
documentation не найдено утверждений, будто эти external checks уже завершены.

До разрешения conflicting-cookie boundary из AUD-01 нельзя считать Google OAuth acceptance
проверенным; окончательный impact должен установить Stage 6 smoke. AUD-02 требует отдельного
product/security решения о limits. AUD-03 требует applicability review до решения об update или
risk acceptance. AUD-04 не требует изменения без принятого archive-link policy. Аудит не
подтвердил, что AUD-02–AUD-04 являются текущими product defects.
