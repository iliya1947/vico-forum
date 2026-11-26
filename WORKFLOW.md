# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: PR #392, stable exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — AUTHOR PASS + COORDINATOR PASS.
7. AUTH-04: PR #393, corrected stable exact head `e9f8bad85694321f3279a72b604546a813a856b8` — AUTHOR PASS + COORDINATOR PASS.
8. **AUTH-05: PR #394, stable exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` — AUTHOR PASS + COORDINATOR PASS.** Exact-head CI #45825184525 PASS; 20/20 applicable connected acceptance PASS. Подтверждённых current-scope blocking defects не установлено.
9. K5 run #45825205521 attempt 1 упал на существующем timing assertion `len(operation)==36`; attempt 2 прошёл на том же exact head без изменения кода/assertion. Это квалифицированный rerun, а не скрытый production regression.
10. AUTH-01–AUTH-05 остаются intermediate stacked PRs без merge в main.
11. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
12. Лёва остановлен после AUTH-05. AUTH-06 **не активирована**.
13. Independent final whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

AUTH-05 закрыта coordinator checkpoint PASS на exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. Следующая stacked-ступень — AUTH-06 whole-lifecycle/security acceptance из root PLAN; активировать её отдельным переходом поверх branch `feat/auth-05-anti-abuse`. До отдельной активации implementation AUTH-06 не начинать.
