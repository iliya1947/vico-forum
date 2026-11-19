# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated audit corrections в Draft implementation PR #354.

## Текущее состояние

- Current main после merge #352: `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`.
- #354 base: `a645fbe21110e77429025c428e498194b9a92ca2`; main ушёл вперёд только общепроектной docs-правкой #352.
- #354 current exact head: `79066adade6a01a1b723d9d2127632182307ed3c`.
- PR #354 Draft/open.
- На этом head изменены 4 файла: Watch control+tests и Bookmark control+tests.
- WATCH-AUDIT-1 уже исправлен.
- BOOKMARKS-AUDIT-1 implementation уже присутствует в текущем diff, но author checkpoint/final acceptance этого расширенного head ещё не зафиксирован.
- BOOKMARKS-AUDIT-2 и TITLE-AUDIT-1 на текущем head ещё не реализованы.
- Exact-head GitHub workflows на `79066ada...`: 7/7 completed SUCCESS, включая общий CI, Topic Watch, Topic Bookmarks, Own topic title и regression connected jobs. Это подтверждает текущий Watch+Bookmark-control slice, но не является final gate всего #354, потому что BOOKMARKS-AUDIT-2 и TITLE-AUDIT-1 ещё не реализованы.

## Назначение

- Исполнитель: Лира / ChatGPT-6.
- Coordinator reviewer после полного implementation: Мира / ChatGPT-5.6 Sol.
- Independent reviewer после Mira PASS: Лёва / Codex-6.1 Sol.
- Марк не назначен.
- Merge: только владелец.

## Следующий шаг

Лира продолжает **в том же #354**, не открывая новый corrective PR:

1. закончить BOOKMARKS-AUDIT-1 и его regression/evidence;
2. исправить BOOKMARKS-AUDIT-2;
3. исправить TITLE-AUDIT-1;
4. выполнить self-check и применимые exact-head checks всего consolidated PR;
5. STOP Мире.

Лёву до свежего whole-PR PASS Миры не подключать.

## После #354

Следующий продуктовый этап #342 — moderation visibility. Structure/topic move идёт после него. #300/Stage6/general UI/UX не активны.
