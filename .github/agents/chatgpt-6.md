# Лира — ChatGPT-6

Активные задачи: два раздельных независимых аудита Vico Forum; оба НЕ закрыты как полный аудит. Актуальный рабочий статус см. в последнем checkpoint.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Лиры в рамках текущего служебного PR.

## Независимый технический аудит форума — 2026-10-21

- Аудит выполняется только по чтению `main`; исходники и implementation PR не менялись. Актуальный проверенный SHA: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Ранний отчёт после семи этапов **не является полным аудитом**; выполнена дополнительная функциональная инвентаризация (этап 8), далее аудит по областям.
- Этап 9 завершён: публичное чтение и навигация, категории/разделы/темы, Popular (24h/7d/30d), Unanswered, Tags, Search, локализованные пути, базовые пустые/404 состояния и соответствующие маршруты, repository queries и существующие component/PostgreSQL tests. Новых **подтверждённых** current-Stage defects в проверенной области не установлено. Это static/source+existing-test review, а не новый браузерный E2E или запуск тестов.
- Спорные предварительные наблюдения из прежних этапов, в особенности Editor 2.0, не представлены как подтверждённые командные дефекты; до закрытия всего объёма аудита остаются в текущем чате согласно `AGENTS.md`.
- Следующая самостоятельная подзадача (после команды владельца): этап 10 — пользовательское участие, solved/best-answer, unread, уведомления, профили и presence.
- Этот файл — личная рабочая заметка Лиры. Общий `.github/service-channel.md` не изменён; новых задач другим агентам не назначено.

---

## Поэтапный аудит текущего чата — AUD-20261022

Дата: 2026-10-22 (Asia/Jerusalem). Эта запись относится к новому согласованному 14-этапному плану; номера этапов и результаты предыдущего независимого прохода выше не переносятся в его покрытие.

### Этап 0 — завершён: объём и реестр, без проверки реализации

- Зафиксированный main: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; exact remote main проверен read-only `git ls-remote`, совпадает с base PR #236 и отдельной локальной audit-копией.
- Локальная исходная ветка `/workspace/vico-forum` остаётся на `2138688`; её исходники не изменялись. Аудитировать зафиксированный main, а не эту отставшую ветку.
- Полный Git tree содержит 491 файл: 437 файлов в прикладном объёме (часть имеет исключённые сервисные разделы), 42 сервисных operational-файла исключены, 12 архивных документов — только справочный контекст. Это классификация, НЕ отметка о прочтении/проверке.
- В дереве зарегистрированы 19 актуальных Markdown документов, 45 SQL migrations, 45 schema snapshots, 137 test-файлов и 16 root/config файлов. Категории подсчёта по назначению могут пересекаться; полный manifest ниже не имеет пропусков и дублей.
- Исключены сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore: их аккаунты, credentials, настройки, provisioning, deploy/rollout, live smoke и фактическая service acceptance. Не делать обращений к этим сервисам ради аудита. Сервисные разделы документации — только контекст, без подтверждения их фактических утверждений.
- В объёме остаются внутренние контракты кода: session identity и permissions, lifecycle файлов, ошибки, транзакции, provider-neutral translation tasks и adapters. Проверять изолированно; обычный PostgreSQL для локальных DB tests не является аудитом Neon. OAuth flow не проверяется даже в общей auth-матрице.
- На этапе 0 новые тесты/сборки/browser/E2E/security checks не выполнялись; source-of-truth документы ещё не прошли полный аудит чтением до конца. Инвентаризация не считается ручной проверкой содержимого файлов.
- Обнаружена разница среды и pinned baseline: доступно Node 24.19.0 / pnpm 11.25.0, проект требует Node 24.21.0 / pnpm 12.3.4. Это ограничение среды для будущих прогонов, не доказанный дефект проекта. Способ получить pinned tools определить до выполнения соответствующих проверок.
- Предыдущие выводы этого чата и чужие personal notes не засчитываются новому циклу автоматически. Ранее сообщённые findings повторно проверять в профильных этапах; до завершения согласованного review не переносить их в общий файл.
- Реализацию, схему, зависимости, PROJECT_STATE и implementation PR не изменять в ходе проверки. Изменения PR #236 — только служебные записи.

### Порядок этапов

| № | Объём | Статус нового цикла |
|---|---|---|
| 0 | Зафиксированная revision, объём, manifest и правила покрытия | Завершён |
| 1 | Полное чтение актуальной документации; требования и противоречия | Не начат |
| 2 | Архитектура, маршруты, server/client, локальная конфигурация и зависимости | Не начат |
| 3 | Email/password, вход/выход, сессии, роли, overrides, resource ownership; без OAuth | Не начат |
| 4 | Public read/discovery/search/tags, участие, unread, notifications, profiles, presence | Не начат |
| 5 | Help, solved/best answer, moderation signals, duplicates, appeals, attention | Не начат |
| 6 | Simple/Advanced, Markdown, clipboard, history, quote/mention, publish/edit | Не начат |
| 7 | Внутренний upload/download/security/lifecycle/cleanup contract; без R2 service | Не начат |
| 8 | Locale registry, routing, UI/content translation, fallback, RTL, task/retry contracts; без real providers/Queues | Не начат |
| 9 | Прикладная PostgreSQL schema, migrations, constraints, transactions, locks, indexes и query plans; без Neon/Hyperdrive operations | Не начат |
| 10 | Сквозная безопасность прикладных границ и dependencies; без исключённых сервисов | Не начат |
| 11 | Browser flows, accessibility, responsive, hydration, LTR/RTL, локальная производительность | Не начат |
| 12 | Качество тестов и применимые локальные CI/build/quality gates; без service rollout и backup/restore | Не начат |
| 13 | Сверка всего manifest, требований/сценариев, findings, остаточных ограничений и итоговый отчёт | Не начат |

### Правила покрытия и остановки

1. Для каждого файла хранить SHA, первичный этап, фактический диапазон/функции прочтения, проверенные требования/сценарии, команды/результаты и остаток. `NOT_REVIEWED` нельзя повышать до PASS по наличию зелёных тестов.
2. Дополнительно вести матрицу требований/сценариев: guest/user/permission-limited/moderator/admin, positive/negative/stale/concurrent/failure paths. Подробные case IDs формировать после чтения требований на этапе 1; не представлять предварительную структуру как готовый test plan.
3. Общие файлы `actions.server`, `mutations.server`, `forum-service`, `forum-repository`, `hyperdrive-forum`, `views` проходят профильные этапы 4–7; локальные DB аспекты также этап 9. Их нельзя закрыть по одному частичному проходу. Безопасность этапа 10 и итоговая сверка этапа 13 сквозные для всего включённого объёма; тесты дополнительно проверяются на этапе 12.
4. Чтение/статический review, выполненный тест, browser observation, подтверждённый defect и непроверенная гипотеза — разные виды evidence. Каждый finding: trigger → expected/actual → causal chain → exact source → reproduction → priority → current scope/future work.
5. Если этап не помещается в ответ, явно сообщить выполненную часть и остаток, остановиться и ждать команды владельца на продолжение. В конце текущего ответа завершить этап 0 и предложить этап 1; этап 1 автоматически не начинать.
6. Изменившийся main не подменяет baseline молча: зафиксировать drift и определить перечень повторных проверок. Автоматического общего PASS/production readiness нет; исключённые области не являются скрытым обязательным gate этого аудита.

### Manifest всех отслеживаемых файлов baseline

`IN / NOT_REVIEWED` — содержимое ещё не проверено в новом цикле. `EXCLUDED` — сервисный объём снят владельцем. `CONTEXT` — архивный материал, читаемый при необходимости для происхождения решения. Первичный этап — маршрут проверки, не исчерпывающий набор пересекающихся проверок.

