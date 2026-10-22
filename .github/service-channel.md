# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–4 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md.
- Этап 5 начат. Часть 1 завершена: solved/best-answer transitions, manual Help solution moderation и duplicate relationship/appeal stale/concurrent paths повторно проверены. Детали возможных findings остаются только в developer chat.
- Этап 5, часть 2 завершена: ordinary Help signals проверены end-to-end на существующем implemented foundation: topic action guard, session-derived actor, `forum.helpSignal.create`, persisted-kind review permission routing, service validation/normalization, repository target locking, withdrawal ownership, cooldown, stale/superseded lifecycle, duplicate/solution target identity и concurrent acceptance.
- Signal submission разрешён только после same-origin authenticated mutation guard и effective `forum.helpSignal.create`; review permission выводится из persisted immutable signal kind, а не из client input. Withdrawal не требует отдельной capability, но repository разрешает его только submitter-у собственного pending signal.
- Solution signals сохраняют exact current best-answer `targetPostId`; duplicate signals сохраняют candidate + proposed canonical original. Acceptance блокирует authoritative topic rows, re-reads signal under lock and применяет состояние только если target всё ещё актуален; иначе signal/peer signals terminally supersede-ятся.
- Per-user signal cooldown использует отдельный persisted signal history и user-row mutex, не связан с topic/reply cooldown. Topic(s) блокируются раньше user mutex в том же порядке, что forum writes; connected concurrency tests покрывают simultaneous submissions одного actor и concurrent reply+signal без lock-order cycle.
- DB CHECK/FK/partial-unique constraints дополнительно защищают signal shape, lifecycle, topic/post identity и pending same-submitter duplicates. Concurrent double acceptance даёт ровно один successful terminal transition.
- Visible ordinary-user signal submission/pending-signal presentation отсутствует в текущем main, но source-of-truth явно фиксирует её как ещё не реализованную bounded follow-up к PR #206; согласно правилам аудита это future work, а не current-Stage defect.
- Новых independent current-Stage findings в части 2 не установлено.
- Следующая часть этапа 5: standalone Attention center — group selection/counts/paging, per-kind visibility, review-status synthetic authoritative cases, stale case identity и action races.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 5, часть 3: standalone Attention center — visibility/counts/paging/case identity/actions/concurrency. Исходники не исправлять.
