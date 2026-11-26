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
9. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 остаются intermediate stacked PRs без merge в main.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. **AUTH-04 — AUTHOR PASS.** Draft #393, base accepted AUTH-03 `39c07e539a47b8a317b3a274132337a6dc61cfdf`, stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`. Исполнитель — Лёва. Exact-head CI #45744054677 и 16/16 применимых connected acceptance PASS. Evidence — `stages/AUTH-04/RESULT.md`.
12. **Мира — PARALLEL REVIEW PASS** на том же exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`: проверены bounded diff, transaction/session/state ordering, two-phase email flow, occupied-email rollback, last-usable-method invariant в lifecycle и native adapter delete/deleteMany, deactivation serialization, observability/schema projections, Settings integration и exact-head workflow evidence. Подтверждённых current-scope blocking defects не установлено.
13. По прямому решению владельца отдельная bounded-проверка AUTH-04 также передана **Лене**. Лена не участвовала в реализации #393.
14. Лёва остановлен; AUTH-05 не активирована. Independent final whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

Дождаться независимого PASS/HOLD Лены по AUTH-04 #393 на stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`. До её результата AUTH-05 не активировать и intermediate PRs не merge. При PASS определить отдельный переход к AUTH-05; при HOLD вернуть подтверждённые current-scope findings реализатору.
