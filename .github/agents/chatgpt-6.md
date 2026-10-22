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

**Статус: эта подзадача завершена; ПОЛНЫЙ ПЕРВЫЙ АУДИТ ОСТАЁТСЯ ОТКРЫТЫМ.** Только прежний independent technical audit, обзорные этапы 1–14. Не переносить результат в независимый AUD-20261022 (437-file manifest). Exact GitHub `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; проектная реализация не изменялась.

Цель: требования × отрицательные/конкурентные/отказные сценарии across auth, actions, editor, published revisions, attachment lifecycle и recovery. Прямо просмотрены релевантные диапазоны `app/forum/mutations.server.ts`, `actions.server.ts`, `views.tsx`, `app/routes/topic.tsx`, `app/auth/session-context.ts`, `app/routes/attachment-{upload,download}.ts`, `app/forum/editor-attachments.tsx`, `db/forum-repository.ts`, `db/forum-attachment-cleanup.ts`; содержимое целевых assertions в `app/forum/write-actions.test.ts`, `public-read.test.tsx`, `tests/database/forum-attachment-publication.test.ts`, `stage4-core-e2e.test.ts` и список случаев связанных тестов. Это selected source/test review, а **не** прочтение каждого файла целиком и **не** новый run tests/browser.

### Matrix: сценарий → реальная граница → тестовое evidence → оценка

| Сценарий | Evidence реализации и тестов | Результат/остаток |
| --- | --- | --- |
| Гость, чужой Origin, input validation | `mutations.server.ts:63–111` проверяет session+Origin, 401/403 и typed validation. `write-actions.test.ts:622–636` утверждает отсутствие writer calls при отказе. | Trace подтверждён; нет интегрированного Worker/browser прогона в первом аудите. |
| Authorized actor, permission-limited, owner-specific | `actions.server.ts:480–499` server-side editOwn, actor from session; `forum-repository.ts:3698–3707` row+owner check. `write-actions.test.ts:201–218,602–620,995–1013`, `forum-attachment-publication.test.ts:121–139`, `stage4-core-e2e.test.ts:345–375` (grant/deny/forgery). | Source/tests подтверждают guards, включая next-request permission changes; не утверждать полный RBAC matrix для каждой операции. |
| Stale published edit, concurrent writers | `forum-repository.ts:3690–3738` transaction/row lock/expectedRevision CAS; server `409` from `mutations.server.ts:104`; native assertion stale rejects in `forum-attachment-publication.test.ts:121–139`. UI `views.tsx:2236–2247,2815–2853` ожидает обновлённую route post revision для rebase. | Сервер защищает current revision; **E1: подтверждённый source-level current-Stage defect** пути UI после 409, когда loader автоматически не обновился. |
| Concurrent/ambiguous publication and selective attachments | `forum-repository.ts:3691–3697,3708–3738`: operation-scope lock, receipt fingerprint, exact retained/current refs, atomic revision/notifications. `forum-attachment-publication.test.ts:77–119,263–275,280–315`: same-result replay, modified retry conflict, no mention side effect on stale reject, parallel uploads. | Путь реализован и покрыт выбранными native assertions; не выдавать inspected tests за собственный execution или browser network interruption. |
| Attachment read authorization and cleanup | `attachment-upload.ts:91–124` session/Origin/write capability; `attachment-download.ts:25–85` public published vs owner-only temporary, inert Content-Type/CSP/no-store; `forum-attachment-cleanup.ts:44–105` claim/lock/retry/no published-ref deletion. Существуют `attachment-operation.test.tsx:106–177`, `editor-attachments.test.tsx:151–336`, native attachment tests. | Selected flows source/test reviewed; живые service-side/storage, end-to-end browser and production cleanup исключены либо не выполнялись. E2 не подтверждён как current-Stage defect. |
| Storage/authorization unavailable vs unexpected failure | `mutations.server.ts:137–147` distinguishes typed authorization unavailable from unforeseen errors; `topic.tsx:89–131` optional read/authz degradation without granting controls; `write-actions.test.ts:1111–1175` typed vs thrown unexpected; `public-read.test.tsx:455–469` unexpected presence reader errors must surface. | Reviewed major typed error paths, **но не все** dependency failures across routes. E3 writer generic catch→503 — кодовый факт без доказанного нарушения current-Stage контракта. |
| UI recovery after negative result | `public-read.test.tsx:2621–2701` real router action 400 retains unsent in-memory editor text and allows retry; `:2314–2382` rebase preserves text+attachment intent only after **manual** `router.revalidate()`; no actual 409→fresh R2 route test. `views.tsx:2236–2247` clears pending on error without revalidation. | **Fail of automatic post-409 recovery at source/contract level (E1)**; typed buffer survives failed save while page stays mounted. Full reload with no saved draft does not establish recovery. |

### Что подтверждено и чего не доказано

- Across examined boundaries current source implements strong server-side authorization, immutable revision fence, transactional operations, fingerprinted replay, protection of published attachment refs, and typed availability distinctions. Выборочные existing assertions подтверждают intended behavior. **Ни один новый executable test/PG/browser/Worker run в этой подзадаче не выполнялся**; GitHub CI exact-tree SUCCESS из предыдущих notes остаётся отдельным historical evidence.
- Единственный ранее установленный и сохранённый в данном первом аудите current-Stage defect — **E1**, строго source-level UI conflict recovery; online browser observation **информация не проверена**. Official React Router documentation (`reactrouter.com/how-to/optimize-revalidation`, checked 2026-10-22, current docs 8.5.0; project pin 8.3.1) says failed 4xx/5xx submissions by default do not revalidate SSR loaders. Topic route provides no specific shouldRevalidate. Нынешний тест вызывает revalidate вручную.
- **E2**: XHR hanging without timeout is conditional resilience concern; `docs/EDITOR.md` defines block while upload pending and Retry/Remove after error, no explicit maximum pending time. **E3**: unknown writer error → 503 caught broadly, but actual current-Stage violation unproven. Не назначать исправления на этих основаниях.
- Missing first-audit evidence that affects completeness: (a) no reconstructible detailed original phase 1–8 review ledger, despite subsequent targeted rechecks; (b) first-audit reviewed code/test coverage was selective rather than exhaustive; (c) no own fresh reproducible integrated 409→revalidate negative test/browser observation; (d) no systematic real Worker/browser walkthrough of session expiry/revocation while forms are open, failure display/retry after transient outage or ambiguous network ACK; (e) local PG/CI not independently re-run in first audit; (f) full current-app keyboard/hydration/responsive UX and all 45 migrations/snapshots not read line-by-line. Last items describe **evidence limitations, not newly discovered defects or necessarily mandatory gates**.
- External OAuth/Cloudflare/Neon/Hyperdrive/R2/live providers/deployment/backup as **services** are outside declared current first-audit review, not reasons by themselves to block pre-release source review. No importing AUD-20261022 manifest or status to fill gaps.
- **Decision:** Cannot declare the *first complete audit* finished on this evidence. The definitive first-audit result currently is a documented **partial, risk-focused static technical review with one current-Stage source-level defect and explicit limitations**, not whole-project clearance. To move toward closure, next separately authorized task should resolve the **specific observable recovery cases** E1 failed-409 action, session/permission changes while editing, ambiguous reply/upload outcomes and typed/unexpected failure response at route UI boundary. This is a targeted regression/integration evidence effort, not a request for blanket re-audit of 437 files. If environment prevents actually running it, state that rather than fabricate PASS.
- **Stop:** do not begin next subtask without owner's command. Findings not published as agreed team state; this note is only Лира personal working record. Other personal notes, common service channel, implementation and `main` remain untouched.

---

## Первый аудит — проверка переходов восстановления 409/отзыв прав/неопределённая публикация (2026-10-22)

**Статус: ограниченная подзадача source-contract verification завершена; первый ПОЛНЫЙ аудит НЕ закрыт.** Только первый независимый обзор, не `AUD-20261022`. Remote baseline: GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, implementation не менялась.

### Возможность выполнения

Проверка повторно сопоставила `main/AGENTS.md` с регламентом и прямым указанием не исправлять код до конца аудита. Контейнер в текущем чате: `node v22.16.0` (project pin `24.21.0`), `pnpm`, `react-router`, `react`, `vitest`, `jsdom`, checkout проекта, `docker` и `psql` отсутствуют; `git ls-remote https://github.com/iliya1947/vico-forum.git` завершился DNS-ошибкой. GitHub connector даёт read-only source, но не runtime/execution. **Ни один заявленный интеграционный test, browser/Worker/PostgreSQL run не выполнен.** Нельзя считать ниже PASS реальной интеграции. Проверена официальная React Router documentation `https://reactrouter.com/how-to/optimize-revalidation` и changelog для project-pinned v8.3.1: после 4xx/5xx action SSR framework loader revalidation по умолчанию пропускается.

### Четыре целевых сценария

1. **Stale Save R1→R2, action 409, route + UI.** `app/routes/topic.tsx:30–36,205–211` exports topic loader/action and has no `shouldRevalidate` override; `app/forum/actions.server.ts:480–498`, `mutations.server.ts:89–111`, `db/forum-repository.ts:3690–3738` enforce author/expectedRevision with transaction/CAS and return 409 on stale Save. `views.tsx:2236–2247` clears submitted ref on `forumWriteError` but does not refresh; `:2815–2853` displays rebase only when route-provided `post.body.id` changed. Existing `public-read.test.tsx:2314–2382` explicitly invokes `router.revalidate()`; `:2621–2701` tests 400/retry but not 409. **E1 remains a confirmed source/official-framework-contract current-Stage defect**: no guaranteed fresh revision or user-accessible explicit rebase immediately after rejected stale Save. Text is preserved while editor remains mounted. **Integrated browser manifestation: информация не проверена.** Do not claim server overwrites anything.
2. **Session expiry/permission revocation while edit form open.** `app/auth/session-context.ts:8–17` reads session per request; `app/forum/mutations.server.ts:63–77,137–147` rechecks session/Origin/effective permission on each action. `db/forum-repository.ts:3701–3707` rechecks ownership. `topic.tsx:81–131` computes edit rights from next loader, `views.tsx:2814` gates editor by current `editablePostIds`; `online-presence-heartbeat.tsx:23–35` triggers revalidation on heartbeat 401, not generic 403 and not every time. A stale UI may temporarily display an editor until route reload, but unauthorized Save is denied with 401/403 and no mutation; after refresh controls disappear. In-memory text can disappear when editor unmounts after rights removal, while contract `docs/EDITOR.md:159–169` explicitly denies reload/navigation recovery and confines buffer to open form. **No proven extra current-Stage defect** based on authority freshness; exact user transition not integration-tested.
3. **Ambiguous publish/reply/upload ACK.** `app/forum/markdown-editor.tsx:933–939` supplies client operationID/selected refs; `db/hyperdrive-forum.ts:168–205` creates server IDs and forwards operation; `db/forum-repository.ts:664–681,745–747,783–817` matches fingerprinted receipt before new reply and returns same postId on identical repeated operation, rejects changed request; `forum-attachment-publication.test.ts:280–315` inspects replay/duplicate and owner-scope. `editor-attachments.tsx:195–244` uses stable asset ID for XMLHttpRequest retry; error permits Retry/Remove, Cancel aborts; `docs/EDITOR.md:357–389` says new open editor/account/context gets separate operation, reload doesn't restore uploads/text. **Server idempotence for same operation is supported by inspected source/test.** Browser unknown response/retry after route error and across a new editor operation remain untested; no guarantee across fresh operation ID, which is not prohibited by current documented contract. No newly confirmed defect.
4. **Typed availability and unforeseen errors across action/UI.** `mutations.server.ts:98–111` maps domain/permission/rate limits and generic writer error to 503; authorization precheck `:137–147` maps only typed `AuthorizationUnavailableError` and rethrows unforeseen authz errors (matches `docs/auth/AUTHORIZATION.md:184–206`). `app/routes/topic.tsx:89–131` optional UI authorizations degrade on classified unavailability only, unexpected rethrows. Action `data({error}, {status})` feeds `TopicView` `views.tsx:2107–2114,2560–2561` inline error while mounted; thrown route error goes to `app/forum/ui.tsx:401–434` generic localized ErrorBoundary with details concealed, with existing `route-error.test.tsx:60–83` tests. `public-read.test.tsx:2621–2701` demonstrates in-memory edit retention after 400, NOT after thrown network/runtime failure. **E3** (generic writer unexpected→503) is a source fact; protected authorization catches are separate and behave as documented, so no demonstrated current-Stage authorization-contract violation. Other unexpected writer availability semantics and actual user recovery are unverified; no defect classification solely by catch style.

### Итог и точный остаток

- Повторно подтвержден **E1** only as source+framework-contract defect (not browser reproduced). E2 and E3 not elevated. Нет новых доказанных current-Stage defects от этой подзадачи.
- Четыре интегрированных перехода остаются **NOT_EXECUTED**: post-409 action with changed loader R2/rebase UI; expiry/revocation while populated edit form; post-commit network ACK loss and replay from still-open form; typed 503 vs unhandled failure rendering and retained buffer. Они требуют настоящей React Router/React runtime проверки, и имеющаяся среда для этого не подходит. No standalone mocked algorithm harness is a substitute.
- Missing historical first-audit 1–8 evidence and selective rather than exhaustive source/test coverage remain unresolved. No invented full PASS. Follow-up requires suitable pinned checkout/test runner, if made available; otherwise clearly report limit. Do not transfer gaps/results to separate AUD-20261022.
- Stop after this subtask until owner's next instruction. Only this personal file may change; no general service channel, other agents' files, implementation, `main`, or new assignment.


---

## Первый аудит — остаточное покрытие ранних областей 1–8: документальный и source-ledger (2026-10-22)

**Статус: подзадача сверки оставшегося доказательного объёма выполнена; ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАВЕРШЁН.** Только первый независимый обзор (исходные 14 этапов), не `AUD-20261022`. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, актуальность remote main сверена при открытии задачи. `AGENTS.md` прочитан до EOF. Ничего в implementation/main и чужих файлах не менять.

### Отдельный реестр текущих проверок — НЕ реконструкция истории

Исторических original checkpoints этапов 1–8, из которых можно вывести дату, весь scoped file list и реальные выполненные assertions каждого этапа, нет. Восстанавливать их из существования поздних записей и зелёного CI нельзя. Это `HISTORICAL_EVIDENCE_UNKNOWN`; **не равно найденному defect кода**. Ниже записана новая прямая выборочная сверка current main, дополняющая ранее выполненные source traces.

