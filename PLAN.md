# PLAN.md — актуальный полный маршрут задачи #342

## 1. Завершённые продуктовые этапы

1. Edit own topic title: implementation #343 + docs #344 merged.
2. Watch: implementation #345 + docs #349 merged.
3. Bookmarks: implementation #346 + docs #350 merged.
4. Mute/Block: implementation #351 + docs #353 merged.

Постоянные продуктовые контракты этих функций уже находятся в main; здесь не дублируются.

## 2. Завершённый consolidated corrective block

#354 merged в main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf` после Mira и Leva PASS одного final SHA. Четыре audit finding и TITLE-AUDIT-1-R1 CLOSED; evidence — `stages/corrections/REVIEW.md`. Без нового факта к этому gate не возвращаться.

## 3. Текущий этап — moderation visibility

V-P1/V-P2/V-P3 **ACCEPTED**, V-T1/V-T2 technical fit **PASS**. Полный план V1–V9 восстановлен из Git и адаптирован к main6fa2a43: `stages/moderation-visibility/PLAN.md`.

Moderation visibility реализуется stacked-лестницей B1→B9. B1 открывается от `main`, каждый следующий bounded PR — от head-ветки предыдущего. Промежуточные PR не merge в `main`. После B9 итоговый head всей лестницы переносится в ветку B1; B2–B9 закрываются как superseded. Собранный B1 становится единым feature PR и проходит final author self-check → Mira whole-feature review → Leva independent review того же exact head → owner merge; затем отдельный docs closeout.

B1–B9 собраны в #355 exact `fdad1930fc68a854d52bee31922f923be5c1c751`. После Mira whole-feature PASS независимый review Лёвы — **HOLD, VIS-FINAL-LEVA-01/02 [P2]**. Полный результат и критерии correction: `stages/moderation-visibility/REVIEW.md`; текущий handoff — WORKFLOW.md. Следующая Мира для reconciliation/correction route. Нового product re-approval не требуется; implementation ещё не merged.

## 4. Последний продуктовый этап — forum structure/topic move

План S0–S10 принят Мирой; компактный перенос: `stages/forum-structure/PLAN.md`.

Перед implementation только сверить план с фактическим main после corrections и visibility. Если нет нового конфликта, повторное проектирование не требуется.

Маршрут:
1. отдельный implementation PR;
2. schema/catalog/ACL/order/version foundation;
3. atomic structural commands + History;
4. public/admin hierarchy readers, ordering/picker;
5. shared UI/canonical actions + receipt/editor integrations;
6. real PG/browser acceptance и применимые checks;
7. Mira whole-PR → Leva independent review → owner merge;
8. отдельный docs closeout при необходимости.

## 5. Завершение

После задач 5–6 и отсутствия текущих debts #342 закрывает свою работу. Затем Мира может свериться с #300/#320 только в рамках owner route.
