# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: draft PR #392, stable exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — **AUTHOR PASS + COORDINATOR PASS**, 0 confirmed current-scope blocking defects.
7. AUTH-03 correction сохранил root PLAN: reset использует Better Auth 1.7.7 opaque random secret + hashed native verification identifier и Vico current-generation binding; SET-05 password change атомарно инвалидирует pending reset/create; AUTH-03 mail outcomes и closed password contexts отражаются в observability.
8. Exact-head CI #45730609055 PASS; 16/16 applicable connected acceptance workflows PASS, включая Worker/Chromium AUTH-02b/03 #45730614967 и AP-10 #45730614955.
9. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 остаются intermediate stacked PRs: без merge в main и independent intermediate review.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. **AUTH-04 активна**, draft #393, base accepted AUTH-03 `39c07e539a47b8a317b3a274132337a6dc61cfdf`, current head `b058838a0b4f20131d2e1b10c47b05743d20ceca`. Исполнитель — Лёва. Implementation и локальные проверки выполнены, exact-head CI/acceptance выполняются. Evidence — `stages/AUTH-04/RESULT.md`.
12. По прямому решению владельца Лёва остаётся исполнителем последующих AUTH-04 → AUTH-06; independent final whole-feature reviewer будет другим агентом.

## Следующий переход

Лёва завершает author self-check и exact-head CI/acceptance AUTH-04 #393, затем записывает stable head/evidence в `stages/AUTH-04/RESULT.md` и останавливается для coordinator checkpoint Миры. AUTH-05 самостоятельно не начинать.