| Зона, потенциально относящаяся к раннему проходу | Прямая текущая проверка / test evidence | Результат и граница |
| --- | --- | --- |
| App route graph и SSR | `app/routes.ts` (полный файл: root locale negotiation, specific /api/auth + attachment routes before /api/*, scoped locale children and * fallback); `app/root.tsx` (html lang/dir from loader matches); `react-router.config.ts` (SSR true, initial discovery). | Source graph reviewed; real browser routing/hydration test не выполнен. |
| Worker per-request composition | `workers/app.ts` (новый RouterContextProvider на request, Better Auth session перед requestHandler, injected reader/writer/authz/translation/attachment dependencies); `workers/database-bindings.ts` (strict HYPERDRIVE vs WEB_HYPERDRIVE, missing binding throws instead of fallback); actual assertions в `workers/database-bindings.test.ts:10–74` проверяют fail-closed и направленность адаптеров (часть assembly tests — literal source checks, а не runtime simulation). | Source/selected tests reviewed; service connections excluded. |
| Email/password authentication + session/returnTo | `app/auth/auth.server.ts` Better Auth pinned 1.7.4, 8–128 password, email enabled, registration name checks, DB rate limiting; `app/auth/session-context.ts` (one session lookup/request + only Set-Cookie forwarding), `app/routes/auth-api.ts` auth handler; `app/auth/credential-path.ts` same-locale relative return target. Actual assertions `session-context.test.ts:32–78`, `credential-view.test.tsx:94–103,161–184`, `auth.server.test.ts:12–35`. Historical native email/DB assertions recorded in prior checkpoint, not independently run now. | SSR/session/source/test review; no Google OAuth/live HTTP in this new subtask. |
| Locale and permission boundaries | `app/routes/locale-boundary.tsx:34–106`: authoritative locale, degraded GET/HEAD 307/no-store, redirect-required mutation 404, optional authz unavailable vs unexpected; `locale-negotiation.ts` user locale negotiation; actual assertions `locale-boundary.test.ts:22–64,90–116,152–174`, `locale-negotiation.test.ts:19–91`; `app/routes/authorization-admin.tsx:15–74` checks session, manage permission and Origin before mutations, typed 401/403/503 vs thrown unexpected. | Source/test assertion review. Это не полный provider/i18n integration nor complete role-mutation DB run; latter previously reviewed in stage 12. |
| Test/build/DB migration gates | `package.json` exact versions: Node 24.21.0/pnpm 12.3.4, RR8.3.1; `.github/workflows/ci.yml:10–116` has checks (migration guards, lint, types, test, build, schema) and native PG17 suite + privilege probes + Worker smoke; previous logged exact-tree run #39615502080 had both jobs SUCCESS 2026-10-21. Native tests `tests/database/migrations.test.ts` selected titles and earlier reviewed assertions are evidence of cases, not fresh runs. | CI declaration/source read; no independent execution. Not automatically a full 45-SQL/45-snapshot review. |

### Граница завершённости первого аудита

- Поздние checkpoints 9–13, отдельные localization/transaction/security checks, target E1, cross-boundary scenario matrix и recovery-source audit already capture the *named principal subsystems* (public forum discovery, participation, Help, authorization, Editor, attachments, translations, local database). **This is bounded source/test-audit coverage, not complete file-by-file 437 manifest.**
- Из доступного исторического материала невозможно показать, что первоначальная программа 1–8 была полностью выполнена, и невозможно ретроактивно назвать её PASS. Сейчас расширена фактическая source-ledger early architecture/auth/locale/CI, но не подтверждено прочтение всех исходников/тестов тех неизвестных этапов.
- **Открытый current-Stage finding:** E1 `409` edit conflict recovery remains confirmed on code + router documented behavior, no integrated browser test. E2/E3 are not established defects. Нового current-Stage defect в данной подзадаче не обнаружено.
- **Неустановленное evidence:** independently executed Worker/browser/React Router UI conflict/revocation/ACK recovery; full accessibility/responsive/hydration real-browser states; independent all-tests/PG run; systematic all SQL+snapshots line review. Сами по себе эти пробелы не следует объявлять обязательными gate *первого* source review; user-requested separate detailed AUD-20261022 has its own explicit coverage rules. UI_UX_PASS.md:666–704 requires a real browser for standalone product acceptance, while Editor 2.0 owner waived separate visual/Pages gate. Do not extend one task's acceptance onto another by default.
- **Окончательная оценка:** первый аудит сейчас нельзя обоснованно назвать завершённым полностью или без находок. Допустимое точное название выполненной работы — *documented targeted application source/test audit on the frozen main, with one identified Editor conflict-recovery defect and explicit unverified areas*. Следующий шаг в первом аудите, если владелец разрешит: финальное reconciliation original scope vs реально demonstrated evidence, принятие корректной границы заключения, без выдумывания ранних PASS и без подмены AUD-20261022. При необходимости executable proof требует иной runtime environment.
- **Остановка:** личный файл Лиры — только рабочая фиксация; не публиковать findings в общий канал, не назначать исправления, не менять main/implementation/другой аудит. Следующую подзадачу начинать только после команды владельца.


---

## Первый аудит — финальная сверка исходного объёма и фактических доказательств (2026-10-22)

**Статус: ФИНАЛЬНАЯ СВЕРКА ПЕРВОГО АУДИТА ВЫПОЛНЕНА, НО ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАВЕРШЁН.** Это решение о достоверности покрытия, не final PASS, не final clearance и не публикация командных findings. Относится только к первому independent audit с исходными обзорными этапами 1–14. НЕ к `AUD-20261022` (отдельная явная программа с manifest).

Baseline GitHub `main` = `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, повторно проверен. Текущий полный `AGENTS.md` прочитан из `main`. Режим: read-only source/test review. Не менять код, schema, shared communication, файлы других агентов или другой audit.

### 1. Proven evidence — фактический выполненный обзор

- **Scope/core public forum:** category/section/topic/messages, search/popular/unanswered/tags, notifications/unread/profile/presence, topic/reply create, solved/best answer, Help and moderation/attention. Прямой trace в записях этапов 9–11 и реальных current source/test samples. Для каждого named subsystem есть source-oriented audit evidence, но нет утверждения, что абсолютно каждый файл/ветвь прочитан построчно.
- **Auth/session and authorization:** Better Auth email/password, request-scoped session/actor, permission snapshot + request freshness, owner and same-origin guard, manager lockout, degraded classified failures, safe error routes; текущие дополнительные проверки `workers/app.ts`, `workers/database-bindings.ts`, `app/auth/auth.server.ts`, `app/routes/auth-api.ts`, `app/routes/authorization-admin.tsx` и `workers/database-bindings.test.ts`, `app/auth/session-context.test.ts`, `credential-view.test.tsx`, `locale-boundary.test.ts`, `locale-negotiation.test.ts`, `write-actions.test.ts`, native DB tests. Source scopes включают критические guards, но не blanket PASS всех permissions × routes × roles.
- **Editor 2.0+attachment lifecycle:** Simple/Advanced, source buffer/Markdown, quotes/mentions, history, published-edit optimistic revision, selected attachments, private upload/download, receipt/idempotency/cleanup. Evidence этапа 13 + 409 targeted audit + cross-boundary matrix; выбранные actual assertions inspected in `public-read.test.tsx`, `forum-attachment-publication.test.ts`, `attachment-upload.test.ts`, `attachment-download.test.ts`. Полный browser E2E не выполнялся.
- **Locale/UI/content translations:** canonical locale registry and middleware, fail-closed mutation on redirect-needed locale, original-safe fallback, UI bundle/persistence, content revision/claim/publish/concurrency; отдельная translation source/test subtask details and current boundary assertions в журнале. Real provider/Queues out of scope.
- **Transactions/migrations/security:** native PG schema/test assertions, migration journal/CI guards, owner/permission/concurrent locks, attachment cleanup; 45 SQL and 45 snapshots NOT all line-reviewed. External DB/Cloudflare acceptance excluded.
- **Entry/quality:** `app/routes.ts`, `app/root.tsx`, `react-router.config.ts`, `workers/app.ts`, `workers/database-bindings.ts`, `package.json`, `.github/workflows/ci.yml` directly reviewed. Evidence `workers/database-bindings.test.ts` includes literal source wiring assertions (NOT worker E2E). Existing GitHub Actions run #39615502080 (PR #232 exact-tree) jobs `checks` and `database` success was rechecked via GitHub API in this final task; no independently executed new CI/PG/browser test.

### 2. Finding triage — full causal status

- **E1, current Editor 2.0:** confirmed source-level functional failure of direct stale-409 recovery, not data corruption. Backend enforces expectedRevision/409 correctly; `app/routes/topic.tsx` has no `shouldRevalidate`; RR8 SSR official `reactrouter.com/how-to/optimize-revalidation` section Default behavior says failed 4xx/5xx action doesn't revalidate loaders by default; `app/forum/views.tsx:2236–2247,2814–2853` resets error tracker without initiating fresh load, while rebase control requires `editBaseRevisionId !== post.body.id`. Existing test `public-read.test.tsx:2314–2382` triggers `router.revalidate()` itself. E1 thus blocks **automatic discovery/recovery** from conflict on stale snapshot, until unrelated route refresh or navigation; typed text survives while mounted. Browser integration runtime: **информация не проверена**.
- **E2:** XHR pending without timeout/individual pending Remove; possible resilience UX, no current requirement max pending lifetime, overall Cancel abort exists; NOT confirmed defect.
- **E3:** `runForumMutation` catch-all unknown→503 is real source behavior; protected authorization unexpected errors rethrow according to `docs/auth/AUTHORIZATION.md`; exact breach of current Stage writer contract not established. NOT confirmed defect.
- Additional Stage 6 live OAuth/providers/Queues/service infrastructure and later visual refinement are **not current first-audit defects** by mere omission.

### 3. Evidence ledger and actual unresolved verification

| Предмет | Итог |
| --- | --- |
| Первоначальные этапы 1–8 по исходному замыслу/истории | **HISTORICAL_EVIDENCE_UNKNOWN**: исходные подробные checkpoints/scope/fulfilled assertions отсутствуют; поздний bounded re-review не подтверждает историческое полное выполнение. |
| Этапы 9–13 | Предметные журналы source/test review существуют; НЕ full executed E2E/entire source-line coverage. |
| Обзорный шаг 14 и later reconciliation | Матрица source/tests, E1–E3 triage, permission/negative/error/ambiguous retry, targeted additional reviews now documented; exact original requirement-by-requirement PASS across full stated scope НЕ доказан. |
| Реальный 409 transition + browser runtime | **NOT_EXECUTED**; direct source/contract defect evidence достаточно для provisional E1, но не для утверждения browser reproduction. |
| Session expiry/revocation, post-commit lost ACK, UI 503/unexpected recovery | Source-side boundaries inspected; end-to-end behavior **NOT_EXECUTED**. |
| Fresh full suite/PG, all SQL/snapshots, exhaustive browser accessibility/responsive/hydration | No independent execution/full line-review; обозначить limitation, а не automatically mandatory gate текущего bounded source-review. |
| Отдельный `AUD-20261022` | Независимая 437-in-scope explicit manifest and progress; status **unchanged** and not awarded credit from this first audit. |

### 4. Вердикт

1. **Финальная сверка выполнена; полноту первого аудита подтвердить невозможно.** Нельзя ни объявить `AUDIT COMPLETE`, ни утверждать, что проверено каждый заявленный механизм/негативный переход. Общий исходный объём ранних этапов нельзя достоверно восстановить из имеющихся записей; изменение определения "полный" на "частичный source review" ради статуса DONE недопустимо.
2. Корректная формулировка результата: **частичный независимый технический source/test audit на зафиксированном main с одним source-confirmed current-Stage finding E1**, с указанными непроверенными интеграционными сценариями. Остальные ранние механизмы были перепроверены выборочно с конкретными evidence; это не ретроспективные PASS 1–8. Доказательства недостаточны для whole-audit clearance.
3. Новую разработку и передачу findings другим агентам в рамках этой проверки **не инициировать**. Личный файл — разрешённый owner рабочий checkpoint, но не финальная публикация team findings.
4. Для реального **полного** покрытия нельзя тратить новые циклы на выдумывание исторических шагов 1–8; требуется объективно заданный scope и отдельное доказательное прохождение, в том числе runtime checks там, где от них зависит результат. Такой explicit manifest уже ведётся **отдельно** в `AUD-20261022`; не подменять его результатами первой проверки. Если owner продолжит именно первый аудит, единственный честный путь — новые предметные проверки недоказанных требований со свежим ledger, не декларация завершения.
5. **Stop после этой subtask** до команды владельца. Ни один следующий этап аудита не запущен.



---

## Первый аудит — статическая проверка DB migrations 0034–0044 и актуальности схемы (2026-10-22)

**Одна подзадача завершена. Первый полный аудит всё ещё ОТКРЫТ.** Это только прежний independent source/test audit, не `AUD-20261022`. Фиксированное `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Read-only: implementation/SQL/snapshot/schema/shared service/чужие файлы не менялись.

### Объём и метод

- Полностью прочитаны именно все **11 SQL migrations `drizzle/0034_*.sql`–`drizzle/0044_*.sql`**, включая `0038_forum_attachment_cleanup_claims` с PL/pgSQL guard function и двумя triggers; `0039_forum_publication_receipts`, `0040_post_edit_history_permissions`, `0041_published_mentions`, `0042_attachment_edit_snapshots`, `0043_attachment_security_read_permission`, `0044_attachment_draft_conflict_boundaries`.
- `drizzle/meta/_journal.json` прочитан и сопоставлен с GitHub directory listing: 45 file names `0000`–`0044` на месте, 45 distinct journal entries, `idx=0…44`, строго возрастающие `when`, missing/extra SQL/journal names = **0**. Также получен/разобран целиком машинно текущий `drizzle/meta/0044_snapshot.json` (47 tables) и сравнен с созданными таблицами/именованными constraints/indexes блока `0034–0044`: все десять создаваемых таблиц присутствуют, missing **named constraints / indexes = 0**. Последний authz `authz_permissions_catalog_check` в migration 0043 и `db/schema.ts:621–629`: 15 keys, два направления различий = 0.
- `db/schema.ts:508–534,609–656,855–1117` конкретные PK/FK/UNIQUE/check для редактора, revisions, attached assets, owner-ref, idle cleanup, generation terminal markers, edit snapshot/provenance, receipts, security events и built-in permissions сопоставлены с SQL. Manual `0038` trigger/function не входит в декларативный Drizzle snapshot (не объявлять отсутствие trigger в snapshot нарушением). Существующие DB tests `tests/database/forum-attachments.test.ts:232–236,294–320,712–768,917–932,935–959,961–1005`, `forum-attachment-publication.test.ts:280–315,317–378` прочитаны до релевантных assertions.
- Trigger `forum_attachment_require_active_ref()` под `SECURITY DEFINER` и `SET search_path=pg_catalog` проверяет status целевого asset под `FOR SHARE` до новых draft/published refs; cleanup `db/forum-attachment-cleanup.ts:67–105,108–141` берёт `FOR UPDATE SKIP LOCKED`, свежую проверку refs, durable claim/token+lease перед удалением private object. Тест с двумя PG connections демонстрирует expected `23514` для ref после claim. Дальнейшие tests проверяют shared post refs, rollback, lost object-delete ACK и отсутствие double-claim.
- SQL `0039` drops nonempty post revision content constraint intentional for attachment-only messages; validation+live referenced assets are enforced in application transaction. Native application/PG tests explicitly verify file-only publish, exact submitted subset, post-edit CAS, replay of identical operation after lost ACK, conflict on modified retry and 24h activity semantics. `0034` legacy `forum_editor_drafts`, `0042` snapshots, `0044` draft-boundary tables remain from accepted historical schema **by design**; current `PROJECT_STATE.md:23–60` and `docs/EDITOR.md:159–175,351–389` explicitly remove runtime text-draft/autosave without rewriting accepted migration 0034–0044. No current defect inferred from dormant tables.
- Clean native PG17 history/schema tests and GitHub Actions CI #39615502080 previously completed successfully; **in this subtask tests, migrations or production services NOT EXECUTED**. Static checks of DDL names/Drizzle snapshot and existing test assertions do not prove runtime SQL execution in this audit.

### Новое подтверждённое несоответствие документации (D1)

`PROJECT_STATE.md:1557–1568` в разделе *«Реализованный foundation / Текущий repository baseline»* прямо утверждает **«текущая repository migration history — 0000–0043»**. Но в актуальном `main` checked-in `drizzle/meta/_journal.json` есть 45 записей через `0044_attachment_draft_conflict_boundaries`, сам `drizzle/0044_attachment_draft_conflict_boundaries.sql` и snapshot `drizzle/meta/0044_snapshot.json` существуют; `PROJECT_STATE.md:367` также отдельно упоминает migration 0044. Это **подтверждённая текущая source-of-truth freshness inconsistency**, а не schema/runtime defect и не будущая Stage 6 работа. Различие внешней accepted migration evidence, заканчивающейся на 0020, корректно и не связано с D1.

**Classification:** D1 — documentation/state accuracy issue in current product/project source-of-truth, не требующий архитектурного изменения. Действия по исправлению внутри audit не предпринимать; сведения о finding сообщать владельцу в чате, не делать утверждённой записью в общем канале до разрешения. E1 остаётся отдельным подтверждённым source-level current-Stage UI finding; E2/E3 не подтверждены как дефекты.

### Точный остаток

- По выбранной high-risk области покрытие улучшено: все 11 SQL прочитаны; schema/текущий final snapshot и названия constraints проверены; релевантные native test assertions просмотрены.
- **Не является проверкой всех `0000–0033` SQL построчно, всех 45 промежуточных snapshots/их преобразований, реального execution PG / FKs/DDL, либо runtime Worker.** Не переносить `AUD-20261022` manifest или статусы.
- Первый аудит всё ещё не может получить whole-scope PASS из-за historical 1–8 ledger gaps + selective evidence and unexecuted observable transitions; одна подзадача не закрывает всю работу. Нет нового доказанного функционального дефекта DB migrations 0034–0044 сверх documentation D1.
- **Stop** по регламенту после этой подзадачи; следующая требует явной команды владельца. Сохранять только personal note в PR #236; не менять прочие файлы и не назначать agents.


---

## Первый аудит — полный обзор SQL 0000–0033 и цепочки snapshots (2026-10-22)

**Подзадача 0000–0033 завершена; ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только прежний технический source/test audit, не `AUD-20261022`; frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; полный актуальный `AGENTS.md` прочитан. Реализация `main`, миграции, snapshots, общий communication-файл и другие личные файлы не изменялись.

### Фактически проверено

- **Все 34 SQL** `drizzle/0000_*.sql`–`drizzle/0033_*.sql` получены с `main` и прочитаны до EOF, в пяти пакетах: 0000–0006, 0007–0013, 0014–0020, 0021–0027, 0028–0033. Функциональные слои по порядку: LocaleRegistry/seed UI storage (0000–0002), Better Auth (0003), forum categories/posts/immutable revisions/current owner FK/solved (0004–0005), dynamic authz roles/grants/lockout (0006), translation durable task lifecycle/generation/DLQ (0007–0013), revision-bound content translation/task metadata/triggers/budgets/admission (0014–0020), tags/reply/read markers/notifications/pins (0021–0025), independent best answer and Help (0026–0031), profiles/presence (0032–0033).
- **Все 34 JSON snapshots `drizzle/meta/0000_snapshot.json`–`0033_snapshot.json` прочитаны программно как JSON, проверена непрерывная последовательность `prevId == prior.id` для всех переходов (включая 0016→0017), список таблиц/новых таблиц на каждом шаге; 0 broken chain, 0 unexpectedly removed tables. На 0033 — 37 tables. Не утверждать, что каждое поле/тип/constraint каждого snapshot был построчно перепроверен. Отдельная предшествующая подзадача: SQL 0034–0044 прочитаны, final 0044 snapshot разобран; history 45 tags `0000`–`0044`.
- По сверке **созданных SQL таблиц 0000–0033 с 0033/0044 snapshots** ни одна таблица не отсутствует. По выборке всех именованных `CREATE/ADD CONSTRAINT`, `CREATE INDEX` против 0033/0044 получены только известные исключения: manual deferrable `forum_topics_current_title_revision_fk`, `forum_posts_current_revision_fk`, `forum_topics_best_answer_topic_post_fk` не перечисляются в Drizzle declarative snapshot; `forum_topics_best_answer_requires_solved_check` появился в 0005, намеренно удалён forward migration 0026. `0026` делает best answer independent from solved; `tests/database/migrations.test.ts:2442–2468` действительно проверяет `pg_constraint` metadata и отсутствие старого coupling constraint. Декларативные `DROP/ADD` catalog/status constraints между historical versions отражают эволюцию, не текущий дефект.
- **Ручные triggers** в SQL 0004/0006/0015/0016: immutable post/title revision guards; built-in role identity protection; deferred required metadata binding for content translation tasks; deletion metadata lifecycle. Разница «manual SQL vs Drizzle snapshot» является ожидаемым representation boundary, а не нарушением. Тест `migrations.test.ts:2565–2596` проверяет `55000` на UPDATE immutable revisions, `:2599–2613` — deferred current-post FK, `:1458–1474` — permission catalog/role protection.
- **Наблюдаемые PostgreSQL test assertions** сверены не только по названиям: `tests/database/migrations.test.ts:59–71` PostgreSQL 17 + UTF8 + expected 45 migrations, `:1414–1456` отсекает canonical en persisted UI resources, `:1458–1475` catalog/seed grants, `:2431–2468` best-answer independent and FK metadata, `:2565–2642` revisions/FK/sourceLocale, `:2821–2885` concurrent locale graph writer ordering, `:2987–3007` reserved locales/invalid arrays; `tests/database/stage4-core-e2e.test.ts:175–210,330–375` exercises real Drizzle/API forum authz grant/override/faked identity (not browser E2E), `tests/database/content-topic-title-execution.test.ts:127–163,392–413,740–769` revision/allowance/concurrency. Other Help/profile/presence test titles/purpose inspected; not asserting all their assertions exhaustively read this turn.
- **No new execution:** no fresh local/CI/PG/Worker/browser run performed in this subtask. Previously verified exact-tree GitHub CI #39615502080 `checks` + `database` SUCCESS remains external existing evidence, not independent run; static parsing and reviewed test assertions do not prove runtime outcomes this turn.

### Stage classification and restrictions

- **New confirmed current-Stage functional/schema defect from 0000–0033: NONE on reviewed evidence.** An old `CHECK` deleted by migration 0026 is *intentional*; historical changes of authz catalog and translation task lifecycle are also intentional. No speculative schema hardening or Stage 6 rollout recommended.
- Existing **D1 documentation mismatch** from previous subtask remains: `PROJECT_STATE.md:1568` says active history 0000–0043, while main journal has 45 migrations through 0044. Do not double-count as a new finding. E1 (409 UI recovery) also unchanged; E2/E3 not elevated.
- After combined recent tasks **45/45 SQL migrations 0000–0044 have been directly read**. **34/45 historical intermediate snapshots (`0000–0033`) have been parsed for chain/table evolution; 0044 final was inspected and compared to schema earlier.** No exhaustive check yet of 0034–0043 intermediate snapshot chains or all intermediate column/type semantics; and no own PG re-execution. These remaining limitations must not silently be converted to PASS. The whole FIRST audit still lacks recoverable old phases 1–8 ledger and actual browser/integration failure recovery evidence.
- **Stop now** as this independent subtask is complete; next possible *bounded* part, with owner approval: `0034–0044` snapshot chain/constraint evolution, to complete historical schema-metadata reconciliation; separate audit `AUD-20261022` not affected. No implementation/fix/agent handoff until approved process.


---

## Первый аудит — цепочка Drizzle snapshots 0034–0044 (2026-10-22)

**Статус: отдельная подзадача проверки snapshots закрыта. ПЕРВЫЙ АУДИТ ФОРУМА ЦЕЛИКОМ ЕЩЁ НЕ ЗАКРЫТ.** Относится только к первому независимому аудиту, а не к `AUD-20261022`. Source `main` exact SHA `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, проверен GitHub branch API. Актуальный `AGENTS.md` из `main` полностью прочитан. Только чтение проверяемой реализации: исходники, tests, migrations и docs не изменялись.

### Доказанное покрытие промежуточной истории 0033→0044

- Получены и разобраны **все 12 snapshot JSON `0033_snapshot.json`–`0044_snapshot.json`**. Для 11 transitions каждая `prevId` точно совпадает с `id` предыдущей, break=0. Table counts: 0033=37, 0034=38, 0035=41, 0036=42, 0037=43, 0038=43, 0039=44, 0040=44, 0041=44, 0042=45, 0043=45, 0044=47. Дрейфа/удаления таблиц в 11 переходах нет.
- Для каждой версии сопоставлены прежняя и следующая snapshots по *all* shared-table `columns`, `indexes`, `foreignKeys`, `compositePrimaryKeys`, `uniqueConstraints`, `checkConstraints` (addition/removal/modification) и перечислены новые таблицы. `0000–0033` chain/tabular evolution уже была проверена в предыдущей подзадаче; суммарно теперь **45/45 snapshots охвачены машинной проверкой исторических ссылок/таблиц**, без утверждения о построчном semantic-review каждого поля каждого snapshot.
- Все 11 SQL `0034–0044` повторно сопоставлены с итоговым `0044_snapshot.json` и зафиксированными **поэтапными** deltas: каждое имя создаваемой таблицы, перечисленные её колонки, именованные PK/FK/UNIQUE/CHECK и индексы обнаружены в итоговом snapshot, errors=0 по выполненной статической name/column inventory. Отдельно проверены определения основных изменённых колонок и catalog check; это не runtime SQL execution.

| Transition | Доказанный snapshot delta и SQL-соответствие |
| --- | --- |
| 0034 | +`forum_editor_drafts` (1 table) |
| 0035 | +`forum_attachments`, `forum_attachment_draft_refs`, `forum_post_attachments` |
| 0036 | +`forum_attachment_security_events` |
| 0037 | +`forum_attachment_draft_generations` |
| 0038 | `forum_attachments` + `cleanup_status` (text, NOT NULL, default `active`), `cleanup_claim_token` nullable, `cleanup_claimed_at` nullable, cleanup index and two CHECK; manual `forum_attachment_require_active_ref` trigger function+2 triggers are in migration SQL, not expressible as Drizzle declarative snapshot |
| 0039 | +`forum_publication_receipts`; intentional removal `forum_post_revisions_content_check` to permit file-only published message with validated refs |
| 0040 | `forum_posts.edited_at` nullable `timestamptz`; `authz_permissions_catalog_check` modified to add post edit/history rights |
| 0041 | `forum_reply_notifications.kind` = text NOT NULL DEFAULT `reply`; check `reply\|mention` |
| 0042 | +`forum_attachment_edit_snapshots` |
| 0043 | catalog CHECK modified to add `forum.attachmentSecurity.read`; final 0043 SQL 15 catalog entries match `db/schema.ts:621–629` |
| 0044 | +`forum_attachment_draft_boundaries`, `forum_attachment_draft_contexts`; foreign keys/indexes captured; historical draft provenance retained |

### Разграничения и тестовое evidence

- Изменение `0040` permission CHECK в snapshot разрешает 14 catalog keys; `0043` добавляет `forum.attachmentSecurity.read`, итоговый `db/schema.ts` содержит те же 15 keys. SQL CHECK сравнен с переходными snapshot expressions, без скрытого whitelist-conflict.
- `0039` SQL `DROP CONSTRAINT "forum_post_revisions_content_check"` совпадает с тем, что в новом 0039 snapshot check исчезает; добавленный `forum_publication_receipts` сохраняет идемпотентный stable operation receipt. Application/PG test assertions в `tests/database/forum-attachments.test.ts` и `forum-attachment-publication.test.ts` уже осмотрены предыдущей подзадачей, в том числе file-only publish, lost ACK replay, 409 revision CAS.
- `0038` cleanup admission trigger+function не представлены в snapshot: ожидаемое manual SQL дополнение, реальная работа и PG contention были проверены *содержанием существующих тестов*, в частности `tests/database/forum-attachments.test.ts:961–988` (PG 23514 after cleanup claim), **но этот чат не запускал PostgreSQL**.
- Таблицы `0034`/`0042`/`0044` с историческим словом `draft` после owner-решения 2026-10-20 НЕ означают, что пользовательские текстовые черновики активны. `docs/EDITOR.md:159–169,351–389`, `PROJECT_STATE.md:23–60` прямо требуют оставить merged SQL intact, убрать runtime text persistence, сохранить attachment/publication machinery. Не трактовать как defect.
- **Отдельные findings:** E1 — прежнее source-confirmed current-Stage 409 edit conflict recovery UI; D1 — stale `PROJECT_STATE.md:1568` (0000–0043 вместо 0000–0044). E2/E3 still unproven. **Новый defect** в рассматриваемой snapshot-chain/DDL parity: **не установлен**. Не обновлять общий channel и не назначать fix.

### Степень завершения

- **Complete bounded schema-history static pass:** 45/45 migration SQL полностью прочитаны двумя подзадачами; 45/45 snapshot files программно разобраны и проверены на continuity/table evolution; changes 0033→0044 reviewed по column/index/FK/PK/unique/check deltas и SQL linkage. Интеграционное применение PostgreSQL/metadata introspection самими агентом здесь **NOT EXECUTED**; exhaustive field-by-field parity для early intermediate snapshots не заявлена.
- Это не equates to complete independent audit whole forum. Недостающие первые historical 1–8 checkpoints cannot be retroactively asserted PASS; React Router runtime 409, revocation and ambiguous network recovery unexecuted. Separate `AUD-20261022` audit remains fully isolated.
- **Остановиться после этой одной подзадачи** до новой явной owner-команды, никаких изменений implementation PR, `main`, общих служебных файлов, чужих personal files.


---

## Первый аудит — интеграционный переход: истёкшая сессия / отозванное право после открытия формы (2026-10-22)

**Одна ограниченная подзадача завершена. ВЕСЬ ПЕРВЫЙ АУДИТ ПО-ПРЕЖНЕМУ ОТКРЫТ.** Frozen `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Полный `AGENTS.md` прочитан из `main`; режим проверки — read-only implementation/test/SoT trace; второй `AUD-20261022` НЕ затронут. Никакого изменения production, implementation code, shared service file, чужих журналов.

### Проверенный сценарий

Пользователь открыл страницу с разрешённой form (Reply/Edit/MarkSolved), затем **перед новым POST** его Better Auth session перестала быть валидной ИЛИ current role grant/override был изменён. Результат должен быть fail-closed, а не доверять ранее отображённым UI controls. Точная обязательная семантика `docs/auth/AUTHORIZATION.md:164–206,223–224`: effective role/grants/overrides server-backed, next-request freshness, request-scoped only cache, protected operation resolves current permission, denial != dependency-unavailable.

**Request chain:**
1. `workers/app.ts:29–51`: new `RouterContextProvider` and `createHyperdriveAuthorization(webConnectionString)` **each incoming fetch**, call `initializeAuthContext` before react-router requestHandler; `app/auth/session-context.ts:9–17` invokes `getSession(request.headers)` before action, stores `AuthSession|null`; `auth.server.ts:85–109` uses real Better Auth `getSession` against DB. Authentication cookies propagated via `withAuthSessionCookies`.
2. `app/forum/mutations.server.ts:74–77`: no session => `{error:"unauthenticated"}` HTTP **401**, no form parsing/domain writer; `app/forum/actions.server.ts:177–188,480–503` topic route guard and action dispatch do not trust earlier UI permissions; uses server-provided actorId. `app/forum/write-actions.test.ts:622–625,995–999` show mock domain writer has **zero calls** when guest/unauthenticated. `app/auth/session-context.test.ts:44–50` covers null context.
3. `tests/database/auth-runtime.test.ts:63–169` is native Better Auth/PostgreSQL **existing source**, specifically `:154–167` artificially ages DB `session.expires_at`, and `runtime.getSession(cookie)` returns null, sets expiry cookie and removes session DB row. This test was *read*, NOT executed afresh.
4. For valid session but revoked grant, `app/forum/actions.server.ts:480–482,500–502,190–193` calls `requireForumPermission` ahead of calling `runForumMutation`. `mutations.server.ts:137–148` asks `authorizationForRequest(context).forUser(session.user.id).has(permission)`, `false` returns **403**, `AuthorizationUnavailableError` maps controlled 503, unexpected error rethrows. `db/hyperdrive-authorization.ts:19–58` keeps promise cache only inside request-local capability; `db/authorization-repository.ts:103–136` loads role+grants+overrides from consistent PostgreSQL snapshot. `app/forum/write-actions.test.ts:201–218,602–620,984–993` confirms denied actions never invoke writer and forged client actor has no effect.
5. **Real PostgreSQL test of NEXT request revocation:** `tests/database/stage4-core-e2e.test.ts:330–375` changes `builtin-moderator` grant and per-user overrides and then submits another protected action through real repo/route context; expects HTTP **403** and unchanged `isSolved` after revoked grant/deny. Regrant/override allow produces 302. This establishes existing integration test coverage of next-request freshness, not live browser form E2E here.
6. `app/routes/topic.tsx:81–130` derives optional edit/reply UI capability from latest server-side permission on loader; typed auth-unavailable may hide controls on public page. `app/forum/views.tsx:2107–2115,2559–2562` maps action failure to visible translated `role="alert"` error. `views.tsx:2236–2247` on failure keeps edit form rather than clearing it; default 4xx/5xx loader skip can leave *presentation* capabilities stale until explicit navigation/revalidation, but server authorization stays authoritative. Contract expressly says optional presentation state is NOT authorization boundary, so stale UI alone does not prove current-Stage functional/security defect; not a second E1.
7. Timing caveat: this checked revoke/expiry **before a NEW protected request**, which is explicit freshness contract. Revocation **after an already accepted in-request authorization snapshot but before commit** is a separate race, not guaranteed immediate invalidation by `docs/auth/AUTHORIZATION.md`; must not retroactively demand stronger cross-transaction locks without current Stage requirement.

### Test execution and conclusion

- **Fresh real end-to-end scenario combining opened browser form → actual DB session expiry or grant revocation → same form submission → UI + no-write:** **NOT_EXECUTED**; available local container had Node 22.16 but no source/deps/pnpm/disposable PG17/browser environment. `tests/database/auth-runtime.test.ts` and `stage4-core-e2e.test.ts` + route/unit mocks only establish the separate critical links. No fresh CI rerun.
- **Source/test-supported expected behavior:** expired request => 401 before writer; revoked grant next request => 403 before writer; client spoofing cannot restore permission; error presentation exists. **New current Stage defect: NOT ESTABLISHED**. This is a bounded, evidence-backed verification of one transition, not blanket runtime PASS and not full forum audit completion.
- Existing separate findings **E1** (post-edit stale 409 loader recovery) and **D1** (`PROJECT_STATE.md` says 0000–0043 despite journal through 0044) remain unchanged. E2/E3 remain not confirmed.
- After this checkpoint **STOP** until explicit user instruction. Next meaningful unreviewed transition: ambiguous publication POST success/response loss and retry continuity *across actual client/server layer*, distinct from server-only receipt tests. Do not mix with second `AUD-20261022`.


---

## Первый аудит — потерянный ACK публикации и idempotent replay (2026-10-22)

**Отдельная ограниченная подзадача завершена. ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ; `AUD-20261022` НЕ ЗАТРАГИВАТЬ.** Frozen `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; полный актуальный `AGENTS.md` из `main` прочитан. Только read-only source/test/SoT; implementation/shared file/другие agents не изменены.

Проверено: POST успешно сохраняет тему/Help-вопрос/ответ/редактирование; HTTP ACK/302 теряется; идентичный POST повторяется с теми же owner/context/operationId/payload. Отличать server idempotency от client error-recovery.

**Четыре звена:**
1. **Mounted browser identity:** `app/forum/editor-attachments.tsx:132–161,168–178,328–335` устанавливает `draftId=crypto.randomUUID()` при инициализации открытой формы и держит ID в state до reset/смены account/context/unmount; `app/forum/markdown-editor.tsx:933–939` вкладывает `editorOperationId`, exact selected IDs, retained edited IDs в native form. `:283–339` `publicationReplayRef` — технический *native form submit* replay в следующем task для поддержания submitter/validation, **НЕ network-ACK retry**. `app/forum/views.tsx:1254–1309,1925–1997,2814–2855,3015–3070` uses MarkdownEditor across four flows; busy blocks duplicate UI submits, including hook `publicationPreparingRef`.
2. **Action/writer:** `app/forum/actions.server.ts:36–53` parses/validates `editorOperationId` and JSON attachment manifest. `:98–118,145–174,480–516` forwards same to writer and redirects using resulting IDs. `db/hyperdrive-forum.ts:168–205` generates fresh random candidate topic/post/revision IDs on *each* retry but supplies stable `publishedDraft.contextKey/draftId`; repository reconciles to committed receipt IDs.
3. **Server transaction:** `db/forum-repository.ts:569–640` (topic), `:664–748` (reply), `:3674–3738` (post edit) computes stable SHA256 fingerprint over actual normalized content/selected refs/revision and starts `database.transaction`. Under `lockAttachmentDraftScope` (`db/attachment-draft-generation.ts:16–24`, `pg_advisory_xact_lock` scoped owner/context), `publicationReceipt` (`:783–803`) returns stored target IDs for equal fingerprint before cooldown/other writes; divergent content under same op=>ForumStateConflictError, mapped 409. New submit atomically creates revisions/post/mentions/refs, calls `finishPublishedDraft` (`:820–850` verifies selected live refs, retires operation, removes temporary refs), and `recordPublicationReceipt` (`:805–818`) persists durable owner/context/draftId/payload fingerprint and result IDs. `drizzle/0039_forum_publication_receipts.sql` has composite PK owner/context/draft_id. Edit receipt is checked **before stale revision CAS**, same POST does not create another revision.
4. **Regression assertions (READ, NOT freshly RUN):** `tests/database/forum-attachments.test.ts:711–769` actual route action→Hyperdrive writer→service→PostgreSQL tests the same POST twice for section topic, Help question, reply, with first result intentionally "lost" to client; both 302 location equal, receipt count 1, post count 1, exact selected attachment one, divergent body HTTP409 without new post. `tests/database/forum-attachment-publication.test.ts:279–295` repository idem reply+subset and divergent body; `:75–118` same edit Save twice, body/history remains exactly two revisions and retained/new ref selection unchanged; `:359–376` rebase and repeated same Save does not create further revision. `app/forum/markdown-editor.test.tsx:101–135` verifies native submit task replay retains submitter/form id; `app/forum/attachment-operation.test.tsx:118–127` verifies *upload* ambiguous retry ID preservation (different boundary). 
   
**Classification/limits:**
- **Server side duplicate prevention for identical POST same operation id: source + existing real-PG test coverage substantiate it. No new current-Stage defect evidenced in this bounded subtask.** Test suites were not freshly executed by Лира in this step; no actual browser network drop/fetch rejection reproduced.
- Client does **not** automatically retry a transport-failed publication POST. The published contract `docs/EDITOR.md:357–398`, `PROJECT_STATE.md:23–60` explicitly eliminates persisted text drafts/reload recovery; `editor-attachments` operation ID is only in mounted state. After navigation/reload/new form mount, new ID means a new logical request and server idempotency does not suppress accidental human repost. This is a *known boundary*, not defect without a stronger accepted current-Stage requirement. Do not claim lost-ACK browser recovery PASS.
- `editorOperationId` omitted by historical text-only clients is accepted for compatibility (`actions.server.ts:36–43`) without a durable receipt; current mounted Editor 2.0 sends ID. No unwarranted Stage hardening.
- E1 stale 409 client revalidation and D1 migrations docs mismatch remain unchanged; E2/E3 not confirmed. Early first-audit phases 1–8 ledger and actual browser experiments not retroactively called complete. Separate `AUD-20261022` untouched.
- **STOP now.** Next bounded task on explicit owner continuation could be E1 end-to-end post-edit 409 revalidation/rebase path, or independently reconciling first-audit coverage gaps; do not expand audit autonomously.


---

## Первый аудит — E1: 409 stale published edit без reload (2026-10-22)

**Статус подзадачи: закончена по доступным source, тестовому evidence и официальному documented framework behavior. ПЕРВЫЙ АУДИТ ФОРУМА В ЦЕЛОМ ОСТАЁТСЯ ОТКРЫТЫМ.** Второй отдельный `AUD-20261022` не тронут. Frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; full current `AGENTS.md` reread. No implementation changes, no shared-file writes, no assignment or agent communication.

### E1 — published post edit stale 409 recovery path

1. Server authority: `db/forum-repository.ts:3674–3738` obtains a per-post transaction row lock; rejects stale `post.currentRevisionId !== expectedRevisionId` at 3706–3707 and writes no revision/refs; CAS on update at 3727–3731 also rejects concurrent change; transaction rollback. `app/forum/actions.server.ts:480–498` passes original expectedRevisionId from hidden form; `app/forum/mutations.server.ts:103–104` maps `ForumStateConflictError` to `{error:"conflict"}` HTTP **409**. No current-Stage data corruption proven.
2. React Router Framework SSR default: package pinned `react-router@8.3.1` in `package.json:37`. Official React Router v8 Revalidation Optimization https://reactrouter.com/how-to/optimize-revalidation specifically says **failed action submissions returning 4xx/5xx do not trigger loader revalidation by default**. `app/routes/topic.tsx:1–212` exports loader, action, component, ErrorBoundary but *no* `shouldRevalidate`; `app/forum/views.tsx` TopicView has no `useRevalidator` and failed edit useEffect simply clears `editPublicationRef` at `:2236–2247`. Therefore failed post edit **does not force fetching latest topic post revision**.
3. Visible blocking chain: the still-mounted edit form stores initial `editBaseRevisionId` R1 at `app/forum/views.tsx:2197–2210` and hidden field uses that stable base `:2814–2819`. Current loader `post.body.id` remains R1 after 409; `:2835–2836` Save stays eligible because local base===loader R1; `:2844–2853` conditional `postEditRevisionChanged` warning and explicit `rebasePublishedAttachments();setEditBaseRevisionId(post.body.id)` button only render if the loader post revision differs. The external current revision is R2, but client still holds loader R1: no automatic rebase path. Clicking Save repeatedly gets 409. A separate fresh navigation/reload may fetch R2 but current in-memory edit text is intentionally not durable and may be lost on remount, per `docs/EDITOR.md:357–359`. Source-confirmed current-Stage UX dead end after 409, **not a data-integrity defect**.
4. Existing `app/forum/public-read.test.tsx:2314–2382` injects remote R2 then calls `await router.revalidate()` **manually** to make rebase warning/button appear; proves correct preservation of local text + attachment IDs *after external revalidation*, NOT that 409 causes it. `:2524–2620` successful edit submission test only tests submitting→loading→idle; `:2621–2702` real HTTP 400 failure tests editor buffer preserved, not 409 revision update. `tests/database/forum-attachment-publication.test.ts:359–376` covers stale CAS + explicit new baseline and idempotent replay, without browser 409 recovery.
5. Exclusion of apparent alternatives: GitHub code search `shouldRevalidate` found only unrelated `content-generation-controls.tsx` `defaultShouldRevalidate:false`, not topic route. `useRevalidator` found in `app/auth/auth-controls.tsx` (signout), `app/forum/online-presence-heartbeat.tsx` (401 / homepage-only success), `app/forum/content-generation-controls.tsx` (conditional content generation queue/poll), and credential page, **none guarantees TopicView revalidate on post-edit 409**. Passive revalidation from other features can mask the symptom in specific topics, not solve it generally.
6. **Additional concrete current-Stage UI mismatch in same 409 path:** `app/forum/views.tsx:2561` uses generic `t("forumWriteError_conflict")`; `app/localization/catalog.ts:588` English text “That solution cannot be selected for this topic.”, `app/localization/manual-values.ts:548` Russian “Этот ответ нельзя выбрать как решение этой темы.” (Hebrew analogous). That text was written for choosing best-answer, and is erroneous/misleading for edit conflict. Treat as coupled E1 presentation symptom or separable bounded UI bug, not unrelated future Stage issue.

### Classification and evidence boundaries

- **E1 source/framework-doc supported: current Stage post-edit 409 response does not trigger latest loader refresh; repair/rebase UI cannot render latest base without an unrelated refresh.** A functional UX defect of current implementation; no evidence of lost edits on already mounted failure itself, nor unauthorized overwrite.
- Real Chromium/Worker/PG scenario `R1 open -> R2 concurrent save -> POST 409 -> inspect warning/current revision and local text` **NOT_EXECUTED by Лира**: no checked-out runtime or running browser app in this audit step. Thus do not claim fresh browser reproduction, current CI pass, or exact runtime measured observation.
- The names `E1` from this **first independent audit** vs historical `PROJECT_STATE.md:1956–1958` “Editor 2.0 edit lifecycle E1” denote different chains: historical E1 fixed premature unlocking during **successful submitting→loading**, with existing tests. They do not resolve this newly scoped failed **409→latest-loader** recovery gap. Other earlier first-audit D1 mismatch `PROJECT_STATE.md:1568` (journals through 0044) remains unchanged. E2/E3 old suspicions still not confirmed.
- No fix implemented during independent audit. Technical fix choice stays with implementation team, after full audit/review stage. Only personal audit checkpoint saved per developer permission; no formal handoff. **STOP after this bounded task**; next explicit owner continuation should reconcile outstanding first-audit coverage and stopping criteria, rather than conflate with `AUD-20261022`.


---

## Первый аудит — обновлённая инвентаризация доказательств и оставшихся gate (2026-10-22)

**СТАТУС: завершена ТОЛЬКО подзадача reconciliation. ПЕРВЫЙ АУДИТ В ЦЕЛОМ НЕ ЗАКРЫТ.** Не путать с отдельным `AUD-20261022` (0–13; 437-file manifest). Source frozen `main` = `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, branch SHA заново проверен; полный актуальный `AGENTS.md` из `main` перечитан. Рабочие заметки Лиры, без изменений реализации, иных personal files и общего communication.

### Метод и существенная корректировка предыдущей финальной сверки

Прочитаны **собственные личные records** первого аудита (начальное резюме 2026-10-21; этапы 9–13; сводная запись 14; последующие дополнительная локализация/DB/security, E1–E3, ранние 1–8 evidence recovery, target matrix 409/auth/retry/error, финальная reconciliation на строках около 1076–1121; новые checkpoint до 1283). **Предыдущая «финальная сверка» уже выполнялась**, поэтому нынешняя задача не является новым complete audit и не может лишь переименовать прошлую работу в DONE.

Корректировка относительно checkpoint `Первый аудит — финальная сверка ...` (около строк 1076–1121): формулировка «45 SQL and 45 snapshots NOT all line-reviewed» **устарела после новых DB-подзадач**. Сейчас **все 45 migration SQL 0000–0044 прочитаны полностью**, все 45 snapshot JSON 0000–0044 разобраны программно по links/table evolution, последние 0033→0044 дополнительно сравнены по columns/indexes/FK/PK/unique/check and SQL deltas, без обнаруженного нового schema-history mismatch. *Не* подменять это утверждением о полном ручном построчном review семантики каждого из 45 JSON snapshots, либо выполненном PostgreSQL apply.

### Исполненное и фактический результат

| Домен | Доказательный источник | Реально выполнено |
| --- | --- | --- |
| Public read/discovery + participation/profile/presence | Stage 9–10 records, route → service/repository → SQL, selected tests | Bounded static source/test assertions review; no live browser |
| Help moderation, attention, duplicate and appeals | Stage 11, selected PostgreSQL and route cases | Bounded source/negative-case check; no new executions |
| Better Auth session, role/overrides/freshness/owner and negative authorization | Stage 12 + later expiration/revocation checkpoint | Source chain; native PG tests including next-request revocation examined, NOT rerun |
| Editor Simple/Advanced / Markdown / 409 / attachments / receipt / cleanup | Stage 13 + later E1, ACK checkpoints | Source-client/server/DB trace, real-PG test assertions inspected; no integrated browser failure experiments |
| Locale + UI/content translations/queue-neutral persistence | Separate translation subtask | Source and chosen positive/negative test assertions inspected; real providers/Queues Stage6 excluded |
| Migrations, SQL snapshot schema history, locks | DB review checkpoints 1122–1214 | 45/45 full SQL, 45/45 parsed snapshots chain, last 11 transitions delta parity; no PG apply executed by Лира |
| CI and build | Historical exact-tree run #39615502080 + package/CI config read | Observed existing checks/database SUCCESS; no fresh own run |

**Current-stage findings:** E1: documented React Router 8 4xx/5xx skip revalidation + missing `topic.tsx` shouldRevalidate / missing TopicView revalidator + UI rebase depends on fresh post revision; accepted 409 leaves old R1 and blocks direct rebase until unrelated refresh. Also under E1, `forumWriteError_conflict` message wrongly describes selecting a solution rather than editing. D1: `PROJECT_STATE.md:1568` historical max migration 0043 versus true journal through 0044; doc only. E2 stuck pending XHR without timeout/Remove and E3 generic writer unknown→503 remain UNCONFIRMED CURRENT-STAGE defect hypotheses, do not suggest fix on hypothetical risk. No evidence of data overwrite.

### Explicit remaining verification and closure criteria

**Not recovered:** Historical original stages 1–8 detailed evidence/scope/tests cannot be inferred. Earlier new current-main source-ledger about early auth/entry/locale/CI does *not* resurrect historical step PASS. This uncertainty cannot be erased by another summary. For complete original full-scope coverage, independently demonstrate all originally required areas or make a new explicit requirement–module–scenario review program; **never re-label the unknown as done**.

**Not executed by Лира:** runtime React Router/React post-409 rejected action → loader refresh → explicit rebase and preserved current edit; same mounted browser form expiry/revocation; post-commit ACK-loss with browser retry under same operation; actual typed 503 vs thrown error UI retention; systematic keyboard/a11y/responsive/hydration states. Some cases have **existing tests**, which were *read*, not personally run. Local test environment for first audit previously inspected and unavailable/incompatible: no pinned Node 24.21.0/pnpm 12.3.4 checkout, PG17, browser app, real Worker private R2. Do not promise current-turn executable verification or production/service testing.

**Prioritization (not unconditional new Stage gates):**
1. First decide exactly what breadth the *first* technical audit is allowed to certify. For a **full originally promised audit** earlier 1–8 proof/remaining source–test coverage and high-risk browser-specific paths must be supplied by real evidence, not rewritten history. The separate `AUD-20261022` already has a strict 437-file manifest for a genuinely exhaustive pass; its progress MUST stay separate. Do not perform duplicate first-audit pseudo-completeness by borrowing its evidence.
2. Highest-impact actionable uncertainty is E1 route-level integrated rejected POST 409 (R1→R2) + editor rebase visibility/preservation; current source establishes cause, but not browser observation. A correctly pinned runnable environment is a prerequisite for an execution PASS; otherwise say NOT_EXECUTED.
3. Error UX and permission/ACK browser transitions need fresh integration proof **only to extent required by first-audit original product-scope acceptance**, not as grounds for hypothetical changes. No current Stage defect from missing manual full-audit test alone.
4. Conclude with auditable final report: exact baseline, positively reviewed module/scenario scope, executed vs read-only evidence, E1/D1 and E2/E3 classifications, explicit limits and whether full evidence is genuinely complete. Until that point **no whole-first-audit clearance; no general communication/fix assignment**.

**Decision in this bounded step:** updated concise complete-known ledger; *first audit remains OPEN and unproven in exhaustive scope*. Do not redo migrations, E1 or account auth source tracing without fresh test/reproduction benefit. No unrelated fix and no reuse of `AUD-20261022` stage statuses. STOP and await owner explicit continuation.


---

## Первый аудит — typed 400/409/429/503, исключения и сохранение формы (2026-10-22)

**Одна ограниченная подзадача завершена. ПОЛНЫЙ ПЕРВЫЙ АУДИТ ФОРУМА ОТКРЫТ; отдельный `AUD-20261022` НЕ затрагивать.** Frozen and verified `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; complete latest `AGENTS.md` from main reviewed. No project source changes. Evidence: GitHub live source/current requirements + existing tests read (not executed) + official current React Router docs about error action/ErrorBoundary. Scope limited to error-to-client buffer/attached-selection transitions in four Editor 2.0 publication flows.

### Crucial current-Stage contract, overlooked in previous summary

`docs/EDITOR.md:159–169` says text/Undo live only in **mounted editor memory**, no drafts/autosave/reload recovery. Yet `docs/EDITOR.md:262–272`, **especially line 271**, imposes a DIFFERENT direct current Stage requirement: **«При сбое сервера/интернета текст и вложения остаются на месте. Повторный запрос не должен создавать дубликат, даже если первый был обработан, но ответ потерялся.»** Therefore cannot dismiss an error-induced route unmount as permitted merely because text drafts were removed. `PROJECT_STATE.md:23–60` confirms new in-memory runtime + separate attachment operation and existing PG idempotence.

### Verified behavior and evidence levels

| Trigger | Current runtime path | Status |
| --- | --- | --- |
| `400 invalid`, `409 conflict`, `429 rateLimited`, `503 unavailable` returned through `data({error},{status})` | `app/forum/mutations.server.ts:49–50,89–111` returns **action data** instead of throwing; `app/routes/topic.tsx:205–211`, `section.tsx:45–51`, `category.tsx:159–175` pass to views; `views.tsx:1254–1309,1925–1997,2228–2279,2560–2561,2814–2855,3015–3074` show alert without intentionally closing mounted editor | Strong source behavior; `app/forum/public-read.test.tsx:2621–2707` **existing actual createMemoryRouter test** verifies 400 edit text preservation, enabled controls and exact retry body even localStorage writes fail (read not run anew). Statuses 409/429/503 full typed form and attachment retention not independently tested. E1 409 lack of revalidation remains separate finding. |
| 429 cooldown | `runForumMutation` maps `ForumWriteRateLimitError`→HTTP429 + Retry-After `Math.ceil(ms/1000)` (`:105–108`); `write-actions.test.ts:638–649` asserts 2100ms→3sec | Action status header proven by source/inspected test, no UI countdown required by accepted scope |
| Failed *upload* separate XHR | `app/forum/editor-attachments.tsx:211–247,292–316` maps onload unsuccessful/transport onerror to per-file error; Retry reuses stable ID, Remove local selection. `docs/EDITOR.md:180–197` explicit retry/remove and text preservation | Unlike publish transport, this path has explicit in-form error recovery. E2 unbounded uploading without timeout remains unproven contract defect. |
| Remount/identity reset | `app/forum/markdown-editor.tsx:189–208,251–271` retains edit content/history within same owner/context and mounted component, `useEditorAttachments` `editor-attachments.tsx:132–161,171–194,328–335` holds same `draftId` and selected refs unless explicit cancel/reset/identity switch or unmount. UI conditions: Section stable `key={section.id}`, edit `key={post.id}`; no reset at action failure. | Supports controlled-error editor continuity; no automatic persisted recovery after unmount (intentional). |
| **Unexpected protected-action authorization failure** | `app/forum/actions.server.ts:480–482` awaits `requireForumPermission` outside `runForumMutation`; `mutations.server.ts:137–147` **rethrows unexpected error** (rather than incorrectly translating to 503, as `docs/auth/AUTHORIZATION.md:184–206` explicitly requires). `topic.tsx:211`, `section.tsx:51`, `category.tsx` export `ErrorBoundary=ForumRouteError`; `app/forum/ui.tsx:401–433` renders only full-page system panel and back-to-forum link, NOT original `TopicView`/MarkdownEditor. Official React Router docs `https://reactrouter.com/start/framework/route-module` and `https://reactrouter.com/api/hooks/useRouteError` state an action throw renders ErrorBoundary **in place of the route component**. Hence mounted form and solely in-memory text/selected upload set are discarded. `write-actions.test.ts:1152–1159,1170–1177` asserts unexpected authorization error propagates, `route-error.test.tsx:60–83` only tests safe ErrorBoundary copy, does not test previously populated form preservation. | **NEW source/framework-contract-supported current Stage finding N1**: error-induced route replacement destroys unsent authoring state despite `docs/EDITOR.md:271` requirement to keep text/attachments during server failure. Concrete trigger is unexpected authorization error (not a claim about routine 503), full causal source chain complete; no live-browser observation/new test execution. **Do not “fix” authz by suppressing unexpected errors as 503; that violates its own current contract.** Requires a solution reconciling error observability with open-form preservation, subject to team review after audit complete. |
| **No HTTP response / network interruption during Form POST** | Four publication flows use React Router non-fetcher `<Form method="post">`, with no custom `clientAction`/network recovery handler in listed route modules, `views.tsx` or `markdown-editor.tsx`. The standard router may deliver unrecoverable transport failure into the route's ErrorBoundary instead of resolved action data, which then loses open-form state. | **NOT_EXECUTED / UNCONFIRMED exact browser path**. Do NOT assert actual offline fetch result without pinned React Router/Chromium integration. However `docs/EDITOR.md:271` explicitly covers internet loss, so not to dismiss as future Stage; direct browser test needed to determine occurrence. |
| **Unexpected writer exception** | `runForumMutation` catches nonclassified exceptions and converts them to typed `503`; this normally preserves mounted form but potentially masks programmer error. Unlike authz guard, no proven same contract for this writer catch. | Former E3 remains an unproven separate semantics issue, NOT automatically current Stage defect. `runSourceLocaleCorrection` rethrows unexpected errors, separate non-post-edit path. |

### Test coverage/gaps and bounded conclusion

- Inspected source of `app/forum/public-read.test.tsx:2479–2522` (reply loading lock, cancel), `:2524–2620` (successful edit loading lock), `:2621–2707` (400 failure text retention and retry), `app/forum/write-actions.test.ts:638–649,1111–1177`, `app/forum/route-error.test.tsx:60–83`, `app/forum/markdown-editor.test.tsx:101–135`. This is **test source examined**, not independent pass. No integrated browser/Worker/PostgreSQL data-route network failure test run. Local container identified: Node22.16, chromium available, but no checked-out repo or pinned Node24.21.0/pnpm12.3.4/PG17 test runtime. Could not execute faithful app route test.
- **NEW** source + RR-documented N1 is a current-Stage **actual requirement conflict** for unexpected action failures that replace route: safe error presentation but removed in-memory buffer. Exact browser reproduction **Информация не проверена**. Do not promote the still-hypothetical pure network failure to verified bug. Not data corruption or security bypass.
- Previous E1 (stale post-edit 409 no fresh loader/rebase) and D1 (migration history doc stale through 0043 instead of 0044) unchanged; E2/E3 not established. This checkpoint is NOT formal shared-channel finding; report in owner chat, do not assign fix before entire independent audit.
- Do not mix with separate explicit `AUD-20261022` 437-file detailed audit. No change implementation, shared service communication or other agent journal.
- **STOP** after bounded error-recovery subtask. Next owner continuation (if requested): a bounded *different* unverified first-audit high-risk scenario; if testing N1 is required, obtain suitable runnable app/browser environment rather than fabricate browser repro.


---

## Первый аудит — клавиатура и смена представлений Editor 2.0 (2026-10-22)

**Одна ограниченная подзадача выполнена; ПЕРВЫЙ АУДИТ ФОРУМА В ЦЕЛОМ НЕ ЗАВЕРШЁН.** Строго независимый первый аудит (исходные 1–14), НЕ `AUD-20261022` manifest 437 файлов. Frozen verified `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Latest full `AGENTS.md` read at start. No implementation changes, no general communication, no other agents files, no edits to second audit. Evidence only source/test files examined via GitHub; tests NOT newly run.

### Current Stage contract

`docs/EDITOR.md:16–43`: Simple WYSIWYG + Advanced Markdown share one source; mode/Preview/Split alone preserves exact Markdown bytes and Undo/Redo history, cursor/selection where feasible. `:47–70` agrees toolbar and mode/preview/fullscreen, compact menu on narrow displays. `:159–169` text/history kept only in mounted form; mode/Preview/Fullscreen/validation does not clear buffer. `:328–348` Ctrl/Cmd+Z/Y/Shift+Z Undo/Redo, Ctrl/Cmd+B/I/K format, Ctrl/Cmd+Enter submit, tab navigation except within Advanced editable code, Ctrl/Cmd+F find only inside editor, labels/focus/mobility. `:351–400` source path and applied test matrix; final cosmetics separate project refinement.

### Source and actual inspected test assertions

1. **Lossless source and history:** `app/forum/markdown-editor.tsx:189–208,213–249,260–270,406–429` stores **one** `value` and `historyRef`, changes mode/view through `setAuthoringMode` and `setMode` without re-serializing Markdown. `app/forum/editor-document.ts:200–252` `recordEditorEdit` adds a step ONLY when Markdown changes, Undo/Redo mutates one shared history; capped 100. `app/forum/editor-document.test.ts:52–60,161–183` asserts no-op change on reparse, exact bytes/selection Undo/Redo. `app/forum/markdown-editor.test.tsx:592–643,703–732,782–805` real assertions on history across Split/Write, Simple→Advanced→Simple then Undo/Redo, exact `FormData` preserving CRLF through view switches and unedited ranges. **Source/test-supported, not fresh runtime pass.**
2. **Selection/caret:** `markdown-editor.tsx:159–178,343–425,652–684` captures selection at authoring mode switch; pending refs + `useLayoutEffect` focus/selection restore to textarea or source-mapped visual leaf. `visual-markdown-editor.tsx:175–270,279–368,542–634` DOM/source mapping and direct contenteditable on safe prose leaves; protected structures cannot silently become editable. `markdown-editor.test.tsx:199–216,352–408,454–499,734–759,1218–1300` selects, format Undo/Redo, calls imperative focus/quote after preview, fails closed on protected source. Actual DOM focus/IME behavior in Chromium, different mobile browsers and screen readers **NOT_EXECUTED**.
3. **Keyboard shortcuts and Tab:** `markdown-editor.tsx:891–931` editor-local event capture Ctrl/Cmd+Enter form.requestSubmit (checked on readiness), B/I/K, simple Z/Y; `:1109–1135` advanced Ctrl/Cmd+F and Z/Y handling; `:555–601` handles Tab indentation and pairs ONLY when cursor is in `editableCodeRanges` (valid fenced code body, not info or closing markers), otherwise falls back to native keyboard navigation. `markdown-editor.test.tsx:85–99,1097–1134,1439–1457` checks formatting/Undo, code-only tab and Ctrl+Enter once for both Simple/Advanced. `docs/EDITOR.md:335` ordinary Simple Tab is navigation, consistent with source.
4. **Preview/Split, hidden textarea and validation:** `markdown-editor.tsx:1017–1046,1059–1171` simple preview toggles, advanced menu has Markdown/Preview/Split; same internal source, hidden source input is the submitted form body; invisible textarea removed from sequential Tab order in preview; native `invalid` reveals editing pane. `markdown-editor.test.tsx:475–530,630–679,1459–1486` asserts preview-to-edit focus, aria region, actual same hidden form value, view-mode transitions. `docs/EDITOR.md:57–62` scope.
5. **Fullscreen focus:** `markdown-editor.tsx:883–903,1044–1046` uses `role="dialog"`, `aria-modal`, aria-label, focus wrap at first/last visible eligible controls and Escape to exit; `app/styles.css:9232–9245` gives fixed-position full viewport and scrollable workspace, visible focus CSS `:9216–9219,5578`. `markdown-editor.test.tsx:1488–1526` checks ARIA and edge Tab/Escape **in jsdom with manually mocked getClientRects**, NOT actual Chromium keyboard traversal, screen-reader modality or mobile UI. No proven defect from this alone.
6. **Attachments survive view changes:** `markdown-editor.tsx:251–258,933–939,1183–1186` calls `useEditorAttachments` from stable component, and `editor-attachments.tsx:132–178,328–335` keys operation on owner/context, not authoring mode, Preview or Fullscreen. Explicit cancel/context reset rotates `draftId` and clears selected; mode/preview/fullscreen `setState` has no reset/cancel. Existing `attachment-operation.test.tsx:106–188` covers in-memory ID/selection and reset, but **there is no found integrated dedicated assertion** that selected attachment + operationId survive every preview/fullscreen switch. Source continuity supports expected behavior, end-user browser check remains open.
7. **IME and F7:** `visual-markdown-editor.tsx:620–634` maintains same DOM leaf across initial typing. `markdown-editor.test.tsx:1368–1389,1618–1629` verifies same focused contenteditable leaf during composition/whitespace; source shows safe markup. Browser-specific F7 focus/IME via actual Chromium not freshly executed here; no claim of whole accessibility acceptance.

**Outcome:** no NEW confirmed current-Stage source-level defect in this bounded keyboard/view/history/state review. This is not a 100% keyboard/a11y/responsive QA PASS, and no fresh runnable tests were executed. Full browser Tab cycle and fullscreen modality, IME/mobile physical+screen keyboards, focus and selection across renderer changes, native form validation, attachment selection through all views remain **NOT_EXECUTED in this first audit**; identify only as evidence limitations pending required browser acceptance. Do not invent new hardening work without current Stage reproducible breach.

Earlier audit status unchanged: E1 stale 409→loader freshness/rebase; N1 unexpected thrown protected action→route ErrorBoundary unmount loses in-memory authoring despite docs/EDITOR.md:271; D1 outdated migration end 0043 vs 0044. E2/E3 conditional observations not confirmed. No source edits / team handoff. **STOP** this subtask until next explicit owner instruction; next distinct high-value audit slice can be responsive/RTL presentation and accessible error/toolbar labels, but must not duplicate this exact review.


---

## Первый аудит — адаптивность, RTL и доступность интерфейса форума (2026-10-22)

**Одна ограниченная подзадача завершена. ПЕРВЫЙ АУДИТ В ЦЕЛОМ НЕ ЗАВЕРШЁН.** Не путать с отдельным `AUD-20261022`/437-file manifest. Frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, `AGENTS.md` полностью перечитан из main; no implementation/shared-channel/other-agent modifications. Only source and existing-test inspection; NO fresh test runs, screenshots, Pages preview, actual Worker or browser visual acceptance.

### Действующий контракт и граница Stage

`docs/UI_UX_PASS.md:617–656` outlines prior shared-shell and mobile-navigation refinements, focused skip-link, RTL and zoom/reflow behavior; its historical accepted mobile nav and PR #167 owner review not re-certified here. `:666–697` **requires browser acceptance with recorded revision, fixtures, viewport, locale/direction, screenshots**, including 3 viewport classes (narrow phone/intermediate desktop), complete LTR/RTL and mixed text, guest/user/manager, empty/populated forum views, multiple messages/code, form/error states, keyboard/focus/contrast/reduced motion/reflow; green CI/source alone insufficient. For Editor 2.0 specifics `docs/EDITOR.md:328–348` focus/labels/mobile and `:14` final cosmetic refinement separate from functionality. No automatic escalation of aesthetic gaps into current-Stage functional findings without reproduction.

### Checked chains with source and actual test assertions

1. **Root/document locale:** `app/root.tsx:8–35` reads trusted locale loader metadata from matched routes and sets `html lang` + `dir` (`en/ltr` fallback), viewport metadata `:39`. `app/forum/ui.tsx:100–130` label-backed native language select uses native language name and preserves current path/search/hash on selection. `app/forum/ui.test.tsx:115–160` contains actual locale route/query/hash asserts, but not newly executed.
2. **Global shell semantics/focus:** `app/forum/ui.tsx:235–362`: localized skip-link FIRST inside ForumShell targets `#forum-content` with `tabIndex=-1`; navbar `aria-label`, discovery links with meaningful `aria-label` even if caption hidden, theme/language controls, unread notifications count label. `app/styles.css:131–134,7170–7205` defines visible `focus-visible`, skip-link keyboard reveal, logical inset and bounded header widths. `app/forum/ui.test.tsx:83–112` tests Tab first onto skip link and its href/focusable target, **does not click skip and assert real browser focus transfer**. No invented full focus PASS.
3. **Responsive layout:** `app/styles.css:1131–1197,1719–1794,2872–2932,6975–7055,7169–7205,9247–9269` shows fluid shell, 52/44/38/30rem adaptive rules, high zoom/intermediate header reflow, narrow mobile centered discovery icon pills (3.6rem each) and localized accessible labels, compact toolbar and stable navigation, minmax(0,1fr) and logical margins/paddings. `app/forum/ui.tsx:285–325` icon+caption markup has accessible title/label, hidden captions under narrow @media. A static CSS branch audit **cannot establish** actual fit/reflow/tap target/100–400% zoom on hardware or exact Hebrew long-label layout; not declared defect.
4. **RTL and mixed source:** `app/root.tsx:32–35` shell direction; `app/forum/views.tsx:98,231,292,404,1336,1585,1627,1643,1696,2569,2661` uses `<bdi dir=auto>`, `dir=auto` for titles, names, reasons/links; `app/forum/markdown.tsx:259–294,317–342` positions rendered prose/list/headings independently via `dir=auto`, and forces code, source language names to `ltr` even under Hebrew RTL. `app/styles.css:803,893,1627–1641,2644–2671,3709,3965,4204,4515,8649,8908` appropriately isolate LTR code and RTL arrow flipping; physical left/right padding/margin/float for core layout not identified in static CSS scan (not exhaustive semantic layout proof). `app/forum/public-read.test.tsx:395–448` parametrized EN/LTR, HE/RTL path/view chain, `:2070–2119` translated HE title + original EN disclosure `lang/dir`; `app/forum/markdown.test.tsx:383–480` mixed language paragraph and code direction assertions. Test source READ, not newly run.
5. **Forms, status and error accessibility:** `app/forum/views.tsx:1255–1309,1925–1997,2560–2561,2815–2855,3015–3070` forms `aria-labelledby/aria-label`, `aria-busy`, field `aria-describedby`, feedback `role=alert`, async `aria-live`; `app/forum/ui.tsx:401–433` safe systemic error `role=alert` and recovery link. `app/forum/public-read.test.tsx:3199–3222` source asserts named topic/reply forms and help hints; `app/forum/route-error.test.tsx:60–83` tests generic/typed safe copy. This inspection does not independently measure keyboard focus order, screen reader announcements, WCAG contrast or form zoom/reflow.
6. **Test inventory and execution boundary:** Source tree includes `app/forum/ui.test.tsx`, `public-read.test.tsx`, `homepage.test.tsx`, `markdown.test.tsx`, `markdown-editor.test.tsx`, `route-error.test.tsx`, screenshot-free React component tests. No first-audit fresh Chromium/Playwright matrix. `docs/UI_UX_PASS.md:648–656` explicitly calls for browser exercise and semantic tooling where available; user-specific visual/Pages acceptance remains as governed by owner/Stage decisions. Do not claim this is an accepted current head.

**Finding classification:** No NEW source-confirmed current-Stage functional/accessibility defect from this finite audit slice. Static evidence of mitigations is not a PASS for real visual clipping, overlap, keyboard focus, reduced motion or screen reader/contrast; those aspects `NOT_EXECUTED` in the FIRST audit. Do not invent fixes or claim full audit closure. E1 (failed 409 latest loader / misleading conflict label), N1 (unexpected thrown action→ErrorBoundary discards mounted form contrary to `docs/EDITOR.md:271`), D1 (migration history documentation max 0043 vs actual 0044) remain; E2/E3 not confirmed. Separate `AUD-20261022` unchanged. STOP this bounded task; next only after explicit user `...`.


---

## Первый аудит — empty/error/loading and locale switch (2026-10-22)

**BOUNDED STEP COMPLETE; ORIGINAL FIRST AUDIT REMAINS OPEN.** This is first audit only, not separate `AUD-20261022`. GitHub main exact `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; complete live `AGENTS.md` read from main. Source + existing test assertions inspected; NO local tests, browser runtime, Worker, actual network switch or visual acceptance performed. Only personal file checkpoint; source/shared channel/other agent files untouched.

### Distinctions checked

1. **True emptiness in public reading:** `app/forum/views.tsx:74–88` displays `categoriesEmpty` only when actual homepage category list empty; `:1792–1810` `sectionsEmpty` only empty category.sections; `:1864–1870` `topicsEmpty` for empty section. Additional `:147–162,203–215,315–325,380–381,467–474,531–543,563–580` implement empty popular/unanswered/unread/notifications/tags/tag results and separate search prompt/query-too-long/no-results. For search, no-results applies when a query exists and results length 0, not when query missing. No proof of DB misreporting.
2. **Optional presence degradation (strongest positive regression):** `app/routes/home.tsx:12–22` performs main `readHomepage()` and optional `readOnlinePresence()` concurrently; only `ForumStorageUnavailableError` for presence maps to null, unexpected error rethrows; `app/forum/views.tsx:90–103` null renders `role=status` unavailable, non-null count=0 renders actual zero + `onlineNoMembers`. `app/forum/public-read.test.tsx:454–477` covers typed unavailable vs unexpected; `app/forum/homepage.test.tsx:209–238` asserts unavailable≠0, actual empty true zero, links. These are existing test *sources*, not freshly executed.
3. **Optional auth/read-state fallback without misrepresenting critical errors:** `app/routes/section.tsx:18–42` throws 404 for missing section; typed `ForumStorageUnavailableError` in optional per-user unread data leaves public topic listing readable, `AuthorizationUnavailableError` in optional editor permission also does not remove public section. `app/routes/category.tsx:78–95` typed authz unavailability preserves general Help reading but protected needsReview filter explicitly gets 503, denied user 403. `app/routes/topic.tsx:84–130,153–176` handles optional permission/content-status failures by type rather than catch-all; unexpected errors propagate. Do not call legitimate forbidden/unavailable a zero-result state.
4. **Route failures vs empty:** `app/forum/ui.tsx:397–433` `EmptyState` and `ForumRouteError` structurally distinct. Error boundary maps 401,403,404,503 to safe localized copy, unexpected to generic 500 with `role=alert` and locale-scoped forum home action. `app/forum/route-error.test.tsx:60–83` existing tests verify 4 statuses + suppression of sensitive unexpected details. Error boundary replacing forms can lose in-memory authoring: already separately classified as N1, not a newly found defect in this task.
5. **Locale switching normal path:** `app/forum/ui.tsx:92–130` native labeled select checks enabled locales; replaces first URL locale segment, preserves `location.search` and `location.hash`. `app/forum/ui.test.tsx:115–160` actually asserts `/en/topics/42?view=latest#post-2`→`/ru/topics/42?view=latest#post-2` and preview override handler. `app/routes/locale-boundary.tsx:34–55,67–87,136–149` validates requested locale, injects its i18n resource snapshot, redirects invalid/legacy locales according to resolution. Under degraded locale registry, GET/HEAD for non-bootstrap locale throws temporary 307 redirect to English preserving server-visible path/search, while protected non-GET gets 404; fragment not available server-side and cannot be assumed preserved across this fallback. This is a distinct contingency; no ungrounded defect assertion.
6. **Current Stage:** `docs/UI_UX_PASS.md:666–697` browser acceptance matrix explicitly includes empty populated sections, auth/error routes, LTR/RTL and actual runtime; missing live browser network-interrupted locale-switch and client visibility tests are evidence gaps, not automatically code defects. No new confirmed current-Stage defect in this bounded slice. Existing E1 (409 failed edit rebase), N1 (unexpected action ErrorBoundary losing mounted editor), D1 docs migration 0043 vs 0044 untouched. E2/E3 unconfirmed.

**STOP.** Next explicit owner continuation should choose distinct originally uncovered first-audit scope; do not repeat empty/error/locale source-only review or conflate the separate 437-file audit. No formal team finding publication.


---

## Первый аудит — пустые выборки, ошибки загрузки и смена локали (2026-10-22)

**Одна ограниченная подзадача завершена; первый аудит форума целиком ОСТАЁТСЯ ОТКРЫТЫМ.** Separate `AUD-20261022` untouched. Frozen `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; current full `AGENTS.md` independently fetched/read first. Audited source/test assertions via GitHub: NO code changes, NO new test/browser runs, no cross-agent or shared communication.

### Scope and verified read chains

1. **Genuine empty data must not impersonate failures:**
   - `app/forum/views.tsx:75–102` home displays `categoriesEmpty` only on legitimate `categories.length===0`, but `onlinePresence===null` renders `role=status` `onlinePresenceUnavailable`, unlike real 0 and no members; `app/routes/home.tsx:12–22` only swallows typed `ForumStorageUnavailableError` from *optional* presence fetch, rethrows unexpected errors, and does not mask required `readHomepage` failures.
   - `app/forum/views.tsx:161–163,212–215,323–326,379–381,467–473,538–540,573–575` render purpose-built empty copy for popularity by window, unanswered, unread, notifications, search (blank, overlength, zero result distinct), tags and tag page. Category/section empty `:1792–1796,1864–1868`, empty pinned/latest `:914–936`. Homepage category with 0 sections maintains visible identity/link without false nested section card `:654–655`; existing `app/forum/homepage.test.tsx:136–155` specifically covers it. Help modes map distinct empty translation keys `app/forum/views.tsx:1096–1125,1389–1402` and have existing tests `app/forum/public-read.test.tsx:865–886,954–975,1005–1024,1349–1394`. Search no-results assertion `:1996–2005`. These sources/tests READ, NOT newly executed.
2. **Required loader failures and auth status must remain distinct:**
   - `app/routes/category.tsx:113,135–136`, `section.tsx:18–19`, `topic.tsx:35–37`, `tag.tsx:16` missing entity throws `404`, not empty result. Help private modes (`mine/help/for-me/needs-review`) require session or permission `category.tsx:67–95`, return `401/403`; optional typed authorization outage may let public mode render without controls; protected needs-review outage returns `503`.
   - `app/routes/notifications.tsx:19–37` and `unread.tsx:17–31`: absent session `401`, typed required storage outage `503`, unexpected error rethrows. `app/routes/section.tsx:23–40` optional unread state or auth presentation failure degrades without changing authoritative core section data; `topic.tsx:92–154` optional read/permission state likewise. `app/routes/locale-boundary.tsx:89–119` typed optional authz / header unread count service failure only suppresses header controls/count; unexpected errors propagate; required private route still checks independently. Thus no evidence that known core-read outages falsely show "empty".
   - `app/forum/ui.tsx:401–433` maps route errors 401,403,404,503 and generic unexpected 500 to localized safe status-specific system page and back-to-forum link. `app/forum/route-error.test.tsx:60–83` tests each HTTP status and leak suppression; no real Chromium error route exercised by Лира. Prior **N1** lost unsent editor buffer after error boundary replacement is a distinct already recorded finding, not retested here.
3. **Locale change + partial/failed registry and translation fallback:**
   - `app/forum/ui.tsx:92–130` `LanguageSwitcher` uses actual current active locale list/native label; modifies URL's locale segment, preserves `location.search` and `location.hash`. `app/forum/ui.test.tsx:115–163` tests change `/en/topics/42?view=latest#post-2`→`/ru/topics/42?view=latest#post-2`, and preview injected handler.
   - `app/routes/locale-boundary.tsx:34–62` explicit canonical resolution, `404` for invalid locale, canonical redirect for aliases, typed context. Degraded registry nonbootstrap GET/HEAD translates path/query to temporary English `307, Cache-Control:no-store` and refuses redirect mutation (`404`); `app/routes/locale-boundary.test.ts:21–118` includes protected mutated alias, canonical Hebrew RTL, and degraded redirect asserting `/en/?from=outage`. `app/root.tsx:26–35` `lang/dir` from context on document root. `app/routes/locale-negotiation.test.ts:19–93` validates signed-in preference/cookie/Accept-Language order, no cache and no mutation root.
   - `app/localization/resource-loader.ts:25–70` loads chain active locale→fallback(s)→canonical EN; `app/localization/catalog.ts:89,249,314,365–367,432` has required status/empty source text, Russian and Hebrew manual translations `app/localization/manual-values.ts:53,213,274,325–327,392,624,782,840,891–893,955`. `app/localization/resources.test.ts:123–174` source asserts stale fallback and reviewed packs. NOT fresh runtime execution.
   - **Cross-locale navigation with already-open authoring form is intentionally NOT text draft recovery**: `docs/EDITOR.md:159–169` says reload/navigation does not restore unsent text, so not automatically current Stage defect. `markdown-editor.tsx:189–208` scope includes `editorLocale`; updating same mounted editor resets body/history; `useEditorAttachments` keys owner/context without locale. Ambiguous same-mounted locale-change lifetime: do **not** claim full UI state transition (may remount), and do not infer a concrete new loss/cross-context defect without browser repro and accepted stronger contract.
4. **Evidence boundaries:** inspected existing actual assertions in `app/forum/public-read.test.tsx:395–451,454–477,865–886,954–975,1005–1025,1349–1395,1975–2005`; `app/forum/homepage.test.tsx:136–155,225–237`; `app/routes/locale-boundary.test.ts:21–118,151–175`; `app/routes/locale-negotiation.test.ts:19–93`; `app/forum/ui.test.tsx:115–163`; `app/forum/route-error.test.tsx:60–83`; `app/localization/resources.test.ts`. None were newly run, no real end-to-end navigation or network outage injection. Need not repeat them just to fill old stages 1–8.

### Bounded outcome

No NEW substantiated current-Stage defect for **genuine empty-vs-error** route states and locale switching based on reviewed source/test evidence. This is NOT full application acceptance, nor proof against transport failures not emulated in browser. Historical E1 (edit 409 failed loader revalidation, plus misleading conflict label), N1 (unexpected action throw → ErrorBoundary destroys mounted editor buffer contrary to `docs/EDITOR.md:271`) and D1 (PROJECT_STATE migration max 0043 vs journal 0044) unchanged. E2/E3 still unverified current-Stage hypotheses. *First audit overall open.* Second `AUD-20261022` not included. **STOP at coherent subtask boundary; await explicit next `...`.**


---

## Первый аудит — HTTP cache boundaries личных SSR-ответов (2026-10-22)

**BOUNDED SUBTASK COMPLETE; FIRST ORIGINAL AUDIT REMAINS OPEN.** Separate `AUD-20261022` is NOT included or updated. Frozen exact `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, main HEAD checked, complete actual `AGENTS.md` re-read. No implementation, shared service channel or other agent file changes. Source + preexisting test files reviewed via GitHub, live tests/Workers/dev-server/HTTP response/CDN settings/browser not executed.

**Why a genuinely distinct slice:** Own journal's first-audit Stage 10 (`chatgpt-6.md:561–567`) ALREADY traced unread/notification actor-bound reads/marks and monotonic state; repeat prohibited. This slice instead asks whether a personalized SSR response generated for user A could be replayed to B by an HTTP edge cache; distinguishes request auth from response cache semantics.

### Traced boundaries

1. **Per-request auth/data:** `workers/app.ts:29–51` allocates a new `RouterContextProvider` per request, populates `initializeAuthContext` before createRequestHandler; the returned data is not a process-level shared response object. `app/routes/notifications.tsx:15–37`, `unread.tsx:13–30` gate with nonnull Better Auth session and read with **`session.user.id`**, unauthenticated 401; `authorization-admin.tsx:15–46` requires per-request `access.authorization.manage` and reads current roles/grants; `profile.tsx:19–41` projects public profile data, `isOwner` computed from session. Nested `locale-boundary.tsx:67–132` SSR loader derives `authUser`, manage/attention links and unreadNotificationCount from same request-bound session, so even public forum SSR can be personalized.
2. **Headers/wrapper:** `app/auth/session-context.ts:21–35` intentionally propagates only Better Auth's Set-Cookie headers to the final page, not getSession cache headers; `session-context.test.ts:53–77` asserts that existing response's `Cache-Control: public, max-age=60` is unchanged by wrapper (synthetic unit test, **NOT evidence any current page actually emits public cache header**). `notifications.tsx`, `unread.tsx`, `authorization-admin.tsx`, `profile.tsx`, `locale-boundary.tsx` do not export route `headers` or explicitly add a page-level private/no-store cache policy in the source. **Actual final SSR response Cache-Control status from RR runtime NOT measured**; do not misstate as a confirmed missing header at network edge or a browser leak.
3. **Known targeted explicit no-store:** `app/routes/mentions.ts:7–12` sets `Cache-Control: private, no-store` and `nosniff` on JSON; `attachment-download.ts:11–15,73–81` same for downloads/errors with other safe headers; `attachment-upload.ts` and `presence.ts` set no-store on relevant responses. `locale-negotiation.ts:10–17`, `locale-boundary.tsx:40–49` 307 locale preference/degraded redirects explicitly no-store. `SCAFFOLD_PLAN.md:181–185` states **root negotiation redirect must no-store but it does NOT require no-store for ordinary canonical `/:locale/...`**. Do not fabricate contractual conflict.
4. **Caching not currently enabled via inspected Worker configuration:** `wrangler.jsonc` contains Worker main, observability, Hyperdrive bindings but **no `cache.enabled`**; `workers/app.ts` does not call `caches.default`, `cache.put`, or subrequest fetch cache. GitHub code search for `cache.enabled`, `caches.default`, `cache.put` returned **no matches in current source**. At 2026-10-22, official Cloudflare Workers Cache docs `https://developers.cloudflare.com/workers/cache/configuration/` (last update 2026-10-12) show new Workers Caching requires explicit `cache.enabled: true` in Wrangler, and `https://developers.cloudflare.com/workers/cache/` explains cache response behavior. The project also has disabled Hyperdrive DB cache infrastructure documented in `PROJECT_STATE.md:1880–1889`; **DB connection cache != HTTP edge cache**. `SCAFFOLD_PLAN.md` guards localized canonical route cache semantics.
5. **Present finding:** No current exact-build path confirmed for A's private server response replay to B (strong request isolation, no Worker cache policy enabled in checked code). The lack of explicit private/no-store for route-produced personalized SSR is a *conditional caching-policy concern*, not a demonstrated current Stage defect or owner-agreed requirement. If future Worker Cache explicitly enabled or HTTP front-end altered, do a separate audit then. **No automatic fix justified pre-release**.
6. **Unverified external/runtime boundary:** unknown actual deployed CDN/edge configuration outside `wrangler.jsonc` and whether it runs this exact SHA; no Worker-HTTP capture for browser/ETag/Cache-Control; cannot verify browser back/forward cache after logout, intermediary user isolation, or future cache.enabled deployment. Do not claim real network vulnerability or successful live cache isolation test. No additional findings E1/N1/D1; E2/E3 remain unconfirmed.
   
**STOP** after this slice. Original first audit still open due historically missing early stages 1–8 evidence and not-executed real browser/Worker endpoints. The separate `AUD-20261022` manifest progress is completely separate and cannot be credited as done. Next owner `...` should pick another *truly unreviewed* current Stage boundary or reconcile feasible end-gates, never repeat Stage10 unread/notifications or promote hypothetical future caching.


---

## Первый аудит — серверные ошибки, логи и диагностическая приватность (2026-10-22)

**BOUND STEP COMPLETE; FIRST ORIGINAL FORUM AUDIT REMAINS OPEN.** Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, current full `AGENTS.md` re-read. Scope only unexpected exceptions and server/app/Worker diagnostic-output privacy, not a repeat of route business rules/previous empty/error view checks. Separate `AUD-20261022` unaffected. No source, team shared channel or other agent personal file changed. Current code/test/docs and authoritative upstream docs read; no fresh browser, Worker live invocation, observability dashboard inspection or Vitest execution.

### Source trace and differentiated error paths

1. **Safe SSR stream (already present):** `app/entry.server.tsx:1–46` uses `renderToReadableStream` `onError`, calling `reportSsrStreamError` only when `shellRendered` is true; `app/server-logging.ts:1–30` never serializes exception message/stack/request headers, only allowlisted `event=ssr_stream_error`, `phase=after-shell`, `errorKind` in six fixed categories. `app/server-logging.test.ts:4–48` asserts OAuth `code/state`, bearer/session cookie and URL in error object do not get logged, including thrown non-Error string. **Test inspected only, not freshly run.**
2. **React Router's independent caught loader/action/initial-shell logging:** `app/entry.server.tsx` exports handleRequest and stream onError but **NO named `handleError` export**, confirmed complete 47-line file and repository search. Official React Router Framework `entry.server.tsx` documentation (https://reactrouter.com/api/framework-conventions/entry.server.tsx) explicitly says **by default framework logs encountered server-side errors to console** unless exported handleError replaces that behavior; exception data includes the original raw Error (message/stack), rather than passing via the bespoke SSR post-shell allowlist logger. `app/routes/topic.tsx:93–130`, `app/forum/mutations.server.ts:137–147` and `app/routes/authorization-admin.tsx:15–44` intentionally rethrow unexpected programming/schema/authz errors. Those *reach this default error reporting path*. `docs/auth/AUTHORIZATION.md:184–206` requires unexpected errors remain observable and are NOT silently masked as unavailable 503; this does **not** authorize leaking exception content to client. Route errors `app/forum/ui.tsx:401–433` safely render generic, localized HTTP error copy, and `app/forum/route-error.test.tsx:60–83` verifies internal messages absent from DOM. **Client-safe rendering and log-safe telemetry are two different boundaries.**
3. **Before RR handler / uncaught Worker exceptions:** `workers/app.ts:29–51` resolves DB bindings, initializes Better Auth session and dependencies **before** entering `requestHandler`, without app-level catching/safe reporter. An unexpected error here skips both exported route ErrorBoundary and the SSR stream reporter. `wrangler.jsonc:6–10` enables Worker observability at `head_sampling_rate=1` with `redact_query_string=true`. Official Cloudflare Workers Logs docs (https://developers.cloudflare.com/workers/observability/logs/workers-logs/) confirm invocation logs/custom logs/errors/uncaught exceptions are collected; 2026-08-24 change (https://developers.cloudflare.com/changelog/post/2026-08-24-preserve-exception-info/) says error objects passed to console can include exception message and stack. `redact_query_string` (https://developers.cloudflare.com/api/typescript/resources/workers/subresources/beta/subresources/workers/methods/edit/) specifically removes query components of logged **request URLs**, NOT text of arbitrary Error.message/stack.
4. **Known safer warning reporters:** `db/hyperdrive-registry.ts:21–27,52–62` logs only `locale_registry_degraded` and finite `RegistryDegradedReason` enum (from `app/localization/persistent-registry.ts`); `db/hyperdrive-ui-translations.ts:23,38–42,60–80,144–161` logs fixed degraded reason (`unavailable|schema-mismatch|timeout|invalid-bundle`), never raw DB cause; `app/localization/persistent-sources.ts:40–75,360–368` logs origin and aggregate skippedRows/reason counts, not raw translation payload. No new leak established in these three collectors.
5. **Client-facing classified error surfaces:** `app/forum/mutations.server.ts:93–118` returns opaque error codes and statuses 400/403/404/409/429/503 (including unknown writer failures transformed to 503, the preexisting E3 source behavior) rather than raw details; `app/routes/attachment-download.ts:11–15,73–88` safe blank 4xx/5xx, no underlying bucket key. `app/forum/ui.tsx:401–433` strips unexpected `Error.message` from rendered content. No new client-side error-message leakage confirmed.

### Classification / demonstrated vs conditional

- **New L1: source+official framework confirmed diagnostic logging boundary gap in current server paths.** Post-shell SSR only is allowlist-sanitized; initial-shell/loader/action errors use React Router default console logging, while pre-router Worker failures pass as uncaught runtime exceptions with observability enabled. Thus **exception messages and stacks are not universally sanitized before diagnostics**. This is a real current-runtime behavior and a **current Stage confidentiality concern / potential defect**, not merely an unrelated Stage 6 idea. The prior safe `reportSsrStreamError` test does not test these paths. Do not propose simply swallowing unexpected exceptions or converting all to 503, which violates `docs/auth/AUTHORIZATION.md` unexpected error semantics and loses diagnostics.
- **No observed exfiltration of concrete secrets, personal messages, OAuth codes or cookies** established: whether any thrown present-day real dependency message actually contains those fields, external Cloudflare dashboard permissions, logging pipeline settings and deployed version are **NOT_VERIFIED**. Do not label actual user-data leak or public disclosure. Need targeted test of loader/action exception with planted sensitive marker asserting emitted safe log **and** unchanged ErrorBoundary UX, plus pre-router exception handling/Cloudflare Worker runtime test if seeking executable proof. No tests newly run.
- Real Cloudflare invocation telemetry, worker exception stack capture and framework's default logger precise output not executed against exact built app; their behavior is supported by official 2026 docs, not independently measured. External production deploy/settings strictly out of audit authorization.
- Prior findings first-audit E1 (409 edit-rebase freshness), N1 (unexpected action ErrorBoundary unmounts unsaved editor), D1 (outdated 0043 document vs migration 0044) unchanged; E2/E3 unconfirmed. **No formal publication to team.**

**STOP after this bounded log/exception/privacy slice; FIRST audit remains OPEN, separate `AUD-20261022` scope unchanged.** Next user continuation may focus on another genuinely unreviewed current Stage boundary or closure-evidence planning, not duplicate error view or raw auth flows.


---

## Первый аудит — logout и межвкладочная смена учётной записи (2026-10-22)

**Одна ограниченная подзадача выполнена; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ.** Текущий `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, актуальный `AGENTS.md` перечитан полностью. Первый независимый source/test audit, НЕ `AUD-20261022` (437-file second manifest). No source edits / shared service channel / other agents files. Existing test *source* read, not freshly executed; two-tab Chromium/real auth Worker/PG not run.

### Current requirements and positive isolation findings

- `docs/EDITOR.md:159–169,308–314,351–368`: author text/history only in mounted form, no text storage or reload recovery; four editor *preferences* are locally retained keyed to stable account ID, survive signout and must not be applied across account switch; opaque attachment operation per form/account/context and owner check on server, no cross-user inheritance. `docs/EDITOR.md:271` requires in-form error retention, not necessarily survival on explicit logout.
- `app/forum/markdown-editor.tsx:109–157,159–208,251–258` derives `accountId=useHeaderAuthUser()?.id`, `localStorage["vico:editor:mode:"+accountId]` and spell-check key, with fallbacks; useEffect on JSON.stringify([accountId, editorContextKey, editorLocale]) resets entire `value` and `historyRef` when scope genuinely changes. `app/forum/markdown.tsx:189–225` code-wrap and line number settings likewise per-user, reset to defaults for guest or different account. Global theme key intentionally site-wide, does not contain authoring content; no production localStorage text draft paths (legacy-only localStorage key in test `public-read.test.tsx:2426–2475` ignored).
- `app/forum/editor-attachments.tsx:132–167` changes owner/context → fresh generation ID+entries; ongoing XHR's `identityRef` invalidates callbacks and cleanup aborts requests; attachment view URL/selection tied to owner/context ID; `app/forum/attachment-operation.test.tsx:157–163` asserts stale ACK under old account cannot repopulate selection. `markdown-editor.test.tsx:807–835,837–879` preferences differ across separately mounted A→B→A; `:1391–1437` changing post context resets text/history and changes operation; **no integrated A→B same-mounted active-tab identity switch test** found.
- Same-tab logout `app/auth/auth-controls.tsx:61–90` calls Better Auth signOut, on success `auth?.setUser(null)` and `await revalidator.revalidate()`; `HeaderAuthProvider:31–43` reconciles initialUser with fresh loader; `auth-controls.test.tsx:146–170` tests immediate signed-out header and loader revalidation guest. `app/routes/topic.tsx:81–130,187–199` recalculates canReply/editablePostIds from **server** session, `app/forum/views.tsx:2737,2814,3055` hides edit/reply controls when fresh permissions removed; true server-side checks `app/forum/mutations.server.ts:70–90` and action guards prevent unauthorized writes. If route revalidation fails, no guarantee of complete UI clearance; not automatically claimed without integrated test.

### NEW I1: cross-tab account replacement leaves stale SSR client identity on an OPEN topic tab

- Example: Tab T1 retains `HeaderAuthProvider.user.id=A`, open `MarkdownEditor` with account A preference and unsent body text. Tab T2 logs out of A and signs into B; HTTP cookies are scoped to browser origin/domain and subsequent same-origin requests from T1 use updated B session (MDN https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies). No `HeaderAuthProvider` subscription to a global Better Auth session-change signal or cross-tab login/logout event; it merely synchronizes with its `initialUser` when route loader is re-run (`auth-controls.tsx:31–43`). `AuthControls` signOut revalidates **only originating tab**.
- `app/forum/online-presence-heartbeat.tsx:11–45` is the only app-level implicit session reconciliation while an idle topic tab is open: for stale A header it POSTs `/:locale/presence` with cookies for B. When HTTP 401, forces revalidator; when **200/204 B is authenticated**, revalidates only if location.pathname === forumIndexPath(locale). On `/:locale/topics/:id`, 204 does NOTHING to reload `initialUser`; interval repeats with stale A, no finite guaranteed repair (except independent navigation/action or window refresh). `online-presence-heartbeat.test.tsx:44–53` covers 401, `:31–41` checks 204 request but does NOT test changed account B on non-homepage; `auth-controls.test.tsx` only direct signout / explicit revalidation.
- Thus T1 may display A identity, A editor preferences, unsent A buffer/attachments, and stale presentation-level permissions while **server is acting as B**. `markdown-editor.tsx:191–208` only resets when *client* accountId changes, so this cross-tab path evades scope invalidation. This directly violates practical account preference separation `docs/EDITOR.md:310–313` when actual account switched but T1 stayed on topic.
- **High-impact continuation check:** `app/forum/actions.server.ts:503–515` accepts normal text-only reply when body present, `selectedAttachmentIds=[]` and `validatedDraftPublicationFence` is UUID. `runForumMutation` uses **current authoritative session B** as author. `db/hyperdrive-forum.ts:193–204` forwards B to repository; `db/forum-repository.ts:664–748,783–849` dedupe scope/receipt and attachment generation are keyed by *current* owner B and form's opaque UUID, with **no comparison to stale client account A** on text-only path; select-empty operation does not require preexisting A-owned attachment ref. Therefore tab T1 may submit A's unsent text as B after cross-tab account replacement, subject to B's actual write permission/cooldown. This is NOT an authorization bypass and backend stores author B consistently; it is a user-identity consistency / unintended attribution and stale personal buffer exposure fault.
- **Classification I1:** CURRENT Stage **source-level confirmed causal gap** for multi-tab signed-in A→signed-in B transition; browser actual two-tab reproduction and server integration **NOT_EXECUTED**, do not claim observed leaked data or completed unintended publication. Scope limited to already-open topic page and tab whose own route does not revalidate; no claim about same-tab signOut (that explicitly revalidates) or homepage (204 causes refresh). No trivial global storage clear or draft system justified; production patch is separate stage and must retain account preference persistence requirement, avoid unsafely publishing under mismatched identity.
- A→guest via another tab differs: heartbeat 401 triggers revalidation in a *visible* tab, and there can be a temporary stale window before it happens; eventual recovery exists as coded. A→B 204 lacks that guarantee. Hidden tabs make no heartbeat until visible; focus then triggers check but 204 stays stale. No route or storage listener for app-level auth transition found. If RR/BAuth library independently triggers navigation/revalidation on cross-tab session change, evidence for that pathway must be established in actual browser, not presumed; local `HeaderAuthProvider` does NOT consume Better Auth reactive session.
- No current-stage defect newly established in per-account storage keys, attachments on **observed** owner changes or same-tab logout behavior. No human UI/bfcache/Worker deployment experiments. User-facing safe server gates remain in effect, so no data-integrity bypass claimed.
   
Other first-audit findings E1, N1, D1, L1 as prior; E2/E3 remain unconfirmed. This is owner-chat/internal personal note ONLY, not a final team report; no general communication publication. **STOP at the end of this independent bounded subtask.** First audit remains OPEN due missing original stages 1–8 history, browser/Worker exact scenario evidence; `AUD-20261022` stays separate.


---

## Первый аудит — пользовательские Markdown-ссылки и внешние ресурсы (2026-10-22)

**BOUND STEP COMPLETE; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ.** Это первый исходный независимый аудит, не `AUD-20261022` и не его 437-file manifest. GitHub remote `main` ещё раз сверен: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; `AGENTS.md` из main полностью получен и прочитан. Read-only review source + существующих тестовых assertions, плюс актуальные официальные правила react-markdown; **NO new Vitest execution, browser, Worker, deployed HTTP, network/resource-request inspection**. Implementation/shared-channel/other-agent files untouched.

### End-to-end source boundaries inspected
1. `app/forum/markdown.tsx:27–34,288–408`: all published prose segments, table cell Markdown и nested spoiler bodies render через ReactMarkdown с одинаковыми `markdownComponents` и `forumUrlTransform`. Custom URL exception applies **only to img.src matching exact `vico-attachment:<UUID>`**. Ordinary `href` passes to `react-markdown@10.1.0` `defaultUrlTransform`. Upstream docs: https://github.com/remarkjs/react-markdown/blob/main/readme.md — safe by default, allows http(s), irc(s), mailto, xmpp, relative; unsafe schemes return unusable destination. No `rehype-raw`; embedded raw HTML is not executable. `app/markdown-syntax.ts` custom plugins only add strikethrough and constrained `dir=ltr|rtl` metadata, not HTML generation from user strings.
2. Link presentation `markdown.tsx:306–309`: `<a href={href} title={title} target="_blank" rel="nofollow noopener noreferrer ugc">`; React attribute values are not interpolated as raw HTML. `rel=noreferrer` prevents request Referer from the parent page and `noopener` protects opener. URL trust remains ordinary authored outbound-link semantics; HTTPS/user-generated links are intentionally supported and may lead outside forum only on click.
3. `ForumInlineImage` (`markdown.tsx:36–48`) renders no `img` unless URL matches opaque UUID **and** provided `ForumInlineAttachmentProvider` contains matching ID and server-detected raster type png/jpeg/gif/webp. `views.tsx:2797–2806` builds same-origin `/api/attachments/file/<id>?post=<id>` URLs from server post attachment records; `app/routes/attachment-download.ts:22–84` reads current published attachment ref or owner-scoped temp operation; allows inline only for verified raster, text only as plain text explicit preview, sets `Content-Security-Policy: sandbox`, `nosniff`, `private, no-store`. External `![remote](https://...)` is omitted rather than auto-fetched.
4. `app/forum/technical-markdown.ts:109–232`: `:::spoiler` title rendered via escaped React text and body recursively by same Markdown; tables render cells through same URL transform; invalid or complex tables do not become raw HTML. `quote-markdown.ts` and `quote-presentation.tsx` wrap standard Markdown links, no separate HTML injection path. `visual-markdown-editor.tsx` displays external source image as protected/inert construct and delegates preview to same ForumMarkdown.
5. `app/forum/clipboard-markdown.ts:5–105`: HTML import explicitly rejects script/style/svg/iframe/object/embed/form/img and non-HTTP(S) anchors, while plain-text paste escapes Markdown syntax. Output remains subject to published renderer's URL filtering, not a direct HTML injection pathway.
6. `app/forum/markdown.test.tsx:152–211,218–225,263–287`, `clipboard-markdown.test.ts:5–34`: existing tests assert external image suppression, attachment-only raster images, forbidden raw HTML/javascript and link rel/target, including links in tables and pasted unsafe links. **Inspected test code only; no fresh execution**. Some assertions are deliberately shallow (unsafe-link check verifies href not starting `javascript:` rather than no anchor), but combined source/official defaultUrlTransform provides independent evidence; test-completeness belongs separate audit, not an invented source defect.

### Result/classification
**No NEW confirmed current-Stage defect in the inspected outbound Markdown links/remote resource execution path.** Ordinary user-authored external URLs remain clickable by design and cannot be categorized as a defect solely for being external; external-link destination reputation/anti-phishing moderation is a product-policy question, not a proven current code contract breach. No evidence of automatic third-party image fetch, unsafe `javascript:` href, executable raw HTML or SSR remote URL fetching from Markdown. No requirement to add new sanitizer dependency without a reproduced current unsafe behavior.

**NOT_EXECUTED:** exact rendered network/browser requests for adversarial URL encodings, click behavior in actual Chromium, end-to-end HTTP attachment response under local Worker, and new regression suite. No user data, external services, or production tested. The first audit's E1, N1, D1, L1, I1 remain as before, E2/E3 unconfirmed; no separate confirmation about historical initial stages1–8. Second `AUD-20261022` entirely untouched.

**STOP:** one bounded first-audit subtask completed, first overall audit remains open. Next distinct slice only on owner continuation; possible focus: redirect/path/URL boundary outside Markdown (auth entry, login return, profile fields), avoiding duplicating link-renderer analysis.