| Путь | Первичный этап | Объём / статус |
|---|---|---|
| `.env.example` | 2 | IN / NOT_REVIEWED |
| `.github/production-schema-manifest.json` | 9 | IN / NOT_REVIEWED |
| `.github/runtime-migration-evidence.json` | 12 | EXCLUDED |
| `.github/scripts/bootstrap-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/bootstrap-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/diagnose-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/diagnose-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/migration-history.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/migration-history.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-migration-contract.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-migration-contract.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-privileges.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/production-privileges.test.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/production-schema-manifest.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-web-credential-bootstrap-workflow.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-diagnostic-workflows.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-recovery-workflow.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-worker-rollout.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-worker-rollout.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/provision-production-web-relations.mjs` | 12 | EXCLUDED |
| `.github/scripts/provision-production-web-relations.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential-v2.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-migration-evidence.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-migration-evidence.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-privileges.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/runtime-privileges.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/validate-production-web-credential-input.mjs` | 12 | EXCLUDED |
| `.github/scripts/validate-production-web-credential-input.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-migration-history.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-production-migration-identity.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-migration-identity.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-migration.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-runtime-privileges.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-schema-manifest.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-recovery-v2-validation-run.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/verify-recovery-v2-validation-run.test.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/verify-runtime-migration-evidence.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-runtime-privilege-probes.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-web-credential-bootstrap-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-credential-diagnostic-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-credential-recovery-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-relation-provisioning-probes.mjs` | 12 | EXCLUDED |
| `.github/workflows/ci.yml` | 12 | IN / NOT_REVIEWED |
| `.github/workflows/codex-service-channel-bridge.yml` | 12 | IN / NOT_REVIEWED |
| `.github/workflows/production-db-identity.yml` | 12 | EXCLUDED |
| `.github/workflows/production-db-migrate.yml` | 12 | EXCLUDED |
| `.github/workflows/production-runtime-privileges.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-bootstrap.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-input-validation.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-preflight-diagnostic.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-recovery-v2.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-recovery.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-rollback-probe.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-relation-provision.yml` | 12 | EXCLUDED |
| `.github/workflows/production-worker-rollout.yml` | 12 | EXCLUDED |
| `.github/workflows/ui-preview-pages.yml` | 12 | IN / NOT_REVIEWED |
| `.gitignore` | 2 | IN / NOT_REVIEWED |
| `.node-version` | 2 | IN / NOT_REVIEWED |
| `AGENTS.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT_HISTORY.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT_STATE.md` | 1 | IN / NOT_REVIEWED |
| `README.md` | 1 | IN / NOT_REVIEWED |
| `ROADMAP.md` | 1 | IN / NOT_REVIEWED |
| `SCAFFOLD_PLAN.md` | 1 | IN / NOT_REVIEWED |
| `TRANSLATION_ARCHITECTURE.md` | 1 | IN / NOT_REVIEWED |
| `app/assets/vico-forum-logo-dark.webp` | 11 | IN / NOT_REVIEWED |
| `app/assets/vico-forum-logo-light.webp` | 11 | IN / NOT_REVIEWED |
| `app/auth/auth-client.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth-controls.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth-controls.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth.server.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth.server.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-path.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-view.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-view.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/request-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/session-context.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/session-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/authorization/admin-view.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/authorization/admin-view.tsx` | 3 | IN / NOT_REVIEWED |
| `app/authorization/catalog.ts` | 3 | IN / NOT_REVIEWED |
| `app/authorization/request-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/entry.client.tsx` | 11 | IN / NOT_REVIEWED |
| `app/entry.server.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/actions-attachment-publication.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/actions.server.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/attachment-container-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-container-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-operation.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.css` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-r2.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-r2.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-request-context.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-structural-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-structural-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-zip-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-zip-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/avatar.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/clipboard-markdown.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/clipboard-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/content-generation-controls.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-generation-controls.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-generation-navigation.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-translation-view.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/editor-attachments.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/editor-attachments.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/editor-document.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/editor-document.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/editor-permission.server.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/homepage.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/homepage.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/markdown-editor.test.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown-editor.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown.test.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/mentions.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/mentions.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/mutations.server.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/online-presence-heartbeat.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/online-presence-heartbeat.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/paths.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile-view.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile-view.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/public-authz-degradation.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/public-read.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/quote-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/quote-presentation.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/request-context.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/route-error.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/technical-markdown.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/technical-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/ui.test.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/ui.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/under-development-view.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/under-development.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/views.tsx` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/visual-markdown-editor.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/write-actions.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/i18next.d.ts` | 4 | IN / NOT_REVIEWED |
| `app/localization/bundles.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/bundles.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/catalog.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/cloudflare-m2m100-provider.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/cloudflare-m2m100-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-action.server.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-action.server.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-policy.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-response.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-status.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-view.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-view.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-markdown-translation.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-markdown-translation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-execution.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-planning.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-provider-allowance.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-provider-allowance.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-request-budget.server.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-request-budget.server.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-source-locale.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-source-locale.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-planning.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-presentation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-presentation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/fingerprint.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/i18next-types.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-navigation.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-rules.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-rules.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-fingerprints.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-packs.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-values.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-registry.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-registry.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-sources.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-sources.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/registry.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/registry.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/request-context.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/request-context.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resolver.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resolver.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resource-loader-bundles.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resource-loader.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resources.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/runtime.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/sources.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/tinyld-source-locale-detector.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/tinyld-source-locale-detector.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-failures.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider-data-policy.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider-data-policy.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-publication.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-consumer.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-dispatch.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-dispatch.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-reconciliation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-reconciliation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-tasks.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-tasks.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-validation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-validation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/ui-translation-service.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/ui-translation-service.ts` | 8 | IN / NOT_REVIEWED |
| `app/markdown-syntax.ts` | 6 | IN / NOT_REVIEWED |
| `app/root.tsx` | 11 | IN / NOT_REVIEWED |
| `app/routes.ts` | 2 | IN / NOT_REVIEWED |
| `app/routes/api.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/attachment-download.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-download.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-upload.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-upload.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attention.tsx` | 5 | IN / NOT_REVIEWED |
| `app/routes/auth-api.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/auth-api.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/authorization-admin.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/authorization-admin.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/category.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/credential-sign-in.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/credential-sign-up.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/home.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/locale-boundary.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-boundary.tsx` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-negotiation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-negotiation.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/mentions.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/routes/mentions.ts` | 6 | IN / NOT_REVIEWED |
| `app/routes/not-found.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/not-found.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/notifications.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/notifications.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/popular.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/post-edit.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/presence.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/presence.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/profile.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/profile.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/search.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/section.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/tag.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/tags.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/topic.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/unanswered.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/under-development.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/unread.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/unread.tsx` | 4 | IN / NOT_REVIEWED |
| `app/server-logging.test.ts` | 10 | IN / NOT_REVIEWED |
| `app/server-logging.ts` | 10 | IN / NOT_REVIEWED |
| `app/styles.css` | 11 | IN / NOT_REVIEWED |
| `app/theme.ts` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/index.html` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/main.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-app.test.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-app.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-i18n.ts` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview.css` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/vite.config.ts` | 11 | IN / NOT_REVIEWED |
| `db/attachment-draft-generation.ts` | 7 | IN / NOT_REVIEWED |
| `db/authorization-repository.test.ts` | 3 | IN / NOT_REVIEWED |
| `db/authorization-repository.ts` | 3 | IN / NOT_REVIEWED |
| `db/authorization-service.ts` | 3 | IN / NOT_REVIEWED |
| `db/content-post-body-execution-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-post-body-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-request-budget-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-topic-title-execution-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-topic-title-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-translation-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/editor-draft-context.ts` | 4 | IN / NOT_REVIEWED |
| `db/forum-attachment-cleanup.ts` | 7 | IN / NOT_REVIEWED |
| `db/forum-attachments.ts` | 7 | IN / NOT_REVIEWED |
| `db/forum-identifiers.ts` | 4 | IN / NOT_REVIEWED |
| `db/forum-repository.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/forum-service.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/forum-write-policy.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-authorization.test.ts` | 3 | IN / NOT_REVIEWED |
| `db/hyperdrive-authorization.ts` | 3 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-generation-status.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-generation-status.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-translations.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-translations.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum-attachments.ts` | 7 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum.test.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/hyperdrive-registry.test.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-registry.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-ui-translations.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-ui-translations.ts` | 8 | IN / NOT_REVIEWED |
| `db/locale-repository.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/locale-repository.ts` | 8 | IN / NOT_REVIEWED |
| `db/postgres-deadlines.test.ts` | 9 | IN / NOT_REVIEWED |
| `db/postgres-deadlines.ts` | 9 | IN / NOT_REVIEWED |
| `db/schema.ts` | 9 | IN / NOT_REVIEWED |
| `db/translation-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-bundle-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-bundle-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-publication-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/web-runtime-wiring.test.ts` | 2 | IN / NOT_REVIEWED |
| `doc_old/PROJECT_HISTORY_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/PROJECT_HISTORY_old_22.9.26_2.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_2.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_3.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_4.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_5.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_6.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_23.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/auth/AUTHORIZATION_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/translation/PROVIDERS_AND_JOBS_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/translation/STORAGE_AND_VERSIONING_old_22.9.26_1.md` | 1 | CONTEXT |
| `docs/EDITOR.md` | 1 | IN / NOT_REVIEWED |
| `docs/UI_UX_PASS.md` | 1 | IN / NOT_REVIEWED |
| `docs/auth/AUTHORIZATION.md` | 1 | IN / NOT_REVIEWED |
| `docs/database/HYPERDRIVE.md` | 1 | EXCLUDED |
| `docs/database/MIGRATIONS.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/CONTENT_TRANSLATION.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/LOCALES.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/PROVIDERS_AND_JOBS.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/RESEARCH.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/STORAGE_AND_VERSIONING.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/UI_TRANSLATION.md` | 1 | IN / NOT_REVIEWED |
| `drizzle.config.ts` | 9 | IN / NOT_REVIEWED |
| `drizzle/0000_tan_johnny_storm.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0001_seed-locales.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0002_ui_translation_storage.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0003_gorgeous_donald_blake.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0004_forum_domain_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0005_calm_proemial_gods.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0006_loving_sentinels.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0007_durable_translation_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0008_translation_task_claim_lease.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0009_translation_task_completion.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0010_translation_task_generation_order.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0011_persistent_translation_locale_invariant.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0012_translation_task_retry_dlq.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0013_translation_task_reconciliation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0014_content_translation_persistence.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0015_content_topic_title_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0016_content_post_body_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0017_content_translation_request_budget.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0018_source_locale_correction_permissions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0019_content_provider_allowance_admission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0020_translation_generation_permission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0021_forum_tags.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0022_forum_reply_relationships.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0023_forum_topic_read_states.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0024_forum_reply_notifications.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0025_forum_topic_pins.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0026_best_answer_independent_from_solved.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0027_help_solutions_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0028_help_solution_moderation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0029_help_question_needs_details.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0030_help_duplicate_workflow.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0031_help_user_moderation_signals.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0032_forum_profiles.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0033_forum_online_presence.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0034_forum_editor_drafts.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0035_forum_attachments_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0036_forum_attachment_security_events.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0037_forum_attachment_draft_generations.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0038_forum_attachment_cleanup_claims.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0039_forum_publication_receipts.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0040_post_edit_history_permissions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0041_published_mentions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0042_attachment_edit_snapshots.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0043_attachment_security_read_permission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0044_attachment_draft_conflict_boundaries.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0000_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0001_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0002_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0003_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0004_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0005_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0006_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0007_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0008_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0009_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0010_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0011_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0012_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0013_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0014_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0015_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0016_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0017_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0018_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0019_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0020_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0021_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0022_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0023_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0024_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0025_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0026_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0027_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0028_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0029_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0030_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0031_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0032_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0033_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0034_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0035_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0036_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0037_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0038_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0039_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0040_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0041_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0042_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0043_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0044_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/_journal.json` | 9 | IN / NOT_REVIEWED |
| `eslint.config.js` | 2 | IN / NOT_REVIEWED |
| `package.json` | 2 | IN / NOT_REVIEWED |
| `pnpm-lock.yaml` | 2 | IN / NOT_REVIEWED |
| `pnpm-workspace.yaml` | 2 | IN / NOT_REVIEWED |
| `react-router.config.ts` | 2 | IN / NOT_REVIEWED |
| `scripts/configure-localization-deadlines.sql` | 12 | IN / NOT_REVIEWED |
| `scripts/reconcile-ui-translation-bundles.ts` | 8 | IN / NOT_REVIEWED |
| `scripts/smoke-production-worker.sh` | 12 | EXCLUDED |
| `scripts/smoke-workers.sh` | 12 | IN / NOT_REVIEWED |
| `tests/database/auth-runtime.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/authorization-snapshot.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/content-generation-status.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-post-body-task-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-request-budget-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-topic-title-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-topic-title-task-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/forum-attachment-publication.test.ts` | 7 | IN / NOT_REVIEWED |
| `tests/database/forum-attachments.test.ts` | 7 | IN / NOT_REVIEWED |
| `tests/database/forum-email-registration.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/forum-help-attention.test.ts` | 5 | IN / NOT_REVIEWED |
| `tests/database/forum-online-presence.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/forum-profiles.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/hyperdrive-registry.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/migrations.test.ts` | 9 | IN / NOT_REVIEWED |
| `tests/database/source-locale-correction.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/stage4-core-e2e.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/translation-generation-authorization.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-generation-isolation.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-reconciliation.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-bundle-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-publication-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-storage.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/production-migration-verifier.test.ts` | 9 | IN / NOT_REVIEWED |
| `tsconfig.cloudflare.json` | 2 | IN / NOT_REVIEWED |
| `tsconfig.json` | 2 | IN / NOT_REVIEWED |
| `tsconfig.node.json` | 2 | IN / NOT_REVIEWED |
| `vite.config.ts` | 2 | IN / NOT_REVIEWED |
| `vitest.config.ts` | 2 | IN / NOT_REVIEWED |
| `vitest.database.config.ts` | 2 | IN / NOT_REVIEWED |
| `workers/app.ts` | 2 | IN / NOT_REVIEWED |
| `workers/attachment-storage.test.ts` | 7 | IN / NOT_REVIEWED |
| `workers/attachment-storage.ts` | 7 | IN / NOT_REVIEWED |
| `workers/database-bindings.test.ts` | 2 | IN / NOT_REVIEWED |
| `workers/database-bindings.ts` | 2 | IN / NOT_REVIEWED |
| `wrangler.jsonc` | 2 | IN / NOT_REVIEWED |

## Аудит форума — этап 10 (2026-10-22)

- Проверен `main` на `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Scope: создание тем и ответов; независимые solved/best-answer transitions; post ownership/authz/Origin; unread/new/read markers; reply/mention notifications; профиль и профильные counters; online presence и browser heartbeat.
- Прослежены UI → routes/actions → `ForumService` → `DrizzleForumRepository`/SQL; рассмотрены актуальные source-of-truth `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`, существующие unit/route tests и native PostgreSQL `tests/database/migrations.test.ts`, `stage4-core-e2e.test.ts`, `forum-profiles.test.ts`, `forum-online-presence.test.ts`.
- Подтверждённые свойства по коду и тестовым сценариям: серверные авторизация/Origin и привязка actor к session; topic/post consistency; best answer независим от solved; monotonic per-user unread marker с concurrent regression; owner-bound notification mark-read, dedup, atomic reply/notification transaction; public-only profile projection, owner-only profile write, URL validation; bounded 5-minute authenticated presence and rate-limited heartbeat. Тесты на этом шаге отдельно не запускались, live browser/external runtime не проверялись.
- Новых подтверждённых current-Stage defects по текущему проверенному scope не установлено. Непроверенные/дискуссионные наблюдения предыдущих этапов не повышаются до статуса командных defects до завершения всего аудита.
- Следующий этап после команды владельца: 11 — Help & Solutions и модерация. Изменений implementation, документации `main`, общего `.github/service-channel.md` и комментариев PR не делалось.


## AUD-20261022 — этап 1, часть 1

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Это продолжение поэтапного плана AUD-20261022, а не независимого аудита с другой нумерацией выше.

### Покрытие документации

