# stages/AUTH-06/PLAN.md — whole-lifecycle/security acceptance

## Цель

Собрать AUTH-01–AUTH-05 в одну исполняемую repository/local-CI lifecycle/security acceptance matrix на stable stacked head и доказать критические cross-flow invariants, не добавляя новую продуктовую функциональность.

## Основание

1. Base: accepted AUTH-05 branch `feat/auth-05-anti-abuse`, exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
2. Полный обязательный контракт AUTH-06 — root `PLAN.md`, раздел **9. AUTH-06 — whole-lifecycle/security acceptance**.
3. AUTH-01–AUTH-05 уже имеют coordinator PASS; AUTH-06 не заменяет AUTH-07 final security gate.

## Scope

1. Создать отдельный stacked implementation PR с base на AUTH-05.
2. Реализовать только недостающий test/fixture/CI/evidence слой, необходимый для полной matrix из root PLAN: unit/route, native PostgreSQL 17 + Better Auth, built Worker HTTP, connected Chromium и schema/runtime.
3. Проверить cross-flow lifecycle, races, AccountState/deactivation ordering, fault/uncertainty, anti-abuse parity/privacy, Owner/RBAC/Settings/History и отсутствие outbound external calls в repository/local-CI harness.
4. Сохранить fake inbox/Google/challenge transports только private disposable test harness; application/production debug route не добавлять.
5. Не выбирать и не активировать реальные mail/Google/anti-bot providers, edge rules или Stage-6 resources.
6. Не удалять и не ослаблять unrelated negative/regression contracts ради прохождения новой matrix.
7. Если acceptance выявит подтверждённый дефект реализации AUTH-01–AUTH-05, **не смешивать correction с AUTH-06 verification package**: зафиксировать HOLD с exact reproduction/evidence и остановиться для отдельного correction route.

## Done

1. Все обязательные группы matrix из root PLAN связаны с фактически исполняемым evidence на одном stable exact head; существующий green CI без новых lifecycle flows сам по себе недостаточен.
2. Applicable `run:ci` и `run:acceptance` реально исполнены на exact head; skipped label-trigger runs не считаются проверкой.
3. Evidence matrix с suite/run IDs, результатами и честными limitations записана в `stages/AUTH-06/RESULT.md`.
4. Confirmed current-scope blockers = 0 → AUTHOR PASS и STOP для coordinator whole-feature review Миры.
5. При blocker → HOLD и STOP; AUTH-07 не начинать.
6. External/deployed provider acceptance этим этапом не утверждается.
