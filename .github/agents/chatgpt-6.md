# Лира — ChatGPT-6

Активная задача: независимый аудит форума. Этап 10 завершён; следующий этап 11 — после команды владельца.

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
