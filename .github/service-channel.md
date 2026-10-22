# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–3 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md.
- Этап 4 завершён: public read/discovery/search/tags, generic participation/write entry points, unread/read-state, notifications, profiles, presence, public Help modes и presentation boundaries проверены. Также выполнен completeness sweep всех primary manifest targets этапа 4 и применимых shared-file ranges.
- Shared `public-read.test.tsx`, `write-actions.test.ts`, `topic.tsx`, `actions.server.ts`, `views.tsx` и repository Help methods имеют cross-stage ответственность. Public/user-facing slices проверены на этапе 4; moderation/solution/signal/duplicate/appeal concurrency semantics должны быть повторно проверены на этапе 5, а editor-specific ranges — на этапе 6. Это intentional cross-stage coverage, а не перенос файла целиком.
- Connected evidence этапа 4 подтверждает deterministic discovery ordering, session-derived identity, effective RBAC freshness, monotonic read markers, transactional notifications, persisted profile/presence behavior и bounded Help recommendation modes.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца начать этап 5: Help solved/best-answer, solution moderation, user signals, duplicates, appeals и standalone Attention center. Повторно включить применимые shared Help ranges из stage-4 files для cross-stage проверки; исходники не исправлять.
