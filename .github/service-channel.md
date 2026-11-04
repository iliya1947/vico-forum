# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в `main`.
- AP-08 implementation PR #283 merged commit `65707c69a7a15b2b594eca88f0a6ad0683f1e23e`; documentation closeout PR #286 merged commit `2651d2bf7de7212068c54674dca7d90716ea92c3`.
- AP-08 coordinator whole-PR review Миры и independent technical review Лёвы завершены PASS на exact head `7b6adbf8c92e1706064cb5845248813668a287d0`; open current-scope implementation-дефектов 0.
- Отдельный authenticated Chromium→Worker→Better Auth→PostgreSQL AP-08 flow не выполнялся и не заявляется проверенным; production/deployed acceptance остаётся отдельной release boundary.
- Текущий `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`.
- Следующий bounded package по `docs/ADMIN_PANEL.md` — AP-09: Users index/page после AP-08.
- AP-09 не включает block/lift: блокировки и их effect/reason matrix относятся к AP-10 и остаются отдельным product gate.
- AP-09 использует утверждённую модель Users: searchable/listable index, dedicated administrative user page и только те существующие controls/data, которые разрешены effective permissions. Independent general user-read boundary не должна раскрывать полный authorization-management snapshot, email, grants или overrides.
- Марк не назначен; Stage 6/production rollout вне scope.

## Текущий маршрут

- Мира: AP-09 scope зафиксирован по актуальным source-of-truth.
- Лёва: подготовить bounded technical plan AP-09 от текущего `main`.
- После плана Лёвы Мира проверяет границы и передаёт реализацию Лире отдельным implementation PR.
- AP-10/blocking не начинать до завершения AP-09 и отдельного решения владельца по block-effect/reasons.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
