# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility stacked delivery:

- B1 Draft #355 — **Mira bounded PASS**, exact `704d5a46d59841538524424296ac28eaa39aa5e6`.
- B2 Draft #357 — **Mira bounded PASS**, exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.
- B1/B2 remain Draft/unmerged.
- **B3 is ACTIVE.** Lira creates the next stacked implementation PR with base = `feature/moderation-visibility-b2-commands` and implements only B3 core public projection/discovery.

B2 checkpoint covered the local B1→B2 diff: desired-state topic/post CAS/reason/no-op; fresh active actor + AP-10 + direct RBAC before no-op; append-last atomic neutral History; writer/parent/receipt/recovery visibility gates; real PostgreSQL stale/no-op/overflow/two-moderator/deactivation/History-failure and lock-order/race coverage. Final exact-head CI and all associated workflows SUCCESS. No confirmed current-B2 blocker remains.

## Baseline

- Current main: `f15b90826f8241d337b1cf6068d879b1a7310f56`.
- #354 corrective package merged and closed.
- V-P1/V-P2/V-P3 — ранее приняты и не переоткрываются.
- V-T1/V-T2 — technical fit PASS на current main.
- Лёва завершил адаптацию V1–V9 к current main и разложил delivery на B1–B9.

## Owner process decision — stacked bounded PR delivery

Владелец утвердил новый рабочий паттерн, который применяется здесь и берётся на вооружение для последующих подходящих задач:

1. B1 открывается от `main`.
2. B2 открывается с base = head-ветка B1; B3 — с base = head-ветка B2; далее лестницей до последнего bounded-этапа.
3. Каждый PR остаётся отдельным bounded implementation PR и показывает свой локальный diff относительно предыдущей ступени.
4. Промежуточные ступени не merge в `main`.
5. После завершения последней ступени итоговый head всей лестницы переносится/fast-forward'ится в ветку первого PR, чтобы первый PR против `main` содержал весь законченный вертикальный срез.
6. Промежуточные B2…Bn закрываются как superseded, а не merge.
7. Собранный первый PR проходит final stable exact-head author self-check → Mira whole-feature review → Leva independent whole-feature review того же head → owner merge в `main`.
8. Если нижняя ступень требует изменения до финальной сборки, зависимые верхние ступени должны быть синхронизированы с изменившимся основанием до продолжения.
9. Этот owner decision имеет приоритет над текущей формулировкой `AGENTS.md`. После текущей задачи требуется отдельное process изменение `AGENTS.md`, чтобы закрепить stacked bounded PR delivery как общий штатный маршрут там, где bounded-этапы составляют одну неделимую вертикальную feature.

## Moderation visibility delivery — B1 PASS; B2.1/B2.2/B2.3a/B2.3b/B2.3c1/B2.3c2/B2.3c3a/B2.3c3b/B2.3c3c/B2.3c3d/B2.3c3e/B2.3c3f/B2.3c3g/B2.3d1/B2.3d2 author PASS

