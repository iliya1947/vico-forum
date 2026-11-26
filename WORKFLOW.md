# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: draft PR #392, stable correction head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — **AUTHOR PASS**, ожидается повторный coordinator checkpoint Миры.
7. Исправлены три замечания на reviewed head `ce75ff3`: invalidation pending proofs при SET-05, native opaque reset storage с Vico binding по root PLAN, mail outcome projections и closed `change` context.
8. Exact-head CI #45730609055 и 16/16 applicable connected workflows PASS. Evidence — `stages/AUTH-03/RESULT.md`.
9. AUTH-04 заблокирован до нового coordinator PASS AUTH-03.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Исполнитель correction по прямому решению владельца — Лёва / Codex-6.1 Sol; independent final whole-feature reviewer будет другим агентом.

## Следующий переход

**Мира — повторный coordinator checkpoint AUTH-03 #392 на exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf`.** Лёва остановился после AUTHOR PASS. AUTH-04 ждёт coordinator PASS.
