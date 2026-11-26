# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: delivery mode stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394: прежний coordinator PASS на `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` **superseded whole-feature finding F01**. Correction candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` опубликован; Содержательная авторская проверка **AUTHOR PASS**. Отдельные автоматизированные результаты на том же exact head: CI #45882443114 PASS, все 20 применимых connected acceptance PASS. F01 correction готова к повторному coordinator checkpoint.
5. AUTH-06 / PR #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: AUTHOR PASS и exact-head CI/20 acceptance PASS сохранены как evidence, но whole-feature coordinator review — **HOLD** из-за defect нижней AUTH-05 ступени. Review: `stages/AUTH-06/REVIEW.md`.
6. F01 registration-challenge email enumeration исправлен; подтверждённых блокирующих дефектов в bounded AUTH-05 author review не осталось. Прежний F02 отозван: действующий SUPER_ADMIN.md прямо допускает canonical ingress IP с source quality в Owner-only telemetry/History; локальная неоднозначная формулировка не изменяет этот контракт. Реализация Owner History не менялась.
7. Существующий SET-02 deliberate closure contract не является F01 и не переоткрывается этой correction.
8. **Исполнитель correction — Ада / Business GPT-6.2** по прямому решению владельца заменить Лёву дальше по задаче.
9. Correction принадлежит AUTH-05 / #394. Product fix не смешивать с test-only AUTH-06 #395.
10. После изменения AUTH-05 зависимый AUTH-06 #395 должен быть синхронизирован с новым accepted base и заново пройти применимые author checks/CI/acceptance.
11. Поскольку Ада теперь участвует в implementation correction, она больше не подходит как independent final whole-feature reviewer; reviewer назначается отдельно после coordinator PASS.
12. AUTH-07, intermediate merge, external mail/Google/challenge provider activation и Stage-6 actions заблокированы.

## Следующий переход

**Ада — AUTHOR STOP. Мира — повторный coordinator checkpoint AUTH-05 #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`.** Проверить bounded correction и взаимодействие с accepted AUTH-04 base, включая F01, SET-02, SA-02 и отдельные automated evidence. Вход: stages/AUTH-05/RESULT.md (актуальный author result и exact-head evidence). При coordinator PASS назначить sync/reverification AUTH-06 #395 на новый accepted base. Ада сама #395 не синхронизирует; AUTH-07, merge и external activation заблокированы.
