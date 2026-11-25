# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; author checks/CI PASS; coordinator checkpoint Миры PASS.
4. Активный bounded-этап: **AUTH-02a — transaction/plugin/state/limits/constraints foundation**.
5. По прямому назначению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лиры снято до начала implementation.
6. AUTH-02a implementation PR **#389**, exact head `ab2f09fc916279455d78bc2ca8a78c27eca72128`, base accepted AUTH-01. CI 45583502311 and 18/18 applicable acceptance workflows PASS. **HOLD** — confirmed conflict between native rate-limit cleanup and custom long-window budgets; technical-plan clarification/correction required before author PASS. Evidence: stages/AUTH-02a/RESULT.md.
7. User-visible mandatory verification / signup/session contract на AUTH-02a не включается; это AUTH-02b.
8. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
9. Лёва участвовал в AUTH-01 implementation, Лена участвует в AUTH-02a implementation; оба не могут быть независимыми final reviewers всей собранной feature. Final reviewer определяется отдельно.

## Следующий переход

Лена реализует только `stages/AUTH-02a/PLAN.md`: transaction-aware lifecycle foundation, lifecycle state/constraints и shared abuse primitives без открытия verification/recovery UI/endpoints и без изменения текущего signup/session behavior. Implementation PR должен иметь base `feat/auth-01-mail-foundation`. До author PASS разрешить storage/cleanup design finding: вопрос технического плана для Лёвы зафиксирован в stages/AUTH-02a/RESULT.md. Лена остаётся исполнителем, AUTH-02b не начинать. После решения и необходимых исправлений — stable exact head, author self-check, применимые checks и coordinator checkpoint Миры.
