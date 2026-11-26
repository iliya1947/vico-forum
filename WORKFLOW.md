# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: delivery mode stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`: прежний coordinator PASS **superseded whole-feature finding F01**; требуется correction.
5. AUTH-06 / PR #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: AUTHOR PASS и exact-head CI/20 acceptance PASS сохранены как evidence, но whole-feature coordinator review — **HOLD** из-за defect нижней AUTH-05 ступени. Review: `stages/AUTH-06/REVIEW.md`.
6. Confirmed current-scope blockers: **1 — F01 registration-challenge email enumeration**. При открытой email registration existing email пропускает required challenge и получает duplicate-neutral 200, fresh email с тем же missing/rejected challenge получает 403/503.
7. Существующий SET-02 deliberate closure contract не является F01 и не переоткрывается этой correction.
8. **Исполнитель correction — Ада / Business GPT-6.2** по прямому решению владельца заменить Лёву дальше по задаче.
9. Correction принадлежит AUTH-05 / #394. Product fix не смешивать с test-only AUTH-06 #395.
10. После изменения AUTH-05 зависимый AUTH-06 #395 должен быть синхронизирован с новым accepted base и заново пройти применимые author checks/CI/acceptance.
11. Поскольку Ада теперь участвует в implementation correction, она больше не подходит как independent final whole-feature reviewer; reviewer назначается отдельно после coordinator PASS.
12. AUTH-07, intermediate merge, external mail/Google/challenge provider activation и Stage-6 actions заблокированы.

## Следующий переход

Ада исправляет только F01 в AUTH-05 #394: устранить caller-observable account-existence distinction, создаваемое required challenge при открытой email registration, не меняя утверждённый SET-02 closure contract и не расширяя provider/external scope. Regression должен сопоставлять existing и fresh email для missing/rejected/unavailable challenge outcomes. После author self-check Ада фиксирует новый stable AUTH-05 exact head/evidence и STOP для повторного coordinator checkpoint Миры. AUTH-06 самостоятельно не синхронизировать до PASS AUTH-05.
