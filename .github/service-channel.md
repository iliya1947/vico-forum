# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`.
- Complaints repository/local-CI cycle завершён; пауза Admin Panel снята.
- Текущий `main`: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
- AP-07 technical plan Лёвы проверен Мирой против current main и permanent admin contract: PASS.
- Подтверждённых current-scope product/architecture blockers AP-07 не найдено.
- Следующий пакет: AP-07 — administrative topic page и message actions внутри topic context.
- AP-08 closure, AP-09 users, AP-10 blocking и AP-11 closeout вне текущего implementation scope.

## Назначения

- Координатор: Мира.
- Технический планировщик AP-07: Лёва — задача завершена.
- Исполнитель AP-07: Лира.
- У Марка активного назначения нет.

## Принятые границы AP-07

- Section admin page получает bounded topics discovery; dedicated admin topic route строится поверх existing authoritative forum reads.
- Существующие Quick actions, source-locale correction, revision-history и authorization переиспользуются; второй RBAC/admin mutation backend не создаётся.
- Нужные current-scope transport/privacy corrections для inline post source correction и post-history response входят в AP-07.
- Новые schema/migrations/permissions/dependencies/runtime grants не требуются по текущему плану.
- AP-08+ и unrelated Complaints/Signals/production work не включать.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
Технический план AP-07: [личный файл Лёвы](agents/codex-6.1-sol.md).
