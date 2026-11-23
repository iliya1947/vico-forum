# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F1 stacked coordinator checkpoint PASS. STOP перед F2.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa` — не изменился.
- Канонический план: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft: [#379](https://github.com/iliya1947/vico-forum/pull/379), branch `feat/forum-structure-f1`.
- Проверенный exact head: `8227db6003f5a23a369e11b645194da229315f7a`, base `main` exact `a3dae581...`, behind 0, Draft, не merge отдельно.

## F1 — MIRA COORDINATOR PASS

Мира независимо проверила весь bounded F1 diff против S8 PLAN и current main.

1. Migration/schema foundation соответствует F1:
   - `0072_forum_structure_foundation`;
   - category/section `sort_position bigint`;
   - singleton `forum_structure_state(version bigint)`;
   - topic `location_version bigint`;
   - nonnegative checks, ordered indexes с `C` collation;
   - upgrade backfill сохраняет прежний ordinary `created_at,id` порядок, Help остаётся reserved;
   - accepted migrations до 0071 не изменены.

2. Permission/admission foundation соответствует принятому S-P3:
   - `forum.structure.manage` initial admin;
   - `forum.topic.move` initial moderator/admin;
   - оба входят в Forum admission, AP-10 `admin.forum` и raw authority;
   - custom roles не получают grants автоматически;
   - Owner получает ключи только через общий catalog-wide projection.

3. History foundation ограничен F1:
   - восемь structural action kinds и category/section/topic target CHECK;
   - typed context с bigint strings;
   - producers/Owner projection остаются будущими F2/F5;
   - новых structural events/user writes F1 не создаёт.

4. Runtime ACL минимален по PLAN:
   - categories/sections: SELECT+INSERT+UPDATE;
   - structure singleton: SELECT+UPDATE;
   - singleton INSERT, structural DELETE и DDL запрещены;
   - реальные insert/update/row-lock probes выполняются rollback-only.

5. Setup writers остаются trusted fixture helpers:
   - получают корректный append order metadata под singleton row lock;
   - не меняют structure version и не пишут History;
   - их возвращаемые DTO остаются JSON-safe;
   - F2 production commands не появились раньше времени.

6. Проверен риск новых bigint-полей: существующие unprojected category/section reads не сериализуют bigint наружу; topic writers/DTO используют явные projections/ручные DTO. Current HTTP/SSR JSON boundary не сломан.

7. Проверена «сверка генератора»:
   - semantic diff `0071_snapshot → 0072_snapshot` существует только для `admin_history`, `authz_permissions`, `forum_categories`, `forum_sections`, `forum_topics` и нового `forum_structure_state`;
   - semantic diff production manifest — те же F1 boundaries;
   - изменения Drizzle declarations старых defaults/index expressions/FK name являются metadata-parity нормализацией и не изменяют accepted DDL.

8. Test fixture corrections не скрывают production regression:
   - current-writer integration fixtures переведены на полный current migration chain;
   - настоящий historical `0054→0055` upgrade fixture наоборот использует SQL своей эпохи, а не current writer;
   - второй commit `8227db6...` меняет только test files.

9. Exact-head evidence независимо сверено:
   - CI run `45205128204`: `checks` SUCCESS и `database` SUCCESS;
   - применимые connected/browser workflows на том же head SUCCESS;
   - открытых review threads/comments в #379 нет.

**Итог:** подтверждённых дефектов F1 текущей задачи нет. F1 coordinator checkpoint **PASS**. Это разрешает только следующую stacked ступень; #379 не merge и whole-feature review ещё не выполняется.

## Следующий gate

**STOP перед F2.** После следующего явного продолжения владельца назначить bounded **F2 — authoritative structure commands + atomic History** на base/head F1 #379. F2 должен быть отдельным stacked Draft PR и не включать F3 topic move, F4 readers или F5 UI.

Поскольку Лёва уже участвовал в implementation F1, final independent whole-feature Codex reviewer остаётся **Марк**, если он не участвует в коде Task 6.

## Границы

- #342 — единственный service channel и никогда не merge.
- F1 #379 остаётся Draft/unmerged.
- F2+ сейчас не активированы.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.
