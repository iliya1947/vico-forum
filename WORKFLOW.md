# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F4 coordinator HOLD → Лёва correction.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 reviewed exact `86aadfe49dfe175b7f42baeaa6fa78883631ebeb`, base accepted F3 unchanged, Draft/unmerged.

## Mira F4 checkpoint — HOLD

Подтверждён один current-F4 blocker.

### F4-01 — обязательный structure singleton не везде обрабатывается как invariant

F4 reader contract требует canonical `structureVersion` и по PLAN unexpected invariant/programming failures не должны маскироваться под denial/not-found/success.

На exact head `86aadfe...`:
- `PostgresForumStructureReader.listDestinations` уже корректно обнаруживает отсутствующий `forum_structure_state(id=1)` и бросает `StructureInvariantError`;
- `readMoveContext` использует `CROSS JOIN forum_structure_state`; при отсутствии singleton запрос возвращает 0 rows и reader возвращает `undefined`, поэтому private route выдаёт ложный neutral 404 вместо invariant failure;
- `PostgresAdminForumReader` list/read projections используют scalar subquery version без invariant check и при существующем объекте могут вернуть `structureVersion: null` при declared `string`.

Это дефект F4 read/error contract, не будущий F5/F6 hardening.

## Исправление — Лёва

Correction реализована в #382, новый stable head `18627a8c53a6db681a7f4f278b88fcdd55f579c1` поверх reviewed `86aadfe...`. Локально:45 targeted PG (14 новых missing-singleton regressions),119 unit, TypeScript/lint PASS. Full CI/applicable acceptance на новом exact head запущены. Следующий шаг сейчас — Лёва проверяет results и затем STOP → Mira re-check; coordinator HOLD пока не заменяется PASS.

Исправить только F4-01 в #382:
- все F4 reads, обещающие `structureVersion`, должны fail как invariant при отсутствии обязательного singleton;
- move-context не должен превращать отсутствие singleton в target-not-found;
- добавить bounded regression coverage для move-context и Admin structureVersion projections;
- не расширять scope в F5.

После исправления: новый stable exact head → author self-check + применимые checks только если implementation head изменён → STOP → новый Mira F4 coordinator checkpoint.

## Границы

- F5 не активирован.
- #379/#380/#381/#382 не merge.
- final independent whole-feature reviewer остаётся Марк, если code-independent.
- #342 — единственный service channel; #300/Stage6/general UI/UX/deploy не активированы.
