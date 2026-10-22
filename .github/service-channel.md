# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–5 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md, кроме отдельно зафиксированного владельцем non-blocking requirement conflict по Attention Mixed pagination.
- Этап 5 полностью закрыл solved/best-answer, Help solution moderation, ordinary moderation signals, duplicate relationships, appeals и standalone Attention center, включая stale/concurrent paths, permission-scoped visibility/counts/actions и connected PostgreSQL evidence.
- Completeness sweep подтвердил, что primary stage-5 targets `app/routes/attention.tsx` и `tests/database/forum-help-attention.test.ts` прочитаны полностью, а все применимые shared Help paths в `topic.tsx`, `actions.server.ts`, `views.tsx`, `forum-service.ts`, `forum-repository.ts`, `write-actions.test.ts`, `public-read.test.tsx` и `migrations.test.ts` повторно покрыты в нужных stage-5 диапазонах.
- Cross-stage остатки не потеряны: editor-specific authoring/editing поведения идут в этап 6; attachment/security storage/lifecycle — в этап 7; cross-cutting security/privacy — в этап 10; browser/a11y/responsive — в этап 11; test-quality/CI completeness — в этап 12.
- Attention Mixed pagination остаётся audit problem / requirement conflict: `docs/UI_UX_PASS.md` задаёт cases-before-paging и 50-case framing, `PROJECT_STATE.md` + код пагинируют qualifying topics и затем разворачивают их cases. Владелец не утверждал конкретный вариант и отметил, что 50 элементов по умолчанию слишком много. Этот пункт вынести в финальный problem list; точный page size и case-vs-topic semantics до финального решения не выбирать.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца начать этап 6: Editor 2.0 — Simple/Advanced, Markdown, clipboard/history, quote/mention, publish/edit. Исходники не исправлять.
