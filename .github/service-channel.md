# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–4 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md.
- Этап 5 начат. Части 1–2 завершены. Часть 3 standalone Attention технически проверена.
- Attention access/mode isolation, group visibility, permission-scoped counts, action identity and stale/concurrent behavior проверены; implementation по этим границам новых independent findings не добавил.
- По Mixed pagination выявлено отдельное несоответствие актуальных source-of-truth: `docs/UI_UX_PASS.md` требует case selection before paging / 50 cases per page, тогда как `PROJECT_STATE.md` и текущая реализация пагинируют Mixed по qualifying topics и затем разворачивают все cases темы. Владелец подтвердил, что конкретную семантику не утверждал, и отдельно отметил, что 50 элементов по умолчанию выглядит слишком большим. Этот вопрос фиксируется как audit problem / requirement conflict с неопределённым итоговым продуктовым решением и НЕ блокирует дальнейший аудит.
- До финального отчёта точный page size и case-vs-topic pagination не выбирать самостоятельно; вынести в общий список проблем для отдельного решения после завершения аудита.
- Следующая часть этапа 5: финальный completeness sweep Help/Attention cross-stage ranges и закрытие этапа либо точная фиксация остатка.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 5, часть 4: финальный completeness sweep Help/Attention и закрытие этапа 5 либо фиксация конкретного остатка. Исходники не исправлять.
