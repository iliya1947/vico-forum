# PLAN.md — актуальный полный маршрут задачи #342

## 1. Завершённые продуктовые этапы

1. Edit own topic title: implementation #343 + docs #344 merged.
2. Watch: implementation #345 + docs #349 merged.
3. Bookmarks: implementation #346 + docs #350 merged.
4. Mute/Block: implementation #351 + docs #353 merged.

Постоянные продуктовые контракты этих функций уже находятся в main; здесь не дублируются.

## 2. Завершённый consolidated corrective block

#354 merged в main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf` после Mira и Leva PASS одного final SHA. Четыре audit finding и TITLE-AUDIT-1-R1 CLOSED; evidence — `stages/corrections/REVIEW.md`. Без нового факта к этому gate не возвращаться.

## 3. Завершённая moderation visibility

B1–B9 собраны и проверены в #355 на exact `66b1bb7ec0f4a1f5bed17583398d5acc041da143`, Mira и Leva whole-feature PASS; VIS-FINAL-LEVA-01/02 CLOSED. Implementation merged как `9c6295593fb51a85cdb556c6fd928dc5d56de0f6`; отдельный docs #378 merged, current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. Task5 и docs debt закрыты; review evidence остаётся в `stages/moderation-visibility/REVIEW.md`.

## 4. Текущий этап — forum structure/topic move

Полный принятый S0–S10 восстановлен из истории и адаптирован Лёвой к current main: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md). Это канонический implementation-ready план Task6, а не компактный outline и не новый продуктовый redesign.

Сохранены S-P1–S-P4/S-T1/S-T2: create/rename ordinary categories/sections, sibling Up/Down, reparent, ordinary topic move; один structure mutex/global CAS + narrow location version; отдельные capabilities/AP-10; atomic History/Owner projection; current-location receipt replay и сохранение domain/personal/Editor state.

Post-visibility seam конкретизирован: hidden ordinary topic требует move+visibility rights по уже принятому S2.6, source-free protected context и canonical writer без расширения public-safe readers. Move×Hide/Restore ordering/denials и нейтральная topic.moved History описаны явно.

F1–F7 задают bounded этапы, зависимости и done criteria. Авторская проверка полноты завершена; implementation/prototype/tests/CI новой функции не начинались. **Следующая Мира:** scope/fit reconciliation → delivery-mode → отдельное назначение F1/исполнителя/reviewer. При участии Лёвы в коде его independent review выполняет другой не участвовавший reviewer.

## 5. Завершение

После задач 5–6 и отсутствия текущих debts #342 закрывает свою работу. Затем Мира может свериться с #300/#320 только в рамках owner route.
