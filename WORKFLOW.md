# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated audit corrections в Draft implementation PR #354.

## Текущее состояние

- Current main после merge #352: `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`.
- #354 base: `a645fbe21110e77429025c428e498194b9a92ca2`; main ушёл вперёд только общепроектной docs-правкой #352.
- #354 current exact head: `6dd9c66c2d22158f41e76089436399082b6553c5`.
- PR #354 Draft/open.
- На этом head изменены 6 файлов: Watch control+tests, Bookmark control+tests и Bookmarks list+tests.
- WATCH-AUDIT-1 уже исправлен.
- BOOKMARKS-AUDIT-1 исправлен; авторский bounded PASS подтверждён на текущем head. Loader определяет состояние кнопки; matching ACK изменяет только transient result. Оба stale-ACK направления и обычный success покрыты.
- BOOKMARKS-AUDIT-2 **bounded PASS**: удалён локальный `removed` latch. Наличие строки определяет fresh loader; тест Remove COMMIT → Add COMMIT → new loader → delayed Remove ACK → extra revalidation сохраняет повторно добавленную строку; обычное удаление проверяется настоящим loader snapshot. TITLE-AUDIT-1 ещё не реализован.
- Exact-head `6dd9c66...`: 7/7 GitHub workflows SUCCESS; CI `44612960668`: checks 2749/2749 unit/route tests в 218 файлах (Bookmarks list 7/7), database 1476/1476 PG17 в 109 файлах; dedicated Bookmarks Chromium `44612960463` 11/11 connected markers. Это bounded PASS, **не** final gate всего #354.

## Назначение

- Исполнитель: Лира / ChatGPT-6.
- Coordinator reviewer после полного implementation: Мира / ChatGPT-5.6 Sol.
- Independent reviewer после Mira PASS: Лёва / Codex-6.1 Sol.
- Марк не назначен.
- Merge: только владелец.

## Следующий шаг

Лира продолжает **в том же #354**, не открывая новый corrective PR:

1. **Следующий bounded-шаг: TITLE-AUDIT-1 [P3]** — восстановить focus на Edit-title opener после Save/Cancel и фактического DOM commit; regression/checkpoint + STOP;
2. после этого выполнить self-check и применимые exact-head checks всего consolidated PR;
3. STOP Мире на fresh whole-PR review.

Лёву до свежего whole-PR PASS Миры не подключать.

## После #354

Следующий продуктовый этап #342 — moderation visibility. Structure/topic move идёт после него. #300/Stage6/general UI/UX не активны.
