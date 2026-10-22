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
- Этап 3 завершён. Проверены email/password и session boundary; dynamic roles/grants/overrides, management mutations, snapshot/freshness и atomic lockout protection; resource ownership для post edit, solution manage own/any, source-locale correct own/any и author-only duplicate appeal. Actor и ownership выводятся server-side; client `actorId/authorId/role/permission/scope` не являются evidence. Repository/domain layer повторно проверяет authoritative author/ownership перед mutation.
- Детали findings этапа 3 остаются только в текущем чате разработчика до завершения всех проверок согласно AGENTS.md; в служебный PR предварительные findings не публикуются.
- Cross-stage test-coverage observations будут оцениваться на этапе 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца начать этап 4: public read/discovery/search/tags, участие, unread, notifications, profiles и presence. Исходники не исправлять.
