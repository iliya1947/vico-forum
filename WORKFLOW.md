# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F2 stacked coordinator checkpoint PASS. STOP перед F3.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted exact `8227db6003f5a23a369e11b645194da229315f7a`, Mira PASS, Draft/unmerged.
- F2 Draft #380 / `feat/forum-structure-f2`: base F1 exact `8227db6003f5a23a369e11b645194da229315f7a`, reviewed exact head `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Draft/unmerged.

## F2 — MIRA COORDINATOR PASS

Мира независимо проверила весь bounded F2 diff против accepted F1 и S4/S5/S8 PLAN.

1. Scope остаётся F2:
   - только `db/forum-structure.ts`, `db/admin-history.ts` и F2 tests;
   - schema/migrations/F1 grants не менялись;
   - live routes/readers/UI, topic move и Owner projection отсутствуют.

2. Все семь ordinary structure commands реализованы:
   - category create/rename/reorder;
   - section create/rename/reorder/reparent;
   - server-generated create IDs, stable existing IDs;
   - Help/service identities и forged Help relations fail closed.

3. Concurrency/lock contract соответствует PLAN:
   - `forum_structure_state FOR UPDATE` — первый authoritative mutex/CAS;
   - нужные category/section rows берутся `FOR NO KEY UPDATE` в deterministic order;
   - active actor admission выполняется после container locks и до no-op/effect;
   - effect → global version SQL CAS/RETURNING → structural History последним;
   - no-op/stale/denied/rollback не двигают version и не создают History.

4. Ordering contract соблюдён:
   - append = `max(position)+1`, empty→0;
   - reorder ищет реального соседа SQL по полной sibling group, не по page/search slice;
   - swap меняет ровно две позиции;
   - source holes после reparent допустимы;
   - equal-position anomaly не выдаётся за successful reorder.

5. Atomic History соответствует F2:
   - один event на один logical effect;
   - bigint positions/versions — canonical decimal strings;
   - bounded name snapshots;
   - forced History failure откатывает domain + version для всех семи operations;
   - shared producer не читает topic source; future `topic.moved` label neutral, но самого topic-move command в F2 нет.

6. Authorization/admission:
   - точный `forum.structure.manage`;
   - request hint сам по себе authority не даёт — DB RBAC/overrides rechecked in-transaction;
   - active account + AP-10 `admin.forum` + Owner behavior проверены;
   - revoke/AP-10 before native admission deny effect.

7. Реальные PG concurrency tests подтверждают:
   - same-version writers сериализуются global mutex; loser stale;
   - deactivation-first и admission-first для effect/no-op;
   - parent `NO KEY UPDATE` совместим с create-topic FK `KEY SHARE`, обе очередности завершаются без deadlock.

8. Exact-head evidence независимо сверено:
   - CI `45235340129`: `checks` SUCCESS, `database` SUCCESS;
   - 3010 unit / 1743 PG17 по author evidence;
   - 4 applicable acceptance workflows на том же head SUCCESS;
   - #380 имеет 1 commit, 4 changed files, behind 0, открытых review threads/comments нет.

**Итог:** подтверждённых дефектов текущего F2 нет. F2 coordinator checkpoint **PASS**. Это разрешает только следующий stacked этап; #379/#380 не merge.

## Следующий gate

**STOP перед F3.** После следующего явного продолжения владельца активировать только **F3 — topic move, hidden admission и receipt reconciliation** поверх accepted F2 head `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.

F4 readers/private context, F5 UI/Owner projection и F6 final assembly пока не активированы.

## Reviewer route и границы

Лёва участвует в implementation Task 6; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel; никогда не merge.
- #379/#380 остаются Draft/unmerged.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.
