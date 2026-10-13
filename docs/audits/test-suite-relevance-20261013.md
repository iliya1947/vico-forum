# Аудит необходимости тестов Vico Forum — временное рабочее пространство

> **Временный audit-only PR. Не объединять в `main`.** После окончания аудита владелец может закрыть PR. В нём не изменяются тесты, приложение, конфигурация и основной `PROJECT_STATE.md`.

## Зафиксированная база

- Дата инвентаризации: 2026-10-13.
- Источник: `main`, commit `83219af2c36a99dd292b6ab1a9550f49b1011c0d`.
- Полное дерево GitHub (не усечено): **118 тестовых файлов** — 77 обычных Vitest, 24 PostgreSQL Vitest, 17 Node `.test.mjs`.
- Последний проверенный CI для сопоставимого набора кода: [run #38372052543](https://github.com/iliya1947/vico-forum/actions/runs/38372052543), **1 075 успешных кейсов** (704 обычных + 222 DB + 149 Node). CI выполнялся на head PR #221, изменявшего только `AGENTS.md`. Это не прямой запуск тестов на merge SHA `main`.
- Инвентаризация тестовых файлов сделана; **индивидуальный аудит не начат**, отметок «лишний тест» пока нет.
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
| 2 | Доступы и восстановление production web credential | 9 | Не начато |
| 3 | Аутентификация и авторизация | 12 | Не начато |
| 4 | Форум, интерфейс, маршруты, функциональные DB-сценарии | 24 | Не начато |
| 5 | Локали, UI-ресурсы и маршрутизация языков | 15 | Не начато |
| 6 | Переводы, генерация, фоновые задачи и хранилища | 44 | Не начато |
| 7 | Оставшиеся DB/runtime контракты | 4 | Не начато |
| 8 | Общие тесты и итоговая межблочная сверка | 2 | Не начато |
| **Итого** | **Без повторного включения файлов** | **118** | **8 файлов / 83 тест-кейса проверено** |

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

### 2. Доступы и восстановление production web credential — 9 файлов, не начато

- [ ] `.github/scripts/bootstrap-production-web-credential.test.mjs`
- [ ] `.github/scripts/diagnose-production-web-credential.test.mjs`
- [ ] `.github/scripts/production-web-credential-bootstrap-workflow.test.mjs`
- [ ] `.github/scripts/production-web-credential-diagnostic-workflows.test.mjs`
- [ ] `.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs`
- [ ] `.github/scripts/production-web-credential-recovery-workflow.test.mjs`
- [ ] `.github/scripts/recover-production-web-credential.test.mjs`
- [ ] `.github/scripts/validate-production-web-credential-input.test.mjs`
- [ ] `.github/scripts/verify-recovery-v2-validation-run.test.mjs`

### 3. Аутентификация и авторизация — 12 файлов, не начато

- [ ] `app/auth/auth-controls.test.tsx`
- [ ] `app/auth/auth.server.test.ts`
- [ ] `app/auth/credential-view.test.tsx`
- [ ] `app/auth/session-context.test.ts`
- [ ] `app/authorization/admin-view.test.tsx`
- [ ] `app/routes/auth-api.test.ts`
- [ ] `app/routes/authorization-admin.test.ts`
- [ ] `db/authorization-repository.test.ts`
- [ ] `db/hyperdrive-authorization.test.ts`
- [ ] `tests/database/auth-runtime.test.ts`
- [ ] `tests/database/authorization-snapshot.test.ts`
- [ ] `tests/database/forum-email-registration.test.ts`

### 4. Форум, интерфейс, маршруты, функциональные DB-сценарии — 24 файлов, не начато

- [ ] `app/forum/content-generation-controls.test.tsx`
- [ ] `app/forum/content-generation-navigation.test.tsx`
- [ ] `app/forum/homepage.test.tsx`
- [ ] `app/forum/markdown-editor.test.tsx`
- [ ] `app/forum/markdown.test.tsx`
- [ ] `app/forum/online-presence-heartbeat.test.tsx`
- [ ] `app/forum/profile-view.test.tsx`
- [ ] `app/forum/profile.test.ts`
- [ ] `app/forum/public-authz-degradation.test.ts`
- [ ] `app/forum/public-read.test.tsx`
- [ ] `app/forum/route-error.test.tsx`
- [ ] `app/forum/ui.test.tsx`
- [ ] `app/forum/write-actions.test.ts`
- [ ] `app/routes/not-found.test.ts`
- [ ] `app/routes/notifications.test.ts`
- [ ] `app/routes/presence.test.ts`
- [ ] `app/routes/profile.test.ts`
- [ ] `app/routes/unread.test.ts`
- [ ] `app/ui-preview/preview-app.test.tsx`
- [ ] `db/hyperdrive-forum.test.ts`
- [ ] `tests/database/forum-help-attention.test.ts`
- [ ] `tests/database/forum-online-presence.test.ts`
- [ ] `tests/database/forum-profiles.test.ts`
- [ ] `tests/database/stage4-core-e2e.test.ts`

### 5. Локали, UI-ресурсы и маршрутизация языков — 15 файлов, не начато

- [ ] `app/localization/bundles.test.ts`
- [ ] `app/localization/i18next-types.test.ts`
- [ ] `app/localization/locale-rules.test.ts`
- [ ] `app/localization/persistent-registry.test.ts`
- [ ] `app/localization/persistent-sources.test.ts`
- [ ] `app/localization/registry.test.ts`
- [ ] `app/localization/request-context.test.ts`
- [ ] `app/localization/resolver.test.ts`
- [ ] `app/localization/resource-loader-bundles.test.ts`
- [ ] `app/localization/resources.test.ts`
- [ ] `app/routes/locale-boundary.test.ts`
- [ ] `app/routes/locale-negotiation.test.ts`
- [ ] `db/hyperdrive-registry.test.ts`
- [ ] `db/locale-repository.test.ts`
- [ ] `tests/database/hyperdrive-registry.test.ts`

### 6. Переводы, генерация, фоновые задачи и хранилища — 44 файлов, не начато

- [ ] `app/localization/cloudflare-m2m100-provider.test.ts`
- [ ] `app/localization/content-generation-action.server.test.ts`
- [ ] `app/localization/content-generation-view.test.ts`
- [ ] `app/localization/content-markdown-translation.test.tsx`
- [ ] `app/localization/content-post-body-execution.test.tsx`
- [ ] `app/localization/content-post-body-planning.test.ts`
- [ ] `app/localization/content-provider-allowance.test.ts`
- [ ] `app/localization/content-request-budget.server.test.ts`
- [ ] `app/localization/content-source-locale.test.ts`
- [ ] `app/localization/content-translation-execution.test.ts`
- [ ] `app/localization/content-translation-planning.test.ts`
- [ ] `app/localization/content-translation-presentation.test.ts`
- [ ] `app/localization/content-translation.test.ts`
- [ ] `app/localization/tinyld-source-locale-detector.test.ts`
- [ ] `app/localization/translation-execution.test.ts`
- [ ] `app/localization/translation-provider-data-policy.test.ts`
- [ ] `app/localization/translation-provider.test.ts`
- [ ] `app/localization/translation-publication.test.ts`
- [ ] `app/localization/translation-task-consumer.test.ts`
- [ ] `app/localization/translation-task-dispatch.test.ts`
- [ ] `app/localization/translation-task-reconciliation.test.ts`
- [ ] `app/localization/translation-tasks.test.ts`
- [ ] `app/localization/translation-validation.test.ts`
- [ ] `app/localization/ui-translation-service.test.ts`
- [ ] `db/content-translation-store.test.ts`
- [ ] `db/hyperdrive-content-generation-status.test.ts`
- [ ] `db/hyperdrive-content-translations.test.ts`
- [ ] `db/hyperdrive-ui-translations.test.ts`
- [ ] `db/ui-translation-bundle-store.test.ts`
- [ ] `tests/database/content-generation-status.test.ts`
- [ ] `tests/database/content-post-body-task-planning.test.ts`
- [ ] `tests/database/content-request-budget-store.test.ts`
- [ ] `tests/database/content-topic-title-execution.test.ts`
- [ ] `tests/database/content-topic-title-task-planning.test.ts`
- [ ] `tests/database/content-translation-store.test.ts`
- [ ] `tests/database/source-locale-correction.test.ts`
- [ ] `tests/database/translation-generation-authorization.test.ts`
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

## Подтверждённые кандидаты на оптимизацию

Пока нет. Добавлять сюда только подтверждённые кандидаты с ID, ссылкой на кейс, сравнением с другими тестами и обоснованием без потери защитного покрытия.

## Открытые вопросы и гипотезы

Проверить возможное пересечение migration/ACL integration probes с тестами этапа 1 после завершения блоков 7–8. Похожие имена и пересекающиеся ограничения сами по себе не доказывают лишность.

## Итоговая сверка

Не проводилась. Финальные числа «сохранить / объединить / удалить / переписать» появятся только после покрытия всех 118 файлов и межблочной проверки.
