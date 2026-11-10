# История проекта — 2026-11-10: Super-admin SA-01

Исторический snapshot завершённого **SA-01**. Не является source of truth для текущего поведения: постоянный контракт — [SUPER_ADMIN.md](../SUPER_ADMIN.md), фактическое состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md).

## Реализованная поставка

- Отдельный защищённый `/:locale/super-admin` с **точным server-bound Owner** (Better Auth `user.id` и `VICO_OWNER_USER_ID`), общим shell и двумя Owner-only входами из обычного Admin и профиля/аккаунта Owner. Не добавлены новый Owner role, RBAC или permission key.
- Минимальный правдивый Overview, live **System** Monitoring трёх источников: Worker serving/build mode, текущая PostgreSQL availability/version, ограниченный счётчик записанных HTTP 5xx. Время наблюдения и начало фактически сохранённой History показываются отдельно, без вымышленной uptime/traffic coverage.
- **Adjacent History** каждого System monitor и общий source-aware **Event log**, который объединяет retained Owner events/observations и существующий native `admin_history` без копирования его event identity. Validated keyset/cursor pagination, protected no-store и независимые Owner guards.
- Forward migration `0062_owner_monitoring_foundation`: append-only `owner_events`, `owner_monitor_observations`, полнота Drizzle metadata/manifest, ограниченные web runtime SELECT/INSERT grants без UPDATE/DELETE. Safe bounded payload, occurrence dedup, bounded sampling/heartbeat; best-effort безопасная 5xx telemetry без veto основного ответа.
- Локализованные EN/RU/HE, RTL, responsive/keyboard. **Infrastructure** отображается как **Under development / Stage 6**, без live integrations или команд.
- Остальные 12 Monitoring-областей, унифицированный профиль с Admin/Owner sections, деактивация, contextual actions из будущих пакетов, real Google/Owner binding, production/live Stage-6 acceptance **не реализованы** в SA-01.

## Implementation, corrective chain и merge

- [Implementation PR #313](https://github.com/iliya1947/vico-forum/pull/313) **merged 2026-11-10**. Финальный stable implementation head: `d9c4268437e76eec9d01f19c7fe1b85d456128c1`; merge commit `be813b86e9a585b266145f655389df1ac4c2d64b`.
- Источник bounded технического плана — [Лёва](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745289141); назначение реализации — [Мира](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745414259). Реализация разделена на Owner event/observation database foundation, shell/System/History UI, connected Chromium acceptance.
- **SA01-MIRA-01** — на первом review обнаружено неверное начало `Coverage since`: последние наблюдения Runtime/Database и только первый 5xx для Requests. Лира исправила вычисление как min фактически сохранённой scoped observation/event History и добавила PostgreSQL-регрессии. [Coordinator finding](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6749272021).
- **SA01-LEV-01** — на следующем техническом review Лёва подтвердил, что невозможная календарная дата в History cursor проходила `Date.parse`, отклонялась PostgreSQL и давала 500 вместо malformed-cursor 400. Мира [подтвердила current-scope defect](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6750472578); Лира добавила canonical ISO round-trip parser validation и route/PG/real-browser regressions без нового cursor format и без изменения классификации настоящих DB errors. [Independent finding](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6750292313).
- [Мира — финальный whole-PR PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6757801001): **0 current-scope defects** на финальном exact head. [Лёва — независимый re-review PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6757929335): **0 current-scope defects** на том же head. Оба замечания закрыты. [Coordinator ready-for-Owner-merge](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6758066942).

## Финальные exact-head проверки

1. [CI #42692723600](https://github.com/iliya1947/vico-forum/actions/runs/42692723600) — **SUCCESS**: application **169 файлов / 2145 тестов**; native PostgreSQL 17 **54 файла / 619 тестов**; lint/typecheck/build, migrations/manifest/grants, Worker/local integration.
2. [Connected SA-01 Chromium #42692723871](https://github.com/iliya1947/vico-forum/actions/runs/42692723871) — **SUCCESS, 16 checkpoints**: реальный built Worker, Better Auth session, disposable PostgreSQL 17, exact-Owner/Guest/non-Owner guards, System/History/Event log identities, реальные timeouts/503 и 5xx, malformed cursor400, EN/RU/HE/RTL/mobile/keyboard и отсутствие внешних запросов.
3. [Existing Chromium regression #42692723602](https://github.com/iliya1947/vico-forum/actions/runs/42692723602) — **SUCCESS**, все четыре job.

Лёва дополнительно выполнил независимые real-web-role PostgreSQL, paging, browser и failure-classification probes, отдельно от штатного CI; детали в [отчёте](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6757929335). Тестовые ресурсы не являются production.

**Граница:** результат — только repository/local-CI. Stage 6 остаётся на паузе. Реальная Google OAuth конфигурация и Owner binding, production schema/Worker rollout, live Infrastructure, новые Monitoring области, unified profile/deactivation и visual polish этим merge не подтверждены. Постоянные документы обновляются отдельным docs-only closeout после implementation merge.
