# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. По прямому решению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лёвы снято до появления сохранённой реализации AUTH-02b.
8. AUTH-02b implementation branch `feat/auth-02b-email-verification`, head `f98346c8184b6cd3196029f266fcf7aedb12acfe`: verification implementation, native and connected fixtures, verification-specific Worker/Chromium acceptance code written. Tests not executed. Implementation PR ещё не создан. Base `feat/auth-02a-lifecycle-foundation` / exact `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Full author self-check and CI/acceptance remain; no author PASS.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01; Лена участвовала в AUTH-02a и теперь реализует AUTH-02b. Оба не могут быть независимыми final reviewers всей собранной feature; final reviewer определяется отдельно.

## Следующий переход

Лена продолжает `stages/AUTH-02b/PLAN.md`: connected verification-specific acceptance implementation checkpoint сохранён. Next — full bounded author self-check against plan, exact Better Auth endpoint/transaction and TS composite boundaries, fixtures, observability/privacy; repair confirmed current-scope defects, create implementation PR and run applicable exact-head CI/acceptance, record evidence for coordinator checkpoint Миры. AUTH-03, merge, independent final review и external activation не начинать.
