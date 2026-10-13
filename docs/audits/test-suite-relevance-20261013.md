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
| 2 | Доступы и восстановление production web credential | 9 | Завершено: 66 тест-кейсов |
| 3 | Аутентификация и авторизация | 12 | Завершено: 57 кейсов, 1 кандидат |
| 4 | Форум, интерфейс, маршруты, функциональные DB-сценарии | 24 | Не начато |
| 5 | Локали, UI-ресурсы и маршрутизация языков | 15 | Не начато |
| 6 | Переводы, генерация, фоновые задачи и хранилища | 44 | Не начато |
| 7 | Оставшиеся DB/runtime контракты | 4 | Не начато |
| 8 | Общие тесты и итоговая межблочная сверка | 2 | Не начато |
| **Итого** | **Без повторного включения файлов** | **118** | **29 файлов / 206 тест-кейсов проверено** |

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

## Открытые вопросы и гипотезы

Проверить возможное пересечение migration/ACL integration probes с тестами этапа 1 после завершения блоков 7–8. Похожие имена и пересекающиеся ограничения сами по себе не доказывают лишность.

Проверить влияние удаления старых credential workflow/scripts на повторяемую read-only диагностику и на используемые shared helper exports перед любой cleanup-реализацией. Live состояние external credentials в рамках этого audit-only прохода не проверялось.

## Итоговая сверка

Не проводилась. Финальные числа «сохранить / объединить / удалить / переписать» появятся только после покрытия всех 118 файлов и межблочной проверки.
