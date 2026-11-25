# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — AUTHOR PASS + COORDINATOR PASS.
6. AUTH-01/AUTH-02a/AUTH-02b остаются intermediate stacked PRs: без merge в main и independent intermediate review.
7. Активный bounded-этап: **AUTH-03 — recovery/reset + password creation для Google-only**.
8. Исполнитель по прямому решению владельца: **Лёва / Codex-6.1 Sol**.
9. Новый AUTH-03 implementation PR ещё не создан. Base: `feat/auth-02b-email-verification` / exact `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`; показывать только bounded AUTH-03 diff.
10. Scope: neutral forgot/reset existing verified credential + own fresh-session mail-proof password creation for Google-only через shared credential service; email change/unlink остаются AUTH-04.
11. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
12. Лёва участвует в implementation stack и не является independent final whole-feature reviewer.

## Следующий переход

Лёва реализует только `stages/AUTH-03/PLAN.md` поверх принятого AUTH-02b. После stable exact head, полного author self-check и применимых CI/acceptance записать evidence в `stages/AUTH-03/RESULT.md` и остановиться для coordinator checkpoint Миры. AUTH-04 самостоятельно не начинать.
