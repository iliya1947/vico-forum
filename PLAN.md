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

B1–B9 собраны в #355 exact `66b1bb7ec0f4a1f5bed17583398d5acc041da143`. После correction fresh Mira whole-feature PASS и Leva independent whole-feature PASS относятся к одному head. VIS-FINAL-LEVA-01/02 CLOSED; полный итог — `stages/moderation-visibility/REVIEW.md`, текущий маршрут — WORKFLOW.md. Следующее действие — owner merge после снятия Draft, затем отдельное назначение docs closeout. Implementation пока не merged.

## 4. Текущий продуктовый этап — forum structure/topic move

Принятый S0–S10 scope сохранён в `stages/forum-structure/PLAN.md`. После merge moderation visibility и docs Mira сверила его с current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

Полного перепроектирования не требуется. Подтверждены как всё ещё необходимые: ordering/version foundation, новые permissions и AP-10/Admin admission, authoritative structural writers + History, current-location publication receipt replay, Owner `forum.structure` projection и connected PG/browser acceptance.

Один post-visibility seam требует явного уточнения Лёвой до implementation: ordinary Admin/public topic reader не раскрывает hidden topic source, поэтому move скрытой ordinary topic (если она остаётся movable по принятому scope) должен проходить через защищённую boundary без расширения public-safe reader и с сохранением hidden state.

Следующий gate: Лёва делает узкую current-main reconciliation принятого плана и возвращает implementation-ready stages/done criteria; затем Мира определяет delivery mode и исполнителя с учётом нового owner decision, разрешающего использовать Лёву для реализации последующих задач.

## 5. Завершение

После задач 5–6 и отсутствия текущих debts #342 закрывает свою работу. Затем Мира может свериться с #300/#320 только в рамках owner route.
