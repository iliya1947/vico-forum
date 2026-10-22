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
- Этап 4 начат. Часть 1 завершена: Home/category/section public reads, Popular, Search, Tags, Unanswered, localized 404/API catch-all и public authorization degradation проверены.
- Этап 4, часть 2 завершена: generic participation/write entry points, Help-authoring entry, same-origin/session/effective-permission guards, persisted write cooldown, topic read-state/unread и reply/mention notifications проверены.
- Этап 4, часть 3 завершена: public profiles и online presence проверены. Profile loader явно сериализует только public fields; owner edit определяется по session id; action допускает только self-edit, same-origin POST и три validated поля bio/GitHub/website. Bio ограничен 500 Unicode characters, URL — 2048; protocol/userinfo/control-character checks выполняются server-side, GitHub canonicalized до `https://github.com/<user>`. Repository повторно валидирует profile fields и DB constraints поддерживают тот же bounded contract.
- Profile role projection использует одну effective role assignment (user_id PK) и не раскрывает grants/overrides/email. Connected PostgreSQL tests подтверждают counts, best-answer replacement, fresh custom-role display и отсутствие private identity fields.
- Presence heartbeat существует только для authenticated routed app, не отправляется guest/hidden tab, использует same-origin POST без client identity, прекращается и revalidates session после 401. Server записывает только session user. Repository DB-throttles update до одного фактического last_seen write минимум на 45 секунд, recent window — 5 минут; public result содержит полный count и не более 12 последних members, только id/name/image.
- Connected presence tests подтверждают repeat heartbeat, expiry после >5 минут, bounded list/full count, отсутствие email и cascade при удалении account. Новых независимых current-Stage findings в части 3 не установлено.
- Сквозной finding global discovery из части 1 распространяется также на authenticated Unread surface; детали finding до завершения аудита остаются только в текущем developer chat и в служебный PR не публикуются.
- Cross-stage metadata/i18n/a11y/performance/privacy/test-coverage вопросы оцениваются на соответствующих этапах и не дублируются здесь.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 4, часть 4: completeness sweep оставшихся manifest targets этапа 4 и закрытие этапа либо фиксация остатка. Исходники не исправлять.
