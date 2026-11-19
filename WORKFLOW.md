# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated audit corrections в Draft implementation PR #354.

## Текущее состояние

- Current main после merge #352: `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`.
- #354 base: `a645fbe21110e77429025c428e498194b9a92ca2`; main ушёл вперёд только общепроектной docs-правкой #352.
- #354 current exact head: `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`.
- PR #354 Draft/open.
- В consolidated PR изменены ровно 9 файлов: Watch control+tests, Bookmark control+tests, Bookmarks list+tests, Title editor+tests и отдельный Title Chromium test.
- WATCH-AUDIT-1 уже исправлен.
- BOOKMARKS-AUDIT-1 исправлен; авторский bounded PASS подтверждён на текущем head. Loader определяет состояние кнопки; matching ACK изменяет только transient result. Оба stale-ACK направления и обычный success покрыты.
- BOOKMARKS-AUDIT-2 **bounded PASS**: удалён локальный `removed` latch; fresh list loader управляет наличием строки, есть Remove→re-add→fresh-loader→old-ACK regression.
- TITLE-AUDIT-1 **bounded PASS**: Save/Cancel восстанавливают focus на видимую Edit-title кнопку после React DOM commit. Два новых component tests и real Chromium assertions для ordinary/Help, без изменения mutation/CAS/conflict/rebase.
- Exact-head `01cecb9...`: **7/7 GitHub Actions workflows SUCCESS**. CI `44614815069`: checks **2751/2751** unit/route tests в 218 файлах (Title editor 5/5), database **1476/1476** PostgreSQL17 tests в 109 файлах; dedicated Title Chromium `44614815034` **9/9** connected markers (Save/Cancel focus). Все четыре bounded corrections PASS; **общая финальная авторская self-check и independent review PR #354 ещё не выполнены**.

## Назначение

- Исполнитель: Лира / ChatGPT-6.
- Coordinator reviewer после полного implementation: Мира / ChatGPT-5.6 Sol.
- Independent reviewer после Mira PASS: Лёва / Codex-6.1 Sol.
- Марк не назначен.
- Merge: только владелец.

## Следующий шаг

Лира продолжает **в том же #354**, не открывая новый corrective PR:

1. **Следующая отдельная `...`: финальная авторская self-check всего consolidated PR #354** — проверить весь 4-finding scope, file diff и существующее exact-head evidence, зафиксировать стабильную передачу Мире, затем STOP;
2. Мира проводит новый coordinator whole-PR review всего #354 на том же head; после PASS — Лёва independent whole-PR review; merge только владелец.

Лёву до свежего whole-PR PASS Миры не подключать.

## После #354

Следующий продуктовый этап #342 — moderation visibility. Structure/topic move идёт после него. #300/Stage6/general UI/UX не активны.
