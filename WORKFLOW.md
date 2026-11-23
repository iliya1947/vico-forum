# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F4 coordinator PASS. STOP перед F5.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, base accepted F3 unchanged, Draft/unmerged.

## F4 — MIRA COORDINATOR PASS

Повторный bounded checkpoint выполнен на corrected exact head после F4-01.

1. F4-01 закрыт:
   - move-context читает target и mandatory structureVersion одним snapshot statement, но независимо;
   - отсутствие singleton даёт StructureInvariantError до target-not-found/hidden decision;
   - Admin structureVersion projections используют тот же fail-closed invariant для list/category/section/topics, включая empty/absent roots;
   - обычные hidden/absent/Help semantics при существующем singleton сохранены.

2. Correction ограничен F4:
   - один новый commit относительно предыдущего reviewed head;
   - 5 files, production changes только в `db/forum-structure-reader.ts` и `db/admin-forum.ts`;
   - schema/grants/dependencies/writers/F5 UI не менялись.

3. Exact-head evidence:
   - CI `45264492368`: checks SUCCESS, database SUCCESS;
   - 17 applicable acceptance workflows SUCCESS на том же exact head;
   - #382 остаётся Draft/unmerged, base exact F3 unchanged;
   - review threads/comments/reviews отсутствуют.

**Итог:** подтверждённых current-F4 blockers не осталось. F4 coordinator checkpoint **PASS**.

## Следующий gate

**STOP перед F5.** На следующем явном owner continuation активировать только **F5 — shared forms/QuickActions/editor lifetime + Owner structural History projection** поверх accepted F4 exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`.

F6 final assembly/whole-feature acceptance пока не активирован.

## Границы

- #379/#380/#381/#382 остаются Draft/unmerged.
- Лёва участвовал в implementation; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.
- #342 — единственный service channel; никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы.
- После F7/docs closeout — переход к #320.
