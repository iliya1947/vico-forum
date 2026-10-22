# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этап 1 завершён: все 18 актуальных документов разрешённого объёма прочитаны полностью до EOF, суммарно 7934 строки; подтверждённых противоречий требований не выявлено.
- Этап 2 завершён: route tree, SSR/Worker composition, request-scoped capabilities, root configs, package/toolchain pins, полный pnpm lockfile и server/client import boundary проверены; подтверждённых current-Stage defects не установлено.
- Этап 3 завершён: email/password/session, dynamic RBAC, overrides/snapshots/lockout и ownership boundaries проверены. Детали findings остаются только в текущем чате разработчика до завершения всех проверок согласно AGENTS.md.
- Этап 4 начат. Часть 1 завершена: проверены Home/category/section public reads, Popular, Search, Tags, Unanswered, localized 404/API catch-all, public authorization degradation и connected PostgreSQL discovery evidence. Help & solutions service section остаётся скрытым в generic section routes/category cards/topic breadcrumb; сквозная проверка global discovery surfaces выявила отдельный finding, детали которого до завершения аудита не публикуются в служебном PR.
- Search normalization/length/wildcard escaping, deterministic Popular periods, tag projections и unanswered semantics имеют connected DB coverage. Classified optional authorization/presence outages не должны снимать публичный read path; unexpected errors не маскируются.
- Cross-stage metadata/i18n/a11y/performance вопросы оцениваются на соответствующих этапах и не дублируются здесь.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 4, часть 2: участие/write entry points, unread/read-state и notifications. Profiles/presence после этого отдельной частью. Исходники не исправлять.
