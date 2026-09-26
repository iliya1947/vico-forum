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

### AUD-01 — conflicting auth `Set-Cookie` headers — Stage 6 acceptance risk, не подтверждённый текущий defect

`workers/app.ts` до маршрутизации всегда вызывает `initializeAuthContext()`, включая
`/api/auth/*`. Если входящая Better Auth cookie истекла, pre-routing `getSession()` возвращает
очищающие `Set-Cookie`. Затем auth handler может успешно выпустить новую `session_token`, но
`withAuthSessionCookies()` добавляет старые clearing cookies **после** cookies handler response.

Database-backed reproduction на Better Auth `1.7.4` подтвердил порядок final headers:

```text
better-auth.session_token=<new token>; Max-Age=604800; ...
better-auth.session_token=; Max-Age=0; ...
```

Подтверждено формирование такого response только в synthetic flow с test-only email/password
provider. Production-конфигурация Vico включает только Google provider, а реальные Google OAuth
credentials/smoke прямо отнесены source-of-truth документами к Stage 6 и ещё не являются принятым
current path. Предполагаемое следствие для Google callback — browser применит clearing directive
после новой session cookie — не воспроизводилось. Поэтому это проверочный сценарий для будущего
Stage 6 acceptance, а не подтверждённый дефект завершённого Stage 4/5 local-CI scope.

Рекомендуемая Stage 6 проверка: real Google callback с expired incoming cookie должен подтвердить
или отклонить конфликт. Только при воспроизведении следует менять pre-routing lookup/merge и
добавлять regression integration test для production provider flow.

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

## Результат отдельной перепроверки каждого finding

| Finding | Отдельная проверка | Вердикт |
| --- | --- | --- |
| AUD-01 | Повторно проверены pre-routing `getSession`, порядок `Headers.append`, database-backed Better Auth synthetic response, enabled production provider и Stage boundaries. Конфликт headers воспроизведён только с test-only email/password provider; production Google callback не проверялся и относится к Stage 6. | **Не подтверждён как defect текущего Stage.** Это обязательный Stage 6 Google OAuth acceptance scenario. |
| AUD-02 | Поиск выполнен отдельно по active contracts, form/domain validation и DB constraints. Application limit отсутствует; [Cloudflare документирует](https://developers.cloudflare.com/workers/platform/limits/) plan-dependent request-body cap (обычно 100 MB), то есть абсолютная platform boundary существует. | **Не подтверждён как defect текущего Stage.** Это release-hardening/product-policy gap; сначала нужно принять допустимые title/body limits. |
| AUD-03 | Условия [sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) и [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) сопоставлены с `pnpm why` и source usage. Vico не импортирует `sharp`/`esbuild`; vulnerable `sharp` находится в Miniflare tooling, а `esbuild@0.18.20` — в Drizzle loader path, не в используемом Vite/esbuild dev server. Crafted HEIF processing и vulnerable esbuild serve path в Vico не воспроизведены. | **Advisory presence подтверждено; Vico vulnerability не подтверждена.** Нужен dependency update/applicability tracking, но это не доказанный application defect. |
| AUD-04 | Каждый target проверен отдельно: архивные target-файлы отсутствуют, тогда как актуальные аналоги существуют вне `doc_old`. Active-doc link scan чистый; archive-link policy отсутствует. | **Не подтверждён как defect.** Это свойство перемещённых historical copies; исправлять только после решения о policy архивов. |

Итог отдельной перепроверки: ни одно из четырёх первоначальных наблюдений не подтверждено как
дефект текущего Stage 4/5 scope. AUD-01 — Stage 6 acceptance risk, AUD-02 — hardening decision,
AUD-03 — dependency advisory без подтверждённой применимости, AUD-04 — archive-policy observation.

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

AUD-01 должен войти в Stage 6 Google OAuth callback smoke с expired-cookie case; до этого Google
OAuth acceptance и сам предполагаемый impact не подтверждены. AUD-02 требует отдельного
product/security решения о limits. AUD-03 требует applicability review до решения об update или
risk acceptance. AUD-04 не требует изменения без принятого archive-link policy. Аудит не
подтвердил ни один AUD-01–AUD-04 как текущий product defect.