Документы прочитаны целиком до фактического EOF, включая последние строки без завершающего перевода строки:

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| PROJECT.md | 109 | d261cf8f85d2ecfb44c54ff327fc2cf8fce70e7e | DOC_READ, 1–EOF |
| README.md | 50 | c6e23326b23c6982bdf521b7dd60b351d73c25f4 | DOC_READ, 1–EOF |
| ROADMAP.md | 444 | 5cbaf503e3e6715f50635f8f131ee6034c90367c | DOC_READ, 1–EOF |
| SCAFFOLD_PLAN.md | 435 | 996f542bc166afa8b29952b4beb7501f9a54e43c | DOC_READ, 1–EOF |
| TRANSLATION_ARCHITECTURE.md | 250 | 0294c0245e846b5fdd5dab22bbc6afe79733cdcf | DOC_READ, 1–EOF |

Всего 1288 строк. DOC_READ обозначает полное чтение и сопоставление этих документов; не подтверждает реализацию требований в коде. Таблица manifest этапа 0 остаётся исходным снимком; эта запись — дополнительный журнал покрытия.

### Требования для последующих проверок

- Классическая структура category → section → topic → post; публичное чтение, участие после входа, безопасный Markdown/code.
- Модульный монолит с SSR; права приложения отделены от identity. Изменяемые роли и персональные allow/deny, актуальность полномочий на следующем запросе, защита от потери управления.
- Email verification, рассылки и password reset отложены решением владельца; не объявлять их отсутствие дефектом текущего объёма.
- Каноническая locale в URL имеет приоритет; registry поддерживает BCP47 без жёсткого потолка языков. Root negotiation: пользователь → cookie → Accept-Language → en.
- Locale routing зависит от HTTP method: GET/HEAD canonical redirects; неканонический mutation получает 404 до action без Location. Root negotiation — no-store.
- Для UI en — canonical source; внутри locale current local manual → persistent manual → machine, затем registry fallback → en. Устаревшие fingerprints не считаются текущими переводами.
- SSR i18next request-scoped; locale/resources и входы форматирования должны совпадать при hydration.
- Content translation привязан к неизменяемой revision и target locale; title/body разделены. Техническая структура Markdown сохраняется; invalid/unavailable translation возвращает текущий оригинал.
- Provider не вызывается внутри SSR; durable job сохраняется до enqueue, используются claim/generation/retry/stale fencing. Внешний exactly-once не предполагается.
- Solved и best answer проверяются как независимые состояния.
- Drafts/autosave обозначены ROADMAP как возможное будущее развитие после решения владельца, а не обязательный scope текущего Editor 2.0.
- SCAFFOLD_PLAN описывает исторический Stage 1; его первоначально узкий состав не сравнивается с текущим продуктом как перечень недостающих функций.
- Отложенная косметическая UI/UX полировка не исключает функциональные, security, data-integrity и authz дефекты.
- Operational утверждения об исключённых Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не проверяются и не становятся acceptance gates этого аудита.

### Проверки согласованности и ограничения

- Все 49 уникальных component IDs translation registry присутствуют в ROADMAP; лишних IDs в ROADMAP не обнаружено.
- Проверка файловых целей локальных Markdown-ссылок в этих пяти документах: отсутствующих целей нет. Это не проверка anchors или внешних URL.
- Подтверждённых противоречий внутри прочитанного среза не установлено. Сопоставление с PROJECT_STATE и профильными контрактами ещё впереди; общий вывод о документации или реализации не сделан.
- Исходники не менялись; tests/build/browser и внешние сервисы на этой части не запускались. Findings прежних проходов автоматически не перенесены.

### Остаток этапа 1

PROJECT_STATE.md, PROJECT_HISTORY.md, AGENTS.md (как предмет согласованности документации; инструкции уже прочитаны на этапе 0), docs/EDITOR.md, docs/UI_UX_PASS.md, docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md в прикладном объёме и шесть профильных документов docs/translation. docs/database/HYPERDRIVE.md исключён как сервисный документ; doc_old — только контекст при необходимости.

Следующая часть: полное чтение PROJECT_STATE.md и PROJECT_HISTORY.md с фиксацией действующего состояния и сверкой с базовыми требованиями, затем профильные контракты. По условию владельца исполнитель останавливается после этой части и ждёт разрешения продолжить этап 1.


## Аудит форума — этап 11 (предыдущий независимый проход, 2026-10-22)

- Этот checkpoint продолжает этапы 8–10 предыдущего прохода из текущего чата. Он **не** закрывает этап 5 отдельного цикла `AUD-20261022` и не изменяет его manifest, статусы и критерии покрытия.
- Source: `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Проверены Help & Solutions reader/actions/views: category modes all/open/active/solutions/mine/help/for-me, четыре комбинируемых фильтра, Help question creation и similar questions; server permissions и запросы.
- Проверены moderation signals (needs-details/needs-review/solution-outdated/duplicate), withdraw/accept/reject и устаревшие cases; решение/подмена best answer; duplicate canonical-root, self-link, active relation, appeals, private visibility; `/:locale/attention` с независимыми Signals/Complaints placeholders/Security Attachments, per-permission case visibility, counts, group-specific pagination и exact case IDs.
- Код и тесты: `app/routes/category.tsx`, `attention.tsx`, `topic.tsx`; `app/forum/actions.server.ts`, `views.tsx`; `db/forum-service.ts`, `db/forum-repository.ts`; `app/forum/public-read.test.tsx`, `write-actions.test.ts`; `tests/database/migrations.test.ts`, `forum-help-attention.test.ts`; relevant `PROJECT_STATE.md`, `docs/UI_UX_PASS.md`, `docs/auth/AUTHORIZATION.md`. Тесты прочитаны как evidence, но в этом шаге заново не запускались; live browser, real DB run и external runtime не проверены.
- Не установлено новых **подтверждённых** дефектов текущего Stage по проверенным цепочкам. Отсутствие видимых user-signal submission форм сверено с зафиксированным backend-only scope PR #206 и последующим moderator-queue PR #217; не классифицировать автоматически как дефект. Общий product-completeness вопрос оставить до финального этапа без преждевременного finding.
- Следующий этап предыдущего прохода (по новой команде владельца): 12 — сквозные сценарии авторизации, динамических разрешений и деградации зависимостей. `main`, общий service-channel и implementation PR не менялись.


## AUD-20261022 — этап 1, часть 2

Статус: **PARTIAL — этап 1 не завершён**. Baseline неизменен: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Нумерация относится только к AUD-20261022; записи независимого прохода сохранены.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| PROJECT_STATE.md | 2020 | 0affd914738d9c94733d0e0ec1473f7b2569097c | DOC_READ, 1–EOF |
| PROJECT_HISTORY.md | 496 | a86ca1c654316e921c3f182437d69907faf4cab0 | DOC_READ, 1–EOF |
| AGENTS.md | 105 | 20acb9210685bf3347f153c0d44d19420e8dc9bc | DOC_READ, 1–EOF |

Полное чтение до фактического EOF и сопоставление с пятью документами части 1. В части 2 — 2621 строка; накопительно — восемь документов, 3909 строк. DOC_READ не является PASS реализации.

### Зафиксированные границы дальнейшей проверки

- Текущее продуктовое решение о removal drafts/autosave сопоставлено с историческими editor slices: исторические CAS/text-sync/recovery требования не переносятся в текущую обязательную функциональность.
- Upload/publication operation без текста, exact selected-file manifest, publication receipt, revision-fenced post edit и технический idle cleanup остаются прикладными контрактами для последующих этапов.
- Product-first usable MVP и отложенная косметическая полировка не отменяют проверки functional/security/data/authz defects.
- Для Help отдельно учитываются authoritative состояния, backend-only signal foundation, moderator queue и provisional UX; незаявленный текущим slice UI не объявляется автоматически дефектом.
- Historical ledger не используется как источник текущего поведения. В частности, старые записи stale-pack, authorization catch-all, generation ordering и persisted bundle convergence требуют сверки с актуальными профильными контрактами и кодом на соответствующих этапах.
- Чтение упоминаний excluded services — только контекст: внешние состояния, credentials, deployments, service API, grants и live acceptance не проверялись.
- Проверка файловых целей локальных Markdown-ссылок этих трёх документов не нашла отсутствующих целей; anchors и внешние URL не проверялись.
- Для точной сверки repository state read-only просмотрены локальный Git log и checked-in migration journal/наличие файла. Это не выполнение миграций и не аудит внешней БД.

Замечания этой части сообщаются владельцу в текущем чате; в служебный PR перенесены только покрытие, границы и следующий шаг по действующему порядку независимых проверок. Вывод о полном соответствии документации ещё не сделан. Tests/build/browser не запускались; реализация и документы main не менялись.

### Остаток и остановка

Полностью прочитать и сопоставить десять профильных документов: docs/EDITOR.md, docs/UI_UX_PASS.md, docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md в разрешённом прикладном объёме и шесть docs/translation/*.md. После этого — итоговая сверка требований и противоречий всего разрешённого документального объёма. docs/database/HYPERDRIVE.md остаётся исключённым, doc_old — контекстом при необходимости.

Следующая часть: docs/EDITOR.md и docs/UI_UX_PASS.md — действующий authoring/product scope и применимые acceptance требования. Исполнитель останавливается и ждёт разрешения владельца продолжить этап 1, часть 3.


## Аудит форума — этап 12 (предыдущий независимый проход, 2026-10-22)

- Продолжен прежний independent audit stages 8–11, `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. **Не относится к AUD-20261022**, не закрывает его этапы и не обновляет его manifest.
- Scope: Better Auth authenticated request/session/cookies и email/password boundary (без live Google OAuth); permission catalog, roles/grants/overrides, request-scoped PostgreSQL snapshot/freshness, authorization management UI/CRUD, last access-manager lockout, guest/cross-origin/forged input, resource ownership (topic/post/editor/attachments), classified dependency degradation и response status handling.
- Проверены `docs/auth/AUTHORIZATION.md`, `PROJECT.md`, `ROADMAP.md`, соответствующие положения `PROJECT_STATE.md`; `workers/app.ts`, `app/auth/*`, `app/authorization/*`, `app/routes/authorization-admin.tsx`, `app/forum/mutations.server.ts`, `app/routes/locale-boundary.tsx`, `app/routes/topic.tsx`, `app/routes/section.tsx`, `app/routes/category.tsx`, `app/routes/attention.tsx`, `app/routes/post-edit.ts`, `app/forum/editor-permission.server.ts`, `app/routes/attachment-upload.ts`, `app/routes/attachment-download.ts`, `db/authorization-*.ts`, `db/hyperdrive-authorization.ts`, `db/hyperdrive-forum.ts` и relevant existing unit/route/PostgreSQL tests.
- Established evidence from source/existing tests: effective permission independent from session role; one snapshot of role/grants/overrides; next-request request-local resolution; management mutators independently authorize within serialized DB lock, protect final manager; typed classified authorization unavailable vs unexpected errors; optional public UI degradation; protected route owner/Origin and per-permission gating; explicit boundaries on editor upload and download. No tests or live browser/runtime executed in this stage.
- Audit-wide findings are **not** transferred to shared communication channel before completion; preliminary findings remain in the conversation. No implementation, schema, `main`, service-channel or other cycle statuses changed.
- Next step on owner instruction: прежний этап 13 — завершить проверку Editor 2.0/Markdown/attachments и спорных findings (scope уточнить по уже согласованному плану); затем самостоятельный final coverage/test gap stage.


## AUD-20261022 — этап 1, часть 3

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись относится к AUD-20261022, отдельно от независимого прохода с другой нумерацией.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/EDITOR.md | 402 | a43653c66f323255e2fd2f63c3339fb18267bf3e | DOC_READ, 1–EOF |
| docs/UI_UX_PASS.md | 704 | 340d8e93d8669ee2212098f83ecaa8b87746652f | DOC_READ, 1–EOF |

Оба документа прочитаны полностью до фактического EOF и сопоставлены с материалами частей 1–2. В части 3 — 1106 строк; накопительно — десять документов, 5015 строк. DOC_READ не является проверкой реализации.

### Прикладные требования для последующих этапов

