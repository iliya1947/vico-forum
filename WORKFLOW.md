# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Moderation visibility B6-A — Лира. A1/A2 completed, STOP before A3.** B5 #367 exact `a2269fb0294feaccb433e76b66e800f3e869658d` received Mira bounded PASS. Owner authorized **B6-A only**. [Stacked Draft #370](https://github.com/iliya1947/vico-forum/pull/370) exact `07eb98e86a1794bdbc623c7aecbb8c6aa628578b`, unchanged B5 base; 3 B6 commits / 12 scoped files / behind 0. B1–B5 remain Draft/unmerged.

**A1:** separate private PostgreSQL hidden topic/post reader with effective `forum.content.visibility.manage` + active account per-read, AP-10-effective Worker authorization, 25+lookahead ordered query, effective parent/topic private projection, neutral private no-store errors.

**A2:** route `/:locale/admin/forum/content`, current capability check before strict application query `kind` plus complete bounded canonical `beforeChangedAt/beforeId` pair. Hidden-only non-source UI, topic/post tabs, pagination, discoverability limited to `canManageVisibility`, EN/RU/HE canonical labels/manual fingerprints, document/data/error `private,no-store`. A2 8-file/two-commit diff over A1; static source+scope checks passed. **22 current-head GitHub checks registered but pending as of last inspection; no runtime PG/Vitest/CI PASS or whole B6-A author PASS claimed.**

**Лира STOP after A2.** Next owner `...` = **B6-A3**: targeted PG and route/security checks for positive/negative grants, AP-10/revoke, availability/unknown error, strict cursor 25+1 and parent projection, EN/RU/HE/no-store. Verify running check-runs, address only confirmed current B6-A findings and obtain new exact-head applicable CI/acceptance after tests. Then STOP → Mira B6-A bounded checkpoint. B6-B/inspector/history/private assets/B7/merge/deploy excluded.

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


## Moderation visibility B3 — MIRA COORDINATOR PASS

- #359 stable exact `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91`, base B2 #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.
- `VIS-B3-MIRA-01` CLOSED. Exact-head CI `44904360356` PASS: 2782/2782 unit, 1600/1600 PG17; 15/15 workflows SUCCESS.
- No current-B3 blocker remains. B3 is an accepted stacked rung only; B1/B2/B3 remain unmerged.

## Moderation visibility B6-A — AUTHORIZED; A1/A2 complete, STOP

- Owner scope unchanged: private queue with fresh `forum.content.visibility.manage`/AP-10, topic/post filter, 25+1 strict `(changed_at,id)` cursor, hidden parent/topic status and `private,no-store` across document/.data/errors. Full inspector, revisions, private assets, B7 Restore/actions out of bounds.
- **A1:** `1a886f979cf1c0aeddc002f35bfd83a5c8a890de` (one 4-file commit). Private PostgreSQL capability + Worker wiring, static PASS.
- **A2:** current exact `07eb98e86a1794bdbc623c7aecbb8c6aa628578b` (2 more commits; 8 additional files; total 3 commits / 12 B6 files). Route `admin/forum/content`; fresh admission before strict app-only query; default topic or exact post filter, complete `beforeChangedAt/beforeId` ISOms ID cursor pair, unknown/duplicate reject, `.data/_routes` only transport. Server-rendered own private queue UI, no hidden source or public hidden links; controlled admin link, EN/RU/HE canonical/manual review fingerprints. Source/compare validation PASS. **22 current SHA check-runs registered and not yet complete. No author B6-A PASS.**
- **STOP before A3:** next `...` authorizes only targeted PostgreSQL and route/permission/revoke/AP-10/outage/pagination/parent/source-safe regression tests and final exact-head applicable CI. After full B6-A author PASS → Mira bounded checkpoint; no B6-B/B7/merge.

## Process side task — agent-triggered PR tests — COMPLETE

- #362 implementation merged into main; #363 documentation merged into main unchanged from the final docs PASS.
- Current main after #363 merge: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Final implementation evidence remains: Leva independent PASS on #362 exact `5ed18dcffb856564fd0e8df9ec9d43020cd7f807`; post-merge hosted workflow_dispatch smoke `44900723276` PASS; final docs review PASS on #363 exact `7ae9f0f8d007cb7f2c2c007794476715881a13ef`.
- Main now contains the manual PR-test policy: ordinary PR CI and browser/connected acceptance do not auto-run on open/head update; agents use one-shot `run:ci` / `run:acceptance`; `workflow_dispatch` is fallback; production/deploy workflows keep separate gates.
- No open process-side finding or docs debt remains.
- **Current active work:** B4 Draft #365 exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e` author self-check PASS with 9/9 workflows SUCCESS. Next **Мира bounded B4 coordinator checkpoint**. B5 blocked until coordinator PASS plus owner continuation.

## Parallel side assignment — stale/legacy audit (Mira-2)

- Direct owner assignment through service PR #342.
- Agent: **Mira-2**.
- Scope: systematic current-product stale/legacy audit only; no fixes.
- Detailed handoff: `research/stale-legacy-audit-handoff.md`.
- This side audit must not alter or block the active moderation visibility B4 chain unless it discovers a defect that directly invalidates that work.
- Result: one classified registry, then STOP for owner decision.
