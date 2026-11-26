# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: draft PR #392, correction head `39c07e539a47b8a317b3a274132337a6dc61cfdf`. Coordinator HOLD относится к reviewed head `ce75ff3629a4adae9941703a33f6d0366bd7f570`; три замечания исправлены, выполняются exact-head проверки.
7. Coordinator review подтвердил три blocking-группы:
   - SET-05 `change-password` не инвалидирует pending recovery/password-create state; change-first race оставляет старый reset proof действительным;
   - implementation recovery-token model противоречит принятому root PLAN: вместо native Better Auth 1.7.7 random reset token/verification storage + Vico binding используется собственный signed JWT/deterministic lifecycle row; это сначала требует технического reconciliation плана;
   - AUTH-03 observability неполна: reset/create mail outcomes не имеют producer/closed purpose projection, а existing password-change не получает предусмотренный closed context `change`.
8. Exact-head CI #45726094032 и 15/15 applicable connected workflows PASS остаются supporting evidence, но не снимают findings.
9. AUTH-04 заблокирован до нового coordinator PASS AUTH-03.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Исполнитель correction по прямому решению владельца — Лёва / Codex-6.1 Sol; independent final whole-feature reviewer будет другим агентом.

## Следующий переход

Лёва завершает author self-check и exact-head CI/acceptance AUTH-03 #392 на `39c07e539a47b8a317b3a274132337a6dc61cfdf`, затем записывает итог в `stages/AUTH-03/RESULT.md` и останавливается для повторного coordinator checkpoint Миры. AUTH-04 ждёт coordinator PASS.
