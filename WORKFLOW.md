# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; затем AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**. F01 registration-challenge email enumeration закрыт; CI #45882443114 PASS и 20/20 applicable connected acceptance PASS.
5. Прежний AUTH-05 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` superseded corrected head.
6. AUTH-06 / PR #395 остаётся на старом exact `2eb3f9c303ad1b67d5348664267eca665f079cf7` и старом base `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. Его прежний AUTHOR PASS/CI/acceptance относятся к superseded stack и не являются финальным evidence corrected stack.
7. **AUTH-06 sync/reverification активирована. Исполнитель — Лёва / Codex-6.1 Sol по прямому назначению владельца.**
8. Задача Лёвы: синхронизировать существующий AUTH-06 #395 с corrected AUTH-05 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`, сохранить bounded AUTH-06 как test/evidence package, затем заново выполнить author self-check и применимые exact-head CI/acceptance.
9. Если sync/reverification выявит product defect нижних ступеней — HOLD/evidence и STOP; product correction не смешивать с AUTH-06 verification package.
10. После нового AUTH-06 AUTHOR PASS Лёва останавливается для повторного whole-feature coordinator review Миры.
11. Ада завершила AUTH-05 correction и текущего назначения на AUTH-06 не имеет.
12. Поскольку Лёва участвует в AUTH-06, а Ада — в AUTH-05 correction, **оба не являются independent final whole-feature reviewer этой assembled feature**; reviewer назначается отдельно после coordinator PASS.
13. AUTH-07, intermediate merge, external mail/Google/challenge provider activation и Stage-6 actions остаются заблокированными.

## Следующий переход

Лёва выполняет AUTH-06 #395 sync/reverification поверх corrected AUTH-05 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` по `stages/AUTH-06/PLAN.md`. После нового stable exact head — author self-check + применимые `run:ci`/`run:acceptance`, обновить `stages/AUTH-06/RESULT.md` фактическим evidence и STOP для Миры. AUTH-07 самостоятельно не начинать.
