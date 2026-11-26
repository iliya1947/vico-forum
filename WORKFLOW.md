# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, stable exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: draft PR #392, stable exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — **AUTHOR PASS + COORDINATOR PASS**, 0 confirmed current-scope blocking defects.
7. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 остаются intermediate stacked PRs без merge в main.
8. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
9. AUTH-04 / draft #393: author PASS Лёвы был на exact `c9035dce425333d14fdf12d2418f4a8a009edabf`; CI #45744054677 и 16/16 applicable connected acceptance PASS являются supporting evidence, но не закрывают findings.
10. Лена выполнила независимую bounded-проверку AUTH-04 и поставила **HOLD** с F01–F04 в `stages/AUTH-04/RESULT.md`.
11. Мира независимо перепроверила F01–F04 против текущего кода, root PLAN и pinned Better Auth 1.7.7 / better-call 1.4.0: **все четыре findings подтверждены как реальные дефекты текущего AUTH-04 scope**. Прежний PARALLEL REVIEW PASS Миры отозван.
12. **Лёва выполняет bounded correction AUTH-04 #393**. Новый head `e9f8bad85694321f3279a72b604546a813a856b8` содержит F01–F04 correction и focused regressions. Локальные PG/component/Worker Chromium проверки PASS, exact-head CI #45752866279 и применимые acceptance выполняются. AUTHOR PASS ещё не выставлен. AUTH-05 не активирована; intermediate merge и external activation заблокированы.

## Следующий переход

Лёва исправляет подтверждённые F01–F04 из `stages/AUTH-04/RESULT.md` в текущем AUTH-04 PR #393 без расширения scope, добавляет необходимые focused regressions, выполняет author self-check и применимые checks на новом stable exact head и записывает evidence в RESULT. После AUTHOR PASS Лёва останавливается; Мира повторно проверяет corrected exact head. AUTH-05 самостоятельно не начинать.
