# PLAN.md — актуальный полный маршрут задачи #342

## 1. Завершённые продуктовые этапы

1. Edit own topic title: implementation #343 + docs #344 merged.
2. Watch: implementation #345 + docs #349 merged.
3. Bookmarks: implementation #346 + docs #350 merged.
4. Mute/Block: implementation #351 + docs #353 merged.

Постоянные продуктовые контракты этих функций уже находятся в main; здесь не дублируются.

## 2. Текущий этап — consolidated audit corrections

Используется один Draft implementation PR #354. Подробный active-plan: `stages/corrections/PLAN.md`.

Порядок внутри пакета:
1. WATCH-AUDIT-1 — исправление уже находится в #354 и прошло промежуточный Watch-only review Миры на прежнем head.
2. BOOKMARKS-AUDIT-1 — устранить второй owner подтверждённого bookmark-state.
3. BOOKMARKS-AUDIT-2 — устранить stale removed-latch, который может скрыть row вопреки свежему loader list.
4. TITLE-AUDIT-1 — восстановить keyboard focus на opener после фактического DOM commit Save/Cancel.
5. После всех изменений Лира выполняет author self-check + применимые exact-head checks и STOP Мире.
6. Мира проводит новый whole-PR review **всего #354** на final stable exact head.
7. Только после Mira PASS Лёва один раз проводит independent whole-PR review того же head.
8. Merge выполняет владелец.

Промежуточный Mira PASS Watch-среза не является final PASS расширенного #354.

## 3. Следующий продуктовый этап — moderation visibility

Полный технический план V1–V9 был подготовлен Лёвой. Компактный перенос: `stages/moderation-visibility/PLAN.md`.

До implementation необходимо на актуальном main подтвердить/зафиксировать scope/fit по продуктовым fork V-P1/V-P2/V-P3 и техническим V-T1/V-T2, если в новом рабочем контексте нет явного принятого решения. Не перепроектировать остальное без нового конфликта.

После принятия:
1. отдельный implementation PR;
2. schema/catalog/History + authoritative commands/locks;
3. public/private projections, assets/translations/inbox/own-state boundaries;
4. protected UI/restore surface;
5. real PG + connected Worker/Better Auth/Chromium acceptance и применимый CI;
6. Mira whole-PR → Leva independent review → owner merge;
7. отдельный docs closeout только если фактическое состояние/SOT изменилось.

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
