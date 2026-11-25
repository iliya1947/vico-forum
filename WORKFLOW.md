# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; author checks/CI PASS; coordinator checkpoint Миры PASS.
4. Активный bounded-этап: **AUTH-02a — transaction/plugin/state/limits/constraints foundation**.
5. По прямому назначению владельца текущий исполнитель: **Лена / GPT-6.2**. Предыдущее назначение Лиры снято до начала implementation.
6. AUTH-02a implementation PR **#389**, exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, base accepted AUTH-01. **AUTHOR PASS / COORDINATOR CHECKPOINT PENDING**. A-01–A-04 исправлены, sequencing regression подтверждён native tests; CI 45600452416 checks/database SUCCESS (3299 unit / 1865 PG), schema/ACL/Worker smoke PASS, 18/18 applicable acceptance SUCCESS. Evidence и границы: stages/AUTH-02a/RESULT.md.
7. User-visible mandatory verification / signup/session contract на AUTH-02a не включается; это AUTH-02b.
8. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
9. Лёва участвовал в AUTH-01 implementation, Лена участвует в AUTH-02a implementation; оба не могут быть независимыми final reviewers всей собранной feature. Final reviewer определяется отдельно.
10. Прямое решение владельца: после coordinator PASS текущего AUTH-02a следующую stacked-ступень **AUTH-02b реализует Лёва / Codex-6.1 Sol**. Это будущий handoff, не активация AUTH-02b сейчас.

## Следующий переход

Мира проводит coordinator checkpoint AUTH-02a на exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653` PR #389 против принятого AUTH-01, stage PLAN/STORAGE-DECISION и final RESULT.md. При confirmed current-scope findings вернуть Лене; при PASS разрешить AUTH-02b Лёве по прямому назначению владельца. Лена закончила author implementation и останавливается. До coordinator PASS не начинать AUTH-02b; без промежуточного merge, independent final review или external activation.
