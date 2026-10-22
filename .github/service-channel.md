# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–5 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md, кроме отдельно зафиксированного владельцем non-blocking requirement conflict по Attention Mixed pagination.
- Этап 6 начат. Часть 1 завершена: Simple/Advanced mode core, lossless Markdown document/history, visual protected-range editing, clipboard conversion, technical Markdown segmentation, rendering, mode persistence, Preview/Split/fullscreen и source-position mapping проверены.
- Подтверждено корректное сохранение exact source при mode/view switches, CRLF-aware span edits, Undo/Redo через переключение режимов, per-account Simple/Advanced preference, protected code/unsupported structures, Simple visual table editing, code-only Tab/Enter/pairing и безопасный published renderer.
- В clipboard/literal-text boundary установлен отдельный current-Stage finding; детали по правилам AGENTS.md остаются только в developer chat до окончания проверки. Root cause находится в общем literal-text escaping path, используемом Simple visual typing и explicit/plain paste.
- Test-quality completeness по этому finding будет отдельно оценена на этапе 12 и сейчас не дублируется.
- Следующая часть этапа 6: quote/mention — attributed quote source/presentation, quote insertion and collapse behavior, mention token/search/insertion, publication recipient extraction and edit notification semantics where applicable.
- Attention Mixed pagination остаётся audit problem / requirement conflict для финального списка; дальнейший аудит не блокирует.
- Cross-stage attachment/security storage/lifecycle — этап 7; localization — этап 8; database — этап 9; cross-cutting security/privacy — этап 10; browser/a11y/responsive — этап 11; test-quality/CI — этап 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 6, часть 2: quote/mention. Исходники не исправлять.
