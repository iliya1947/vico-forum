# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: delivery mode stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394: прежний coordinator PASS на `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` **superseded whole-feature finding F01**. Correction candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` опубликован; CI #45882443114 и connected acceptance запущены. Авторская проверка по существу ещё не завершена; состояние CI/acceptance учитывается отдельно.
5. AUTH-06 / PR #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: AUTHOR PASS и exact-head CI/20 acceptance PASS сохранены как evidence, но whole-feature coordinator review — **HOLD** из-за defect нижней AUTH-05 ступени. Review: `stages/AUTH-06/REVIEW.md`.
6. Confirmed current-scope blockers: **1 — F01 registration-challenge email enumeration** на прежнем exact head; correction candidate устраняет раздельную challenge admission, но blocker остаётся открытым до проверок и coordinator PASS.
7. Существующий SET-02 deliberate closure contract не является F01 и не переоткрывается этой correction.
8. **Исполнитель correction — Ада / Business GPT-6.2** по прямому решению владельца заменить Лёву дальше по задаче.
9. Correction принадлежит AUTH-05 / #394. Product fix не смешивать с test-only AUTH-06 #395.
10. После изменения AUTH-05 зависимый AUTH-06 #395 должен быть синхронизирован с новым accepted base и заново пройти применимые author checks/CI/acceptance.
11. Поскольку Ада теперь участвует в implementation correction, она больше не подходит как independent final whole-feature reviewer; reviewer назначается отдельно после coordinator PASS.
12. AUTH-07, intermediate merge, external mail/Google/challenge provider activation и Stage-6 actions заблокированы.

## Следующий переход

Ада продолжает AUTH-05 F01 на candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`: немедленно выполнить содержательный bounded author self-check по полному применимому контракту, независимо от состояния и результатов CI/acceptance. Зафиксировать отдельный результат авторской проверки и findings, если есть. CI/connected acceptance — самостоятельные автоматизированные проверки exact head, не условие начала или завершения авторской проверки. Подтверждённые дефекты устранять отдельным corrective pass. Evidence в stages/AUTH-05/RESULT.md. Передать Мире и выполнить STOP только после положительной авторской проверки и всех применимых автоматизированных проверок на одном stable exact head. AUTH-06 самостоятельно не синхронизировать до PASS AUTH-05.
