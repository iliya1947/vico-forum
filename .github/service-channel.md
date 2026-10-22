# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла. Это инвентаризация, а не проверка реализации.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме; обычные локальные PostgreSQL tests не являются аудитом Neon.
- Этап 1 завершён: все 18 актуальных документов разрешённого объёма прочитаны полностью до EOF, суммарно 7934 строки. Operational разделы MIGRATIONS и внешние/service факты RESEARCH учитывались только как контекст в пределах заданного исключения. Итоговая документальная сверка не выявила подтверждённых противоречий требований. DOC_READ не означает PASS реализации; этапы 2–13 проверяют код, данные, тесты и runtime-сценарии отдельно.
- Этап 2 завершён без подтверждённых current-Stage defects: route tree, SSR/Worker composition, request-scoped capabilities, root configs, package/toolchain pins, полный pnpm lockfile и server/client import boundary проверены.
- Этап 3 начат. Часть 1 завершена: проверены email/password registration/sign-in, credential return-path safety, request-scoped session initialization, sliding-session cookie propagation, expired-session handling, sign-out UI/revalidation boundary и Better Auth resource route. OAuth service flow не проверялся.
- Этап 3, часть 2 завершена: проверены dynamic permission catalog, built-in/custom roles, grants, per-user overrides, protected management route, server-side actor derivation, same-origin boundary, request-local resolution snapshot/freshness, management-state snapshot consistency, availability classification и atomic last-manager lockout protection. Подробные findings этой незавершённой проверки остаются только в текущем чате разработчика согласно AGENTS.md и в служебный PR не публикуются.
- Следующая часть этапа 3 — resource ownership и owner/any permission boundaries.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Если этап не помещается в один ответ, исполнитель сообщает сделанное и остаток, останавливается и ждёт разрешения владельца на продолжение.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 3, часть 3: resource ownership, owner/any permission pairs и authoritative actor/resource checks. OAuth service flow исключён; исходники не исправлять.
