# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; author checks/CI PASS; coordinator checkpoint Миры PASS.
4. Активный bounded-этап: **AUTH-02a — transaction/plugin/state/limits/constraints foundation**.
5. По прямому назначению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лиры снято до начала implementation.
6. AUTH-02a implementation PR ещё не создан. Он должен иметь base `feat/auth-01-mail-foundation` и показывать только bounded diff поверх AUTH-01.
7. User-visible mandatory verification / signup/session contract на AUTH-02a не включается; это AUTH-02b.
8. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
9. Лёва участвовал в AUTH-01 implementation, Лена участвует в AUTH-02a implementation; оба не могут быть независимыми final reviewers всей собранной feature. Final reviewer определяется отдельно.

## Следующий переход

Лена реализует только `stages/AUTH-02a/PLAN.md`: transaction-aware lifecycle foundation, lifecycle state/constraints и shared abuse primitives без открытия verification/recovery UI/endpoints и без изменения текущего signup/session behavior. Implementation PR должен иметь base `feat/auth-01-mail-foundation`. После stable exact head, author self-check и применимых checks записать evidence в #320 и остановиться для coordinator checkpoint Миры.