- Четыре authoring flows используют один Markdown source: create-topic, reply, Help question, published-post edit. Simple/Advanced и Preview/Fullscreen без правки не изменяют bytes; Undo/Redo переходит между режимами.
- Simple сохраняет protected/unsupported technical blocks, редактирует безопасные текстовые spans и обычные таблицы; изменение соседнего текста не пересериализует сложный блок. Native input/IME, whitespace, focused DOM, cross-leaf selection/Enter и table paste — отдельные обязательные переходы.
- Code Copy сохраняет исходные bytes без gutter/metadata; wrap/line numbers — presentation-only, code всегда LTR. Code-only Tab/indent/pairs не затрагивают prose. HTML/TSV clipboard import не должен молча терять неподдерживаемые данные.
- Цитата сохраняет автора и permanent anchor; collapse зависит от реальных видимых строк, а не только newline count. Simple, Preview/public и translation protection должны согласовываться.
- In-memory body/history сохраняются при mode/view switch и validation failure; reload/navigation не восстанавливают text draft. Account-scoped mode/spellcheck/wrap/line-number settings отделены от сообщения и не переносятся между аккаунтами.
- Немедленная загрузка и typed errors не мешают вводу текста; retained pending/error files блокируют Publish/Save. Attachment-only publication допустима. Stable upload identity и publication receipt защищают от logical duplicates после lost ACK.
- Remove изменяет mounted selection, а не удаляет pool ref; late ACK не возвращает снятый файл. Final submit публикует exact selected uploaded/retained IDs, проверяя authoritative owner/context/operation/permission/verification/ref/cleanup state.
- Save опубликованной правки использует expectedRevisionId и immutable history. Cancel/Remove не меняют public refs. Explicit rebase учитывает актуальный published baseline, явные local removals и новые local uploads; stale Save не применяет частичные изменения.
- Operation закрывается terminally при Cancel/Publish. Abandoned pool имеет 24-hour idle от успешного нового upload; Remove/read/failure/idempotent ACK не продлевают idle. Shared/published refs, durable claims и grace защищают от premature deletion.
- Файлы проверяются server-side по размеру, типу и bounded structure; active HTML/SVG не исполняется. Type-check не называется антивирусом. Suspicious events durable, deduplicated, permission-protected и read-only в Security/Attachments.
- Mentions связываются со stable account ID; уведомления создаются atomically при publish/edit, исключают quotes/code/self и дедуплицируются с reply и lifetime notified-set сообщения.
- Direction auto/manual сохраняет source; supported explicit markers узко распознаются. Technical content остаётся LTR. Browser spellcheck не обещает одинаковые словари/качество во всех ОС.
- Общий UI сохраняет category → section → topic → messages, canonical locale, catalog-owned strings, logical CSS, content lang/dir и safe provenance/original fallback.
- Best answer визуально идёт после original без перенумерации; solved независим. Help internal section скрыт из generic discovery; внимание, пользовательские сигналы, complaints scaffold и attachment security не смешиваются.
- Profiles остаются bounded public projection с owner-only write, без email/session/grants; присутствие основано на authoritative heartbeat и не считает guests. Выборки, ранжирование, counters и permission privacy проверяются по собственным контрактам позднее.
- Финальная browser/product matrix включает desktop/mobile/tablet, LTR/RTL/mixed content, Guest/User/Manager, populated/empty/error/pending и keyboard/focus/reflow/reduced-motion. Static Pages/green CI не доказывают real runtime flows.
- Позднее специальное условие Editor о Pages/owner visual acceptance только по запросу не смешивается с обязательной финальной product acceptance перед публичным релизом. Отложенная косметика не отменяет functional/security/data/authz checks.
- External сервисы и их acceptance из этого аудита исключены по указанию владельца; требования к внутренним lifecycle/download/authz остаются в объёме.

Файловые цели локальных Markdown-ссылок этих двух документов не содержат отсутствующих файлов; anchors/внешние URL не проверялись. Tests/build/browser и сервисные вызовы не выполнялись. Код и документы main не менялись. Замечания сообщены только владельцу в чате по порядку независимых проверок; PR содержит покрытие, требования и следующий шаг.

### Остаток и остановка

