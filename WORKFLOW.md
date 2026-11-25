# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; author checks/CI PASS; coordinator checkpoint Миры PASS.
4. Активный bounded-этап: **AUTH-02a — transaction/plugin/state/limits/constraints foundation**.
5. По прямому назначению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лиры снято до начала implementation.
6. AUTH-02a implementation PR **#389**, exact head `ab2f09fc916279455d78bc2ca8a78c27eca72128`, base accepted AUTH-01. CI 45583502311 и 18/18 applicable acceptance workflows PASS на прежнем коде. **HOLD** — A-01–A-04 correction и sequencing diagnostics до author PASS. Лёва разрешил storage technical-plan issue: отдельная `auth_lifecycle_budget` с явной expiry, native limiter неизменён; PLAN/stage PLAN исправлены. Решение/acceptance: stages/AUTH-02a/STORAGE-DECISION.md. Implementation ещё не изменена.
7. User-visible mandatory verification / signup/session contract на AUTH-02a не включается; это AUTH-02b.
8. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
9. Лёва участвовал в AUTH-01 implementation, Лена участвует в AUTH-02a implementation; оба не могут быть независимыми final reviewers всей собранной feature. Final reviewer определяется отдельно.

## Следующий переход

Лена продолжает назначенный AUTH-02a в #389 по `stages/AUTH-02a/PLAN.md` и `stages/AUTH-02a/STORAGE-DECISION.md`: перенос existing common budget в explicit-expiry store с forward schema/capability probes, A-02–A-04 bounded simplification и диагностика sequencing risk. Base остаётся `feat/auth-01-mail-foundation`. Storage blocker для начала исправления снят; прежний head не получает author/coordinator PASS. Не открывать verification/recovery UI/endpoints и не менять текущий signup/session behavior. Затем новый stable exact head, author self-check, применимые CI/acceptance и coordinator checkpoint Миры. AUTH-02b, merge и external activation не начинать; Лёва не дублирует реализацию Лены.