- B1 Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`: Mira bounded PASS, `VIS-B1-MIRA-01` closed; stays Draft/unmerged.
- B2 Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), branch `feature/moderation-visibility-b2-commands`, base = B1 branch.
- B2.1 `41f94434e62b59d40d7f7ebd57be5927decb23c9`: neutral ID-only transaction-owned History append and dedicated PG rollback/reason regressions, author PASS.
- B2.2 exact `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`: `db/forum-repository.ts`, `db/forum-service.ts`, `db/hyperdrive-forum.ts`, `workers/app.ts`, focused test updates. Topic/post transactional Hide/Restore state CAS, current revision and membership checks, active actor, direct RBAC/Owner and AP-10 admission even on no-op, mandatory transition reason, overflow/stale denial, History appended last and transaction rollback. B2.2 changed only backend commands/wiring/tests; no action routes/reader exposure.
- Exact-head [CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485): 2758/2758 unit and 1493/1493 PostgreSQL17 SUCCESS including 7/7 new `moderation-visibility-commands.test.ts` cases. GitHub check-runs 22/22 SUCCESS; associated workflows 18/18 SUCCESS. Earlier red CI attempts on intermediate commits corrected within B2.2; verified evidence is final exact head.
- B2.3a exact `355c0a1de2e3032f4b3c88ff996ae680bf2f1fff`: `createPost` keeps topic NO KEY UPDATE and parent FK KEY SHARE; requires visible topic and visible direct parent before actor/mutation. Missing and hidden share generic not-found; matching receipt replay remains inert/allowed. Exactly two changed files vs B2.2 (`db/forum-repository.ts`, `tests/database/moderation-visibility-commands.test.ts`); +3 PG cases, including hidden root generic reply and Hide/Restore replay boundaries.
- [Exact-head CI 44704018502](https://github.com/iliya1947/vico-forum/actions/runs/44704018502): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit, 1496/1496 PG17**, 10/10 visibility-commands tests.
- B2.3b `59eb34bd86d31bf00b960b487bed09555bbbe07d`: `editPublishedPost` retains draft+receipt-first, uses topic NO KEY UPDATE → post UPDATE → actor admission, denies hidden topic/post before mutation. Own title and all source-locale change/no-op entrypoints reject hidden content under topic→post→actor locks; any source-locale no-op checks `admin.forum` measure. `tests/database/moderation-visibility-commands.test.ts` adds 6 cases, selective legacy `content-topic-title-execution.test.ts` fixture includes visibility column.
- [Exact-head CI 44706419635](https://github.com/iliya1947/vico-forum/actions/runs/44706419635): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit, 1502/1502 PG17** including 16/16 visibility commands and 14/14 title-execution tests. Earlier intermediate failures resolved; final source/test scope reverified.
- B2.3c1 exact `c0160417f52b6c02237251c078f93248f74535ab`: `setTopicClosed` (including no-op), `pinTopic`, `unpinTopic` (including idempotent paths) reject hidden topics under existing topic mutex. Exactly two files changed vs B2.3b: `db/forum-repository.ts` + `tests/database/moderation-visibility-commands.test.ts`; +2 PG regressions check state/History unchanged while hidden and recovery after Restore, including Owner and moderator actor.
- [Exact-head CI 44709756666](https://github.com/iliya1947/vico-forum/actions/runs/44709756666): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit and 1504/1504 PG17**, including 18/18 visibility commands. No failed job on this head.
- B2.3c2 exact `0430b1db36b90e8f28d6f3d1b2cdc7d1f66e545e`: `createHelpSignal` checks hidden primary/duplicate original and selected answer under existing topic→post locks. `withdrawHelpSignal` and `resolveHelpSignal(rejected)` resolve immutable signal identity first, then lock all relevant topics in sorted order, optional post, then signal→actor; `resolveHelpSignal(accepted)` locks and checks same dependencies before effects. No hidden-signal mutation/History, Restore allows legitimate operations. Scope: `db/forum-repository.ts` and `tests/database/moderation-visibility-commands.test.ts`, seven PG regressions.
- Exact-head [CI run 44711821916](https://github.com/iliya1947/vico-forum/actions/runs/44711821916): **22/22 check-runs, 18/18 workflows SUCCESS, 2758/2758 unit, 1511/1511 PostgreSQL17, 25/25 visibility commands**. B2.3c2 author PASS.
- B2.3c3a exact `373c1b8bab3605e73598f673ed34b9823cee6b50`: `setHelpSolutionModeration` reads `forumTopics.isHidden` and selected `forumPosts.isHidden` under pre-existing NO KEY UPDATE locks before actor and signal/History mutation. Exactly two B2.3c3a files (`db/forum-repository.ts`, `tests/database/moderation-visibility-commands.test.ts`), +2 PG cases covering hidden topic and selected answer, change/no-op/clear, Owner/moderator denial and Restore.
- [Exact-head CI 44715419604](https://github.com/iliya1947/vico-forum/actions/runs/44715419604): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit, 1513/1513 PG17 (27/27 visibility commands)**.
- B2.3c3b exact `038ce369b8e29168b99b4ed8218b3e36b719a692`: `selectBestAnswer` checks hidden topic and candidate/old answer under ordered topic→post locks before actor, including no-op and replace. Preserves pending signal effects and History only on admitted changes. Exactly two files changed vs B2.3c3a (`db/forum-repository.ts`, `tests/database/moderation-visibility-commands.test.ts`), +3 PG tests covering own/any, no-op, previous selection hidden, unchanged signals/History and Restore.
- [Exact-head CI 44717164926](https://github.com/iliya1947/vico-forum/actions/runs/44717164926): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit and 1516/1516 PG17**, 30/30 visibility tests.
- B2.3c3c exact `a40d91da20d608ba18879e95bcc1a04e1133e4fe`: `markTopicSolved` checks `isHidden` on topic under pre-existing NO KEY UPDATE before already-solved/active-duplicate guard and actor, pending duplicate signals, History; hidden own/any denied, Restore preserves visible behavior. Only `db/forum-repository.ts` and `tests/database/moderation-visibility-commands.test.ts`; +2 PG regressions.
- [Exact-head CI 44719055856](https://github.com/iliya1947/vico-forum/actions/runs/44719055856): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS; 2758/2758 unit, 1518/1518 PG17 (32/32 visibility)**.
- B2.3c3d exact `039f9ed77c432b9ac22d48b9facac864012522b9`: `confirmHelpDuplicate` reads both topics' `isHidden` under pre-existing sorted NO KEY UPDATE, returns generic not-found before state/actor/History changes; unchanged visible/Restore semantics. Only `db/forum-repository.ts` and `tests/database/moderation-visibility-commands.test.ts`; +2 real PG regressions.
- [Exact-head CI 44721618584](https://github.com/iliya1947/vico-forum/actions/runs/44721618584): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS; 2758/2758 unit, 1520/1520 PG17 (34/34 visibility)**.
- B2.3c3e exact `d51659b01db7b3c55111616010f760ed5e3b9b6d`: `removeHelpDuplicate` pre-reads immutable active original identity, takes sorted duplicate/original topic NO KEY UPDATE locks and denies hidden before relationship/appeal/actor/History; rechecks active relation identity under lock to prevent stale pre-read effects. +2 real PG tests for both topic lock orders, hidden duplicate/original, pending appeal/History preservation, Restore and stale-repeat conflict. Only `db/forum-repository.ts` and `tests/database/moderation-visibility-commands.test.ts`.
- [Exact-head CI 44726577837](https://github.com/iliya1947/vico-forum/actions/runs/44726577837): **22/22 checks SUCCESS, 18/18 workflows SUCCESS; 2758/2758 unit and 1522/1522 PostgreSQL17 (36/36 visibility)**.
- B2.3c3f exact `86ac06b7a9c71e285b5efe258701866419d112a4`: `appealHelpDuplicate` intentionally remains available to the authoritative author under hidden duplicate and/or original per V6 protected own-appeal exception. Current repo already checks topic membership, active relationship/exact expected ID, pending uniqueness, author and active account. +2 real PG regressions in `tests/database/moderation-visibility-commands.test.ts`; no production code changed, no schema/lock changes.
- [Exact-head CI 44737362429](https://github.com/iliya1947/vico-forum/actions/runs/44737362429): **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1524/1524 PG17 (38/38 visibility)**.
- B2.3c3g exact `562147fdd0b8d82e04847b0becb0bed554567e08`: verified existing admin `resolveHelpDuplicateAppeal` preserves the pending appeal's own protected lifecycle across Hide; accepted outcome removes relationship, rejected keeps it, both append one original History, keep visibility untouched, exact expected appeal and replay conflict. +2 real PG tests in `tests/database/moderation-visibility-commands.test.ts`; no production code or lock changes.
- [Exact-head CI 44738934867](https://github.com/iliya1947/vico-forum/actions/runs/44738934867): **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1526/1526 PostgreSQL17 (40/40 visibility)**.
- B2.3d1 exact `acd402a3f74d5fabb9f8ad627277877ea44e4c96`: no separate recovery writer; published-post edit Save/rebase reuse the existing transactionally gated `editPublishedPost`. Matching durable receipt replay after Hide is inert; fresh/changed operations preserve original conflicts/visibility gate. +2 real PG tests for hidden post receipt/Restore and hidden topic stale-revision rebase/Restore, no new production code. Only `tests/database/moderation-visibility-commands.test.ts` changed.
- [Exact-head CI 44744285347](https://github.com/iliya1947/vico-forum/actions/runs/44744285347): **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit and 1528/1528 PG17 (42/42 visibility)**.
- B2.3d2 exact `19f2bdaa80b244093f37424a955a18acc3e572f9`: title task planning checks locked topic `isHidden`, body task planning locks parent topic before post and checks both visibility flags; preserves head→task→topic→post/revision→translation→actor→budget order. Denied plans roll back heads/budget/tasks, existing pending tasks retained; accepted execution untouched. +3 real PostgreSQL tests and selective planning fixture column updates; four files: `db/content-topic-title-task-store.ts`, `db/content-post-body-task-store.ts` and their two `tests/database/content-*-task-planning.test.ts` suites.
- [Exact-head CI 44746654595](https://github.com/iliya1947/vico-forum/actions/runs/44746654595): **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1531/1531 PostgreSQL17**.
- **B2.3e1–B2 tail author tests PASS on exact `282ca1417e721b766e12488539a8d93dec4a1258`:** 87/87 visibility tests; 1576/1576 real PostgreSQL17, 2758/2758 unit checks. Deterministic `pg_blocking_pids` barriers cover both Hide/Restore orders vs title/body plans, topic reply, direct parent reply, edit and title/post Complaint protected submission, stale post-revision CAS, actor deactivation-before/writer-before and FK KEY SHARE compatibility. No production code changed after B2.3d2. Test-only fixes: PostgreSQL soft-blocker queue membership, translatable planner fixture and TS cleanup.
- **Final whole-B2 author PASS, exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`:** +2 real PG regressions confirm previously accepted title/body translation tasks complete private revision-bound publication through Hide and reuse persisted results after Restore; no executor modifications. [Final exact-head CI 44753654036](https://github.com/iliya1947/vico-forum/actions/runs/44753654036) **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1578/1578 PostgreSQL17 (87/87 visibility)**. This exact head passed author self-check and whole B2 bounded scope. B1/B2 remain Draft/unmerged.
- **Execution cadence correction approved by owner:** remaining B2 microsteps are implementation detail inside the single bounded B2 stage. Between them use targeted tests/checks sufficient for the changed seam; no routine full-repository CI and no owner STOP after each microstep. Full exact-head CI is required once, when the whole B2 bounded scope is ready for Mira checkpoint, or earlier only if a concrete cross-cutting risk gives a reason.
- **B2 author PASS — Лира STOP → Мира bounded coordinator checkpoint on stable Draft #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.** All real PG race/deactivation/lock tests, final accepted-task execution, exact-head CI and author self-check passed. Mira verifies bounded B2 diff against B1 and stage plan; on Mira PASS proceed with stacked B3, not before. No Leva until B9 folded feature, no merge of B1/B2 now.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.


## Moderation visibility B2 bounded checkpoint — PASS

- Reviewed stacked Draft #357 local diff against B1 #355.
- Stable exact head: `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.
- Topic/post visibility commands keep topic→post→actor ordering, exact version+revision CAS, mandatory nonblank reason for real transitions, admitted no-op semantics, fresh active actor/AP-10/direct capability checks before success, overflow guard and append-last History.
- History failure rolls back state; concurrent moderators produce one committed transition; actor deactivation order and FK KEY SHARE compatibility are covered with real PostgreSQL locks.
- Local writers are gated for hidden topic/post/parent where B2 requires it; exact committed receipts remain inert; protected Complaints/duplicate-appeal lifecycles remain available by their own authority.
- Real `pg_blocking_pids` barriers cover both committed orders for Hide/Restore against title/body planning, reply/direct parent, edit and protected Complaint; accepted translation tasks retain private completion semantics.
- Final exact-head CI run 44753654036: 22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1578/1578 PostgreSQL17.
- No B3 public projection/discovery implementation was introduced.
- Some translation planning/accepted-task coverage overlaps future B4 responsibilities; this is not a current B2 defect and does not justify rollback. B4 must assess the remaining boundary against the then-current stack rather than duplicate already-covered work.
- **B2 bounded PASS.** Next stacked rung is B3 from branch `feature/moderation-visibility-b2-commands`, only after owner continuation.


## Moderation visibility B3 — ACTIVE

Owner continuation received after B2 Mira PASS.

Lira is active on **B3 — core public projection/discovery**.

Delivery:
- create a new stacked implementation PR with base `feature/moderation-visibility-b2-commands`;
- keep B1 #355 and B2 #357 Draft/unmerged;
- implement only the B3 bounded result from the accepted stage plan;
- split B3 into **small working batches of 2–3 related microsteps**; if a microstep starts to sprawl or becomes uncertain, stop the batch earlier;
- after each batch run only the targeted checks needed for that batch, record the result, then **STOP for owner `...`** before taking the next batch; automatically triggered broad GitHub workflows are ignored completely at this boundary; do not open Actions/CI until whole B3 completion;
- do not run full repository CI after each batch; full author self-check + one full exact-head CI/check set only when the entire B3 bounded scope is complete (or earlier only for a concrete cross-cutting risk);
- after complete B3, STOP Mira for the coordinator checkpoint; B4 must not start before Mira B3 PASS and a new owner continuation.

B3 result boundary: typed hidden tombstones/public topic 404, consistent thread snapshot/anchors, SQL visibility filtering before rank/count/LIMIT across B3 public discovery/read paths, safe unavailable solution/duplicate projections, public history/edit/recovery denial, and leak/pagination/rank/count/root/parent acceptance. Do not implement B4 assets/private-file work, B5 own/inbox, B6 private moderation surfaces, B7 actions/UI, or later stages.

## B3 current working batch — STOP

- Active stacked Draft [#359](https://github.com/iliya1947/vico-forum/pull/359) exact `cc25f9dd826ac0f95a79c3a3a7967198c46428d8`; base B2 #357 unchanged, B1/B2/B3 Draft/unmerged. B3 incomplete.
- **Current B3 two-microstep targeted fix:** confirmed an indirect public-loader leak in `DrizzleForumRepository.readTopicBlockedAuthors()`: its block-author join previously matched hidden posts, so the topic loader's `blockedAuthorIds` could reveal a hidden post author even though the post DTO was a sanitized tombstone. Changed only the SQL join in `db/forum-repository.ts` to include `forumPosts.isHidden=false` and `forumTopics.isHidden=false`, preserving actor/topic filtering and grouping. No changes to B5 blocked-user lists or filter storage.
- Added one real-PG regression to `tests/database/moderation-visibility-commands.test.ts`: blocked author with exactly one reply appears while visible; after post Hide the public topic has a tombstone and scoped blocked-author projection is empty; post Restore restores the match; topic Hide returns empty and Restore restores it again; test unblocks the pair in `finally`.
- **17/17 targeted static source/contract checks PASS** against exact head; **Vitest/actual PostgreSQL/HTTP execution NOT VERIFIED** (no checkout/runtime). Earlier B3 tests likewise remain without runtime execution; no runtime PASS claimed.
- Previous B3: typed hidden post DTO, SQL visibility filtered discovery, searches/Help/profile/unread and boundaries, public/cache no-store, HTML/JSON/translation and neutral 404 sentinel tests. Still open: real executable targeted tests, remaining source/meta/error/pagination boundary acceptance and whole-B3 author self-check.
- Owner mandate: **do not open, inspect, analyze, poll, or retry GitHub Actions/CI before entire B3 completes**; ignore auto-triggered workflows. No B4+, Mira checkpoint, fold, or merge.
- **Next owner `...`:** one new small 2–3 related microstep B3 package from a verified remaining gap; run available targeted checks, update #342 handoff, STOP.