Осталось восемь профильных документов: docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md (прикладные контракты; сервисные разделы — только контекст) и шесть docs/translation/*.md. Затем требуется общая сверка всего разрешённого документального объёма. Исключённый docs/database/HYPERDRIVE.md не добавляется в объём.

Следующая часть: полное чтение AUTHORIZATION.md и MIGRATIONS.md, сопоставление dynamic permissions, ownership/lockout/error semantics и локальных schema/migration contracts. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 4.


## AUD-20261022 — этап 1, часть 4

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Продолжение AUD-20261022; нумерация независимого прохода не изменяется.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/auth/AUTHORIZATION.md | 264 | 79b68863e17bb1202609abd9d5641b5fc6454917 | DOC_READ, 1–EOF |
| docs/database/MIGRATIONS.md | 313 | e8ad5ef6b862ab4b7d57d9664a6f25fe810a685d | DOC_READ, 1–EOF; operational sections CONTEXT |

Оба документа прочитаны полностью до фактического EOF; сопоставлены с уже прочитанными базовыми/product/editor документами. В части 4 — 577 строк; накопительно — двенадцать документов, 5592 строки. DOC_READ не является PASS реализации. Внешние утверждения MIGRATIONS прочитаны как контекст без проверки сервисов и без расширения объёма.

### Требования для последующих прикладных проверок

- Better Auth определяет authenticated identity/session; application permissions разрешаются сервером из PostgreSQL, независимо от role claims/client input.
- Одна explicit role на пользователя с built-in user fallback, динамические built-in/custom grants и per-user overrides. Precedence: deny → allow → role grant → deny. Role inheritance/multiple-role membership не входят в текущую модель.
- Permission catalog code-backed: 15 документированных ключей. Все документированные initial grants входят в этот catalog: user — 7, moderator — 14, admin — 15. Это механическая проверка документа, а не сравнение с runtime catalog/seed/schema.
- editOwn, solution.manageOwn и sourceLocale.correctOwn проверяют authoritative ownership; pin и attachmentSecurity.read независимы. Управление duplicate/сигналами проверяется по своей persisted kind/resource applicability, а не по клиентскому выбору permission.
- resolveUser и management-state composite reads требуют internally consistent snapshot; freshness действует со следующего request, cache допускается только внутри request.
- Typed dependency unavailability отделена от denial. Protected mutation fail-closed; optional public controls могут деградировать только при classified availability failure. Unexpected schema/programming/config/invariant errors не подавляются catch-all.
- Каждая management mutation заново проверяет capability, validation и same-origin boundary; custom role удаляется только без assignments. Нельзя атомарно убрать последнего effective authorization manager. External bootstrap исключён; публичный unauthenticated bootstrap запрещён.
- Development schema evolution использует reviewed forward SQL, journal и snapshots. После merge SQL/snapshot/journal history immutable; исправление — forward migration.
- History guard, metadata check и clean PostgreSQL integration имеют разные цели. Local DB tests ограничены disposable PostgreSQL 17 с именем *_test; DATABASE_URL server/admin-only, без browser/Worker bundle и логирования.
- Feature schema и runtime могут merge вместе при доказанной local/CI согласованности; это не требует немедленной внешней миграции. Внешний rollout/evidence остаётся отдельной границей, исключённой из этого аудита; старое accepted external evidence не объявляется дефектом только из-за новых local migrations.
- Прикладное разделение DB capabilities следует реальным queries/least privilege; application roles не тождественны PostgreSQL runtime roles. Проверка внешних grants/credentials/Hyperdrive/deployment не выполнялась.

Проверка файловых целей локальных Markdown-ссылок в этих документах: отсутствующих файлов нет. Anchors и внешние URL не проверялись. Миграции/БД/tests/build/browser не запускались. Реализация и main-документы не менялись. Замечания переданы владельцу только в чате по порядку независимых проверок; в служебный PR записаны покрытие, требования и следующий шаг.

### Остаток и остановка

Остаются шесть документов docs/translation: LOCALES.md, UI_TRANSLATION.md, CONTENT_TRANSLATION.md, STORAGE_AND_VERSIONING.md, PROVIDERS_AND_JOBS.md и RESEARCH.md, затем финальная сверка разрешённого документального объёма.

Следующая часть: полностью прочитать LOCALES.md и UI_TRANSLATION.md, сопоставить locale routing/registry/fallback, UI source fingerprints, trust и SSR/hydration требования. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 5. Исключённые сервисы в объём не возвращаются.


## Аудит форума — этап 13 (предыдущий независимый проход, 2026-10-22)

- Относится исключительно к старому поэтапному аудиту (8→13) текущей цепочки сообщений. **Не обновляет AUD-20261022** и не засчитывается в его tracked manifest/status.
- Проверенная версия `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Scope: in-memory редактор Simple/Advanced, source-preserving Markdown/Undo/Redo, quote/mention, edit form/history, upload/publish/cancel/ref manifest and private download/cleanup boundaries.
- По исходникам и существующим компонентным/route/native PostgreSQL тестам проверены editor history/CRLF/protected technical blocks; Markdown safe rendering/quotes/mentions; native submit replay/lock; отсутствие runtime text drafts/autosave; stable attachment ID/retry and selected-vs-pool refs; published edit CAS, exact retained+new attachment set, terminal operation, idempotent receipts and cleanup tests.
- Evidence: `docs/EDITOR.md`, top current `PROJECT_STATE.md`, `app/forum/markdown-editor.tsx`, `editor-attachments.tsx`, `editor-document.ts`, `visual-markdown-editor.tsx`, `markdown.tsx`, `quote-*.ts*`, `mentions.ts`, `views.tsx`, `app/forum/actions.server.ts`, `db/forum-repository.ts`, `db/forum-attachments.ts`; `app/forum/public-read.test.tsx`, `markdown-editor.test.tsx`, `editor-attachments.test.tsx`, `attachment-operation.test.tsx`, `editor-document.test.ts`, `markdown.test.tsx`, `tests/database/forum-attachments.test.ts`, `forum-attachment-publication.test.ts` (existing tests inspected, not executed).
- Limit: local runtime has no project checkout and direct GitHub is network-blocked; fresh Chromium+Worker+Postgres/R2 E2E not performed. Checkpoint **does not declare definitive clearance** of potential UI conflicts/stalled uploads. Audit findings remain in chat until owner authorizes publication at completion; no unverified finding placed in general channel.
- Next on explicit owner command: итоговый этап — матрица реализованных функций/requirements против reviewed/tested evidence, remaining gaps, disputed findings and their Stage classification. No modification of implementation/main or other audit cycle.


## AUD-20261022 — этап 1, часть 5

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись относится только к AUD-20261022.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/translation/LOCALES.md | 571 | f58527e4a3067ca593c9a91ee7cdd195c0459193 | DOC_READ, 1–EOF |
| docs/translation/UI_TRANSLATION.md | 452 | dabc15f8c466f670c60b97395e818c50891b597c | DOC_READ, 1–EOF |

Полное чтение до фактического EOF, включая последнюю строку LOCALES без завершающего newline. В части 5 — 1023 строки; накопительно — четырнадцать документов, 6615 строк. DOC_READ не означает PASS реализации.

### Требования для последующих прикладных проверок

- Canonical BCP47 translation identity отделена от formatting extensions/preferences; locale не задаёт timezone. SSR и hydration получают одинаковые formatting inputs и initial relative-time reference.
- Registry — единственный источник разрешённых locale и UI direction; readiness и publication независимы. Alias/match/fallback graph проверяется на ambiguity/cycles/duplicates; exact reserved api/assets не являются prefix ban.
- en code-owned, active/ready bootstrap; persistent en запрещён. Persistent rows валидируются целиком как graph; invalid dataset не публикуется. Empty healthy bootstrap-only state отличается от expected migration acceptance.
- Один lazy immutable registry snapshot на request; technical routes без locale consumer не открывают registry DB path. Cross-request stale registry cache и module-global pg Client/Pool не разрешены этим baseline.
- Classified registry unavailable/schema/integrity failure допускает bootstrap-only English; non-English GET/HEAD временно redirect-ится с no-store без записи preference cookie, writes fail closed. Programming failures автоматически не маскируются.
- Controlled graph writer использует short SERIALIZABLE transaction и self-exclusive table lock до первого SELECT/DML; no external side effects inside transaction. Unknown commit outcome требует reconciliation, а не blind retry.
- Explicit URL authoritative: active alias/case/deprecated GET/HEAD → 308 canonical; unknown/inactive/disabled/malformed → 307 /en с remainder/query. Non-GET/HEAD redirect-required → 404 без Location до action. Root negotiation только GET/HEAD, user → cookie → Accept-Language → en, q=0 исключён.
- Locale boundary server loader обязателен для server validation при client navigation; middleware сам по себе не гарантирует network request. Неизвестный child route возвращает реальный 404.
- Bootstrap/resource fallback не включает implicit i18next locale reduction/dev. По locale specificity exact-target machine может выиграть fallback-locale manual; внутри locale current local manual → persistent manual → machine.
- Resources остаются раздельными по locale; fallback не flatten-ится в target, особенно для plural rules. Только текущая route locale chain/namespaces передаётся клиенту; все language packs целиком не импортируются.
- Canonical English descriptor содержит semantic metadata; missing canonical key — catalog defect. Structured plural/select единица имеет общий lifecycle/fingerprint и полный required branch set.
- Local packs допускают partial/stale state; unknown keys, invalid placeholders/structure/markup — structural errors. Stale value исключается с fallback; автоматический re-fingerprint без review запрещён. Strict zero-stale CI не предполагается.
- SSR i18next request-scoped; browser использует те же locale/chain/resources/versions без повторного language detection.
- Verified persisted bundle hit обходит raw namespace reads; miss/invalid/incompatible deploy использует controlled raw/local/English fallback. Provider в read path не вызывается. Machine publication атомарна с task completion и exact-locale whole-namespace bundle.
- UI generation eligibility: registered canonical non-English, active/inactive допустимы, disabled запрещён; planner/preflight используют один predicate. Self-healing bounded/deduplicated/internal-policy controlled; page request не запускает прямой provider/fan-out.
- Provider/local output недоверен; placeholders, technical tokens, branch structure, size, emptiness и markup проходят runtime validation. Plain provider не объявляется structured-capable.

Указанные в документах 28 уникальных component references присутствуют в architecture registry; неизвестных IDs не обнаружено. Файловые цели локальных Markdown-ссылок существуют; anchors и внешние URL не проверялись. Новых подтверждённых противоречий в прочитанной части не установлено; полная сверка с оставшимися translation/storage/job контрактами ещё не завершена.

Tests/build/browser, внешние сервисы и их acceptance не выполнялись. Исходники и main-документы не менялись.

### Остаток и остановка

Остались CONTENT_TRANSLATION.md, STORAGE_AND_VERSIONING.md, PROVIDERS_AND_JOBS.md и RESEARCH.md, затем итоговая сверка всего разрешённого документального объёма.

Следующая часть: полностью прочитать CONTENT_TRANSLATION.md и STORAGE_AND_VERSIONING.md, сверить immutable revisions, protected content, freshness/trust, bundle identity и cache/read semantics. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 6.


---

## Рабочая фиксация статуса двух аудитов — 2026-10-22 (без закрытия)

**Статус: ОБА АУДИТА ОТКРЫТЫ.** Эта запись — рабочий checkpoint в личном файле Лиры, **НЕ** финальное заключение, не утверждение о полном покрытии и не согласованный командный finding. Владелец прямо разрешил использовать личный файл как рабочее пространство, но запретил объявлять аудит завершённым до фактического завершения.

### A. Предыдущий независимый проход (14 этапов) — не путать с AUD-20261022

- Поэтапный обзор всех 14 запланированных шагов проведён; статическая сверка основных подсистем, действующих требований и существующих тестов выполнена с неодинаковой глубиной. **Это НЕ подтверждение полного аудита всего согласованного объёма**: нет доказанной исчерпывающей матрицы требований и проверок каждого заявленного сценария/файла; полный браузерный E2E и независимый прогон прикладных/PG тестов в этом проходе не выполнены. Повторение отдельных частей не закрывает эти пробелы.
- Зафиксированный источник: GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; PR #232 head `a528c6d2cfba8029072c1f18ae963946a0bbd744` имеет идентичный Git tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2`. GitHub Actions run #39615502080: jobs `checks` и `database` SUCCESS на том tree; это evidence прошлой CI-проверки, а не свежий самостоятельный test run.
- Области, проверенные в предыдущем проходе: публичные маршруты/категории/разделы/темы, search/popular/unanswered/tags; публикация и reply, solved/best-answer, unread/notifications/profiles/presence; Help & Solutions/duplicate/moderation; auth/authorization/degraded paths; Editor 2.0 Simple/Advanced/Markdown/quote/mentions/history; вложения, приватность, CAS/идемпотентность/cleanup. Ранние checkpoints этапов 9–13 находятся выше в файле; поздние итоги 14-го этапа присутствовали в текущем чате, но не были ранее записаны в личный файл.
- **Предварительное техническое наблюдение E1, current Editor 2.0 scope:** stale published-post edit. `db/forum-repository.ts` отвергает stale expected revision; `app/forum/actions.server.ts` возвращает `409` через `app/forum/mutations.server.ts`; после неуспешного action React Router обычно не revalidate loader; `app/forum/views.tsx` (состояние `editBaseRevisionId`, Save disabled при несовпадении, rebase только при появлении нового `post.body.id`) не инициирует обновление при `conflict`. Тест `app/forum/public-read.test.tsx` около строки 2314 проверяет успешный rebase после **явного** `router.revalidate()`, а не автоматическое восстановление после `409`. Сервер защищает данные, но путь восстановления в UI предположительно недоступен до внешнего refresh. Сильное source-level finding; реальный интегрированный браузерный сценарий не запускался. В текущем чате эта цепочка названа дефектом current Stage; перед окончательным командным статусом сверить отрицательные/альтернативные маршруты обновления и не переоценивать доказательства.
- **Предварительное наблюдение E2, conditional:** `app/forum/editor-attachments.tsx` `XMLHttpRequest` не устанавливает `timeout`/`ontimeout`, `uploading` запрещает индивидуальный Remove, `blocking` не позволяет публиковать при неоконченном upload. Изолированный Chromium опыт с удержанным запросом показал ожидаемое браузерное поведение; интегрированный runtime форума не воспроизведён. Утверждённый `docs/EDITOR.md` обеспечивает retry/remove после **ошибки** и блокирует публикацию во время upload; максимальное ожидание отдельно не задано. Требуется корректно определить, является ли случай current-Stage дефектом или возможным улучшением UX/сети до pre-release; не назначать исправление автоматически.
- **Предварительное наблюдение E3, семантика:** `app/forum/mutations.server.ts` `runForumMutation` переводит любые другие исключения в `503 unavailable`, тогда как `runSourceLocaleCorrection` unexpected error пробрасывает. Это установленный факт кода, но нарушение конкретного current-Stage контракта/реальный сценарий не доказаны. Не назначать исправление только из-за несовпадения стиля.
- **Исключено из дефектов**: drafts/autosave Editor удалены по решению владельца 2026-10-20; Stage 6 live OAuth/providers/Queues/deployment/backup и последующий визуальный refinement не объявлять current-Stage обязательствами без прямого текущего scope.
- **Следующее для этого прохода:** восстановить требования и доказательства ранних этапов из доступного контекста, отделить проверенную реализацию от просто упомянутых тестов, устранить критические незакрытые логические звенья в E1–E3, затем дать честную оценку достаточности покрытия. Итоговая публикация/закрытие — только по фактически установленной полноте.

### B. Отдельный полный аудит `AUD-20261022` (0–13)

- **Статус не изменён:** этап 0 завершён; этап 1 частично выполнен (через часть 5); этапы 2–13 не закрыты этим циклом.
- Сохранены собственный manifest, exclusions, per-file evidence и критерии этапов в секции `Поэтапный аудит текущего чата — AUD-20261022`. Результаты предыдущего прохода **не засчитывать** автоматически.
- Следующая назначенная внутри `AUD-20261022` часть: этап 1, часть 6 — полное чтение `docs/translation/CONTENT_TRANSLATION.md` и `STORAGE_AND_VERSIONING.md`, затем оставшиеся документы и итоговый документальный reconciliation. Этот пункт записан как состояние **другого плана**, не как новая команда текущему чату.

### Правила дальнейшей записи

- Рабочие заметки можно сохранять только в `.github/agents/chatgpt-6.md` в служебной ветке PR #236 с пометками evidence/uncertainty и явным именем аудита.
- Не писать неподтверждённые findings в общий `.github/service-channel.md`, не назначать работу другим агентам, не трогать implementation или `main` во время аудита.
- Не использовать `DONE`, `полный аудит завершён`, `final clearance` до проверки всех обязательных требований выбранного аудита.


---

## Первый аудит — дополнительная подзадача: локализация и переводы (2026-10-22)

**Статус: подзадача проверки source/contracts/tests выполнена; ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только предыдущий independent audit из текущего чата, не `AUD-20261022`. Baseline GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

**Контракт:** `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `TRANSLATION_ARCHITECTURE.md`; профильные `docs/translation/LOCALES.md`, `UI_TRANSLATION.md`, `CONTENT_TRANSLATION.md`, `STORAGE_AND_VERSIONING.md`, `PROVIDERS_AND_JOBS.md`. Внешние Stage 6 providers, Queue, Neon, OAuth и deployed acceptance не проверяются и не становятся current-Stage defects только по отсутствию запуска.

**Trace reviewed:**
1. `app/routes/locale-boundary.tsx`, `app/localization/resolver.ts`, `locale.ts`, `resource-loader.ts`, `runtime.ts`, `persistent-sources.ts`, `db/hyperdrive-ui-translations.ts`: canonical explicit locale loader/middleware; non-GET redirect-required paths fail closed; деградация registry → English; target/fallback locale resources separate; local current > persistent manual > machine within locale; persisted compiled hit avoids raw namespace fetch; invalid/degraded bundle falls back to raw/local/English; SSR snapshot initializes request-scoped i18next, without language re-detection or provider request.
2. `app/localization/content-translation.ts`, `content-translation-presentation.ts`, `app/routes/topic.tsx`, `db/content-translation-store.ts`: content identity by type/id/revision/target; same-known-source skips lookup, missing/invalid/stale/classified unavailable shows original current revision; quote attribution check and per-block provenance/language/direction; title and post body distinct; attachment-only empty bodies excluded from translation units; manual translation outranks machine on same exact identity.
3. `app/localization/content-translation-planning.ts`, `content-post-body-planning.ts`, `content-translation-execution.ts`, `content-post-body-execution.ts`, `content-translation-task-consumer.ts`, `content-post-body-task-consumer.ts`, `content-post-body-publication.ts`, `content-translation-publication.ts`, `content-markdown-translation.ts`: authoritative revision + permitted target/source; stable committed task before enqueue; re-evaluate active generation/revision/policy/claim/provider data bounds; protected AST segments exclude code/technical tokens, output reconstituted with structure/attribution check.
4. `db/content-topic-title-execution-store.ts`, `db/content-post-body-execution-store.ts`, `db/translation-task-store.ts`: machine publish locks generation head → task → current topic/post revision; conditional claim and exact expected revision, serialized transactional write and completion; stale provider results rejected, manual current translation preserved, completion failure rolls back body write; lost claim/duplicate delivery protected.
5. Existing tests reviewed as code/evidence (not executed here): `app/localization/content-translation.test.ts` (11), `content-translation-presentation.test.ts` (7), `content-markdown-translation.test.tsx` (12), `content-post-body-planning.test.ts` (11), `resource-loader-bundles.test.ts` (5), `resources.test.ts` (10), `app/routes/locale-boundary.test.ts` (5); `tests/database/content-post-body-task-planning.test.ts` (26), `content-topic-title-execution.test.ts` (14), `content-translation-store.test.ts`. Проверяются stale revision during provider window, manual concurrent writes, claim loss, failed completion rollback, no duplicate provider, budget/dedup, original fallback. Дополнительно есть CI exact-tree success PR #232 run #39615502080, но fresh tests/browser не запускались.

**Результат:** в проверенной translation source/persistence/recovery цепочке новых подтверждённых дефектов актуального Stage не установлено. Отсутствие реальной Queue/provider acceptance — явно Stage 6, не finding текущего scope. Это не PASS каждого translation-модуля и не полный security/release audit.

**Остаток первого аудита:** иные ранее не доказанно покрытые области и cross-boundary матрица требований/реализации/тестов; уточнение E1–E3 предыдущего checkpoint и классификация только при наличии достаточных доказательств. Следующая самостоятельная подзадача по команде владельца: сквозные транзакционные, миграционные и security boundaries на уровне приложения, с акцентом на ранее частично проверенные узлы. `AUD-20261022` state/manifest не изменены.

**Сохранение:** личный файл Лиры; `main`, implementation PR, `.github/service-channel.md` и другие personal files не менялись.


---

## Первый аудит — дополнительная подзадача: миграции, транзакции и прикладная безопасность (2026-10-22)

**Статус:** завершена только эта ограниченная подзадача **первого** независимого аудита; **полный аудит Vico Forum остаётся открытым**. Это НЕ этапы/покрытие отдельного `AUD-20261022`. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

### Требования и Stage boundary
- `AGENTS.md` прочитан с `main`; `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/auth/AUTHORIZATION.md`, `docs/database/HYPERDRIVE.md` получены и просмотрены до EOF. Действующий local/CI Stage 4–5 с последующими Editor 2.0 исправлениями отделён от Stage 6 external providers/OAuth/Neon/Hyperdrive/R2 acceptance. Прочие исторические срезы PROJECT_STATE не заменяют текущий блок 2026-10-20.
- Миграции и схемы **аудированы выборочно по критическим границам**, не заявлено чтение всех 45 SQL или всех snapshots, не заявлен live внешний DB audit.

### Проверенная реализация / evidence
1. **Journal/migrations/CI:** `drizzle/meta/_journal.json` содержит 45 последовательных уникальных tags (0–44), возрастающие timestamps; последняя SQL `drizzle/0044_attachment_draft_conflict_boundaries.sql` с owner/context/attachment FK и backfill, без перезаписи предыдущих migration. `.github/scripts/migration-history.mjs` запрещает переписывать accepted SQL/snapshots/journal; `.github/scripts/production-migration-contract.mjs` проверяет timestamp/hash prefixes и post exact match; `.github/scripts/production-schema-manifest.mjs` сверяет schema shape. `.github/workflows/ci.yml`: migrations-history guards, schema parity, clean PG17, runtime privilege probes, split-Hyperdrive local smoke. `tests/database/migrations.test.ts` проверяет 45 миграций/immutable revisions/FK/concurrency/constraints. GitHub Actions run #39615502080 exact source tree PR #232: checks/database SUCCESS 2026-10-21, but **fresh локальные прогоны в аудите не выполнены**. Live production migrate/privileges не проверялись (Stage 6).
2. **Forum writes:** `app/forum/actions.server.ts`, `app/forum/mutations.server.ts` требуют session user, same-origin, актуальную server-side permission; caller-supplied actor не является авторитетным. `db/forum-repository.ts` `createTopicWithInitialPost`/`createPost` — transaction, owner/context upload scope lock, cooldown, FK-bound topic/post/revisions, selected private refs, receipt request fingerprint и rollback вместе с mentions/notifications. `editPublishedPost` сериализует scope, блокирует post row, проверяет post.authorId и expectedRevisionId, избирательные старые refs, CAS current revision, новый immutable revision + mentioned recipients + receipt в одной transaction; stale edit — 409, опубликованная версия защищена.
3. **Authz:** `app/routes/authorization-admin.tsx`, `db/authorization-service.ts`, `db/authorization-repository.ts` — protected UI manager permission, Origin, повторный permission check **внутри serialized mutation under FOR UPDATE** `authz_mutation_lock`, last-manager lockout. `withReadSnapshot` использует REPEATABLE READ READ ONLY. Negative/concurrency evidence: `tests/database/migrations.test.ts` около 1477/1558, `tests/database/authorization-snapshot.test.ts`; ветки classified unavailable не смешиваются с forbidden. External provisioning excluded.
4. **Private attachments:** `app/routes/attachment-upload.ts` требует identity/Origin/current authoring permission до обращения в private R2; stable UUID, selected safe response без object key; `app/routes/attachment-download.ts` published refs read public (только после публикации), draft read bound to authenticated owner+context+operation; response nosniff/no-store/CSP sandbox/limited safe inline types. `db/forum-attachments.ts` validates ownership/ref creation and serializes owner/context; `db/attachment-draft-generation.ts` uses transaction advisory scope lock + terminal generation marker; `db/forum-attachment-cleanup.ts` claims deletions durably and retries after ambiguous delete, referential checks guard shared refs. Evidence: `app/routes/attachment-upload.test.ts`, `attachment-download.test.ts`, `tests/database/forum-attachments.test.ts` (owner-negative, revoke/closed operation, duplicate retry, concurrent claims, ref cleanup).
5. **Additional tests inspected** `tests/database/migrations.test.ts` (31 cases including cooldown, transaction rollback, duplicate signaling, immutable revisions, manager race, lost COMMIT ACK), `tests/database/forum-attachments.test.ts` (23), `app/routes/attachment-upload.test.ts` (18), `attachment-download.test.ts` (4), `tests/database/authorization-snapshot.test.ts` (2). Их наличие и код **не равны** самостоятельному прогону.

### Вывод и остаток
- В пределах названных **просмотренных** application transactional/security/migration boundaries **новых подтверждённых дефектов текущего Stage не установлено**. **Это не положительный результат независимого исполнения всех DB/security checks** и не означает, что весь manifest проверен.
- Ранее сохранённое E1 (409 → stale UI rebase), E2 (non-terminating upload), E3 (catch-all unknown → 503) остаётся отдельной рабочей классификацией. E3 установлено повторно в `runForumMutation`, но нет достаточного доказательства нарушения конкретного действующего Stage contract: не повышать до current-Stage defect по стилистическому различию.
- **Не проверено**: все 45 SQL и 45 snapshots построчно; полный threat-model/cross-boundary scenario matrix; actual local fresh PG run/real browser; external credentials/provisioning/production state (снято Stage 6). Эти пробелы не скрываются утверждением о «полном аудите».
- **Следующая подзадача первого аудита после отдельной команды:** итоговая сводка реально просмотренных требований и взаимосвязей по первому проходу; определить точные пробелы в исходном scope и остаточную классификацию findings, не подменяя результаты `AUD-20261022`. Сначала диагностика и trace, а не назначение исправлений.

**Границы записи:** обновлён только личный `.github/agents/chatgpt-6.md` PR #236. `main`, implementation PR, общий `.github/service-channel.md` и чужие personal files не изменять. Полный аудит НЕ объявлять завершённым до доказанной полноты.


---

## Первый аудит — сверка доказанного покрытия и E1–E3 (2026-10-22)

**Статус: ПОДЗАДАЧА «МАТРИЦА ПОКРЫТИЯ И ПЕРЕКЛАССИФИКАЦИЯ» ВЫПОЛНЕНА, ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только предыдущий independent audit с 14 обзорными этапами; **не** `AUD-20261022` с 437 tracked files. Baseline `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; exact-tree CI `checks`/`database` SUCCESS на #39615502080, 2026-10-21, но это не индивидуальный независимый прогон.

### Матрица «требование / реализация / существующие тесты / степень прямой проверки»

`SR` — прямо прослежены исходники и контракты; `TS` — соответствующие тесты прочитаны, но не выполнялись новым прогоном; `EV-PARTIAL` — нет достаточно конкретного журнала покрытия, либо проверены только части. Ниже **нет ни одного заявления о PASS отдельного runtime E2E**.

| Область текущего прикладного Stage | Source-to-contract evidence | Test evidence, просмотрено без запуска | Уверенность/остаток |
| --- | --- | --- | --- |
| Рабочая архитектура/конфигурация, SSR и route graph | Неполный реконструируемый trace этапов 1–8; `PROJECT.md`, `ROADMAP.md`, части `PROJECT_STATE.md` и routing рассмотрены | build/Workers CI старого exact tree | **EV-PARTIAL**: ранние 1–8 не имеют равнозначного предметного checkpoint |
| Email/password session/identity, logged-in guest boundaries (без OAuth) | Этап 12: Better Auth request/session, `workers/app.ts`, `app/auth/*`, protected actions | auth/route/API tests упомянуты в этапе 12; список кейсов не полностью реконструирован | **SR + TS partial** |
| Server authorization (roles/overrides/last manager/degraded) | Этап 12 + отдельная transactional security подзадача; `db/authorization-repository.ts`, manager route, `docs/auth/AUTHORIZATION.md` | `tests/database/migrations.test.ts` manager concurrency, `authorization-snapshot.test.ts`, route security | **SR + TS** |
| Public discovery/navigation, categories/sections/search/popular/tags/unanswered | Этап 9; `app/routes/*`, `db/forum-repository.ts`, relevant read paths | `app/forum/public-read.test.tsx`, `tests/database/migrations.test.ts` и другие профильные | **SR + TS** |
| Create topic/reply, unread, notifications, profiles, presence, solved/best | Этап 10; routes/action/service/SQL | `tests/database/stage4-core-e2e.test.ts`, `forum-profiles.test.ts`, `forum-online-presence.test.ts` и route tests | **SR + TS** |
| Help, moderation signals, duplicate/appeals/attention | Этап 11; readers, actions, moderator permissions, visibility and case IDs | `forum-help-attention.test.ts`, `app/forum/write-actions.test.ts`, `public-read.test.tsx` | **SR + TS** |
| Editor 2.0 Simple/Advanced/Markdown/quotes/mentions, mode switches and live published edit | Этап 13 + последующие E1–E3; `docs/EDITOR.md`, `views.tsx`, editor code | `markdown-editor.test.tsx`, `editor-document.test.ts`, `public-read.test.tsx` | **SR + TS; E1 ещё требует уточнённого test/repro** |
| Attachment auth/upload/download, selected/ref lifecycle, cleanup | Этап 13 + transactional/security подзадача; owner/operation scope locks, private/public ref, R2 gates | `app/routes/attachment-*.test.ts`, `tests/database/forum-attachments.test.ts`, `forum-attachment-publication.test.ts` | **SR + TS; E2 лишь conditional scenario** |
| Locale routing, UI content translation, Markdown protection, jobs/publication | Дополнительная отдельная подзадача; relevant translation architecture/details and content/UI store | `content-translation*.test.ts`, `content-markdown-translation.test.tsx`, `tests/database/content-*-execution*.test.ts`, `resource-loader-bundles.test.ts` | **SR + TS, профилированные source paths** |
| PostgreSQL schema, migrations, constraints, authz races, durable publication | Дополнительная подзадача: journal 45 tags, критические transactional paths/CI guards | `tests/database/migrations.test.ts`, `forum-attachments.test.ts`, migration/history/privilege scripts | **EV-PARTIAL**: не все 45 SQL + 45 snapshots проверены построчно; миграционные guards и CI это не заменяют |
| Runtime error mapping, storage outages and failure recovery | Этап 12 + security/mutation source; typed authz vs storage and failure paths | `app/forum/write-actions.test.ts`, `app/forum/route-error.test.tsx` | **SR + TS partial; E3 contract unresolved** |
| Интерактивная доступность, responsive/hydration, keyboard/IME, actual browser UX | Части editor/design contracts просмотрены; подробной полной матрицы real-state observations в первом аудите нет | CI + component tests; isolated Chromium test чужого браузерного механизма ≠ forum E2E | **EV-PARTIAL; не выдавать за runtime acceptance** |
| Source-of-truth coverage, integration constraints, final triage | Исходные 14 обзорных шагов обсуждены; полноценный requirement/scenario trace восстанавливается сейчас | `main` / CI references | **EV-PARTIAL**: в ранних 1–8 нет надёжного точного доказательного ledger; не переносить manifest или DONE другого `AUD-20261022` |

**Значение матрицы:** `SR + TS` означает положительный **source-level review исследованного механизма**, не исчерпывающую проверку всего поддерева и не запуск tests. Наличие теста не закрывает неописанный сценарий. Расхождение review-depth в ранних этапах 1–8 — главный текущий недостаток доказательного покрытия; нельзя объявить «полный аудит завершён» только потому, что ранее перечислены номера 1–14. Не путать с требованием read-every-file из отдельного AUD-20261022.

### Re-triage E1–E3 с проверкой альтернатив

- **E1 (409 published post edit): сильное, current-Stage source-level defect finding; full integrated 409 repro не проводилось.** `app/forum/actions.server.ts` `intent=editPost` → `runForumMutation` → `db/forum-repository.ts` rejects stale expected revision 409; React Router v8 Framework SSR documented default: failed 4xx/5xx does **not** revalidate active loaders. `app/routes/topic.tsx` no `shouldRevalidate` override; `app/forum/views.tsx` records `editBaseRevisionId`, handles failure only by clearing publication tracker, only enables rebase once `post.body.id` changed via loader; no `revalidator.revalidate` on action error. `app/forum/public-read.test.tsx` 2314 verifies rebase after **manual** `router.revalidate()`; 2621 verifies text remains after 400 but **not** loader refresh after 409. **Alternatives checked:** `OnlinePresenceHeartbeat` revalidates only homepage on normal heartbeat (or 401 session refresh); `ContentGenerationManager` may revalidate when translation work is queued/polled, unrelated to 409 and not guaranteed for ordinary editor. User navigation/refresh can eventually supply new loader data, so claim **not** «rebase impossible ever», precisely «failed stale Save does not guarantee new current revision or discoverable direct recovery, editor stays stale until unrelated revalidation/navigation». Current editor contract requires explicit rebase and preservation of typed text; likely violated in 409 flow. Before assigning implementation, confirm with deterministic route-level failed-409 test (or integrated repro if available) and decide appropriate current-Stage correction.
- **E2 (pending upload indefinitely): NO established current-Stage defect.** `app/forum/editor-attachments.tsx` XHR no timeout/ontimeout; while pending no individual Remove, publish blocked; overall Cancel abort exists. Isolated held-XHR Chromium reproduces browser mechanism only. `docs/EDITOR.md` 192–198, 268–278 requires blocking while pending, Retry/Remove **on failed upload**, but specifies no max pending lifetime/individual in-progress cancel. Treat as potential resilience UX improvement; absent observed application failure or contradictory current contract do not demand fix.
- **E3 (runForumMutation unknown error mapped 503): demonstrated source difference, NOT classified as current-Stage defect on current evidence.** `app/forum/mutations.server.ts` maps unknown catch-all to unavailable/503 vs `runSourceLocaleCorrection` rethrows; `docs/auth/AUTHORIZATION.md` unexpected authorization errors must not be converted into typed availability, but authz permission precheck is outside `runForumMutation` and has its own typed guard; no proof that this generic writer catch violates the same contractual boundary in a real action. Distinguish source fact from proven user/system impact; no implementation action yet.

### What remains before the FIRST audit can truthfully close

1. **Reconstruct early phases 1–8:** accountable list of actual requirements, entrypoints, cases and evidence; for missing segments perform targeted source-to-contract checks, not blanket re-do of 437-file second audit.
2. **E1 targeted 409 failure path:** test or independently verify exact route/action behavior, contrasting successful 2xx auto-revalidation and unrelated periodic revalidators. Do not elevate E2/E3 absent current Stage proof.
3. **Cross-boundary acceptance coverage:** for high-risk current Stage user actions cover guest, authorized, permission-limited, stale, concurrent, storage-down/ambiguous outcome and failure-recovery; identify which truly untested or only read as tests. E2E/browser only when essential to determine actual behavior, **not** prerequisite for source audit as a whole.
4. **Final audited-scope declaration:** list what was actually covered and what wasn't, separate known defects, risks, future Stage and external exclusions; only then potentially close first audit. Do not import separate `AUD-20261022` completion/manifest into this result.

**This is a working checkpoint, not final finding publication or audit clearance.** Updated only personal `.github/agents/chatgpt-6.md`; no change to shared `.github/service-channel.md`, other personal files, source `main`, or `AUD-20261022` plan/state.


---

## Первый аудит — восстановление доказательного покрытия раннего прохода 1–8 (2026-10-22)

**Статус: ограниченная подзадача восстановления текущего code-evidence выполнена. ПОЛНЫЙ АУДИТ ОТКРЫТ.** Только *первый* independent audit (старые этапы 1–14); не обновлять `AUD-20261022`, 437-file manifest и его статусы. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, SHA проверен повторно.

### Историческая неопределённость

В личных notes зафиксирована последовательность «ранний отчёт после семи этапов; инвентаризация 8; scope этапа 9 и далее»; **полных исходных чекпоинтов 1–8 с темами, датами, файлами, assertion/evidence и результатами там нет**. Их точную историческую программу/покрытие нельзя надёжно восстановить по одному описанию «этапы 1–8 пройдены». Не придумывать соответствие «этап N = subsystem X» и не ставить ретроактивный PASS всем ранним этапам. Следующий ledger — **новая прямая сверка актуального исходного кода**, не доказательство того, что тот же контроль был сделан в прошлом.

### Восстановленные сейчас цепочки из source/current requirements/test assertions

| Проверяемая граница | Текущая реализация, прямой source trace | Существующее test evidence (прочитано, НЕ выполнено в аудите) | Статус |
| --- | --- | --- | --- |
| App entry + route topology | `app/routes.ts` точные technical /api/auth, attachments и fallback /api/* до nested locale; `app/root.tsx` SSR html lang/dir from loader; `react-router.config.ts` SSR и initial discovery | `app/routes/locale-boundary.test.ts`, `app/forum/route-error.test.tsx` | Reviewed source/selected assertions; no full browser validation |
| Worker dependency composition | `workers/app.ts` создаёт новый `RouterContextProvider` на request, session до handler, injects reader/writer/authz/attachment/locale/UI-translation capabilities; `workers/database-bindings.ts` строго требует separate HYPERDRIVE/WEB_HYPERDRIVE, без substitute | `workers/database-bindings.test.ts` шесть relevant cases, включая strict fail-closed и literal assembly guards; `workers/attachment-storage.test.ts` | Reviewed composition; no real Cloudflare connections |
| Better Auth email identity/session | `app/auth/auth.server.ts` Better Auth 1.7.4 + Drizzle; email/password 8–128, registration name server hook, persistent DB rate limiting; `app/auth/session-context.ts` resolves once/request, propagates only auth Set-Cookie, not unrelated get-session headers; `app/routes/auth-api.ts` delegates to runtime | `app/auth/auth.server.test.ts`, `session-context.test.ts`, `tests/database/forum-email-registration.test.ts`: real PG registration hashed credential, incorrect password, invalid names; `tests/database/auth-runtime.test.ts`: sliding session cookies, expired session→null | Reviewed source and selected real assertions; not live OAuth |
| Credential redirects + guest UX | `app/auth/credential-path.ts` locale-scoped, same-origin validated `returnTo`; `credential-view.tsx` signup/signin client errors, disabled pending, success navigation; deferred email verification/reset disclosed | `app/auth/credential-view.test.tsx` registration/signin/return anchor/safe fallback, `tests/database/forum-email-registration.test.ts` | Current MVP reviewed; email sender/reset out of scope |
| Locale routing/fallback/hydration | `app/routes/locale-negotiation.ts`, `locale-boundary.tsx`, `app/localization/resolver.ts`, `resource-loader.ts`, `runtime.ts`: authenticated user→cookie→Accept-Language→en, canonical active loader/middleware; noncanonical mutations 404; persisted bundle hit / local+manual+machine+English fallback, request-scoped i18next; en code-owned | `app/routes/locale-negotiation.test.ts` four route cases, `locale-boundary.test.ts` six route cases, `app/localization/resource-loader-bundles.test.ts` five compiled bundle cases, `app/localization/resources.test.ts` locale priority and runtime | Reviewed selected code; complete translation subtask recorded separately |
| Authorization/ownership | `app/forum/mutations.server.ts` requires session + Origin, authoritative session.actor; `db/authorization-repository.ts` repeatable read snapshots, mutation-level effective permission recheck+lockout; protected server actions; site header optional degradation fail-closed | `tests/database/migrations.test.ts` manager locking; `authorization-snapshot.test.ts`; `app/forum/write-actions.test.ts` negative cases; `app/forum/route-error.test.tsx` safe errors 401/403/404/503/500 | Reviewed critical paths; complete threat model not claimed |
| Forum/domain persistence | `db/hyperdrive-forum.ts` request capabilities, `app/forum/actions.server.ts` actions, `db/forum-repository.ts` transactions/immutable revisions, readable topic/reply/search/unread; Reader/Writer typed contexts | `tests/database/stage4-core-e2e.test.ts` direct PG layer (not browser E2E), `forum-attachment-publication.test.ts`, `app/forum/public-read.test.tsx` | Subsystem already covered in stages 9–13; no retrospective re-mark |
| Local CI/migration/quality boundary | `package.json` pins Node 24.21.0/pnpm 12.3.4, RR 8.3.1, Better Auth 1.7.4; `.github/workflows/ci.yml` type/lint/test/build/schema/PG17/Workers smoke; migration journal guards | Previous exact-tree GitHub Actions run #39615502080 jobs checks and database SUCCESS 2026-10-21 | CI observed, not independently rerun |
| UI shell/theme/error/action + Editor | `app/forum/ui.tsx` locale switch, theme; `app/root.tsx`; `docs/EDITOR.md`, `docs/UI_UX_PASS.md` source-of-truth reviewed; Editor review in separate prior stage 13 | `app/forum/route-error.test.tsx`, existing Editor tests inspected in stage 13 | No complete interactive responsive/a11y/browser matrix |

Документация `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`, `docs/auth/AUTHORIZATION.md`, `docs/EDITOR.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/LOCALES.md` получена с exact `main` и прочитана до EOF в этой подзадаче. Source file contents and representative actual test assertions (не только названия) прочитаны по перечисленным entrypoints. Actual `Node/PG/browser/deployed` testing заново не производилось; существующий CI отдельный уже подтверждённый build/test evidence. Нет новых доказанных current-Stage дефектов **в узко проверенных source chains**, но нет global PASS.

### Остаток после восстановления

1. **Документально не восстанавливаются исторические действия 1–8**: при отсутствии старого подробного лога их статус именно `HISTORICAL_EVIDENCE_UNKNOWN`, независимо от настоящих отдельных проверок. Переписывать историю нельзя.
2. Реальные проверенные текущие ядро/forum/Editor/localization/DB цепочки теперь перечислены по предметам и не нуждаются в полном повторном 437-file проходе; однако first-audit claim «полностью проверен весь scope» всё ещё не обоснован. Отдельно требуются связанная matrix по критическим негативным/конкурентным/ошибочным путям и точная граница *исходного* first audit (без выдуманного обязательного browser E2E).
3. **Следующая компактная подзадача, по команде владельца:** окончательно проверить E1 на конкретном route-level action `409` (эффект отсутствия автоматической revalidation vs сохранение local editor text/rebase), опираясь на нынешний исходник/тесты, без требования инфраструктуры ради самой формальности. E2/E3 оставить evidence-only до подтверждения current-Stage contract failure.
4. Лишь после сквозной сверки реального объёма/пробелов можно назвать результат первого технического аудита оконченным или чётко обозначить оставшийся непроверенный объём. `AUD-20261022` независимо открыт и не получает зачёт с этого review.

**Никакого исправления и объявления полного завершения.** Этот checkpoint только в личном файле Лиры; shared service channel, чужие personal notes, implementation/main и второй audit не трогать.


---

## Первый аудит — целевая проверка ошибки 409 в Editor 2.0 (2026-10-22)

**Статус: эта подзадача завершена; полный первый аудит НЕ завершён.** Относится только к independent audit, проходившему ранее по этапам 1–14. `AUD-20261022` (отдельный 437-file audit) не менять. Exact `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

**Finding E1 — подтверждён по коду и документированному поведению React Router; функциональный дефект текущего Editor 2.0.** Интегрированная браузерная реализация и новый route-level regression test в этой подзадаче НЕ запускались.

**Ожидаемое по контракту:** `docs/EDITOR.md` published post edit uses immutable revision, rejects stale Save, preserves in-memory typed text and local attachment intent, supports **explicit rebase** to latest published revision; failure must not discard entered content. Отменённый text-draft/autosave не использовать как механизм восстановления.

**Trigger / causality:**
1. Two tabs start with `post.body.id=R1`. One saves R2; second submits `R1` with edited text. `app/forum/views.tsx:2815-2839`: hidden `expectedRevisionId=editBaseRevisionId` initially R1; Save allowed while matches cached loader `post.body.id`.
2. `app/forum/actions.server.ts:482-497` forwards expectedRevisionId into `writer.editPublishedPost`; `db/forum-repository.ts:3674-3736` serializes by row lock, checks author/revision and fails stale `ForumStateConflictError` before altering revision/refs. `app/forum/mutations.server.ts:89-111` returns `data({error:"conflict"},{status:409})`; server protects published data correctly.
3. Project `package.json`: `react-router 8.3.1`, SSR mode `react-router.config.ts`. Official React Router documentation `https://reactrouter.com/how-to/optimize-revalidation` states that Framework SSR **4xx/5xx action failures do not revalidate active loaders by default**. `app/routes/topic.tsx` has loader/action but **no shouldRevalidate**, `TopicView` has no `useRevalidator`/conflict refresh.
4. `app/forum/views.tsx:2236-2246`: error effect only resets pending publication tracker; `views.tsx:2556-2561` displays generic alert. **No fetch/revalidation of authoritative R2**, so cached `post.body.id` remains R1; hidden `expectedRevisionId` remains R1. `views.tsx:2844-2851` rebase UI appears only when `editBaseRevisionId !== post.body.id`; no difference → no button. Save enabled again when pending stops, so next submission still R1 → another 409.
5. Typed source remains in live editor (default revision change alone does not reset scope; in-memory state), but user cannot invoke explicit rebase on unchanged loader snapshot. Browser full reload/navigation may fetch R2 but discards typed text (text drafts deliberately gone).

**Alternatives checked:** `app/forum/online-presence-heartbeat.tsx` does not routinely revalidate topics (homepage-only success heartbeat, auth-401 exception). `app/forum/content-generation-controls.tsx` can revalidate when generation queue/poll progresses, but only conditionally and unrelated to a stale edit. Ordinary locale navigation or explicit refresh may refresh loader but not preserve unsent text through full page reload. `app/forum/public-read.test.tsx:2314-2382` confirms text preserved and rebase works after **manual** `router.revalidate()`; :2621-2700 covers failure `400` and local text survival, **not actual 409→automatic refresh**. `tests/database/forum-attachment-publication.test.ts:121-139` covers authoritative stale revision rejection; `app/forum/write-actions.test.ts` verifies server action forwarding/authorization, not end-user recovery.

**Classification:** Confirmed **source-level current-Stage functional defect**: missing guaranteed freshness/recovery transition after failed stale Save. No implication of overwritten server data or lost in-memory typed text. Not to claim «rebase impossible under all circumstances» because unrelated router revalidation may allow recovery. No remaining source-level alternative found that changes the conclusion. **Observation in deployed browser: информация не проверена**. Suitable implementation regression is a deterministic router test `action status 409` + changed loader R2 + type preserved + explicit rebase makes Save ready; no requirement to test production/OAuth/real R2/Neon to establish this defect.

**E2/E3 remain unchanged:** pending XHR no timeout is a conditional UX robustness question, not confirmed current-Stage defect; generic unexpected writer exception→503 is a source fact with insufficient current-Stage contract failure evidence. Do not assign fixes for E2/E3 as if proven.

**Next first-audit subtask after owner instruction:** final cross-boundary requirement × (guest/authorized/permission-limited/stale/concurrent/unavailable/ambiguous retry) gap reconciliation; clarify remaining source/test coverage and audit completion status honestly, without importing separate `AUD-20261022` manifest.

**Service constraints:** only personal `.github/agents/chatgpt-6.md` in PR #236; no change to shared service-channel, other agents' personal files, implementation, main, or separate audit statuses. This checkpoint is not a completed full-audit result nor a handoff to implementation.


---

## Первый аудит — сквозная сверка критических сценариев (2026-10-22)

**Статус: эта подзадача завершена; ПОЛНЫЙ ПЕРВЫЙ АУДИТ ОСТАЁТСЯ ОТКРЫТЫМ.** Только прежний independent technical audit, обзорные этапы 1–14. Не переносить результат в независимый AUD-20261022 (437-file manifest). Exact GitHub \`main\`: \`d72b27ca762dd930f0e7ad614e5b00832a07ec0c\`; проектная реализация не изменялась.

Цель: требования × отрицательные/конкурентные/отказные сценарии across auth, actions, editor, published revisions, attachment lifecycle и recovery. Прямо просмотрены релевантные диапазоны \`app/forum/mutations.server.ts\`, \`actions.server.ts\`, \`views.tsx\`, \`app/routes/topic.tsx\`, \`app/auth/session-context.ts\`, \`app/routes/attachment-{upload,download}.ts\`, \`app/forum/editor-attachments.tsx\`, \`db/forum-repository.ts\`, \`db/forum-attachment-cleanup.ts\`; содержимое целевых assertions в \`app/forum/write-actions.test.ts\`, \`public-read.test.tsx\`, \`tests/database/forum-attachment-publication.test.ts\`, \`stage4-core-e2e.test.ts\` и список случаев связанных тестов. Это selected source/test review, а **не** прочтение каждого файла целиком и **не** новый run tests/browser.

### Matrix: сценарий → реальная граница → тестовое evidence → оценка

| Сценарий | Evidence реализации и тестов | Результат/остаток |
| --- | --- | --- |
| Гость, чужой Origin, input validation | \`mutations.server.ts:63–111\` проверяет session+Origin, 401/403 и typed validation. \`write-actions.test.ts:622–636\` утверждает отсутствие writer calls при отказе. | Trace подтверждён; нет интегрированного Worker/browser прогона в первом аудите. |
| Authorized actor, permission-limited, owner-specific | \`actions.server.ts:480–499\` server-side editOwn, actor from session; \`forum-repository.ts:3698–3707\` row+owner check. \`write-actions.test.ts:201–218,602–620,995–1013\`, \`forum-attachment-publication.test.ts:121–139\`, \`stage4-core-e2e.test.ts:345–375\` (grant/deny/forgery). | Source/tests подтверждают guards, включая next-request permission changes; не утверждать полный RBAC matrix для каждой операции. |
| Stale published edit, concurrent writers | \`forum-repository.ts:3690–3738\` transaction/row lock/expectedRevision CAS; server \`409\` from \`mutations.server.ts:104\`; native assertion stale rejects in \`forum-attachment-publication.test.ts:121–139\`. UI \`views.tsx:2236–2247,2815–2853\` ожидает обновлённую route post revision для rebase. | Сервер защищает current revision; **E1: подтверждённый source-level current-Stage defect** пути UI после 409, когда loader автоматически не обновился. |
| Concurrent/ambiguous publication and selective attachments | \`forum-repository.ts:3691–3697,3708–3738\`: operation-scope lock, receipt fingerprint, exact retained/current refs, atomic revision/notifications. \`forum-attachment-publication.test.ts:77–119,263–275,280–315\`: same-result replay, modified retry conflict, no mention side effect on stale reject, parallel uploads. | Путь реализован и покрыт выбранными native assertions; не выдавать inspected tests за собственный execution или browser network interruption. |
| Attachment read authorization and cleanup | \`attachment-upload.ts:91–124\` session/Origin/write capability; \`attachment-download.ts:25–85\` public published vs owner-only temporary, inert Content-Type/CSP/no-store; \`forum-attachment-cleanup.ts:44–105\` claim/lock/retry/no published-ref deletion. Существуют \`attachment-operation.test.tsx:106–177\`, \`editor-attachments.test.tsx:151–336\`, native attachment tests. | Selected flows source/test reviewed; живые service-side/storage, end-to-end browser and production cleanup исключены либо не выполнялись. E2 не подтверждён как current-Stage defect. |
| Storage/authorization unavailable vs unexpected failure | \`mutations.server.ts:137–147\` distinguishes typed authorization unavailable from unforeseen errors; \`topic.tsx:89–131\` optional read/authz degradation without granting controls; \`write-actions.test.ts:1111–1175\` typed vs thrown unexpected; \`public-read.test.tsx:455–469\` unexpected presence reader errors must surface. | Reviewed major typed error paths, **но не все** dependency failures across routes. E3 writer generic catch→503 — кодовый факт без доказанного нарушения current-Stage контракта. |
| UI recovery after negative result | \`public-read.test.tsx:2621–2701\` real router action 400 retains unsent in-memory editor text and allows retry; \`:2314–2382\` rebase preserves text+attachment intent only after **manual** \`router.revalidate()\`; no actual 409→fresh R2 route test. \`views.tsx:2236–2247\` clears pending on error without revalidation. | **Fail of automatic post-409 recovery at source/contract level (E1)**; typed buffer survives failed save while page stays mounted. Full reload with no saved draft does not establish recovery. |

### Что подтверждено и чего не доказано

- Across examined boundaries current source implements strong server-side authorization, immutable revision fence, transactional operations, fingerprinted replay, protection of published attachment refs, and typed availability distinctions. Выборочные existing assertions подтверждают intended behavior. **Ни один новый executable test/PG/browser/Worker run в этой подзадаче не выполнялся**; GitHub CI exact-tree SUCCESS из предыдущих notes остаётся отдельным historical evidence.
- Единственный ранее установленный и сохранённый в данном первом аудите current-Stage defect — **E1**, строго source-level UI conflict recovery; online browser observation **информация не проверена**. Official React Router documentation (\`reactrouter.com/how-to/optimize-revalidation\`, checked 2026-10-22, current docs 8.5.0; project pin 8.3.1) says failed 4xx/5xx submissions by default do not revalidate SSR loaders. Topic route provides no specific shouldRevalidate. Нынешний тест вызывает revalidate вручную.
- **E2**: XHR hanging without timeout is conditional resilience concern; \`docs/EDITOR.md\` defines block while upload pending and Retry/Remove after error, no explicit maximum pending time. **E3**: unknown writer error → 503 caught broadly, but actual current-Stage violation unproven. Не назначать исправления на этих основаниях.
- Missing first-audit evidence that affects completeness: (a) no reconstructible detailed original phase 1–8 review ledger, despite subsequent targeted rechecks; (b) first-audit reviewed code/test coverage was selective rather than exhaustive; (c) no own fresh reproducible integrated 409→revalidate negative test/browser observation; (d) no systematic real Worker/browser walkthrough of session expiry/revocation while forms are open, failure display/retry after transient outage or ambiguous network ACK; (e) local PG/CI not independently re-run in first audit; (f) full current-app keyboard/hydration/responsive UX and all 45 migrations/snapshots not read line-by-line. Last items describe **evidence limitations, not newly discovered defects or necessarily mandatory gates**.
- External OAuth/Cloudflare/Neon/Hyperdrive/R2/live providers/deployment/backup as **services** are outside declared current first-audit review, not reasons by themselves to block pre-release source review. No importing AUD-20261022 manifest or status to fill gaps.
- **Decision:** Cannot declare the *first complete audit* finished on this evidence. The definitive first-audit result currently is a documented **partial, risk-focused static technical review with one current-Stage source-level defect and explicit limitations**, not whole-project clearance. To move toward closure, next separately authorized task should resolve the **specific observable recovery cases** E1 failed-409 action, session/permission changes while editing, ambiguous reply/upload outcomes and typed/unexpected failure response at route UI boundary. This is a targeted regression/integration evidence effort, not a request for blanket re-audit of 437 files. If environment prevents actually running it, state that rather than fabricate PASS.
- **Stop:** do not begin next subtask without owner's command. Findings not published as agreed team state; this note is only Лира personal working record. Other personal notes, common service channel, implementation and \`main\` remain untouched.
