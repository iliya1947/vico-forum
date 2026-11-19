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

Один bounded visibility implementation PR охватывает темы и сообщения, public/private reads, assets, translations, own-state/inbox и atomic moderation. B1–B9 — внутренние проверяемые checkpoints; номера/границы/готовность описаны в stage plan, здесь не дублируются.

Следующий checkpoint — Мира проверяет полноту адаптации и передаёт Лире **только B1**. Нового product re-approval не требуется. Код ещё не начат. Whole-PR Mira→Leva review и owner merge только после полного вертикального среза; затем отдельный docs closeout.

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
