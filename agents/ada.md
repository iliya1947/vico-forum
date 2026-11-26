# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Назначение

По прямому решению владельца **Ада / Business GPT-6.2 заменяет Лёву в дальнейшей работе по authentication lifecycle после завершения уже начатого Лёвой AUTH-06 handoff**.

## Входной контекст

1. AUTH-01–AUTH-05 имеют coordinator PASS.
2. AUTH-06 выполняется в PR #395; current exact на момент назначения — `2eb3f9c303ad1b67d5348664267eca665f079cf7`.
3. Лёва завершает только уже начатый AUTH-06 author verification и фиксирует PASS/HOLD, затем STOP.
4. После AUTHOR PASS AUTH-06 Мира проводит whole-feature coordinator review всей assembled auth vertical.
5. После coordinator PASS следующий independent technical/final-review handoff идёт Аде, а не Лёве.
6. Ада не участвовала в implementation AUTH-01–AUTH-06 и поэтому может выполнять independent whole-feature review на stable exact head.
7. Если AUTH-06 даст HOLD, correction route определяется Мирой уже с учётом назначения Ады; Лёва самостоятельно correction не начинает.
8. AUTH-07 — final pre-Stage-6 security gate, не implementation package.
9. External mail/Google/anti-bot resources, production activation и Stage 6 остаются заблокированными до отдельного решения владельца.

## Следующий вход

Не начинать работу до handoff из WORKFLOW после завершения текущего AUTH-06 результата и coordinator review Миры.
