# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–4 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md.
- Этап 5 начат. Часть 1 завершена: повторно проверены solved/best-answer transitions, manual Help solution moderation и duplicate relationship/appeal mutations с акцентом на stale/concurrent state. Включены shared `topic.tsx`, `actions.server.ts`, `views.tsx`, ForumWriter/Service/Repository paths, applicable `public-read.test.tsx`, `write-actions.test.ts`, `migrations.test.ts` и `forum-help-attention.test.ts`.
- Best answer остаётся независимым от solved state; selection валидирует topic/post relation и запрещает original post/active duplicate. Замена Help best answer атомарно помечает прежний answer как system-outdated, очищает state нового answer и supersede-ит stale solution/duplicate signals.
- Signal acceptance имеет target identity и rechecks current topic/best-answer state under locks. Attention appeal action также передаёт exact case/appeal identity. Topic-level duplicate and manual solution moderation paths были отдельно проверены на stale-target semantics; детали возможных findings остаются только в developer chat до завершения аудита.
- Следующая часть этапа 5: ordinary Help signals end-to-end — submission/withdrawal/permission routing, per-kind acceptance/rejection, cooldown, stale/superseded lifecycle and concurrency. Затем standalone Attention center.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 5, часть 2: ordinary Help signals end-to-end — submission, withdrawal, permissions, stale/superseded lifecycle, cooldown и concurrency. Исходники не исправлять.
