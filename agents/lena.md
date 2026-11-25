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

Implementation PR #389, exact head `ab2f09fc916279455d78bc2ca8a78c27eca72128`, base #388 accepted head unchanged. Все foundation components написаны; подробности и проверки в stages/AUTH-02a/RESULT.md. CI 45583502311 and all 18 applicable acceptance workflows PASS. HOLD on confirmed shared-storage expiry/cleanup design conflict; technical-plan question for Лёва is in stages/AUTH-02a/RESULT.md. Resume bounded implementation after resolution; then author checks and coordinator checkpoint Миры. Не начинать AUTH-02b. Не считать код протестированным до фактических результатов.
