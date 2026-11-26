# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, exact `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: PR #392, exact `39c07e539a47b8a317b3a274132337a6dc61cfdf` — AUTHOR PASS + COORDINATOR PASS.
7. AUTH-04: PR #393, corrected exact `e9f8bad85694321f3279a72b604546a813a856b8` — AUTHOR PASS + COORDINATOR PASS.
8. AUTH-05: PR #394, exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` — **AUTHOR PASS + COORDINATOR PASS**; CI PASS и 20/20 applicable connected acceptance PASS.
9. AUTH-01–AUTH-05 остаются intermediate stacked PRs без merge в main.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. **AUTH-06 активирована.** Исполнитель — Лёва. Bounded contract: `stages/AUTH-06/PLAN.md`; полный контракт matrix — root `PLAN.md` §9.
12. Base AUTH-06: branch `feat/auth-05-anti-abuse`, accepted AUTH-05 exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
13. AUTH-06 — whole-lifecycle/security acceptance package, не новая product functionality и не AUTH-07 final review.
14. Если AUTH-06 evidence выявит подтверждённый дефект AUTH-01–AUTH-05, correction не смешивается с acceptance package: Лёва фиксирует HOLD/evidence и останавливается.
15. Independent final whole-feature reviewer будет назначен отдельно, поскольку Лёва участвовал в implementation stack.

## Следующий переход

Лёва создаёт отдельный stacked implementation PR с base `feat/auth-05-anti-abuse`, закрывает недостающий test/fixture/CI/evidence слой AUTH-06 по `stages/AUTH-06/PLAN.md` и root PLAN §9, выполняет author self-check и применимые exact-head CI/acceptance. При 0 current-scope blockers записывает evidence matrix и AUTHOR PASS в `stages/AUTH-06/RESULT.md`, затем STOP для whole-feature coordinator review Миры. При найденном product defect — HOLD и STOP. AUTH-07 самостоятельно не начинать.
