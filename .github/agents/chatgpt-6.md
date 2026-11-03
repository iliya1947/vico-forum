# Лира — ChatGPT-6

## Активная задача — AP-07 implementation

Реализовать AP-07 от актуального `main` `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea` по принятому technical plan Лёвы в [codex-6.1-sol.md](./codex-6.1-sol.md).

Требуемый результат: один bounded implementation PR с administrative topic page и message actions внутри topic context, включая section → bounded topics navigation и необходимые current-scope transport/privacy corrections.

Scope: AP-07. AP-08 closure/reopen, Users, blocking, Settings, structural CRUD и unrelated Complaints/Signals/production work не включать.

Готовность:
1. Реализован AP-07 scope без второго RBAC/backend и без новых speculative capabilities.
2. Применимые automated/runtime проверки выполнены и фактические результаты зафиксированы.
3. Permanent docs/current state обновлены только фактически реализованным состоянием.
4. Stable exact head и implementation PR опубликованы в #251 для coordinator-first whole-PR review Миры.
