# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; **AUTHOR PASS + COORDINATOR PASS, 0 confirmed current-scope defects**. Evidence: `stages/AUTH-02a/RESULT.md`.
5. AUTH-02a остаётся intermediate stacked PR: без merge в main и без independent Codex review.
6. A-01 storage-plan defect исправлен: отдельная `auth_lifecycle_budget` с explicit expiry; native Better Auth limiter неизменён. A-02–A-04 и sequencing correction приняты на exact head.
7. Следующая ступень **AUTH-02b — mandatory verification/UI** заранее назначена владельцем Лёве / Codex-6.1 Sol, но ещё не активирована.
8. Base AUTH-02b при активации — stable head AUTH-02a `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.
9. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
10. Лёва уже участвовал в AUTH-01 и назначен на AUTH-02b; независимый final reviewer всей собранной feature определяется отдельно.

## Следующий переход

Активировать AUTH-02b как следующую stacked-ступень и передать её Лёве по прямому решению владельца. До этой отдельной активации implementation AUTH-02b не начинать.
