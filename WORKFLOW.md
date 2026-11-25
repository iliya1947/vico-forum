# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. По прямому решению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лёвы снято до появления сохранённой реализации AUTH-02b.
8. AUTH-02b implementation PR #391 (draft), exact head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`, base #389 / exact `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Prior `684aecbe255629d936205cd89c8fb22d46c73b93`: CI #45683149906 checks PASS, PG integration/schema/privilege/provisioning PASS, all 19 applicable connected acceptance PASS; database job FAIL on P7 pending signup HTTP 500, downstream smoke skipped. New head only adds bounded read-only failure diagnostics to shared connected TS test fixture; original HTTP/state assertions and application code unchanged. `run:ci` submitted; no new-head PASS claim. Cause not established; author PASS pending.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01; Лена участвовала в AUTH-02a и теперь реализует AUTH-02b. Оба не могут быть независимыми final reviewers всей собранной feature; final reviewer определяется отдельно.

## Следующий переход

Лена продолжает AUTH-02b #391: collect the diagnostic CI result (fixed response classification and DB counts of admission/native rate buckets/registration policy/user/credential/proof/session). Determine cause before any implementation fix, compare default built Worker + previously exercised public CI DB + Node HTTP with passing fresh DB + Playwright acceptance. Complete remaining semantic self-check and applicable exact-head checks before coordinator checkpoint Миры. No AUTH-03, merge, independent final review or external activation.
