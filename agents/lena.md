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

## Завершение

После implementation выполнить author self-check и применимые checks, зафиксировать PR/stable exact head/evidence в #320 и остановиться для coordinator checkpoint Миры. AUTH-02b самостоятельно не начинать.

Поскольку Лена участвует в implementation, независимую final whole-feature review этой сборки она не выполняет.

## Текущее продолжение AUTH-02a

Implementation PR #389, head `0d803d705c8ee7b85c0ab22f8ea694a1e0269c33`, accepted #388 base unchanged. A-01 storage plan resolved by Лёва and implemented with 0074, separate explicit-expiry table, web-only CRUD and native regression coverage; not runtime-verified. Next A-02–A-04 transaction/guard simplification and native sequencing diagnostic, then coherent correction author self-check and applicable CI/acceptance. Details in stages/AUTH-02a/RESULT.md and STORAGE-DECISION.md. No PASS yet; old green CI belongs to pre-correction head. AUTH-02b not started.
