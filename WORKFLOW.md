# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388 — coordinator PASS.
4. AUTH-02a: PR #389 — coordinator PASS.
5. AUTH-02b: PR #391, exact `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — coordinator PASS.
6. AUTH-03: PR #392, exact `39c07e539a47b8a317b3a274132337a6dc61cfdf` — AUTHOR PASS + COORDINATOR PASS.
7. AUTH-04: PR #393, corrected exact `e9f8bad85694321f3279a72b604546a813a856b8` — AUTHOR PASS + COORDINATOR PASS.
8. AUTH-05: PR #394, exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` — AUTHOR PASS + COORDINATOR PASS; CI PASS и 20/20 applicable connected acceptance PASS.
9. AUTH-01–AUTH-05 остаются intermediate stacked PRs без merge в main.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. **AUTH-06: PR #395, exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`; author verification выполняется.** Текущий исполнитель — Лёва; он завершает уже начатый AUTH-06 handoff и после этого больше не является следующим техническим агентом этой задачи.
12. Base AUTH-06: branch `feat/auth-05-anti-abuse`, accepted AUTH-05 exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
13. AUTH-06 — whole-lifecycle/security acceptance package, не новая product functionality и не AUTH-07 final review.
14. Если текущая AUTH-06 verification выявит подтверждённый defect AUTH-01–AUTH-05, Лёва фиксирует HOLD/evidence и STOP; correction не смешивается с acceptance package.
15. **По прямому решению владельца следующий технический агент после текущего handoff Лёвы — Ада / Business GPT-6.2. Она заменяет Лёву дальше по задаче.**
16. Поскольку Ада не участвовала в implementation AUTH-01–AUTH-06, она может быть назначена independent whole-feature reviewer на final stable head после coordinator PASS Миры; конкретный AUTH-07 handoff оформляется только после завершения текущей ступени.

## Следующий переход

Лёва завершает только уже начатый author self-check и реально запущенные `run:ci` / `run:acceptance` PR #395 на exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`. При PASS или HOLD он записывает итог/evidence в `stages/AUTH-06/RESULT.md` и STOP. После этого Мира проводит whole-feature coordinator review; дальнейший технический handoff, который по прежнему workflow получил бы Лёва, передаётся Аде. AUTH-07 самостоятельно не начинать.
