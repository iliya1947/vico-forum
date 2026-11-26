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
9. AUTH-04 / draft #393 после correction: stable exact head `e9f8bad85694321f3279a72b604546a813a856b8` — **AUTHOR PASS + COORDINATOR PASS**. Exact-head CI #45752866279 PASS; **19/19 applicable connected acceptance PASS**. Evidence — `stages/AUTH-04/RESULT.md`.
10. Исходный head `c9035dce425333d14fdf12d2418f4a8a009edabf` получил HOLD Лены с F01–F04; Мира независимо подтвердила findings и отозвала прежний PASS. Corrected head `e9f8bad85694321f3279a72b604546a813a856b8` повторно проверен Мирой: F01–F04 закрыты, новых current-scope blocking defects не установлено.
11. Лёва остановлен после AUTH-04 correction. AUTH-05 **ещё не активирована**. Intermediate merge и external activation не выполнять.
12. Independent final whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

AUTH-04 закрыта coordinator checkpoint PASS на exact `e9f8bad85694321f3279a72b604546a813a856b8`. Следующая stacked-ступень — AUTH-05 из root PLAN; активировать её отдельным переходом. До отдельной активации implementation AUTH-05 не начинать.
