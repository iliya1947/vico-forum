# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–4 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md.
- Этап 5 начат. Часть 1 завершена: solved/best-answer, manual Help solution moderation и duplicate relationship/appeal stale/concurrent paths проверены.
- Этап 5, часть 2 завершена: ordinary Help signals проверены end-to-end — submission/withdrawal, permissions, cooldown, immutable target identity, stale/superseded lifecycle и concurrent acceptance. Новых independent findings в этой части не установлено.
- Этап 5, часть 3 проверена технически, но пока не закрыта: standalone Attention center прошёл access/mode isolation, group visibility, permission-scoped counts, action identity и stale/concurrent checks; по одному current pagination contract обнаружено расхождение source-of-truth, требующее решения владельца до окончательной классификации.
- Signals mode доступен только actor с хотя бы одной текущей Help moderation capability; Security/Attachments отделён независимой `forum.attachmentSecurity.read`. Complaints остаётся пустым scaffold за существующим Help moderation boundary. Security events здесь проверены только как route/access boundary; attachment storage/lifecycle относится к этапу 7.
- Queue visibility строится из current permissions: needs-details, solution review/outdated, duplicate и appeals независимо фильтруются; inaccessible kinds не попадают в cases/counts. Needs-review group складывает user pending signals и отдельно типизированные authoritative current-best-answer review-status tasks; последние read-only и ведут к конкретному answer/solution controls.
- Counts считаются по полному visible pending набору независимо от current page. Mixed по действующему contract считает topics с 2+ visible pending user signals и повторяет их exact signal cases; appeals/review-status не подменяются synthetic signals.
- Signal actions несут immutable `caseId`, route сверяет persisted topic/kind, выводит permission из persisted kind, а repository повторно блокирует exact signal/targets. Appeal actions несут exact appeal `caseId`, route сверяет current pending appeal и writer передаёт `expectedAppealId` compare-and-set. Stale case не переключается на новый appeal.
- Connected attention DB tests покрывают per-permission isolation, full counts, individual records, Mixed, resolution disappearance, authoritative review-status distinction, exact appeal identity and paging beyond 50 cases.
- До решения владельца по расхождению pagination contract новые implementation findings части 3 не классифицируются.
- Следующий шаг этапа 5 зависит от решения владельца по этому contract; после решения — завершить часть 3 и перейти к финальному completeness sweep.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-quality вопросы остаются за этапами 8, 10, 11 и 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать решения владельца по зафиксированному в текущем developer chat расхождению current Attention pagination contract. После решения завершить часть 3; исходники не исправлять.
