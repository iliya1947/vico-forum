# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01–AUTH-05 — coordinator PASS.
2. Accepted stack head: AUTH-05 #394 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
3. AUTH-06 активирована как последняя implementation-ступень stacked delivery; bounded handoff — `stages/AUTH-06/PLAN.md`, полный matrix contract — root `PLAN.md` §9.
4. Исполнитель AUTH-06 — Лёва по прямому назначению владельца на AUTH-04→AUTH-06.
5. AUTH-06 — whole-lifecycle/security acceptance/evidence package, не AUTH-07 final review и не новая product functionality.
6. При найденном дефекте предыдущих ступеней Лёва должен HOLD/STOP для отдельной correction, а не смешивать исправление с verification package.
7. External/deployed provider activation остаётся заблокированной.

## Следующий переход

После AUTHOR PASS AUTH-06 провести whole-feature coordinator review всей assembled auth vertical на stable exact head. Только после coordinator PASS переходить к AUTH-07 final gate и independent reviewer route.
