# stages/AUTH-06/PLAN.md — whole-lifecycle/security acceptance

## Цель

Сохранить AUTH-06 как единую исполняемую repository/local-CI lifecycle/security acceptance matrix и после изменения нижней AUTH-05 ступени заново доказать её на corrected stacked head, не добавляя новую продуктовую функциональность.

## Основание

1. Corrected accepted AUTH-05: PR #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`.
2. Existing AUTH-06 PR #395 был собран поверх superseded AUTH-05 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`; прежний AUTH-06 head `2eb3f9c303ad1b67d5348664267eca665f079cf7` и его runs остаются историческим evidence только старого stack.
3. Полный обязательный контракт AUTH-06 — root `PLAN.md`, раздел **9. AUTH-06 — whole-lifecycle/security acceptance**.
4. Исполнитель текущего sync/reverification — Лёва / Codex-6.1 Sol по прямому решению владельца.
5. AUTH-06 не заменяет AUTH-07 final security gate.

## Scope

1. Синхронизировать существующий AUTH-06 #395 с corrected AUTH-05 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`.
2. Сохранить bounded AUTH-06 как test/fixture/CI/evidence слой: unit/route, native PostgreSQL 17 + Better Auth, built Worker HTTP, connected Chromium и schema/runtime.
3. Не переносить в AUTH-06 новую product implementation из нижних этапов. Реальные sync-conflicts разрешать минимально и только в рамках совместимости test/evidence package с corrected base.
4. Заново проверить cross-flow lifecycle, races, AccountState/deactivation ordering, fault/uncertainty, anti-abuse parity/privacy, Owner/RBAC/Settings/History и отсутствие outbound external calls.
5. Fake inbox/Google/challenge transports остаются private disposable test harness; application/production debug route не добавлять.
6. Не выбирать и не активировать реальные mail/Google/anti-bot providers, edge rules или Stage-6 resources.
7. Если reverification выявит product defect AUTH-01–AUTH-05, зафиксировать HOLD с exact reproduction/evidence и STOP; product correction не смешивать с AUTH-06 verification package.

## Done

1. PR #395 основан на corrected AUTH-05 и имеет новый stable exact head.
2. Все обязательные группы matrix root PLAN §9 связаны с фактически исполняемым evidence на этом новом head.
3. Applicable `run:ci` и `run:acceptance` реально исполнены на новом exact head; skipped label-trigger runs не считаются проверкой.
4. `stages/AUTH-06/RESULT.md` обновлён новым exact SHA, suite/run IDs, результатами и честными limitations; старый head явно не выдаётся за текущий.
5. Confirmed current-scope blockers = 0 → AUTHOR PASS и STOP для повторного whole-feature coordinator review Миры.
6. При blocker → HOLD и STOP; AUTH-07 не начинать.
7. External/deployed provider acceptance этим этапом не утверждается.
