# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в main; current main `e39c36ccef29c6164706d826f26c57088a97fa20`.
- AP-08 product decisions владельца зафиксированы: reopen есть; close/reopen одной capability; mandatory reason нет; closed topic запрещает новые replies всем без actor exceptions.
- Лёва подготовил technical plan AP-08: [#6621343128](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128).
- Лира реализовала AP-08 в implementation PR #283; текущий сохранённый head: `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.
- Работа Лиры не считается дефектной из-за того, что coordinator scope Миры оказался шире необходимого. Overscope сам по себе не является основанием удалять, откатывать или переписывать уже корректно реализованное.
- Владелец остановил дальнейшее продолжение Лиры до завершения разбора coordinator-сбоя Миры. #283 сохраняется как есть; новых code/docs/tests/acceptance изменений по этой причине не делать.
- Прежний coordinator PASS Миры не использовать как доказательство того, что каждое изменение было необходимо именно для AP-08; это процессный дефект координации, а не установленный дефект реализации.
- AP-09+, blocking и production rollout вне текущего scope.

## Текущий маршрут

- Лира: работа по #283 остановлена владельцем; текущий head сохраняется без переделки.
- Лёва: новых задач по AP-08 сейчас нет.
- Мира: устраняет только последствия собственного coordinator-сбоя в служебном состоянии и не меняет реализацию #283 без отдельного подтверждённого current-scope дефекта.
- Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
