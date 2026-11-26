# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: PR #392, stable exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — AUTHOR PASS + COORDINATOR PASS.
7. AUTH-04: PR #393, corrected stable exact head `e9f8bad85694321f3279a72b604546a813a856b8` — **AUTHOR PASS + COORDINATOR PASS**. F01–F04 исходного head закрыты; CI #45752866279 и 19/19 applicable connected acceptance PASS.
8. AUTH-01–AUTH-04 остаются intermediate stacked PRs без merge в main.
9. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
10. **AUTH-05 активирована.** Исполнитель — Лёва. Bounded contract: `stages/AUTH-05/PLAN.md`.
11. Base AUTH-05: branch `feat/auth-04-account-security`, accepted AUTH-04 exact head `e9f8bad85694321f3279a72b604546a813a856b8`.
12. AUTH-05 завершает provider-neutral anti-abuse/budget/challenge/config/adversarial coverage; конкретный anti-bot provider и external resources не выбираются и не активируются.
13. Independent final whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

Лёва создаёт отдельный stacked implementation PR с base `feat/auth-04-account-security`, реализует bounded AUTH-05 по `stages/AUTH-05/PLAN.md`, выполняет author self-check и применимые CI/acceptance, записывает stable exact head/evidence в `stages/AUTH-05/RESULT.md` и останавливается для coordinator checkpoint Миры. AUTH-06 самостоятельно не начинать.
