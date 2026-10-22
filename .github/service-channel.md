# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла. Это инвентаризация, а не проверка реализации.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме; обычные локальные PostgreSQL tests не являются аудитом Neon.
- Этап 1 завершён: все 18 актуальных документов разрешённого объёма прочитаны полностью до EOF, суммарно 7934 строки. Operational разделы MIGRATIONS и внешние/service факты RESEARCH учитывались только как контекст в пределах заданного исключения. Итоговая документальная сверка не выявила подтверждённых противоречий требований. DOC_READ не означает PASS реализации; этапы 2–13 проверяют код, данные, тесты и runtime-сценарии отдельно.
- Этап 2 завершён: проверены route tree, SSR/Worker composition и request-scoped capability wiring; root React Router/Vite/TypeScript/Drizzle/lint/Vitest/env configs; package/toolchain pins; полный двухдокументный pnpm lockfile и direct dependency consistency; server/client import boundary на уровне архитектуры. Все 35 direct manifest specifier совпадают с project lockfile; env lockfile pin совпадает с `packageManager=pnpm@12.3.4`. Двухдокументный pnpm lockfile является штатной pnpm 12 формой при package-manager pin. Production не экспортирует `clientLoader/clientAction`; runtime DB/server imports route-модулей находятся в server-only exports или type-only paths, клиентские компоненты не тянут DB capabilities/secrets. Новых подтверждённых current-Stage defects на этапе 2 не установлено.
- Проверка конкретных route/domain semantics переносится в профильные этапы 3–8; dependency vulnerabilities и security boundary — этап 10; локальные build/test/CI gates — этап 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Если этап не помещается в один ответ, исполнитель сообщает сделанное и остаток, останавливается и ждёт разрешения владельца на продолжение.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md). Предыдущая запись независимого аудита в этом файле сохранена отдельно; её номера этапов не являются статусами нового плана.

## Текущий следующий шаг

Ожидать разрешения владельца начать этап 3: email/password, sign-in/sign-out, session identity, roles/overrides и resource ownership; OAuth service flow исключён из аудита. Исходники не исправлять.
