# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; затем AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**. Whole-feature F01 registration-challenge email enumeration закрыт; exact-head CI #45882443114 PASS и 20/20 applicable connected acceptance PASS. Повторный checkpoint: `stages/AUTH-05/RESULT.md`.
5. Прежний AUTH-05 exact `ac59e3d2...` superseded corrected head.
6. AUTH-06 / PR #395 остаётся на старом exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`. Его прежний AUTHOR PASS/CI/acceptance остаются историческим evidence, но head построен поверх superseded AUTH-05 и **не может продолжать final cycle без sync/reverification**.
7. Whole-feature HOLD из `stages/AUTH-06/REVIEW.md` закрыт на уровне причины F01 только после corrected AUTH-05 PASS; whole-feature PASS ещё не выдан.
8. По прямому решению владельца дальнейшую техническую работу выполняет **Ада / Business GPT-6.2**. Поскольку она участвовала в AUTH-05 correction, independent final reviewer этой assembled feature будет другим агентом.
9. External mail/Google/challenge provider activation, intermediate merge и Stage-6 actions остаются заблокированными.
10. AUTH-07 не активирован.

## Следующий переход

Отдельно активировать для Ады **AUTH-06 sync/reverification**: перенести существующий test/evidence package #395 на corrected AUTH-05 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`, разрешить конфликты только в границах AUTH-06, затем заново выполнить author self-check и применимые exact-head CI/acceptance. После AUTHOR PASS — STOP для повторного whole-feature coordinator review Миры. Этот переход пока не активирован.
