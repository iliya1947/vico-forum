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
9. AUTH-04 / draft #393 после correction: stable exact head `e9f8bad85694321f3279a72b604546a813a856b8` — **AUTHOR PASS**, ожидает повторной coordinator проверки Миры. Exact-head CI #45752866279 PASS (3339 unit/component + 1903 PG17 tests), **19/19 applicable connected acceptance PASS**. Evidence — `stages/AUTH-04/RESULT.md`.
10. Исходный head c9035dc получил HOLD Лены с F01–F04, независимо подтверждённый Мирой. Corrected head e9f8bad закрывает эти findings реализацией и focused regressions по author self-check; disposition на новом head даёт Мира.
11. Мира независимо перепроверила F01–F04 против текущего кода, root PLAN и pinned Better Auth 1.7.7 / better-call 1.4.0: **все четыре findings подтверждены как реальные дефекты текущего AUTH-04 scope**. Прежний PARALLEL REVIEW PASS Миры отозван.
12. **Лёва завершил bounded correction AUTH-04 #393 и остановился для повторного checkpoint Миры**. AUTH-05 не активирована; intermediate merge и external activation заблокированы.

## Следующий переход

Мира повторно проверяет corrected AUTH-04 #393 на stable exact head `e9f8bad85694321f3279a72b604546a813a856b8`. Маршрут — заключительные разделы `stages/AUTH-04/RESULT.md` (bounded correction и AUTHOR PASS) → `stages/AUTH-04/PLAN.md` / root PLAN → полный bounded diff и focused tests. Проверка включает F01–F04 и взаимодействие с accepted AUTH-03. Лёва остановился; AUTH-05 разрешается только после coordinator PASS. Intermediate merge и external activation не выполнять.
