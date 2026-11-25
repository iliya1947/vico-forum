# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Текущее назначение

По прямому решению владельца реализовать **AUTH-02a — transaction/plugin/state/limits/constraints foundation** по `PLAN.md` и `stages/AUTH-02a/PLAN.md`.

## Основание stack

1. AUTH-01 принят на PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.
2. Новый implementation PR создаётся с base `feat/auth-01-mail-foundation`, не от main.
3. Показывать только bounded diff AUTH-02a.

## Критические границы

1. Не включать mandatory verification и не менять текущий signup/session UX.
2. Не реализовывать AUTH-02b/03/04 user flows.
3. Не выбирать anti-bot provider.
4. Не выполнять real provider calls/external activation.
5. Не расширять future observability enums без фактического producer текущей ступени.
6. Если Better Auth 1.7.7 public extension seam недостаточен и нужен private import/dependency upgrade либо существенное изменение полного плана — остановиться и вернуть finding Мире/Лёве, а не строить обход.
7. Сохранить принятые AUTH-01 boundaries и не менять нижнюю ступень без необходимости; если изменение AUTH-01 всё же потребуется, зафиксировать это до продолжения stack.

## Следующая ступень

По прямому решению владельца после PASS AUTH-02a следующий пакет AUTH-02b реализует Лёва. Это не меняет текущее назначение Лены: завершить AUTH-02a и остановиться на coordinator checkpoint Миры; AUTH-02b не начинать.

## Завершение

После implementation выполнить author self-check и применимые checks, зафиксировать PR/stable exact head/evidence в #320 и остановиться для coordinator checkpoint Миры. AUTH-02b самостоятельно не начинать.

Поскольку Лена участвует в implementation, независимую final whole-feature review этой сборки она не выполняет.

## Текущее состояние AUTH-02a

Author PASS on #389 exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, accepted #388 base unchanged. A-01–A-04 correction complete, native sequencing regression and schema/ACL verified; CI 45600452416 and 18/18 acceptance SUCCESS. Final evidence and coordinator handoff in stages/AUTH-02a/RESULT.md. Stop for Мира checkpoint; return only if confirmed corrections assigned. AUTH-02b assigned to Лёва after coordinator PASS. No merge/external activation or independent review of own work.
