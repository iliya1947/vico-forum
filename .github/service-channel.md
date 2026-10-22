# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–3 завершены. Детали findings остаются только в текущем developer chat до завершения всех предусмотренных проверок согласно AGENTS.md.
- Этап 4 начат. Части 1–3 завершены: public discovery, generic participation/write, unread/read-state, notifications, profiles и presence проверены.
- Этап 4, часть 4a завершена: выполнен completeness sweep малых оставшихся manifest targets и test-matrix inventory крупных shared test files. Проверены under-development view/feature registry/route, i18next typing declaration, post-edit redirect boundary, editor operation context-key parser, Hyperdrive registry adapter и его unit/connected outage tests, а также remaining connected Stage-4 E2E authorization/search section. Новых current-Stage findings в этих targets не установлено.
- `public-read.test.tsx` содержит 78 test blocks, `write-actions.test.ts` — 38, `stage4-core-e2e.test.ts` — 3. Матрица показала, что существенная Help/solution/duplicate/signal функциональность живёт в shared stage-4 files, тогда как отдельный этап 5 manifest содержит только `app/routes/attention.tsx` и `tests/database/forum-help-attention.test.ts`. Поэтому этап 4 пока нельзя закрыть без проверки Help sections этих shared files и соответствующих production paths; иначе часть заявленного объёма выпадет из AUD-20261022.
- Уже установленный cross-surface discovery finding остаётся только в current developer chat; в служебный PR детали findings до завершения проверки не публикуются.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-coverage вопросы оцениваются на соответствующих этапах.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 4, часть 4b: Help modes/public presentation и связанные shared production/test paths, которые формально находятся в manifest этапа 4. После них определить, можно ли закрыть этап 4 перед отдельным attention-этапом 5.
