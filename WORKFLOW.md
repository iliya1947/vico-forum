# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: delivery mode stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394: прежний coordinator PASS на `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` **superseded whole-feature finding F01**. Correction candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` опубликован; CI #45882443114 и connected acceptance запущены. Содержательная авторская проверка завершена: **AUTHOR HOLD** из-за нового несоответствия F02 в privacy/Owner History, не из-за CI. F01 исправлен по source-level evidence. Результаты автоматизированных проверок учитываются отдельно.
5. AUTH-06 / PR #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: AUTHOR PASS и exact-head CI/20 acceptance PASS сохранены как evidence, но whole-feature coordinator review — **HOLD** из-за defect нижней AUTH-05 ступени. Review: `stages/AUTH-06/REVIEW.md`.
6. F01 registration-challenge email enumeration устранён по содержательной проверке candidate; runtime evidence и coordinator checkpoint ещё не приняты. Новый finding **F02 — полный canonical network IP для registration-challenge попадает в Owner History**, несмотря на запрет raw IP в AUTH-05 PLAN §3.2. Факт передачи IP установлен по source-level цепочке. Permanent SUPER_ADMIN.md разрешает qualified canonical IP в exact-Owner-only telemetry/History; границу между этим правилом и AUTH-05 privacy clause следует разрешить до PASS. Это не установленная публичная утечка.
7. Существующий SET-02 deliberate closure contract не является F01 и не переоткрывается этой correction.
8. **Исполнитель correction — Ада / Business GPT-6.2** по прямому решению владельца заменить Лёву дальше по задаче.
9. Correction принадлежит AUTH-05 / #394. Product fix не смешивать с test-only AUTH-06 #395.
10. После изменения AUTH-05 зависимый AUTH-06 #395 должен быть синхронизирован с новым accepted base и заново пройти применимые author checks/CI/acceptance.
11. Поскольку Ада теперь участвует в implementation correction, она больше не подходит как independent final whole-feature reviewer; reviewer назначается отдельно после coordinator PASS.
12. AUTH-07, intermediate merge, external mail/Google/challenge provider activation и Stage-6 actions заблокированы.

## Следующий переход

Содержательный review candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` завершён HOLD; evidence в stages/AUTH-05/RESULT.md. Требуется разрешить F02: относится ли запрет raw IP к полному нормализованному адресу в exact-Owner-only History для нового registration-challenge, либо только к непроверенному ingress header. Ада не меняет утверждённый permanent SA02 contract и не расширяет назначение только F01 без разрешения. После разрешения — при необходимости отдельный bounded corrective pass, повторная самостоятельная авторская проверка. CI/connected acceptance учитываются отдельно, не определяют результат author self-check. Coordinator checkpoint Миры только после положительных отдельных результатов на одном stable head; AUTH-06 до PASS AUTH-05 не синхронизировать.
