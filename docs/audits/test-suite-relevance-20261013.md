# Аудит необходимости тестов Vico Forum — временное рабочее пространство

> **Временный audit-only PR. Не объединять в `main`.** После окончания аудита владелец может закрыть PR. В нём не изменяются тесты, приложение, конфигурация и основной `PROJECT_STATE.md`.

## Зафиксированная база

- Дата инвентаризации: 2026-10-13.
- Источник: `main`, commit `83219af2c36a99dd292b6ab1a9550f49b1011c0d`.
- Полное дерево GitHub (не усечено): **118 тестовых файлов** — 77 обычных Vitest, 24 PostgreSQL Vitest, 17 Node `.test.mjs`.
- Последний проверенный CI для сопоставимого набора кода: [run #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543), **1 075 успешных кейсов** (704 обычных + 222 DB + 149 Node). CI выполнялся на head PR #221, изменявшего только `AGENTS.md`. Это не прямой запуск тестов на merge SHA `main`.
- Инвентаризация тестовых файлов завершена; индивидуальный аудит этапов 1–5 и прохода 6A выполнен. Находки и гипотезы приведены ниже; этап 6 продолжается, этапы 7–8 не начаты.
- Изменения `main` после базового SHA проверять отдельно: не переносить автоматически выводы на новый код.

## Задача и критерии

1. Установить, что именно защищает каждый тестовый кейс и соответствует ли поведение текущим требованиям/Stage.
2. Отделить полезное пересечение уровней unit / integration / PostgreSQL от повторной проверки одной и той же гарантии.
3. Классифицировать **подтверждённые** находки: сохранить / объединить / удалить / переписать; гипотезы отдельно.
4. Сверить дубли между этапами, не теряя регрессионное покрытие. Никаких удалений/правок тестов в этом PR.
5. Для каждого вывода фиксировать путь + конкретный `test()` / `it()`, проверяемую гарантию, ссылку на реализацию и доказательство, почему дубликат/устаревший/полезный.
6. Записывать результат каждого небольшого прохода в этот файл; **после прохода останавливаться** до команды владельца. Не начинать следующую подзадачу автоматически.

## План проходов

| Этап | Область | Тестовых файлов | Статус |
| --- | --- | ---: | --- |
| 1 | Миграции, CI, production-workflow (без credentials) | 8 | Завершено: 83 тест-кейса |
| 2 | Доступы и восстановление production web credential | 9 | Завершено: 66 тест-кейсов |
| 3 | Аутентификация и авторизация | 12 | Завершено: 57 кейсов, 1 кандидат |
| 4 | Форум, интерфейс, маршруты, функциональные DB-сценарии | 24 | Завершено: 24 файла, 227 кейсов |
| 5 | Локали, UI-ресурсы и маршрутизация языков | 15 | Завершено: 130 тест-кейсов |
| 6 | Переводы, генерация, фоновые задачи и хранилища | 44 | В работе: 6A–6E — 37/44 файлов, 370 кейсов |
| 7 | Оставшиеся DB/runtime контракты | 4 | Не начато |
| 8 | Общие тесты и итоговая межблочная сверка | 2 | Не начато |
| **Итого** | **Без повторного включения файлов** | **118** | **105 файлов / 933 тест-кейса проверено** |

Для крупных этапов **4** и **6** использовать несколько небольших проходов (обычно до 10–12 взаимосвязанных файлов за раз), без искусственного разрыва одной причинно связанной проверки. Этап 8 включает также поиск повторов между всеми предыдущими этапами. Распределение ниже — учётное, связанные тесты из разных этапов допустимо сопоставлять вместе.

## Реестр файлов

Отметка `[x]` означает: содержимое теста и релевантную реализацию рассмотрели и зафиксировали вывод. Она **не означает**, что тест признан лишним.

### 1. Миграции, CI, production-workflow (без credentials) — 8 файлов, завершено

- [x] `.github/scripts/migration-history.test.mjs`
- [x] `.github/scripts/production-migration-contract.test.mjs`
- [x] `.github/scripts/production-privileges.test.mjs`
- [x] `.github/scripts/production-worker-rollout.test.mjs`
- [x] `.github/scripts/provision-production-web-relations.test.mjs`
- [x] `.github/scripts/runtime-migration-evidence.test.mjs`
- [x] `.github/scripts/runtime-privileges.test.mjs`
- [x] `.github/scripts/verify-production-migration-identity.test.mjs`

### 2. Доступы и восстановление production web credential — 9 файлов, завершено

- [x] `.github/scripts/bootstrap-production-web-credential.test.mjs`
- [x] `.github/scripts/diagnose-production-web-credential.test.mjs`
- [x] `.github/scripts/production-web-credential-bootstrap-workflow.test.mjs`
- [x] `.github/scripts/production-web-credential-diagnostic-workflows.test.mjs`
- [x] `.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs`
- [x] `.github/scripts/production-web-credential-recovery-workflow.test.mjs`
- [x] `.github/scripts/recover-production-web-credential.test.mjs`
- [x] `.github/scripts/validate-production-web-credential-input.test.mjs`
- [x] `.github/scripts/verify-recovery-v2-validation-run.test.mjs`

### 3. Аутентификация и авторизация — 12 файлов, завершено

- [x] `app/auth/auth-controls.test.tsx`
- [x] `app/auth/auth.server.test.ts`
- [x] `app/auth/credential-view.test.tsx`
- [x] `app/auth/session-context.test.ts`
- [x] `app/authorization/admin-view.test.tsx`
- [x] `app/routes/auth-api.test.ts`
- [x] `app/routes/authorization-admin.test.ts`
- [x] `db/authorization-repository.test.ts`
- [x] `db/hyperdrive-authorization.test.ts`
- [x] `tests/database/auth-runtime.test.ts`
- [x] `tests/database/authorization-snapshot.test.ts`
- [x] `tests/database/forum-email-registration.test.ts`

### 4. Форум, интерфейс, маршруты, функциональные DB-сценарии — 24 файла, завершено (4A–4D)

- [x] `app/forum/content-generation-controls.test.tsx`
- [x] `app/forum/content-generation-navigation.test.tsx`
- [x] `app/forum/homepage.test.tsx`
- [x] `app/forum/markdown-editor.test.tsx`
- [x] `app/forum/markdown.test.tsx`
- [x] `app/forum/online-presence-heartbeat.test.tsx`
- [x] `app/forum/profile-view.test.tsx`
- [x] `app/forum/profile.test.ts`
- [x] `app/forum/public-authz-degradation.test.ts`
- [x] `app/forum/public-read.test.tsx`
- [x] `app/forum/route-error.test.tsx`
- [x] `app/forum/ui.test.tsx`
- [x] `app/forum/write-actions.test.ts`
- [x] `app/routes/not-found.test.ts`
- [x] `app/routes/notifications.test.ts`
- [x] `app/routes/presence.test.ts`
- [x] `app/routes/profile.test.ts`
- [x] `app/routes/unread.test.ts`
- [x] `app/ui-preview/preview-app.test.tsx`
- [x] `db/hyperdrive-forum.test.ts`
- [x] `tests/database/forum-help-attention.test.ts`
- [x] `tests/database/forum-online-presence.test.ts`
- [x] `tests/database/forum-profiles.test.ts`
- [x] `tests/database/stage4-core-e2e.test.ts`

### 5. Локали, UI-ресурсы и маршрутизация языков — 15 файлов, завершено

- [x] `app/localization/bundles.test.ts`
- [x] `app/localization/i18next-types.test.ts`
- [x] `app/localization/locale-rules.test.ts`
- [x] `app/localization/persistent-registry.test.ts`
- [x] `app/localization/persistent-sources.test.ts`
- [x] `app/localization/registry.test.ts`
- [x] `app/localization/request-context.test.ts`
- [x] `app/localization/resolver.test.ts`
- [x] `app/localization/resource-loader-bundles.test.ts`
- [x] `app/localization/resources.test.ts`
- [x] `app/routes/locale-boundary.test.ts`
- [x] `app/routes/locale-negotiation.test.ts`
- [x] `db/hyperdrive-registry.test.ts`
- [x] `db/locale-repository.test.ts`
- [x] `tests/database/hyperdrive-registry.test.ts`

### 6. Переводы, генерация, фоновые задачи и хранилища — 44 файла, в работе (6A–6E завершены)

- [x] `app/localization/cloudflare-m2m100-provider.test.ts`
- [x] `app/localization/content-generation-action.server.test.ts`
- [x] `app/localization/content-generation-view.test.ts`
- [x] `app/localization/content-markdown-translation.test.tsx`
- [x] `app/localization/content-post-body-execution.test.tsx`
- [x] `app/localization/content-post-body-planning.test.ts`
- [x] `app/localization/content-provider-allowance.test.ts`
- [x] `app/localization/content-request-budget.server.test.ts`
- [x] `app/localization/content-source-locale.test.ts`
- [x] `app/localization/content-translation-execution.test.ts`
- [x] `app/localization/content-translation-planning.test.ts`
- [x] `app/localization/content-translation-presentation.test.ts`
- [x] `app/localization/content-translation.test.ts`
- [x] `app/localization/tinyld-source-locale-detector.test.ts`
- [x] `app/localization/translation-execution.test.ts`
- [x] `app/localization/translation-provider-data-policy.test.ts`
- [x] `app/localization/translation-provider.test.ts`
- [x] `app/localization/translation-publication.test.ts`
- [x] `app/localization/translation-task-consumer.test.ts`
- [x] `app/localization/translation-task-dispatch.test.ts`
- [x] `app/localization/translation-task-reconciliation.test.ts`
- [x] `app/localization/translation-tasks.test.ts`
- [x] `app/localization/translation-validation.test.ts`
- [x] `app/localization/ui-translation-service.test.ts`
- [x] `db/content-translation-store.test.ts`
- [x] `db/hyperdrive-content-generation-status.test.ts`
- [x] `db/hyperdrive-content-translations.test.ts`
- [x] `db/hyperdrive-ui-translations.test.ts`
- [x] `db/ui-translation-bundle-store.test.ts`
- [x] `tests/database/content-generation-status.test.ts`
- [x] `tests/database/content-post-body-task-planning.test.ts`
- [x] `tests/database/content-request-budget-store.test.ts`
- [x] `tests/database/content-topic-title-execution.test.ts`
- [x] `tests/database/content-topic-title-task-planning.test.ts`
- [x] `tests/database/content-translation-store.test.ts`
- [x] `tests/database/source-locale-correction.test.ts`
- [x] `tests/database/translation-generation-authorization.test.ts`
- [ ] `tests/database/translation-task-generation-isolation.test.ts`
- [ ] `tests/database/translation-task-reconciliation.test.ts`
- [ ] `tests/database/translation-task-store.test.ts`
- [ ] `tests/database/ui-translation-bundle-store.test.ts`
- [ ] `tests/database/ui-translation-publication-store.test.ts`
- [ ] `tests/database/ui-translation-storage.test.ts`
- [ ] `tests/database/ui-translation-store.test.ts`

### 7. Оставшиеся DB/runtime контракты — 4 файлов, не начато

- [ ] `db/postgres-deadlines.test.ts`
- [ ] `db/web-runtime-wiring.test.ts`
- [ ] `tests/database/migrations.test.ts`
- [ ] `workers/database-bindings.test.ts`

### 8. Общие тесты и итоговая межблочная сверка — 2 файлов, не начато

- [ ] `app/server-logging.test.ts`
- [ ] `tests/production-migration-verifier.test.ts`

## Журнал завершённых проходов

### Разбиение этапа 6 (44 файла, без повторов)

- **6A — source locale / безопасное представление** — **7 файлов**, 69 кейсов, **завершён**: `app/localization/content-source-locale.test.ts`, `app/localization/tinyld-source-locale-detector.test.ts`, `app/localization/content-translation.test.ts`, `app/localization/content-translation-presentation.test.ts`, `app/localization/content-markdown-translation.test.tsx`, `app/localization/translation-validation.test.ts`, `app/localization/content-generation-view.test.ts`.
- **6B — провайдеры и исполнение** — **9 файлов, 118 кейсов, завершён**: `app/localization/cloudflare-m2m100-provider.test.ts`, `app/localization/content-provider-allowance.test.ts`, `app/localization/content-request-budget.server.test.ts`, `app/localization/content-generation-action.server.test.ts`, `app/localization/translation-provider-data-policy.test.ts`, `app/localization/translation-provider.test.ts`, `app/localization/translation-execution.test.ts`, `app/localization/content-translation-execution.test.ts`, `app/localization/content-post-body-execution.test.tsx`.
- **6C — планирование, очереди и публикация** — **8 файлов, 74 кейса, завершён**: `app/localization/content-translation-planning.test.ts`, `app/localization/content-post-body-planning.test.ts`, `app/localization/translation-publication.test.ts`, `app/localization/translation-task-consumer.test.ts`, `app/localization/translation-task-dispatch.test.ts`, `app/localization/translation-task-reconciliation.test.ts`, `app/localization/translation-tasks.test.ts`, `app/localization/ui-translation-service.test.ts`.
- **6D (6Г) — DB/Hyperdrive адаптеры** — **5 файлов, 31 кейс, завершён**: `db/content-translation-store.test.ts`, `db/hyperdrive-content-generation-status.test.ts`, `db/hyperdrive-content-translations.test.ts`, `db/hyperdrive-ui-translations.test.ts`, `db/ui-translation-bundle-store.test.ts`.
- **6E (6Д) — content generation PostgreSQL** — **8 файлов, 78 кейсов, завершён**: `tests/database/content-generation-status.test.ts`, `tests/database/content-post-body-task-planning.test.ts`, `tests/database/content-request-budget-store.test.ts`, `tests/database/content-topic-title-execution.test.ts`, `tests/database/content-topic-title-task-planning.test.ts`, `tests/database/content-translation-store.test.ts`, `tests/database/source-locale-correction.test.ts`, `tests/database/translation-generation-authorization.test.ts`.
- **6F — tasks/UI storage PostgreSQL** — **7 файлов**, **не начат**: `tests/database/translation-task-generation-isolation.test.ts`, `tests/database/translation-task-reconciliation.test.ts`, `tests/database/translation-task-store.test.ts`, `tests/database/ui-translation-bundle-store.test.ts`, `tests/database/ui-translation-publication-store.test.ts`, `tests/database/ui-translation-storage.test.ts`, `tests/database/ui-translation-store.test.ts`.
- Сумма 7 + 9 + 8 + 5 + 8 + 7 = **44**. Каждая позиция сверена с реестром: без пропусков и повторов. Не начинать 6F до команды владельца.

### Проход 6E / 6Д — PostgreSQL content translation/generation и авторизация (2026-10-14)

- **База:** `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`, без code/test edits. Просмотрены полностью 8 test files, их `beforeAll/beforeEach` fixtures, real PostgreSQL queries, multi-session concurrency, fake provider/Queue boundaries и postcondition assertions; сопоставлены с `PROJECT_STATE.md`, `ROADMAP.md`, `docs/translation/{CONTENT_TRANSLATION,PROVIDERS_AND_JOBS,STORAGE_AND_VERSIONING}.md`, с ранее проверенными application unit tests 6A–6C и Hyperdrive/Drizzle unit 6D. PostgreSQL только из ранее сохранённого CI; при текущем аудите ни production, ни локальная тестовая БД не запускались.
- **CI:** **8 файлов / 78 исполняемых cases** = `2 + 25 + 11 + 14 + 13 + 7 + 4 + 2`. Все файлы прошли в [GitHub database CI #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177318) на source-equivalent PR #221 (не новый прогон). Здесь нет `it.each`-расширения сверх 78 объявленных cases.
- **Файлы и предметное покрытие:**
  - [`tests/database/content-generation-status.test.ts`](../../tests/database/content-generation-status.test.ts) — **2** кейсов. PostgreSQL real adapter: title/body set-based generation-status read, live task-head/revision and locale isolation; distinctly tests SQL against 6D mock row parsing.
  - [`tests/database/content-post-body-task-planning.test.ts`](../../tests/database/content-post-body-task-planning.test.ts) — **25** кейсов. PostgreSQL real post-body planning/execution: atomic budget/task metadata, concurrency, provider windows, Markdown protection, manual-trust, lease ownership, rollback on failed task completion, FK isolation.
  - [`tests/database/content-request-budget-store.test.ts`](../../tests/database/content-request-budget-store.test.ts) — **11** кейсов. Fixed-window PostgreSQL ledger: exact per-requester/global limits, no partial global charge, lock order/concurrency, policy isolation, DB-owned reset/retry, rollback on injected failure, bounded cleanup.
  - [`tests/database/content-topic-title-execution.test.ts`](../../tests/database/content-topic-title-execution.test.ts) — **14** кейсов. PostgreSQL real title executor+dispatcher: stored kind, provider data-policy revocation, stale/reclaim/allowance lifecycle, concurrent admission, retries, authoritative revision and manual result fencing.
  - [`tests/database/content-topic-title-task-planning.test.ts`](../../tests/database/content-topic-title-task-planning.test.ts) — **13** кейсов. PostgreSQL real title planning: current immutable revision, serialized dedup and one-unit budget, pending/completed/live claim, rollback on metadata failure, FIFO enqueue post-commit, task FK and generation.
  - [`tests/database/content-translation-store.test.ts`](../../tests/database/content-translation-store.test.ts) — **7** кейсов. PostgreSQL exact title/body revision/target persistence, trusted manual-over-machine, concurrent idempotent writes, Drizzle batch no-stale leak, owner FK, SQL locale constraints and cascade.
  - [`tests/database/source-locale-correction.test.ts`](../../tests/database/source-locale-correction.test.ts) — **4** кейсов. Real route action + Postgres: authoritative revision copying, old translation remains historical, current grants/ownership, strict source-locale validations, stale/CAS concurrent corrections.
  - [`tests/database/translation-generation-authorization.test.ts`](../../tests/database/translation-generation-authorization.test.ts) — **2** кейсов. Migration/DB current grants for translation.generate built-in roles and effective dynamic deny/allow overrides, not just mocked route permission wiring.
- **Сравнение кандидатов на дублирование:**
  1. [`content-topic-title-task-planning.test.ts`](../../tests/database/content-topic-title-task-planning.test.ts) и [`content-post-body-task-planning.test.ts`](../../tests/database/content-post-body-task-planning.test.ts) повторяют high-level race/success исходы (`duplicate upsert`, `budget atomicity`, `completed/live claim`, `enqueue failure`, `metadata rollback`). Однако тестируют **разные Drizzle planning stores**, content-specific revision joins, отдельные kinds/FK/identity/budget scopes и отдельные schemas. Post-body дополнительно охраняет CNT-04 protected metadata, no partial provider publication и source-protection policy; title дополнительно проверяет его policy/allowance, cross-kind isolation. Общий durable-task backbone сам по себе **не гарантирует интеграцию обоих ресурсов**. Эквивалентных входов/выходов одной реализации не выявлено.
  2. Оба planning DB test files против [`content-translation-planning.test.ts`](../../app/localization/content-translation-planning.test.ts) и [`content-post-body-planning.test.ts`](../../app/localization/content-post-body-planning.test.ts): первые включают **реальные transaction isolation, row locks, simultaneous PG connections, FK/trigger rollback**; вторые unit fixtures проверяют **сервисную логику, порядок проверки source/provider, что именно отправляется в durable API и Queue**. Это разные границы, не взаимозаменяемые case executions.
  3. [`content-request-budget-store.test.ts`](../../tests/database/content-request-budget-store.test.ts) проверяет сам PostgreSQL fixed-window counter, сквозной lock ordering, limit `cost`, indexed cleanup. Budget predicates в title/body planning test files проверяют **атомарность совместного budget + task transaction** на разных resource-specific stores, в том числе duplicate costs. Отдельный ledger test не гарантирует правильную транзакцию конкретного planner.
  4. [`content-topic-title-execution.test.ts`](../../tests/database/content-topic-title-execution.test.ts) и execution cases внутри [`content-post-body-task-planning.test.ts`](../../tests/database/content-post-body-task-planning.test.ts) защищают **разные publication stores и provider windows**: title — one plain provider call, content-policy preflight/allowance, post — multiple ordered protected Markdown segments, token restoration, manual inserts between calls, atomic no-partial writes, reclaim races. Unit tests 6B используют mocked persistence; integration tests здесь проверяют actual task status, generation heads, lease ownership и stored translations.
  5. [`content-generation-status.test.ts`](../../tests/database/content-generation-status.test.ts) реализует SQL query через настоящий PostgreSQL с реальными revision/head/task/locale rows; [`db/hyperdrive-content-generation-status.test.ts`](../../db/hyperdrive-content-generation-status.test.ts) проверяет mocked driver cardinality, SQL invocation count, classified unavailable/cleanup and public projection. Один уровень не заменяет другой.
  6. [`content-translation-store.test.ts`](../../tests/database/content-translation-store.test.ts) проверяет реальные versioned FK/check/cascade/uniqueness constraints и race при write; [`db/content-translation-store.test.ts`](../../db/content-translation-store.test.ts) — mocked Drizzle query-count и error wrapping. Совпадающий method `readBatch` не делает один тест лишним.
  7. [`source-locale-correction.test.ts`](../../tests/database/source-locale-correction.test.ts) проверяет actual authorization current DB + route actions and concurrent revision CAS, [`translation-generation-authorization.test.ts`](../../tests/database/translation-generation-authorization.test.ts) — **отдельную permission `forum.translation.generate`** и текущие grant/override rows. Право correction `correctOwn/correctAny` не заменяет generation permission. Auth tests Stage 3 на generic permissions не подтверждают эту миграцию grants автоматически.
- **Предварительная оценка инфраструктурного покрытия:** PostgreSQL integration tests используют scoped disposable test schema/database and controlled fixtures; конкурентные тесты открывают дополнительные test connections, инъекции ошибок через rollback/temporary triggers выполняются только в test scope. Нельзя называть эти тесты реальными provider/Queue acceptance или production Neon smoke. Current Stage 5 local/CI code-backed contracts уже реализованы; Stage 6 external not-ready сам по себе не основание их удалять.
- **Итог прохода 6E:** **0 доказанных точных дублирующих кейсов, 0 файлов для удаления и 0 новых подтверждённых дефектов тестов**; многократное тестирование похожего outcome на **разных конкретных PostgreSQL resource paths** оправдано. Пересечения с оставшимся shared task/observability/UI storage в 6F проверить при следующем проходе; также сверить `COV-03` (mock-observe pass-through) с реальной PostgreSQL `observeTranslationTasks` в 6F.
- **Прогресс:** **105/118 файлов, 933/1 075 исходных кейсов проверено**. Остаётся **13 файлов и 142 кейса**, из них 6F — 7 files, Stage 7 — 4, Stage 8 — 2. Stage 6 пройдено **37/44 файла, 370 кейсов**. Следующий проход **6F (6Е)**, 7 файлов PostgreSQL shared translation-tasks/UI storage, только после отдельной команды владельца.

### Проход 6D / 6Г — PostgreSQL / Hyperdrive adapter boundaries (2026-10-14)

- **База:** GitHub `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d` без изменений. Прочитаны целиком пять test files, fixtures и assertions; сравнены с `db/{content-translation-store,hyperdrive-content-generation-status,hyperdrive-content-translations,hyperdrive-ui-translations,ui-translation-bundle-store,postgres-deadlines}.ts`, текущими `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md` и `docs/translation/{CONTENT_TRANSLATION,PROVIDERS_AND_JOBS,STORAGE_AND_VERSIONING,UI_TRANSLATION}.md`. Не производились действия с live DB или Cloudflare.
- **CI:** **5 файлов / 31 кейс** = `5+5+5+12+4`; все 31 case passed в [GitHub CI checks #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) (сопоставимый PR #221 head, не новый CI-run). `hyperdrive-ui-translations.test.ts` раскрывает три варианта `bundle read` и два варианта `unknown connect`; `ui-translation-bundle-store.test.ts` раскрывает три malformed versions/resources. Свежих тестовых прогонов не было.
- **Файлы и проверяемые contracts:**
  - [`db/content-translation-store.test.ts`](../../db/content-translation-store.test.ts) — **5** кейсов. Drizzle set-based title/post read bounded to two queries, raw/wrapped PostgreSQL unavailable and timeout classification, unexpected permission failure preserved.
  - [`db/hyperdrive-content-generation-status.test.ts`](../../db/hyperdrive-content-generation-status.test.ts) — **5** кейсов. Single SQL batch for title/body generation hints, revision exactness, bounded public state, classified unavailable versus integrity failure, cleanup preserving original errors.
  - [`db/hyperdrive-content-translations.test.ts`](../../db/hyperdrive-content-translations.test.ts) — **5** кейсов. Web caller deadline choice, PostgreSQL connection/query timeouts mapped to original-safe batch presentation, direct adapter typed classification and unexpected error/cleanup handling.
  - [`db/hyperdrive-ui-translations.test.ts`](../../db/hyperdrive-ui-translations.test.ts) — **12** кейсов. Request-scoped lazy UI store: memoized compiled bundles and raw reads, English/no-op, classified bundle and raw-table errors, broken connection circuit/reporter once and unexpected error transparency.
  - [`db/ui-translation-bundle-store.test.ts`](../../db/ui-translation-bundle-store.test.ts) — **4** кейсов. Persisted compiled bundle verifier accepts current version and rejects mismatched version, unknown source keys and structured payload; wraps as PersistentBundleIntegrityError.
- **Проверка пересечений:**
  1. `db/content-translation-store.test.ts` проверяет Drizzle storage-classification на raw/wrapped PG errors и **не-N+1** два set-based query; `db/hyperdrive-content-translations.test.ts` — upstream per-request `pg.Client` connect/timeout/cleanup и сквозной original-safe `ContentTranslationPresentationService`. Совпадение `storage-unavailable` сохраняет разные runtime boundaries. `content-translation-presentation.test.ts` из 6A использует fake reader, не реальный PG adapter.
  2. `db/hyperdrive-content-generation-status.test.ts` читает **task/status generation heads**, не stored translations. Его one-query assertion и revision/status integrity отличаются от `content-generation-view.test.ts` (pure UI state/gating) и `content-generation-controls.test.tsx` (client polling/dedup). Реальное SQL и current-generation snapshot исследовать отдельно в 6E.
  3. `db/hyperdrive-ui-translations.test.ts` `readApproved` проверяет **raw UI translation table**, `read` — **compiled bundle table**. Два похожих случая missing table/permission error не дубли: один нужен для каждого отдельного query/read path. Request-local memoization/circuit and per-request degradation отличаются от 5-stage pure bundle-resource fallback и от `db/hyperdrive-content-translations.test.ts` (single-request content batch reader).
  4. `db/ui-translation-bundle-store.test.ts` проверяет **persisted version/resource verifier** и `PersistentBundleIntegrityError` wrapping. `app/localization/bundles.test.ts` из этапа 5 защищает **compiler canonical deterministic bundle output**. Wrapper/persisted trust boundary отдельно охраняем. DB transaction/read/write/reconciliation покрытие будет сверено с реальными PostgreSQL тестами в 6F.
  5. Classified cleanup-failure preservation повторяется в нескольких адаптерах, но **применяется к разным factories/read interfaces и typed errors**, так что автоматическое удаление такой проверки из одного адаптера не сохраняет его контракт.
- **Наблюдение QUALITY-01 (не доказанная избыточность):** [`db/hyperdrive-content-translations.test.ts:23–39`](../../db/hyperdrive-content-translations.test.ts#L23-L39) `uses the shared web caller deadlines by default` проверяет указание default client factory через `readFileSync` и `source.includes("const defaultClientFactory: PostgreSqlClientFactory = createWebClient;")`. Затем тест отдельно проверяет реальные параметры `createWebClient(...)`. Такая string-based wiring assertion хрупка при безвредном переименовании/форматировании и **не запускает фабрику через default-argument** reader. Однако проверка выбираемого web factory существенна (отличается от более коротких localization deadlines), а реальные web deadline значения она подтверждает. **Кандидат на улучшение способа проверки**, не на удаление теста или изменение приложения. Не приписывать test coverage timeout path отсутствующим runtime calls.
- **Граница Stage:** local/CI typed DB reader/storage, degradation, public status and deterministic current bundle verification присутствуют в текущем Stage 5, поэтому эти проверки **не future placeholders**. External Hyperdrive/Workers AI deployed acceptance Stage 6 сюда не относится.
- **Итог:** **0 доказанных дублирующих или целиком лишних кейсов/файлов** в 6D; 1 качественное замечание `QUALITY-01` без срочного изменения. **Итого 97/118 файлов, 855/1 075 исходных кейсов**, остаётся **21 файл и 220 кейсов**. Этап 6: **29/44 файла, 292 кейса**. Далее **6E** (8 PostgreSQL content generation files), только после отдельной команды владельца.

### Проход 6C — планирование, очереди, preflight и публикация (2026-10-13)

- **База:** `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d` неизменён. Полностью рассмотрены **восемь test files** с `it.each`, fixtures/harness/assertions. Код тестов сопоставлен с implementation `app/localization/{content-translation-planning,content-post-body-planning,translation-publication,translation-task-consumer,translation-task-dispatch,translation-task-reconciliation,translation-tasks,ui-translation-service}.ts` и текущим `PROJECT_STATE.md` Stage 5A/5B, `docs/translation/{CONTENT_TRANSLATION,PROVIDERS_AND_JOBS,UI_TRANSLATION,STORAGE_AND_VERSIONING}.md`. Действия с external DB/provider/Queue не проводились.
- **CI:** **8 файлов / 74 case executions**, file-level `✓ ...(N tests)` подтверждены в [checks run #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) (на head PR #221, source-equivalent production code; **не** новый CI run). `13 + 15 + 5 + 11 + 5 + 8 + 4 + 13 = 74`. Параметризованные `it.each`: title no-job **4**, post no-job **5**, UI consumer stale reasons **6**, reconciliation invalid query **5**, UI regeneration stale classes **3**, fallback locales **2**.
- **Назначение конкретных файлов:**
  - [`app/localization/content-translation-planning.test.ts`](../../app/localization/content-translation-planning.test.ts) — **13**: Topic-title planning: authoritative current revision/source, detected und without persisting evidence, exact no-job cases, metadata-only provider capability, atomic budget admission outcome, post-commit enqueue failure.
  - [`app/localization/content-post-body-planning.test.ts`](../../app/localization/content-post-body-planning.test.ts) — **15**: Post-body planning: protected authoritative Markdown, no semantic text, segment-only provider capability, budget and current revision gates, protection policy/source fingerprint and durable task id.
  - [`app/localization/translation-publication.test.ts`](../../app/localization/translation-publication.test.ts) — **5**: UI publication after provider result: plain/plural validation, recheck of newly added manual translation, conditional claim-token publication and claim-lost mapping.
  - [`app/localization/translation-task-consumer.test.ts`](../../app/localization/translation-task-consumer.test.ts) — **11**: UI preflight after claim: current source fingerprint/policy/generation/target, exact local and persistent manual overrides, ignored fallback-locale rows and nonclaimed/terminal deliveries.
  - [`app/localization/translation-task-dispatch.test.ts`](../../app/localization/translation-task-dispatch.test.ts) — **5**: Persisted-kind dispatcher: UI/title/post handlers, missing task ack, unknown kind fail-closed before any kind-specific claim.
  - [`app/localization/translation-task-reconciliation.test.ts`](../../app/localization/translation-task-reconciliation.test.ts) — **8**: Recovery iteration: pending and expired processing reserved ids only, partial transport failure survival, query limits; includes one low-information mock store observe() passthrough test.
  - [`app/localization/translation-tasks.test.ts`](../../app/localization/translation-tasks.test.ts) — **4**: Initial UI durable task-before-enqueue, no enqueue on failed persist, pending left on enqueue error and sequential dispatch ordering.
  - [`app/localization/ui-translation-service.test.ts`](../../app/localization/ui-translation-service.test.ts) — **13**: Exact target UI translation job planning, fresh/manual/machine/stale policy priority, fallback suppression, deterministic versioned identities, invalid/unknown namespace guarding and pure plan vs dispatch.
- **Проверенные потенциальные дубли:**
  1. [`content-translation-planning.test.ts`](../../app/localization/content-translation-planning.test.ts) и [`content-post-body-planning.test.ts`](../../app/localization/content-post-body-planning.test.ts) имеют похожий набор `known/detected source`, `same-locale`, `inactive target`, `budget denied`, `enqueue fail`. Но вызывают **разные planner classes**, передают **разную task kind identity** и разные provider/data-policy metadata; post дополнительно защищает CNT-04 Markdown segments и `protectedContentPolicyVersion`. Единый upstream `ContentSourceLocaleResolver` не гарантирует, что оба planners правильно применяют его decision и transactional task upsert. Совпадение названий/веток **не основание** убирать половину матрицы.
  2. [`ui-translation-service.test.ts`](../../app/localization/ui-translation-service.test.ts) проверяет **чистое планирование exact locale и актуальность local/manual/machine policy**, [`translation-tasks.test.ts`](../../app/localization/translation-tasks.test.ts) — **UI durable job dispatcher** (upsert before enqueue, no orphan messages, input ordering), [`translation-task-reconciliation.test.ts`](../../app/localization/translation-task-reconciliation.test.ts) — **повторный transport attempt после резервирования ранее сохранённых DB records** и продолжение recovery при частичном enqueue failure. Первый dispatch и последующее восстановление — разные execution paths.
  3. [`translation-task-consumer.test.ts`](../../app/localization/translation-task-consumer.test.ts) проверяет `uiTranslationTaskStaleReason` **до provider call**, [`translation-publication.test.ts`](../../app/localization/translation-publication.test.ts) — **повторную проверку того же условия после provider call** перед conditional database publication. Даже наличие общей helper-функции не создаёт дубль: новое manual translation или изменение generation возможны между двумя моментами.
  4. [`translation-task-dispatch.test.ts`](../../app/localization/translation-task-dispatch.test.ts) — discriminator из **persisted kind** до claim; ранее проверенные `translation-execution.test.ts`, `content-translation-execution.test.ts`, `content-post-body-execution.test.tsx` — **конкретные executor claims и provider behavior** после выбора вида. Distinct trust boundary.
  5. Mock planning `upsertPending` не моделирует PostgreSQL isolation/transaction; соответствующие data-layer resource/current-revision/atomic request-budget и concurrent planning guards остаются отдельной **обязательной** проверкой в 6E/6F.
- **Замечание COV-03 / кандидат для межэтапного сопоставления, пока НЕ доказанное дублирование:** [`translation-task-reconciliation.test.ts:108–145`](../../app/localization/translation-task-reconciliation.test.ts#L108-L145) назван `exposes bounded non-sensitive operational observability`, но целиком задаёт fixture `snapshot` и утверждает `await reconciler.observe() === snapshot`. В текущем [`translation-task-reconciliation.ts:130–132`](../../app/localization/translation-task-reconciliation.ts#L130-L132) `observe()` **только делегирует** `tasks.observeTranslationTasks()` без своей filtering, bounding, redaction. Поэтому тест доказывает передачу snapshot без изменения, **не** bounded/non-sensitive характер данных. Эта гарантия должна проверяться на стороне DB reader (соответствующие 6F PostgreSQL tests) или отдельного boundary, если он есть. После сравнения с 6F можно решить, достаточен ли тест тонкого pass-through или его лучше переименовать/усилить; не удалять заранее и не считать дефектом приложения.
- **Stage:** все planning/publication/reconciliation контракты присутствуют в current Stage 5 local/CI. Stage 6 external Queue/Workers AI/authoritative live allowance/production anti-abuse acceptance не выполнен; это **не** делает тесты на уже реализованный recovery/conditional publication ненужными.
- **Результат 6C:** **0 подтверждённых целиком лишних файлов, 0 доказанных повторных кейсов**, 1 точно установленная слабость семантики тестового названия `COV-03` (не заявляется как runtime defect). **Общий прогресс: 92/118 файлов, 824/1 075 исходных кейсов; остаётся 26 файлов / 251 кейс.** Внутри этапа 6: **24/44 файла, 261 кейс**. Следующий блок **6D** (5 DB/Hyperdrive adapter tests), затем 6E/6F только по отдельным командам владельца.

### Проход 6B — провайдеры, allowance, budget, action, execution (2026-10-13)

- **База:** неизменённый `main` commit `83219af2c36a99dd292b6ab1a9550f49b1011c0d`. Полностью исследованы 9 test files, их `it.each` матрицы и тестовые harness, сверены с implementation `app/localization/{cloudflare-m2m100-provider,content-provider-allowance,content-request-budget.server,content-generation-action.server,translation-provider-data-policy,translation-provider,translation-execution,content-translation-execution,content-post-body-execution}.ts`, `PROJECT_STATE.md` (Stage 5A/5B/current Stage 5), `ROADMAP.md`, `docs/translation/{CONTENT_TRANSLATION,PROVIDERS_AND_JOBS,UI_TRANSLATION,STORAGE_AND_VERSIONING}.md`. Никаких live Workers AI/Queue/Cloudflare/Neon вызовов.
- **CI:** **9 файлов / 118 test cases** = `27+10+8+6+5+7+12+20+23`, все `✓ filename (N tests)` в [GitHub checks CI #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) на source-equivalent PR #221 head (без повторного запуска сейчас). В `cloudflare-m2m100-provider.test.ts` именно `it.each` malformed output **8** + error taxonomy **10** объясняют 27 исполнений при 11 объявлениях `it`; остальные параметризованные кейсы отдельно учтены.
- **Каждый test file и уникальная область:**
  - [`app/localization/cloudflare-m2m100-provider.test.ts`](../../app/localization/cloudflare-m2m100-provider.test.ts) — **27** cases. Cloudflare Workers AI M2M100 adapter: UI whitelist and mapping, content default-deny and per-call policy, malformed responses, documented error metadata mapping (retry/terminal), direct-call fail-closed.
  - [`app/localization/content-provider-allowance.test.ts`](../../app/localization/content-provider-allowance.test.ts) — **10** cases. Pre-claim allowance: attempt occurrence identities, title and post-body whole-attempt envelopes, stale fencing after asynchronous adapter, absent/unsupported provider vs absent allowance, deferral and segment budgets.
  - [`app/localization/content-request-budget.server.test.ts`](../../app/localization/content-request-budget.server.test.ts) — **8** cases. HMAC requester pseudonym and actor-kind/key-version separation, identity redaction, validated versioned scope/cost/window/cleanup contracts; independent of allowance before provider call.
  - [`app/localization/content-generation-action.server.test.ts`](../../app/localization/content-generation-action.server.test.ts) — **6** cases. Action boundary: server-only actor pseudonymization, automatic 3000-semantic-character threshold and explicit bypass, bounded budget-denied/no-op results, classified availability error map.
  - [`app/localization/translation-provider-data-policy.test.ts`](../../app/localization/translation-provider-data-policy.test.ts) — **5** cases. Provider/model/allowed canonical locale pair + public-title classification and operation constraints, including four malformed-configuration parameter cases.
  - [`app/localization/translation-provider.test.ts`](../../app/localization/translation-provider.test.ts) — **7** cases. Provider-neutral router chooses adapters by capability/locale and message kind, retains provenance, validates operation and refuses unsupported select structure; leaves payload untrusted for executor validation.
  - [`app/localization/translation-execution.test.ts`](../../app/localization/translation-execution.test.ts) — **12** cases. UI task executor claim/preflight/plural provider request, failed output/provenance, typed retry/terminal, durable attempt exhausted/claim loss, conditional UI publication.
  - [`app/localization/content-translation-execution.test.ts`](../../app/localization/content-translation-execution.test.ts) — **20** cases. Topic-title executor revision/source/policy/generation/target/current gates, exactly-one public-title plain request, default-deny real adapter, provider failure taxonomy, lost claim and publication fencing.
  - [`app/localization/content-post-body-execution.test.tsx`](../../app/localization/content-post-body-execution.test.tsx) — **23** cases. Post-body executor markdown segment ordering, fingerprint and policy stale checks, technical limits, precheck and between-call capability revocation, no partial publication, full provenance/token/structure validation, retry and claim loss.
- **Целенаправленная проверка дублей:**
  1. `cloudflare-m2m100-provider.test.ts` и `translation-provider-data-policy.test.ts` оба содержат разрешения public-title locale pairs, но policy unit test проверяет **валидность конфигурации и точное решение для provider/model/classification/operation**, adapter test — **вызов/невызов реального Workers AI runner, корректный provider payload и повторную policy проверку после изменения разрешения**. Оставить оба.
  2. `translation-provider.test.ts` проверяет **provider-neutral router selection и deliberate pass-through untrusted payload**. Адаптер Cloudflare проверяет реальные provider error codes и output shape, а task executors — превращение untrusted/invalid results в terminal durable outcome. Никакой один слой не заменяет два остальных.
  3. `content-request-budget.server.test.ts` = **requester HMAC pseudonym and admission policy input validation**, `content-generation-action.server.test.ts` = **authenticated actor → planner admission, UI result mapping and automatic/explicit size threshold**, `content-provider-allowance.test.ts` = **другая операция**, pre-provider **attempt capacity** и occurrence/generation fencing перед claim. Совпадение терминов `budget`, `allowance` не означает взаимозаменяемость.
  4. `translation-execution.test.ts`, `content-translation-execution.test.ts`, `content-post-body-execution.test.tsx`: общие сценарии `already-claimed → ack/no-provider`, `reclaimed exhausted → terminal/no-provider`, `claim-lost → ack`, `dependency failure → retry` повторяются у **трёх разных executor entrypoints**. Каждый владеет отдельным claim/preflight/provider/publication path; один тест UI executor не гарантирует защиту title/post executors. Единственный реальный shared durable lifecycle проверяется отдельно в Stage 6C/6F. Не сокращать сейчас.
  5. Title и post-body оба проверяют `unsupported provider` и invalid provenance, но post body дополнительно имеет **несколько последовательных provider calls**, whole-set atomic publication и protected Markdown restoration. В `content-provider-allowance.test.ts` "configured but unsupported" title/post отличаются task kind/current-source/envelope paths и принципиально отличаются от **no provider configured**: первый должен допустить terminal unsupported execution без лишнего allowance; второй обязан defer. Это действующая current Stage 5 local/CI гарантия, не гипотетический future safety mechanism.
  6. `content-post-body-execution.test.tsx` + Stage 6A `content-markdown-translation.test.tsx`: AST/token unit test гарантирует **защиту и восстановление Markdown**, executor test — **применение этой защиты при последовательных provider calls, no partial success, final conditional publish**. Похожие protected-token fixtures выполняют разные работы.
- **Релевантность Stage:** Stage 5 repository/local-CI content task execution, bounded delivery, pre-claim allowance and HMAC request-budget foundation завершены и реально присутствуют в коде. Stage 6 external deployment, real provider credentials, Cloudflare Queues, authoritative production allowance, production anti-abuse policy **не принимались и не проверялись**. Проверки fake runner/adapter не выдавать за live provider acceptance. При этом default-deny paths и unsupported-provider terminal/deferred branches — текущий явный контракт, а не причины удалить тесты из-за отсутствия реальной конфигурации.
- **Результат прохода:** **0 подтверждённых целиком лишних test files и 0 подтверждённых отдельными идентичными кейсами** в 6B. Пересечения сознательно оставлены как guards независимых entrypoints. Финальный межблочный аудит Stage 8 сравнит эти guards с DB storage/task lifecycle, но без доказанной идентичности их не удалять.
- **Прогресс:** **84/118 файлов, 750/1 075 исходных кейсов**, осталось **34 файла, 325 кейсов**. Stage 6: **16/44 файла, 187 кейсов**, остаток 28. Следующий проход **6C**, 8 файлов `content-translation-planning`, `content-post-body-planning`, `translation-publication`, `translation-task-consumer`, `translation-task-dispatch`, `translation-task-reconciliation`, `translation-tasks`, `ui-translation-service`. Остановка до команды владельца.

### Проход 6A — язык источника, Markdown, translation presentation, generation view (2026-10-13)

- **База:** тот же `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`; полностью рассмотрены 7 test files, реальные implementation `app/localization/{content-source-locale,tinyld-source-locale-detector,content-translation,content-translation-presentation,content-markdown-translation,translation-validation,content-generation-view}.ts` и runtime dependencies; сопоставлено с [`docs/translation/CONTENT_TRANSLATION.md`](../../docs/translation/CONTENT_TRANSLATION.md), Stage 5 local/CI section of [`PROJECT_STATE.md`](../../PROJECT_STATE.md), provider/execution и UI/presentation boundaries. Не выполнялись внешние provider/production calls.
- **CI:** **7 файлов / 69 кейсов** = `10 + 17 + 10 + 6 + 10 + 10 + 6`, с подтверждёнными `✓ filename (N tests)` в [CI #38372052543 checks](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) на source-equivalent PR #221; 69 passed. В текущем проходе тесты не запускались.
- **Файлы и независимые гарантии:**
  1. [`content-source-locale.test.ts`](../../app/localization/content-source-locale.test.ts), **10**: immutable current source, canonical validation, `und` detection policy and typed failures, explicit correction/new revision and future job gating.
  2. [`tinyld-source-locale-detector.test.ts`](../../app/localization/tinyld-source-locale-detector.test.ts), **17**: pinned offline TinyLD actual language samples EN/RU/HE/JA/AR, score+margin, top candidate mapping, unsupported Georgian, tech/Markdown semantic filtering, no UI locale leakage, typed failures and known-source resolver bypass.
  3. [`content-translation.test.ts`](../../app/localization/content-translation.test.ts), **10**: exact current revision identity, original-safe fallback (stale/invalid/availability/unknown source), canonical write/provenance/same-source no-op and unexpected-error propagation.
  4. [`content-translation-presentation.test.ts`](../../app/localization/content-translation-presentation.test.ts), **6**: batched independent title/post reads, wrong-row isolation, manual provenance, per-block RTL/unknown direction, same-source no-DB and classified failure behavior.
  5. [`content-markdown-translation.test.tsx`](../../app/localization/content-markdown-translation.test.tsx), **10**: mdast semantic segments, technical tokens/URLs/code/raw HTML protection, collision-safe marker set, output-set/length/structure validation, safe `ForumMarkdown` render and RTL.
  6. [`translation-validation.test.ts`](../../app/localization/translation-validation.test.ts), **10**: **UI provider** plain/plural validation, branch completeness, placeholders, protected names and control tokens, untrusted output; not substitute for markdown translation.
  7. [`content-generation-view.test.ts`](../../app/localization/content-generation-view.test.ts), **6**: exact revision/locale generation keys, 3 000 semantic character automatic vs explicit gate, current/converging/deferred/unavailable read-only presentation state.
- **Пересечения и актуальность:**
  - `ContentTranslationService.readCurrent` и `ContentTranslationPresentationService.readCurrent` share `selectCurrentContentTranslation`, но первая проверяет **single record store access/write**, вторая — **batch identity filtering, multiple independent units, direction/provenance**; сохранять.
  - `translation-validation.test.ts` проверяет UI translation descriptor plural/placeholder output, `content-markdown-translation.test.tsx` — **user-content CommonMark AST/token reconstruction**. Названия «validation» не делают тесты дублями.
  - `content-generation-view.test.ts` проверяет **pure server loader view state**, ранее проверенные `content-generation-controls.test.tsx` и `content-generation-navigation.test.tsx` — **fetcher client lifecycle и navigation stale-response fencing**. Разные механизмы.
  - `tinyld-source-locale-detector.test.ts` real-model language smoke защищает pinned TinyLD behavior. `content-source-locale.test.ts` generic resolution/policy защищает отдельно факт, что UI locale нельзя выдавать за язык публикации. Это действующая Stage 5 local/CI implementation; отсутствие deployed provider Stage 6 не основание удалить.
- **Подтверждённое локальное избыточное покрытие SRC-01:** [`content-source-locale.test.ts:58–69`](../../app/localization/content-source-locale.test.ts#L58-L69) `uses an already-canonical immutable revision locale without invoking detection` проверяет source `ru` и no `detector.detect` call с injected fake. [`tinyld-source-locale-detector.test.ts:214–238`](../../app/localization/tinyld-source-locale-detector.test.ts#L214-L238) `lets the existing resolver bypass TinyLD for a known immutable revision source` вызывает **тот же `ContentSourceLocaleResolver.resolve` для известного `ru`** с реальным `TinyLdContentSourceLocaleDetector`, но его underlying model runner подменён throwing stub и **никогда не вызывается**. Оба tests ломаются при одной и той же регрессии `ContentSourceLocaleResolver.resolve`: если для известного source начнёт вызываться `detector.detect`. При таком bypass проверка TinyLD scoring/mapping отсутствует; настоящие TinyLD cases охраняют её отдельно. **Кандидат:** оставить generic known-source no-detect case, убрать одну дублирующую known-source iteration из TinyLD test file; файл TinyLD и остальные 16 cases оставить. Различие inject-объекта не образует самостоятельной исполняемой provider-механики на known-source ветке. **Исходники не менялись**.
- **Итог:** **1 подтверждённый узкий кандидат на объединение/удаление SRC-01; 0 файлов под удаление**; остальные 68 кейсов сохранять. Общий прогресс: **75/118 файлов, 632/1 075 исходных кейсов**. Остались **43 файла, 443 кейса** (включая оставшиеся 37 файлов этапа 6, 4 этапа 7, 2 этапа 8). Следующий блок **6B**, 9 файлов — только после команды владельца.

### Проход 5 — локали / UI translation / routing (2026-10-13)

- **База:** неизменённый GitHub `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`. Все 15 test files просмотрены полностью с их fixtures, параметризованными cases и assertions. Сопоставлены с актуальными `app/localization/{bundles,locale-rules,registry,persistent-registry,persistent-sources,resource-loader,resolver,request-context}.ts`, `app/routes/{locale-boundary,locale-negotiation}`, `db/{hyperdrive-registry,locale-repository}.ts`, `docs/translation/{LOCALES,UI_TRANSLATION,STORAGE_AND_VERSIONING}.md`, `docs/database/HYPERDRIVE.md`, `PROJECT_STATE.md` и текущими CI/typecheck scripts.
- **Учтено:** **15 файлов, 130 test cases** = `12+1+5+19+11+9+7+18+5+17+6+4+7+8+1`. Все 130 присутствуют с успешным file-level `✓ ...(N tests)` в [CI checks #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) (129 cases) и [CI database](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177318) (1 case). Этот audit **не запускал** новый test run. CI выполнен на source-equivalent PR #221, а не непосредственно на merge commit main.
- **Файлы и разные проверяемые контракты:**
  - [`app/localization/bundles.test.ts`](../../app/localization/bundles.test.ts) — **12**: Deterministic compiled namespace bundle/ETag, plural expansion, source/version invalidation and inherited-name input validation.
  - [`app/localization/i18next-types.test.ts`](../../app/localization/i18next-types.test.ts) — **1**: Negative compile-time namespace/key assertions via @ts-expect-error, included in tsc -b; minimal runtime smoke is not proof of type safety by itself.
  - [`app/localization/locale-rules.test.ts`](../../app/localization/locale-rules.test.ts) — **5**: Intl/CLDR target plural categories including Arabic six-way cardinal and explicit refusal of unsupported/extension candidates.
  - [`app/localization/persistent-registry.test.ts`](../../app/localization/persistent-registry.test.ts) — **19**: Persistent locale rows and graph integrity, canonical tags, semantic identity ordering/fallback, strict degradation/unknown failures, request memoization.
  - [`app/localization/persistent-sources.test.ts`](../../app/localization/persistent-sources.test.ts) — **11**: Persistent manual-vs-machine precedence, fingerprint/policy freshness, malformed-row isolation/reporting/deduplication and scoped storage integrity.
  - [`app/localization/registry.test.ts`](../../app/localization/registry.test.ts) — **9**: In-memory bootstrap/aliases/reserved segments/fallback graph and deep immutability of returned locale snapshots.
  - [`app/localization/request-context.test.ts`](../../app/localization/request-context.test.ts) — **7**: Explicit per-request dependency injection/configuration failures for registry loader, UI store and content translation presentation.
  - [`app/localization/resolver.test.ts`](../../app/localization/resolver.test.ts) — **18**: Pure explicit locale resolution (canonical 308, unavailable 307, mutating fail-closed) and root negotiation preference/q-value logic.
  - [`app/localization/resource-loader-bundles.test.ts`](../../app/localization/resource-loader-bundles.test.ts) — **5**: Resource loader persisted exact-locale bundle hit, no raw fallback reads for target, distinct fallback locale resources and equivalent server/hydration runtime.
  - [`app/localization/resources.test.ts`](../../app/localization/resources.test.ts) — **17**: Local pack/canonical English source priority, stale fingerprint, real runtime plural lookup, RU/HE reviewed pack content and runtime isolation.
  - [`app/routes/locale-boundary.test.ts`](../../app/routes/locale-boundary.test.ts) — **6**: Actual middleware 404/non-mutating 307/308 and translated request context; public loader's classified authz degraded fallback vs unexpected failure.
  - [`app/routes/locale-negotiation.test.ts`](../../app/routes/locale-negotiation.test.ts) — **4**: Root route integration: auth locale wins, no-store redirect, query preservation, HEAD and nonlocale mutation rejected.
  - [`db/hyperdrive-registry.test.ts`](../../db/hyperdrive-registry.test.ts) — **7**: Adapter lazy shared pg/Drizzle registry load; error categorization/report once/cleanup and unexpected error propagation through mock Client.
  - [`db/locale-repository.test.ts`](../../db/locale-repository.test.ts) — **8**: Controlled SERIALIZABLE writer statement/lock deadlines, uncertain commit reconciliation, cancellation differentiation and canonical SQL DML tags.
  - [`tests/database/hyperdrive-registry.test.ts`](../../tests/database/hyperdrive-registry.test.ts) — **1**: Real node-postgres connection refused on 127.0.0.1:1 -> bootstrap English degraded; unlike mock unit tests, exercises actual pg driver error.
- **Сопоставление похожих наборов:**
  1. [`bundles.test.ts`](../../app/localization/bundles.test.ts) — compiler/version/ETag validation одного namespace; [`resource-loader-bundles.test.ts`](../../app/localization/resource-loader-bundles.test.ts) — orchestration persisted `(locale, namespace)` reads, raw-source bypass и hydration. [`resources.test.ts`](../../app/localization/resources.test.ts) — local-pack priority, explicit fallback, actual i18next lookup and reviewed RU/HE content. Отдельные уровни; даже одинаковые plural terms имеют разные input/calls/assertions.
  2. Prototype namespace vectors (`constructor`, `__proto__` и прочие) используются **на разных публичных границах**: bundle compile/verify и canonical/local source/pack validation. Их одноимённость не доказывает повтор одного call path. Не сокращать без cross-surface regression comparison.
  3. [`registry.test.ts`](../../app/localization/registry.test.ts) защищает invariants in-memory LocaleRegistry и immutable snapshots, [`persistent-registry.test.ts`](../../app/localization/persistent-registry.test.ts) — DB row adapter + full graph publication + semantic hashing и degraded fallback, [`db/hyperdrive-registry.test.ts`](../../db/hyperdrive-registry.test.ts) — request-scoped pg adapter errors и one-time reporting. Ровно один [`tests/database/hyperdrive-registry.test.ts`](../../tests/database/hyperdrive-registry.test.ts) exercises **real node-postgres connection refusal** без подмены client (порт `127.0.0.1:1` намеренно недоступен), в отличие от mocked adapter. Этот тест **не выполняет успешный запрос к действующей PostgreSQL service**; его место в `database` job — организационный выбор, не отсутствие ценности.
  4. [`resolver.test.ts`](../../app/localization/resolver.test.ts) проверяет чистые правила negotiation/redirect; [`locale-boundary.test.ts`](../../app/routes/locale-boundary.test.ts) — реальную middleware integration, fail-closed mutation и injectable context; [`locale-negotiation.test.ts`](../../app/routes/locale-negotiation.test.ts) — true root route response headers/status with user session. Пересечение правил намеренное, routing integration не гарантируется pure resolver unit test.
  5. [`persistent-sources.test.ts`](../../app/localization/persistent-sources.test.ts) обрабатывает potentially malformed **DB translation rows** и local/manual priority; [`resources.test.ts`](../../app/localization/resources.test.ts) тестирует code-owned packs/translation fallback. Отдельный trust boundary и source identity. [`db/locale-repository.test.ts`](../../db/locale-repository.test.ts) защищает legacy/current controlled registry lifecycle writes с `SERIALIZABLE`/ambiguous COMMIT; planned Stage 6 rollout pause **не делает local contract неактуальным**.
- **Особенность TYPE-01 (описание механизма, не кандидат удаления):** [`i18next-types.test.ts`](../../app/localization/i18next-types.test.ts) содержит `@ts-expect-error` negative type assertions; их защищает `pnpm typecheck` → `tsc -b`, поскольку [`tsconfig.cloudflare.json`](../../tsconfig.cloudflare.json) включает `app/**/*` и [`ci.yml`](../../.github/workflows/ci.yml) исполняет typecheck. Прохождение Vitest `1 test` **само по себе** не подтверждает корректность TypeScript constraints. Один runtime assertion на пустой `store.data` имеет низкую standalone ценность, но сам файл всё ещё нужен как compile-time type regression и безопасно удалить его без переноса этих assertions нельзя. Не предлагать переписывание ради одного прогона.
- **Stage boundary:** source-of-truth описывает Stage 5 local/CI UI resource/compiled-bundle production logic и code-owned English fallback как действующие. External Hyperdrive/provider/Queue rollout остаётся Stage 6. Отсутствие production deployment — не основание вычищать тесты реально реализованных loaders/security boundaries.
- **Вывод:** **0 доказанно лишних или побитно тождественных кейсов; 0 целиком лишних файлов** в этапе 5. Контролируемые сходства оставлены с обоснованием. Итог аудита: **68 из 118 файлов и 563 из 1 075 кейсов**, осталось **50 файлов / 512 исходных кейсов**. **Этап 6** (переводы, генерация, фоновые задачи и хранилища), 44 файла, планировать связными проходами и начинать только после команды владельца.

### Разбиение этапа 4 (учётное, без повторов)

- **4A, UI/Markdown/error/preview:** 7 файлов, **53** кейса — **завершено**.
- **4B, forum read/write и generation UI:** 5 файлов, **103 кейса — завершено** — `app/forum/public-read.test.tsx`, `app/forum/public-authz-degradation.test.ts`, `app/forum/write-actions.test.ts`, `app/forum/content-generation-controls.test.tsx`, `app/forum/content-generation-navigation.test.tsx` — **завершено**.
- **4C, пользовательские маршруты/профили/присутствие:** 7 файлов, **40 кейсов — завершено** — `app/forum/online-presence-heartbeat.test.tsx`, `app/forum/profile-view.test.tsx`, `app/forum/profile.test.ts`, `app/routes/notifications.test.ts`, `app/routes/presence.test.ts`, `app/routes/profile.test.ts`, `app/routes/unread.test.ts` — **завершено**.
- **4D (4Г), реальные PostgreSQL/forum-runtime contracts:** 5 файлов, **31 кейс — завершено** — `db/hyperdrive-forum.test.ts`, `tests/database/forum-help-attention.test.ts`, `tests/database/forum-online-presence.test.ts`, `tests/database/forum-profiles.test.ts`, `tests/database/stage4-core-e2e.test.ts` — **завершено**.
- Крупные файлы, особенно `public-read.test.tsx`, можно дополнительно исследовать по темам внутри 4B, но не считать дважды. После 4D выполнить сводную проверку пересечений внутри Stage 4 и оставить межэтапную сверку Stage 8.

### Проход 4Г / 4D — PostgreSQL и forum-runtime (2026-10-13)

- **База:** `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`, без изменений. Прочитаны полностью 5 test files, сопоставлены с `db/hyperdrive-forum.ts`, `db/forum-repository.ts` (контракты read/mutation), `app/forum/actions.server.ts`, `app/routes/{presence,profile,notifications,unread}.tsx/ts`, `PROJECT_STATE.md` и `docs/UI_UX_PASS.md`. Никаких production/live DB операций не было.
- **Учтено:** **5 файлов / 31 test case** = `12 + 8 + 4 + 6 + 1`. Проверено по [CI checks #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) (12 Hyperdrive unit cases) и [database job того же CI](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177318) (8+4+6+1 = 19 native PostgreSQL cases); **31 успешно** на сопоставимом test source-head. Аудит — статическое чтение; тесты не перезапускались. Hyperdrive `it.each` считает sync/async cleanup и разные error classes по отдельности.
- **Файлы и независимое покрытие:**
  - [`db/hyperdrive-forum.test.ts`](../../db/hyperdrive-forum.test.ts) — **12**: Mock PostgreSQL client: separate sync/async cleanup exceptions after success and failures, availability timeout vs unexpected query, cause-chain and typed availability classification.
  - [`tests/database/forum-help-attention.test.ts`](../../tests/database/forum-help-attention.test.ts) — **8**: Native PostgreSQL: Help queue filters and grants visibility, signal vs appeal identity, individual cases, stable count/group semantics, resolved task removal and case paging.
  - [`tests/database/forum-online-presence.test.ts`](../../tests/database/forum-online-presence.test.ts) — **4**: Native PostgreSQL: unique per-user presence, 45-second write throttle, five-minute read window, full count with twelve-member projection, no email leak and FK cascade.
  - [`tests/database/forum-profiles.test.ts`](../../tests/database/forum-profiles.test.ts) — **6**: Native PostgreSQL: no profile row defaults, upsert/CHECK/cascade, private user projection, live custom role lookup, all/Help message counts and current selected-answer replacement.
  - [`tests/database/stage4-core-e2e.test.ts`](../../tests/database/stage4-core-e2e.test.ts) — **1**: Connected PostgreSQL + request-scoped app actions: create topic/reply, selected answer, solve, tag/search/popular/unanswered views, role grant removal/restore and effective user overrides across new requests.
- **Сверка внутри этапа 4 (4A–4D):**
  1. `db/hyperdrive-forum.test.ts` проверяет **адаптеры и причину classifying/cleanup** до границы routes. `public-authz-degradation.test.ts`, `write-actions.test.ts` и route tests проверяют **корректные HTTP/UI реакции** на classified failures. Одна проверка не заменяет другую.
  2. `forum-help-attention.test.ts` проверяет PostgreSQL выборки, task counts, отдельные signal/appeal identities, group permission filtering и pagination. `public-read.test.tsx` тестирует route/UI permissions и отображение cases на mocked reader. Различные слои.
  3. `forum-online-presence.test.ts` проверяет durable 45-second throttle, 5-minute read window, 12-user cap + full count, delete cascade. `online-presence-heartbeat.test.tsx` и `app/routes/presence.test.ts` — browser POST lifecycle и session-derived actor/origin. Не дубли.
  4. `forum-profiles.test.ts` проверяет реальный storage/aggregation/role consistency, `profile.test.ts` — URL/Unicode validation, `profile-view.test.tsx` — safe DOM/RTL, `app/routes/profile.test.ts` — auth/privacy/action mapping. Защищают разные границы.
  5. `stage4-core-e2e.test.ts` — **сквозной integration тест в disposable PostgreSQL**, связывающий маршруты/action, Drizzle repository и real authorization/grants/overrides. Несмотря на частичное совпадение успешных операций с более узкими тестами, только он проверяет их совместимость **между запросами с изменившимся persisted authz**. Это **не браузерный/deployed/production E2E**; такому уровню acceptance он не эквивалентен.
- **Отдельное замечание по точности описания теста (не избыточность):** [`tests/database/forum-online-presence.test.ts:56`](../../tests/database/forum-online-presence.test.ts#L56) включает слова `ignores client-supplied identity`, но тест вызывает repository API с переданным `userId`, без HTTP form/client-forged identity. Реальную security guarantee утверждает [`app/routes/presence.test.ts:27`](../../app/routes/presence.test.ts#L27), где form `userId=victim` и ожидается запись только session user. Здесь лучше уточнить имя DB-теста (до `exposes only public identity and counts users once`) при ближайшей правке, **не удалять его**: другие реальные DB assertions независимы. Это **именование**, не uncovered server security.
- **Ограничения:** PostgreSQL tests используют disposable local `*_test` database / isolated schemas; некоторые cases используют последовательный shared fixture, но внутри test suite это согласованный интеграционный сценарий, **не доказанная лишность или текущий дефект**. Не приписывать интеграционным тестам реальные production operations.
- **Итог 4Г:** **0 доказанных лишних кейсов / файлов**, в этапах **4A–4D 24/24 файла, 227 test cases** просмотрены; [AUTH-01](#auth-01--дублирующий-test-case-с-runtimenull) остаётся единственным ранее подтверждённым тождественным тестом в других этапах. Общий прогресс аудита: **53/118 файлов, 433/1 075 исходных кейсов**, осталось 642 кейса. Следующий **этап 5 (локали/UI translation)**, 15 файлов, только по команде владельца.

### Проход 4C — профили, присутствие, уведомления, unread (2026-10-13)

- **База:** immutable `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`. Полностью прочитаны 7 test files и соответствующие implementations `app/forum/{online-presence-heartbeat,profile-view,profile}.tsx/ts`, `app/routes/{notifications,presence,profile,unread}.tsx/ts`; сопоставлены с `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md` (actual current UI/UX-pass and Stage 6 boundaries).
- **Учтено:** **7 файлов, 40/1 075 кейсов**: `4 + 4 + 12 + 3 + 6 + 9 + 2 = 40`. Каждый файл имеет `✓ ... (N tests)` в [checks CI #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268), на сопоставимом PR #221 head; все 40 прошли. `it.each` counted as separate executions: profile unsafe website = 6, GitHub links = 4; presence invalid origin = 3; profile POST unauthorized = 4. **В текущем аудите заново тесты не запускались.**
- **Файлы:**
  - [`app/forum/online-presence-heartbeat.test.tsx`](../../app/forum/online-presence-heartbeat.test.tsx) — **4** кейса. Browser heartbeat: guest silence, same-origin authenticated POST, 401 stop, hidden-page and RTL visibility resume.
  - [`app/forum/profile-view.test.tsx`](../../app/forum/profile-view.test.tsx) — **4** кейса. Public profile UI, HTML-safe bio/links/avatar fallback, RTL name isolation, edit mode and validation feedback.
  - [`app/forum/profile.test.ts`](../../app/forum/profile.test.ts) — **12** кейса. 500-code-point Unicode bio, normalization, HTTP(S)/GitHub URL allowlist and per-segment opaque profile path encoding; it.each covers 6 unsafe website and 4 GitHub variants.
  - [`app/routes/notifications.test.ts`](../../app/routes/notifications.test.ts) — **3** кейса. Auth-only notifications inbox, current-user/ISO date serialization, read+reply-anchor redirect.
  - [`app/routes/presence.test.ts`](../../app/routes/presence.test.ts) — **6** кейса. Server POST: identity only from session, guest/cross-origin rejects (3 matrix entries), methods/intent validation and classified 503 vs unexpected errors.
  - [`app/routes/profile.test.ts`](../../app/routes/profile.test.ts) — **9** кейса. Public projection privacy, owner edit gating, 4 authn/authz/CSRF rejections, authoritative writes, drafts/400/503/error mapping, malformed HTTP methods/forms.
  - [`app/routes/unread.test.ts`](../../app/routes/unread.test.ts) — **2** кейса. Signed-in-only inbox and session-scoped unread topic/first-unread cursor.
- **Сопоставление похожих проверок:**
  1. [Browser heartbeat](../../app/forum/online-presence-heartbeat.test.tsx) проверяет **поведение в браузере** — периодичность, отсутствие ping у гостя, видимость вкладки и 401 stop. [Server presence action](../../app/routes/presence.test.ts) независимо проверяет **серверную authority/CSRF**, отсутствие доверия полям клиента и 204/401/403/405/503. Сходство «guest» не является тождественной гарантией.
  2. [Profile field validator](../../app/forum/profile.test.ts) содержит разные adversarial URL классы и Unicode boundary cases; [profile view](../../app/forum/profile-view.test.tsx) проверяет safe display, [profile route](../../app/routes/profile.test.ts) — privacy projection и persistence mutation authorization. Уровни не взаимозаменяемы; URL attack matrices не сливать без доказательства одинакового execution path.
  3. [Notifications route](../../app/routes/notifications.test.ts) и [Unread route](../../app/routes/unread.test.ts) повторяют общий auth requirement **у разных защищённых маршрутов**, но проверяют разные capabilities / userscope / returned state. Удаление одного auth guard test уменьшает контрактный контроль конкретной route.
  4. Данные и выборка online/presence/profile/read-state из PostgreSQL проверяются отдельно в **4D**, поэтому нельзя пока заключить, что mocked route checks заменяют native DB integration.
- **Подтверждённые пробелы качества тестов (не избыточность, не выявленный application runtime defect):**
  - **COV-01:** [`online-presence-heartbeat.test.tsx:43–51`](../../app/forum/online-presence-heartbeat.test.tsx#L43-L51) называется `stops heartbeat requests and revalidates session after a 401`, но утверждает только count `fetchMock`. В [implementation](../../app/forum/online-presence-heartbeat.tsx) 401 branch вызывает `revalidator.revalidate()` и останавливает timer/listener, однако сам тест **не фиксирует вызов revalidation**. Рекомендовать отдельно проверяемый spy/observable revalidator effect, если тест будет улучшаться. Текущий компонентный тест не обеспечивает названную гарантию.
  - **COV-02:** [`profile-view.test.tsx:44–49`](../../app/forum/profile-view.test.tsx#L44-L49) называется `shows the owner edit link and only owner editable fields`, но вызывает `show({ isOwner:true, editing:true,... })`. В [`profile-view.tsx`](../../app/forum/profile-view.tsx) link «Edit profile» отображается только при `isOwner && !editing`. Тест проверяет поля редактирования, ошибку и Cancel, но **не показывает и не проверяет ссылку Edit**. Можно добавить assertion для `isOwner=true, editing=false` либо уточнить название/разделить. Route-unit тест подтверждает boolean `editing`, не заменяет DOM-link assertion.
  - Обе находки относятся к **действующей функциональности текущего UI/UX pass**, но не означают доказанных пользовательских ошибок. **Не выполнять правки** в audit PR.
- **Итог 4C:** **0 доказанных лишних кейсов, 0 полностью избыточных файлов; 2 доказанных пробела в проверяемых assertions**. Суммарно **48/118 файлов, 402/1 075 кейсов**. Stage 4: **19/24 файлов, 196 кейсов** рассмотрено. Далее **4D** — 5 forum/PostgreSQL-related test files, после команды владельца.

### Проход 4B — публичное чтение, actions, generation UI (2026-10-13)

- **База:** неизменённый `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`. Пять файлов полностью просмотрены; проверены test harness, cases, assertions и отличие отдельных entrypoints. Сопоставлены с `app/forum/actions.server.ts`, `app/forum/mutations.server.ts`, `app/routes/{home,category,section,topic,attention,...}`, `app/forum/views.tsx`, `app/forum/content-generation-controls.tsx`, `app/localization/content-generation-view.ts` и current UI/UX/translation Stage source of truth.
- **Учтено:** **5 файлов, 103 test cases** = `9+2+9+50+33`. Проверено по file-level `✓ ... (N tests)` из [CI #38372052543 / checks](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268); все 103 успешны на сопоставимом PR #221 source-head. `public-read.test.tsx` содержит 49 `it(...)`, но первый кейс находится внутри `describe.each([{locale:"en",direction:"ltr"},{locale:"he",direction:"rtl"}])`, поэтому исполняется **50 кейсов**, а не 49: это два разных language-direction input. Тесты сейчас не перезапускались.
- **Файлы и разные проверяемые гарантии:**
  - [`app/forum/content-generation-controls.test.tsx`](../../app/forum/content-generation-controls.test.tsx) — **9**: Точный revision key, automatic/explicit feedback, StrictMode deduplication, loader revalidation, bounded polling and post-hydration replacement guards.
  - [`app/forum/content-generation-navigation.test.tsx`](../../app/forum/content-generation-navigation.test.tsx) — **2**: Real React Router navigation: fresh locale/topic generation snapshot; stale in-flight answer not attached to new route.
  - [`app/forum/public-authz-degradation.test.ts`](../../app/forum/public-authz-degradation.test.ts) — **9**: Fail-closed optional auth UI with public read preserved on classified outage, public translation guest parity, read-only generation hints, status/presentation convergence, unexpected failures.
  - [`app/forum/public-read.test.tsx`](../../app/forum/public-read.test.tsx) — **50**: Public route/React UI through category→section→topic, Help filters/auth/moderation, discovery, translations, links, best answer, forms/pending and 404. First describe.each en(LTR)/he(RTL) makes 49 declarations = 50 cases.
  - [`app/forum/write-actions.test.ts`](../../app/forum/write-actions.test.ts) — **33**: Protected POST mutation flows: actor from session, same-origin, topic/reply/Help, solution/duplicate/signal, source-locale, generation action paths with authoritative identity, 401/403/404/409/429/503 mapping.
- **Cross-check с предыдущим 4A и внутри 4B:**
  1. [`public-read.test.tsx`](../../app/forum/public-read.test.tsx) проверяет **real forum route loader + bound React page**: категории, Help filters, identity-dependent lists, публичную приватность апелляций и конечные формы. [`homepage.test.tsx`](../../app/forum/homepage.test.tsx) отдельно проверяет **isolated HomeView** category disclosure/placeholder/online/conditional navigation. Частичное совпадение UI не равно тождественным входам/проверкам.
  2. [`public-read.test.tsx#L2653-L2672`](../../app/forum/public-read.test.tsx#L2653-L2672) проверяет missing **category loader** и actual localized fallback route rendering. [`not-found.test.ts`](../../app/routes/not-found.test.ts) проверяет catch-all route registration/404, [`route-error.test.tsx`](../../app/forum/route-error.test.tsx) — status-specific error render и leak-safety 401/403/404/503/500. Exact duplicates не установлены.
  3. [`public-authz-degradation.test.ts`](../../app/forum/public-authz-degradation.test.ts) проверяет **read-only optional permission hints** и translation/generation display при service outage/competing status; [`write-actions.test.ts`](../../app/forum/write-actions.test.ts) — **protected mutations** с обязательной permission, actor/server identity и controlled failure. Distinct security boundary.
  4. [`content-generation-controls.test.tsx`](../../app/forum/content-generation-controls.test.tsx) проверяет **component lifecycle and fetcher feedback**; [`content-generation-navigation.test.tsx`](../../app/forum/content-generation-navigation.test.tsx) — **actual React Router navigation / invalidation** между topic/locale. Double-submit prevention на одной странице не заменяет stale-response navigation test.
  5. Generation control unit UI и server action code уже присутствуют в `main`; external provider/Queue deployment остаётся Stage 6 работой. Эти тесты проверяют implemented Stage 5 local/CI paths и fail-closed `enabled` gate — **не считать лишними только из-за отсутствия production provider**.
  6. Help moderation and signals tests проверяют актуальные работающие boundaries в `main`. Неслитые PR или планируемые admin UI не могут быть основанием для автоматического удаления. Подробности cross-Stage DB guards исследовать в 4D/8.
- **Вывод:** **0 подтверждённых тождественных или устаревших кейсов**, **0 тестовых файлов под удаление** в 4B. Рекомендация: сохранить 103 до финального межуровневого сравнения, не сокращать coverage ради числа. Не заменять 4D PostgreSQL проверками только потому, что здесь есть mocked repository.
- **Общий прогресс:** **41/118 файлов, 362/1 075 исходных кейсов**. Из этапа 4 завершены **12/24 файла, 156 кейсов**. Далее **4C** (presence, profiles, unread/notification routes), **7 файлов**, не начат. Остановиться до отдельной команды владельца.

### Проход 4A — интерфейс/Markdown/error/preview (2026-10-13)

- **База:** `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d` неизменён. Все 7 test files прочитаны и сопоставлены с реальными `MarkdownEditor`, `ForumMarkdown`, `HomeView`, `ForumShell`, `ForumRouteError`, локализованным catch-all route и Pages preview controller/embedded routing. Текущие границы сверены с [`docs/UI_UX_PASS.md`](../../docs/UI_UX_PASS.md), в частности § GitHub Pages preview, Homepage contract, Topic authoring, Unfinished-function behavior.
- **Учтено:** **7 тестовых файлов, 53 отдельных test cases**, по успешному [checks CI #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268): `8 + 17 + 11 + 5 + 6 + 4 + 2 = 53`. Прочитаны `it.each` матрицы route-error (401/403/404/503) — это 4 разных кейса, плюс 500. CI фактически выполнялся на сопоставимом PR #221 head (он изменял только `AGENTS.md`), **не перезапускался**. В общей инвентаризации: **36/118 файлов, 259/1 075 исходных тестов**.
- **Проверенные файлы:**
  - [`app/forum/homepage.test.tsx`](../../app/forum/homepage.test.tsx) — **8** тестов. Домашняя карта категорий, раскрытие трёх разделов, корректные ссылки/доступность Unread, честные online-states и временный Under development.
  - [`app/forum/markdown-editor.test.tsx`](../../app/forum/markdown-editor.test.tsx) — **17** тестов. Реальная редакторская mutation Markdown, selection/caret/focus, code fences/backtick/RTL, imperatively inserted Reply/Quote, native validation/form POST, write/preview/split.
  - [`app/forum/markdown.test.tsx`](../../app/forum/markdown.test.tsx) — **11** тестов. Safe CommonMark renderer: sanitizer/links/images, code copy/wrap/errors, RTL code direction и budget-aware syntax highlighting.
  - [`app/forum/route-error.test.tsx`](../../app/forum/route-error.test.tsx) — **5** тестов. Рендер 401/403/404/503 с безопасным текстом/recovery link и unexpected 500 без утечки error detail.
  - [`app/forum/ui.test.tsx`](../../app/forum/ui.test.tsx) — **6** тестов. Skip link/keyboard navigation, URL locale switcher с сохранением query/anchor, preview override, system/manual light/dark startup/persistence.
  - [`app/ui-preview/preview-app.test.tsx`](../../app/ui-preview/preview-app.test.tsx) — **4** тестов. Representative preview-state catalog (locale/identity), 3 editor fixtures и click-through из home → section → topic в static Pages preview.
  - [`app/routes/not-found.test.ts`](../../app/routes/not-found.test.ts) — **2** тестов. Точная конфигурация locale catch-all и возврат HTTP 404 на unknown route, независимо от рендера 404-страницы.
- **Сходство тестов, не являющееся доказанным дублированием:**
  1. `markdown-editor.test.tsx` проверяет UI редактирования и интеграцию превью через `<ForumMarkdown>`, в том числе один smoke unsafe-input example; `markdown.test.tsx` отдельно испытывает sanitizer/code renderer и его state/budget. Редактор может сломать подключение безопасного рендера, не ломая сам renderer — smoke остаётся обоснованным.
  2. `route-error.test.tsx` проверяет **представление** исключений и безопасную обработку 401/403/404/503/500. `not-found.test.ts` проверяет **route registration и настоящий HTTP 404**, а не его внешний вид.
  3. `homepage.test.tsx` проверяет реальные Home-компоненты/подменные state/links, а `preview-app.test.tsx` — управляемый **статический GitHub Pages preview** и click-through на representative data. Pages не заменяет реальные SSR/permissions, поэтому эту проверку нельзя ошибочно приравнять к полноценному forum-route E2E.
  4. Тесты language and theme `ui.test.tsx` защищают разные источники состояния: browser pre-hydration bootstrap, system preference, persisted override и отдельный preview callback path. Совпадение элемента UI не равнозначно совпадению контракта.
- **Проверка актуальности Stage:** `Under development` остаётся approved временным поведением **до реализации в `main`**; новые функции из открытых PR не считать уже принятыми. Pages preview — действующий инструмент текущего UI/UX pass, не снятая заготовка.
- **Вывод:** **0 подтверждённых избыточных кейсов или ненужных файлов** в проходе 4A. Сохранить все 53 до итогового сопоставления с оставшимися forum route/runtime tests. **0 изменений реализации.**
- **Следующий подэтап:** 4B (forum public read/write + generation UI), **5 файлов**, не начат. Остановиться до команды владельца.



### Проход 1 — миграции, CI и production workflow (2026-10-13)

- **Основание:** exact `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d` (без изменений). Восемь `.test.mjs` прочитаны до конца, сопоставлены с одноимёнными исполняемыми модулями, применимыми wrapper-скриптами, `ci.yml`, manual workflows и `docs/database/MIGRATIONS.md` / `HYPERDRIVE.md`.
- **Учтено:** **8/118 тестовых файлов, 83/1 075 тест-кейсов**. Числа тест-кейсов сверены по фактическим `ℹ pass` соответствующих восьми команд из [CI #38372052543 (job checks)](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268). **83 прошли**, 0 упали. Это доказательство исполнения тестов на сопоставимом source-head PR #221 (он изменял только `AGENTS.md`), **не оценка доказательности каждого assertion автоматически**.
- **Результат аудита:** **8 файлов / 83 кейса сохранять** в текущем объёме; подтверждённых лишних, устаревших либо тождественных проверок **0**. Вывод о межэтапном дублировании предварительный до этапа 8.
- **Проверенные файлы и независимая гарантия:**
  - [.github/scripts/migration-history.test.mjs](../../.github/scripts/migration-history.test.mjs): **5** тестов. История принятых SQL/snapshot/journal — PR-level append-only guard; исполняется `verify-migration-history.mjs` в CI.
  - [.github/scripts/production-migration-contract.test.mjs](../../.github/scripts/production-migration-contract.test.mjs): **6** тестов. Pre/post ledger Drizzle по timestamp + SQL hash при внешней миграции; исполняется `verify-production-migration.mjs`.
  - [.github/scripts/production-privileges.test.mjs](../../.github/scripts/production-privileges.test.mjs): **17** тестов. Контракт migrator/application-owner и read-only localization для production schema migration; используется `verify-production-migration.mjs`.
  - [.github/scripts/production-worker-rollout.test.mjs](../../.github/scripts/production-worker-rollout.test.mjs): **10** тестов. Сопоставление exact Worker version/deployment и защитных свойств manual rollout/rollback; используются `.github/workflows/production-worker-rollout.yml`, `production-worker-rollout.mjs`, smoke.
  - [.github/scripts/provision-production-web-relations.test.mjs](../../.github/scripts/provision-production-web-relations.test.mjs): **12** тестов. Выдача web relation grants из shared ACL contract, owner-phase prerequisites, commit/rollback и безопасный CLI; используется manual provisioning workflow.
  - [.github/scripts/runtime-migration-evidence.test.mjs](../../.github/scripts/runtime-migration-evidence.test.mjs): **4** тестов. Проверка GitHub run, точного SHA и покрытия migrations в deploy evidence gate; используется `verify-runtime-migration-evidence.mjs` до Worker upload.
  - [.github/scripts/runtime-privileges.test.mjs](../../.github/scripts/runtime-privileges.test.mjs): **18** тестов. Два runtime roles, exact ACL/ownership/defaults/CONNECT и каталог PostgreSQL; используется `verify-production-runtime-privileges.mjs` и relation provisioning.
  - [.github/scripts/verify-production-migration-identity.test.mjs](../../.github/scripts/verify-production-migration-identity.test.mjs): **11** тестов. Read-only отдельный identity/CREATE gate для dedicated migrator; используется manual `.github/workflows/production-db-identity.yml`.
- **Сопоставление похожих групп:** 
  1. `migration-history` защищает *невозможность переписать уже принятые файлы/журнал в PR*; `production-migration-contract` проверяет *реально применённый ledger в целевой БД*; `runtime-migration-evidence` привязывает *подтверждённый GitHub migration run к допускаемому Worker rollout*. Одинаковая тема, но три независимые границы.
  2. `production-privileges` проверяет *роль владельца/мигратора и базовую read-only localization схему*, `runtime-privileges` — *отдельные реальные web/localization runtime роли и их текущие расширенные ACL*. Пересечения в правилах least privilege не дают оснований удалить один из двух тестовых наборов, потому что entrypoints/acceptance разные.
  3. `verify-production-migration-identity` — отдельная ручная read-only проверка dedicated migrator до миграции, а не замена full production privilege contract.
  4. `production-worker-rollout` включает проверки порядка и строк workflow. Они проверяют зафиксированную форму workflow, **не доказывают реального успешного deploy/rollback**. Эта граница покрытия — примечание по качеству, **не установленная избыточность и не самостоятельный дефект Stage**.
- **Потенциальное пересечение для этапа 8:** сравнить `migration-history.test.mjs` с `tests/database/migrations.test.ts` и `tests/production-migration-verifier.test.ts`; сравнить ACL fixture tests с native PostgreSQL ACL probes (`verify-runtime-privilege-probes.mjs`, `verify-web-relation-provisioning-probes.mjs`). Подозрение **не подтверждено**: уровни testing различаются.
- **Следующее действие:** этап 2 — 9 тестовых файлов credential recovery/bootstrap; **не начат**, нужен отдельный запрос владельца.

### Проход 2 — web credential bootstrap, diagnostics и recovery (2026-10-13)

- **Основание:** тот же exact `main` SHA `83219af2c36a99dd292b6ab1a9550f49b1011c0d`; прочитаны полностью девять `.test.mjs`, сопоставлены с шестью credential workflows, их entrypoint/модульными реализациями, `ci.yml` и фактической хронологией из [`docs/database/HYPERDRIVE.md`](../../docs/database/HYPERDRIVE.md).
- **Учтено:** **9/118 тестовых файлов, 66/1 075 тест-кейсов** в этом проходе (суммарно **17/118 файлов, 149/1 075 кейсов**). Числа сверены с отдельными `ℹ pass` 9 Node-команд из [CI #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268). На этом head все 66 прошли; тесты не перезапускались.
- **Текущее состояние, установленное по source of truth:** [`HYPERDRIVE.md`](../../docs/database/HYPERDRIVE.md) § One-time web credential bootstrap / Web credential failure diagnostics / recovery v2 / Accepted web credential (2026-09-28) фиксирует:
  1. Bootstrap workflow уже использован и consumed; one-shot `GITHUB_RUN_NUMBER=1` запрещает повторное исполнение.
  2. Recovery V1 и V2 также externally использованы и consumed; v2 завершился неуспехом на `COMMIT` с компенсацией.
  3. Rollback-only diagnostic one-shot уже успешно выполнен и исчерпан, а **read-only preflight diagnostic** повторно запускаем.
  4. После этого принят рабочий web credential через отдельный owner-authorized Neon `ALTER ROLE`; существующий unbound cache-disabled Hyperdrive создан и проверен.
  Это **документально подтверждённая историческая позиция**, а не выполненная заново live DB-диагностика. Workflow/test implementation согласуется с такими одноразовыми границами.
- **Файлы / самостоятельная или условная ценность:**
  - [`.github/scripts/bootstrap-production-web-credential.test.mjs`](../../.github/scripts/bootstrap-production-web-credential.test.mjs) — **13** кейсов. Смешанный набор: shared validation/Neon target/SCRAM/ACL preflight используются также diagnostics и recovery; bootstrap-specific one-shot/CLI относится к исчерпанной процедуре. Не удалять файл целиком.
  - [`.github/scripts/diagnose-production-web-credential.test.mjs`](../../.github/scripts/diagnose-production-web-credential.test.mjs) — **6** кейсов. Нужен для повторно доступной read-only диагностики и для rollback-probe; second branch одноразовый и уже выполненный — рассмотреть позже отдельно.
  - [`.github/scripts/production-web-credential-bootstrap-workflow.test.mjs`](../../.github/scripts/production-web-credential-bootstrap-workflow.test.mjs) — **3** кейсов. Прямые проверки первого одноразового workflow, документально исчерпанного после неудачного dispatch. Условный кандидат на совместную очистку workflow+тест.
  - [`.github/scripts/production-web-credential-diagnostic-workflows.test.mjs`](../../.github/scripts/production-web-credential-diagnostic-workflows.test.mjs) — **4** кейсов. Одна половина о повторной read-only диагностике; другая — о уже использованном одноразовом rollback-probe. Нельзя удалять без разделения.
  - [`.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs`](../../.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs) — **5** кейсов. Охрана v2 one-shot и сопряжённой repeatable validation; v2 уже исчерпан; кандидат только вместе с выводом всего v2 path.
  - [`.github/scripts/production-web-credential-recovery-workflow.test.mjs`](../../.github/scripts/production-web-credential-recovery-workflow.test.mjs) — **5** кейсов. Тесты одноразового recovery V1: documented consumed; условный кандидат на удаление вместе с неиспользуемым workflow.
  - [`.github/scripts/recover-production-web-credential.test.mjs`](../../.github/scripts/recover-production-web-credential.test.mjs) — **18** кейсов. Проверка bounded failure stages, compensation и secret-safe output; runtime V2 делегирует сюда. Самостоятельно убрать нельзя, даже если V1 workflow уже consumed.
  - [`.github/scripts/validate-production-web-credential-input.test.mjs`](../../.github/scripts/validate-production-web-credential-input.test.mjs) — **9** кейсов. Повторяемый read-only gate к V2; несмотря на consumed V2, формально validation workflow ещё запускаем — решение о его выводе нужно принимать вместе с v2 path.
  - [`.github/scripts/verify-recovery-v2-validation-run.test.mjs`](../../.github/scripts/verify-recovery-v2-validation-run.test.mjs) — **3** кейсов. Проверка GitHub evidence gate перед V2; используется только соответствующим recovery-v2 workflow; условный кандидат при полном выводе этого workflow.
- **Вывод:**
  1. Все девять test files включены в CI; **удалять отдельный test file сейчас нельзя** без коррекции самого CI.
  2. **Подтверждены уже исчерпанные операционные workflow** (bootstrap, recovery V1, recovery V2 и rollback-only probe) и связанные исторические проверки. Это кандидаты на **согласованную cleanup-операцию**, не на немедленное удаление кейсов.
  3. Нет установленного случая, в котором два теста проверяют строго одну и ту же гарантию без дополнительного уровня защиты; пересечения в проверках secret safety и one-shot guard относятся к нескольким независимым entrypoints.
  4. `bootstrap-production-web-credential.mjs` также предоставляет общие SCRAM, target и preflight helpers для diagnostics/validation/recovery; `recover-production-web-credential-v2.mjs` делегирует в V1 recovery core. Пофайловое удаление исторических скриптов или тестов может сломать оставшиеся пути. Сначала определить, какие целые операционные пути можно вывести, затем сохранить/перенести реально используемые helper-тесты.
  5. **0 подтверждённых тест-кейсов, безопасных для изолированного удаления**. Подтверждён один класс исторической избыточности (consumed one-shot operations); точный набор удаляемых тестов зависит от последующей проверки зависимостей и политики хранения этих workflow.
- **Следующий проход:** этап 3 — аутентификация/авторизация (12 файлов), **не начат**; остановка до команды владельца.

### Проход 3 — authentication / application authorization (2026-10-13)

- **База:** тот же `main` commit `83219af2c36a99dd292b6ab1a9550f49b1011c0d`. Полностью прочитаны 12 test files и сопоставлены с `app/auth/*`, маршрутом [`authorization-admin.tsx`](../../app/routes/authorization-admin.tsx), [`db/authorization-repository.ts`](../../db/authorization-repository.ts), [`db/hyperdrive-authorization.ts`](../../db/hyperdrive-authorization.ts), [`docs/auth/AUTHORIZATION.md`](../../docs/auth/AUTHORIZATION.md) и current Better Auth/DB code.
- **Кейсы:** **57** (51 application Vitest и 6 native PostgreSQL Vitest), учтены параметризованные `it.each`. По логам [checks CI](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177268) и [database CI](https://github.com/iliya1947/vico-forum/actions/runs/38372052543/job/115211177318) — **57 passed** на сопоставимом PR #221 head (только `AGENTS.md` различался с `main`). Новые тесты не запускались.
- **Файлы, кейсы и роль:**
  - [`app/auth/auth-controls.test.tsx`](../../app/auth/auth-controls.test.tsx) — **11**: Header guest/signed-in links, returnTo/query/hash, LTR/RTL, sign-out and server-loader revalidation.
  - [`app/auth/auth.server.test.ts`](../../app/auth/auth.server.test.ts) — **3**: Better Auth 1.7.4 email/password, persisted rate limiting, Cloudflare IP and origin/CSRF configuration.
  - [`app/auth/credential-view.test.tsx`](../../app/auth/credential-view.test.tsx) — **9**: Email registration/login and Google alternative, safe error feedback, returnTo with anchor and header refresh.
  - [`app/auth/session-context.test.ts`](../../app/auth/session-context.test.ts) — **4**: Per-request session setup and Set-Cookie propagation; **два идентичных `.each` cases** при `runtime(null)` — находка AUTH-01.
  - [`app/authorization/admin-view.test.tsx`](../../app/authorization/admin-view.test.tsx) — **3**: Admin presentation сохраняет intents/fields, не предлагает delete для built-in и показывает safe feedback.
  - [`app/routes/auth-api.test.ts`](../../app/routes/auth-api.test.ts) — **2**: `/api/auth/*` forwards runtime handler и register order против catch-all.
  - [`app/routes/authorization-admin.test.ts`](../../app/routes/authorization-admin.test.ts) — **8**: Самостоятельные authn/authz guards у loader/action, 503 vs unexpected failure, bulk state, forged actor и management result mapping.
  - [`db/authorization-repository.test.ts`](../../db/authorization-repository.test.ts) — **6**: PostgreSQL query snapshot shape, transaction BEGIN/COMMIT/ROLLBACK cleanup semantics, bound query reuse, unique-slug conflict mapping.
  - [`db/hyperdrive-authorization.test.ts`](../../db/hyperdrive-authorization.test.ts) — **3**: Классификация dependency availability против schema/programming errors и request-scoped vs new-request permission cache.
  - [`tests/database/auth-runtime.test.ts`](../../tests/database/auth-runtime.test.ts) — **1**: Реальный Better Auth + PostgreSQL sliding-session Set-Cookie, session expiry и cleanup; не дублирует pure fake-session тест.
  - [`tests/database/authorization-snapshot.test.ts`](../../tests/database/authorization-snapshot.test.ts) — **2**: Реальная конкурентная PostgreSQL консистентность `resolveUser` и `readManagementState` при параллельных changes to grants/overrides/assignment.
  - [`tests/database/forum-email-registration.test.ts`](../../tests/database/forum-email-registration.test.ts) — **5**: Реальные email/password signup/login, persisted hash/verification/session, invalid names и trim on PostgreSQL.
- **Подтверждённый дубль AUTH-01 (1 лишний запуск):** [`app/auth/session-context.test.ts:44–51`](../../app/auth/session-context.test.ts#L44-L51) параметризует два названия (`guest/no-session` и `invalid or expired session`), **но в обеих итерациях передаёт один и тот же `runtime(null)`, один `Request("https://vico.test/en")` и утверждает одно и то же `authSessionForRequest(context) === null`**. Это тождественные входы, вызываемая логика и assertion. Вторая итерация не создаёт invalid/expired cookie и не проверяет его обработку. [`tests/database/auth-runtime.test.ts:155–167`](../../tests/database/auth-runtime.test.ts#L155-L167) отдельно и реально истекает PostgreSQL session, затем проверяет rejection, Set-Cookie и удаление старой строки. **Рекомендация:** заменить только этот `it.each` одним `it("stores null when auth runtime reports no session", ...)`. Убрать один повтор, оставить DB-expiry regression. Сейчас **не исправлялось**.
- **Проверенные потенциальные пересечения, не подтверждены как лишние:**
  1. Header [`safeForumReturnPath`](../../app/auth/credential-path.ts) и credential `credentialReturnPath` тестируют соответственно path/anchor encoding при построении URL и обработку untrusted callback URL на странице входа. Функции связаны, но входные границы разные.
  2. [`app/auth/auth.server.test.ts`](../../app/auth/auth.server.test.ts) фиксирует security configuration, [`tests/database/forum-email-registration.test.ts`](../../tests/database/forum-email-registration.test.ts) — фактическую регистрацию/вход/валидацию имён. Не эквивалентны.
  3. [`app/auth/session-context.test.ts`](../../app/auth/session-context.test.ts) проверяет передачу mock session/cookies, [`tests/database/auth-runtime.test.ts`](../../tests/database/auth-runtime.test.ts) — настоящую sliding/expired session в PostgreSQL. Не эквивалентны (кроме найденного повтора внутри mock test).
  4. Route `authorization-admin` проверяет отказ и mapping кодов ответов, repository tests — SQL/transaction semantics, [`tests/database/authorization-snapshot.test.ts`](../../tests/database/authorization-snapshot.test.ts) — реальные concurrency interleavings. Все три уровня защищают разные ошибки.
- **Ограничение:** real Google OAuth login/deployed smoke не покрыт этими tests и остаётся Stage 6 acceptance; это известная external boundary, **не причина удалять** unit/API/DB проверки Stage 4. Сам аудит не является новым runtime/browser acceptance.
- **Итог:** **12 файлов / 57 кейсов рассмотрены; 1 подтверждённый дублирующий кейс; 0 файлов, которые доказанно целиком лишние.** Общий прогресс: **29/118 файлов и 206/1 075 исходных кейсов**. Следующий этап 4 — forum/UX, **24 файла; требуется разбиение на несколько связных малых проходов**, остановка до команды владельца.

## Подтверждённые кандидаты на оптимизацию

### CRED-01 — условная очистка исчерпанных одноразовых credential workflows

- **Факт:** bootstrap V1, recovery V1/V2 и rollback-probe уже consumed (см. `HYPERDRIVE.md` §§ соответствующих операций), текущий рабочий web credential принят другим способом.
- **Кандидаты целыми test files:** [bootstrap workflow tests](../../.github/scripts/production-web-credential-bootstrap-workflow.test.mjs), [recovery V1 workflow tests](../../.github/scripts/production-web-credential-recovery-workflow.test.mjs), [recovery V2 workflow tests](../../.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs) и [validation-run gate tests](../../.github/scripts/verify-recovery-v2-validation-run.test.mjs) — только **после** вывода зависимых workflow/script entrypoints.
- **Смешанные наборы, не удалять целиком без миграции покрытия:** [bootstrap helper tests](../../.github/scripts/bootstrap-production-web-credential.test.mjs), [recovery V1 core tests](../../.github/scripts/recover-production-web-credential.test.mjs), [diagnostic workflow tests](../../.github/scripts/production-web-credential-diagnostic-workflows.test.mjs); [input validation tests](../../.github/scripts/validate-production-web-credential-input.test.mjs) относятся к repeatable validation, но его текущий практический смысл после consumed V2 требует окончательного решения.
- **Граница:** повторяемую read-only preflight диагностику сохранить до подтверждения наличия эквивалентной безопасной диагностики. Нельзя удалять тесты при сохранении исполнительных workflow или используемых helper-функций. CI содержит явные `node --test` записи, их также потребуется обновить при будущем cleanup.
- **Статус:** обоснованное предложение по совместному cleanup **после** полной проверки, но **не разрешение немедленно удалять**. Число безопасно удаляемых отдельно тест-кейсов — 0.

### AUTH-01 — дублирующий test case с `runtime(null)`

- **Файл:** [`app/auth/session-context.test.ts#L44-L51`](../../app/auth/session-context.test.ts#L44-L51).
- **Доказательство:** две итерации `it.each` отличаются только названием, не входными значениями и не проверяемым поведением. Параметр строки теста внутри callback не используется.
- **Решение для последующей реализации:** один `it` вместо двух одинаковых `it.each`-итераций; из исходных 4 test cases файла останется 3. Отдельный real expiry integration test сохранить.
- **Статус:** подтверждён как изолированное устранение 1 ненужного прогона без потери проверяемой логики; **в audit PR изменения исходников не вносились**.

### SRC-01 — второй known-source обход TinyLD ничего нового не проверяет

- **Кейсы:** [`content-source-locale.test.ts#L58-L69`](../../app/localization/content-source-locale.test.ts#L58-L69) и [`tinyld-source-locale-detector.test.ts#L214-L238`](../../app/localization/tinyld-source-locale-detector.test.ts#L214-L238).
- **Почему пересечение настоящее:** обе вызывают `ContentSourceLocaleResolver.resolve` для канонического известного исходного `ru`; основная гарантия — `detector.detect` не вызывается. Во втором тесте TinyLD только конструируется, а подменённый underlying runner ни разу не запускается, так что адаптер не получает собственного meaningful execution coverage.
- **После аудита:** оставить тест в `content-source-locale.test.ts`, удалить или объединить **1 кейс** из `tinyld-source-locale-detector.test.ts`; остальные TinyLD language/gating/semantic filtering test cases оставить.
- **Классификация:** подтверждённый повтор одной branch guarantee текущего Stage 5; low-risk потенциальная оптимизация, не дефект приложения и не обязательное срочное исправление. **В рабочем PR только запись.**

## Подтверждённые пробелы тестового покрытия (не кандидаты на удаление)

- **COV-01 (4C):** название `online-presence-heartbeat.test.tsx` 401-теста обещает `revalidator.revalidate()`, но проверяется только остановка fetch. В реализации вызов есть; тест не защищает от регрессии именно revalidation.
- **COV-03 (6C):** `app/localization/translation-task-reconciliation.test.ts` обещает bounded/non-sensitive observability, но лишь сравнивает переданный mock snapshot с возвращённым `observe()`. Actual observe() является тонкой делегацией в store, а bounded/redaction должны проверяться на DB layer в 6F. Это **неточное название/ограниченность assertions**, не установлено лишнее тестирование или runtime defect.
- **COV-02 (4C):** название `profile-view.test.tsx` owner-edit теста обещает ссылку «Редактировать профиль», но fixture сразу открывает `editing=true`; DOM-link отсутствует по задумке и не утверждается.
- Эти замечания — слабость отдельных assertions или формулировок, не признак избыточности и не подтверждённый runtime defect. Отдельные узкие test improvements допустимы после завершения audit stage; в этом PR никаких тестов не меняется.

## Качество способов проверки (не кандидаты на удаление)

- **QUALITY-01 (6Г):** `db/hyperdrive-content-translations.test.ts` проверяет default-factory wiring через буквальный текст `readFileSync(...).includes(...)`, а client deadline values — отдельно в реальном `createWebClient`. Это хрупкая проверка синтаксиса вместо поведения default аргумента, но сама гарантия web deadline нужна. Рассмотреть смену способа проверки при следующем целевом улучшении; не удалять тест.

## Замечания к формулировкам тестов

- **NAME-01 (4Г):** название DB presence кейса говорит «ignores client-supplied identity», хотя у repository-level test нет client form/actor distinction. Security invariant надёжнее зафиксирован в `app/routes/presence.test.ts`. Уточнить название только при следующей связанной правке, не сокращать покрытие.

## Открытые вопросы и гипотезы

**Этап 5:** при итоговой сверке Stage 8 убедиться, что shared namespace inherited-name vectors и localized SSR hydration checks не повторены целиком в Stage 6 generation/persistence tests. Сейчас **нет подтверждённых дубликатов**.


Первоначальные подозрения на тождественное дублирование `public-read.test.tsx` с `homepage.test.tsx`, `route-error.test.tsx`, `not-found.test.ts`, а также с PostgreSQL/forum-runtime 4Г **не подтвердились** в пределах этапа 4; дополнительное межэтапное пересечение проверить в Stage 8.


Проверить возможное пересечение migration/ACL integration probes с тестами этапа 1 после завершения блоков 7–8. Похожие имена и пересекающиеся ограничения сами по себе не доказывают лишность.

Проверить влияние удаления старых credential workflow/scripts на повторяемую read-only диагностику и на используемые shared helper exports перед любой cleanup-реализацией. Live состояние external credentials в рамках этого audit-only прохода не проверялось.

## Итоговая сверка

Не проводилась. Финальные числа «сохранить / объединить / удалить / переписать» появятся только после покрытия всех 118 файлов и межблочной проверки.
