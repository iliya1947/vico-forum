# agents/lira.md — личная рабочая память Лиры по authentication lifecycle

## Текущее назначение

Реализовать **AUTH-02a — transaction/plugin/state/limits/constraints foundation** по `PLAN.md` и `stages/AUTH-02a/PLAN.md`.

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
6. Если Better Auth 1.7.7 public extension seam оказывается недостаточным и нужен private import/dependency upgrade либо существенное изменение полного плана — остановиться и вернуть finding Мире/Лёве, а не наращивать обходы.

## Завершение

После implementation выполнить author self-check и применимые checks, зафиксировать PR/stable head/evidence в #320 и остановиться. AUTH-02b самостоятельно не начинать.
