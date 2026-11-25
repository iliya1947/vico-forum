# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`; **AUTHOR PASS + COORDINATOR PASS**, 0 confirmed current-scope blocking defects.
6. AUTH-01/AUTH-02a/AUTH-02b остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
7. AUTH-02b доставляет mandatory email verification + resend + verification UI; signup не создаёт полноценную session до verification, terminal verification — explicit POST, затем отдельный sign-in.
8. Exact-head CI #45715104959 PASS; 19/19 применимых acceptance workflows PASS, включая AUTH-02b #45715112322 с no-JS credential transport regression.
9. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
10. Лёва участвовал в AUTH-01 и correction/finalization AUTH-02b; Лена — в AUTH-02a/02b. Final independent whole-feature reviewer будет назначен отдельно.
11. По прямому решению владельца после AUTH-02b Лёва остаётся исполнителем AUTH-03 → AUTH-06.

## Следующий переход

Активировать **AUTH-03 — recovery + password creation** как следующую stacked-ступень с base на принятом AUTH-02b head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` и передать её Лёве. До отдельной активации AUTH-03 implementation не начинать.
