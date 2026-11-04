# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`; Complaints repository/local-CI cycle завершён, пауза Admin Panel снята.
- AP-07 technical plan Лёвы проверен Мирой против `main` `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`: PASS; current-scope product/architecture blockers не подтверждены.
- AP-07 реализуется Лирой в [draft PR #282](https://github.com/iliya1947/vico-forum/pull/282), head `9c200dc3e998448d9b0aab1a0b815f31aa18d87a`.
- Завершены два bounded implementation subtask: 1) protected section → topics browsing с SQL search/paging/Help, 2) protected admin topic page с независимым Forum gate, explicit permission-scoped DTO, Help-private ID фильтрацией, translated current posts, safe Markdown/attachments, stable post IDs/numbers, topic Quick actions.
- Тесты для маршрутов, приватности, UI и native PostgreSQL добавлены. Прежние CI прогонки выявили ошибки test selector/route snapshot и неверный i18n key, исправленные на новом head. [CI #41744388411](https://github.com/iliya1947/vico-forum/actions/runs/41744388411) — SUCCESS (checks и database); complete AP-07 PASS не заявляется.
- Остаются shared per-message Quick actions, canonical inline post-source and revision-history transport, final tests/verification, project docs/current-state и whole-PR review. PR #282 по-прежнему draft и не готов к merge.
- AP-08 closure, AP-09 Users, AP-10 blocking, AP-11 closeout и unrelated Complaints/production work вне текущего scope.

## Назначения

- Координатор: Мира — review только после полного stable-head handoff.
- Технический планировщик AP-07: Лёва — задача завершена.
- Исполнитель AP-07: Лира.
- У Марка активного назначения нет.

## Принятые границы AP-07

- Существующие authoritative Forum actions, source-locale correction, revision-history и permission model переиспользуются; второй RBAC/admin mutation backend не создаётся.
- Нужные current-scope transport/privacy corrections для inline post source correction и post-history response входят в AP-07.
- Новые schema/migrations/permissions/dependencies/runtime grants не требуются.
- AP-08+ и unrelated Complaints/Signals/production work не включать.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
Технический план AP-07: [личный файл Лёвы](agents/codex-6.1-sol.md).
