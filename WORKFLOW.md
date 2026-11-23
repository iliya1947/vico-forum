# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F3 stacked coordinator checkpoint PASS. STOP перед F4.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted exact `8227db6003f5a23a369e11b645194da229315f7a`, Mira PASS, Draft/unmerged.
- F2 Draft #380 / `feat/forum-structure-f2`: accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Mira PASS, Draft/unmerged.
- F3 Draft #381 / `feat/forum-structure-f3`: base accepted F2 exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, reviewed exact head `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`, Draft/unmerged.

## F3 — MIRA COORDINATOR PASS

Мира независимо проверила bounded F3 diff против accepted F1/F2 и S2.1/S4/S4.1/S6/S8 PLAN.

1. Scope остаётся F3:
   - production changes ограничены новым `db/topic-move.ts`, минимальным receipt reconciliation в `db/forum-repository.ts` и export существующего raw effective-permission helper;
   - schema/grants/migrations не менялись;
   - public/private readers, routes, picker, live UI и Owner projection не подключались.

2. Authoritative topic move:
   - structure singleton `FOR UPDATE` берётся первым и не инкрементируется;
   - actual topic берётся `FOR NO KEY UPDATE`;
   - hidden applicability проверяется под actual topic lock до CAS/location/destination result;
   - ordinary category/section identities валидируются и locked `FOR NO KEY UPDATE` в deterministic order;
   - actor active/AP-10/current raw permission recheck выполняется до no-op/effect;
   - actual effect меняет только `section_id` + `location_version`;
   - History append идёт последним в той же transaction.

3. Hidden boundary:
   - move-only hidden и absent дают neutral not-found;
   - visibility-only/generic structure/history/author без move не получают target read;
   - dual capability и exact Owner могут переносить hidden ordinary topic без Restore;
   - topic/post visibility flags, revisions и individually hidden posts не переписываются.

4. CAS/state:
   - expected global structure/source section/location version проверяются;
   - A→B→A/desired-location stale не превращаются в no-op;
   - current no-op проходит admission и не создаёт event/version change;
   - location bigint сохраняется строкой и overflow fail-closed;
   - global structure version topic move не меняет, включая max bigint.

5. Atomic History/privacy:
   - `topic.moved` использует neutral `topic:<id>` label;
   - context содержит только bounded structural before/after + location versions;
   - title/body/author/revision/visibility reason не читаются и не попадают в event;
   - forced History failure откатывает location/version.

6. Receipt reconciliation:
   - matching create-topic receipt по-прежнему использует original fingerprint/input;
   - после actor admission выполняется plain persisted-topic SELECT без topic/structure lock;
   - replay возвращает persisted current `sectionId`, не двигает тему назад и не создаёт вторую publication/History/attachments/notices;
   - concurrency receipt×move в обеих actor-lock очередностях не создаёт lock inversion.

7. Реальные PG race tests покрывают обе очередности move×Hide/Restore, post visibility, reply, Watch, closure, title/post edit, translation planning/accepted publication, section reparent и actor deactivation. Shared gate ждёт реально acquired row lock и подтверждает blocker через PostgreSQL.

8. Preservation matrix покрывает closed/solved/pinned/inactive-author, revisions/translations, Watch/Bookmarks/Mute/Block/read/inbox, published/draft/evidence attachments и Complaint evidence; hidden public/Admin/assets остаются закрытыми.

9. Exact-head evidence независимо сверено:
   - CI run `45252637056`: `checks` SUCCESS и `database` SUCCESS;
   - 10 applicable acceptance workflows на том же exact head SUCCESS;
   - #381 остаётся Draft, base F2 unchanged, behind 0;
   - открытых review threads/comments/reviews нет.

**Итог:** подтверждённых дефектов текущего F3 нет. F3 coordinator checkpoint **PASS**. Это разрешает только следующий stacked этап; #379/#380/#381 не merge.

## Следующий gate

**STOP перед F4.** После следующего явного продолжения владельца активировать только **F4 — coherent readers/order/private move context/picker/routes/Hyperdrive wiring** поверх accepted F3 head `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.

F5 live forms/QuickActions/UI/Owner projection и F6 final assembly пока не активированы.

## Reviewer route и границы

Лёва участвует в implementation Task 6; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel; никогда не merge.
- #379/#380/#381 остаются Draft/unmerged.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.
