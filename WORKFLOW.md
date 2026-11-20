# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility: B1 **Mira bounded PASS**, Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`.

B2 — stacked Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), base = `feature/moderation-visibility-b1-foundation`. **B2.1 author PASS**: neutral atomic visibility History append. **B2.2 author PASS**: transactional topic/post Hide/Restore desired-state, in-transaction fresh actor/RBAC/Owner/AP-10 admission before no-op, version+revision CAS, reason validation, atomic History + PostgreSQL regressions. Stable exact head `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`.

[Exact-head CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485) **SUCCESS**: 2758/2758 unit, 1493/1493 PG17 (7/7 new B2.2), overall **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS**. All changes B2.2 confined to #357; no public Hide/Restore route, no B3–B9.

**B2.3a author PASS:** `createPost` denies new replies under hidden topic or directly hidden parent, preserving generic reply with hidden root and inert matching publication receipt. Exact `355c0a1de2e3032f4b3c88ff996ae680bf2f1fff`. [CI run 44704018502](https://github.com/iliya1947/vico-forum/actions/runs/44704018502) **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1496/1496 PG17 (10/10 visibility commands)**.

**B2.3b author PASS** — exact `59eb34bd86d31bf00b960b487bed09555bbbe07d`. Published edit denies hidden topic/post, own title denies hidden topic, source-locale own/any change/no-op gates check locked visibility (topic→post→actor) and any no-op retains AP-10 admission. Original edit receipt replay remains inert. Added 6 PG regressions and updated one selective translation test fixture to include the current `is_hidden` column. [Exact-head CI run 44706419635](https://github.com/iliya1947/vico-forum/actions/runs/44706419635): **22/22 check-runs and 18/18 workflows SUCCESS, 2758/2758 unit and 1502/1502 PG17 (16/16 visibility tests)**. First intermediate head failed a synthetic fixture and one unrelated settings UI wait; the fixture was corrected locally, all tests passed on final exact head.

**B2.3c1 author PASS** — exact `c0160417f52b6c02237251c078f93248f74535ab`, [CI run 44709756666](https://github.com/iliya1947/vico-forum/actions/runs/44709756666): **22/22 check-runs, 18/18 workflows SUCCESS; 2758/2758 unit, 1504/1504 PostgreSQL17 (18/18 visibility commands)**. Hidden topics now reject setTopicClosed (including unchanged/ABA/CAS path), pinTopic and unpinTopic (including no-op) before actor/mutations, preserving topic NO KEY UPDATE and existing visible-topic semantics. Two PG regressions verify open and already closed+pinned state, no extra History, Restore recovery, and Owner/moderator denial.

**B2.3c2 author PASS** — exact `0430b1db36b90e8f28d6f3d1b2cdc7d1f66e545e`. Help signal create/withdraw/accepted/rejected gates reject hidden primary/duplicate-original topics and selected answer; sorted topic→post→signal→actor locks retain authorization and History effects. Seven PG regressions cover hidden signals and Restore. [CI 44711821916](https://github.com/iliya1947/vico-forum/actions/runs/44711821916) verified **22/22 check-runs and 18/18 workflows SUCCESS, 2758/2758 unit, 1511/1511 PostgreSQL17, 25/25 visibility commands**.

**B2.3c3a author PASS** — `setHelpSolutionModeration` rejects a hidden topic or hidden selected answer under existing topic→post→signals→actor lock order, before change/no-op, signal supersession or History. Two new PG regressions check hidden topic/answer, unchanged/changed/clear, moderator/Owner, no side effects and Restore. Exact `373c1b8bab3605e73598f673ed34b9823cee6b50`; [CI 44715419604](https://github.com/iliya1947/vico-forum/actions/runs/44715419604) **22/22 check-runs, 18/18 workflows SUCCESS, 2758/2758 unit, 1513/1513 PG17, 27/27 visibility tests**.

**B2.3c3b author PASS** — exact `038ce369b8e29168b99b4ed8218b3e36b719a692`. `selectBestAnswer` rejects hidden topic or hidden candidate/current answer under existing topic lock and sorted post NO KEY UPDATE locks, including same-answer no-op before actor admission or side effects. Preserves visible-topic semantics, sorted post→signals→actor lock graph, ID-based History. +3 PostgreSQL regressions for hidden topic, hidden new answer, hidden old answer, own/any, no-op, unchanged signal/History, Restore. [CI 44717164926](https://github.com/iliya1947/vico-forum/actions/runs/44717164926): **22/22 check-runs, 18/18 workflows SUCCESS, 2758/2758 unit, 1516/1516 PG17, 30/30 visibility tests**.

**B2.3c3c author PASS** — `markTopicSolved` rejects hidden topics under the existing topic NO KEY UPDATE lock before own/any actor admission, already-solved conflict or pending duplicate-signal supersession; generic not-found for hidden, no data/History side effects, Restore resumes original behavior. Two PG regressions. Exact `a40d91da20d608ba18879e95bcc1a04e1133e4fe`; [CI 44719055856](https://github.com/iliya1947/vico-forum/actions/runs/44719055856): **22/22 check-runs, 18/18 workflows SUCCESS; 2758/2758 unit, 1518/1518 PostgreSQL17 (32/32 visibility)**.

**Лира STOP перед B2.3c3d.** Next owner continuation only: `confirmHelpDuplicate` hidden topic/original topic admission; other duplicate writer operations remain separate slices. Whole B2 incomplete, no Mira checkpoint; B1/B2 Draft/unmerged, no B3+.

## Baseline

- Current main: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
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

## Moderation visibility delivery — B1 PASS; B2.1/B2.2/B2.3a/B2.3b/B2.3c1/B2.3c2/B2.3c3a/B2.3c3b/B2.3c3c author PASS

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
- B2 remaining: B2.3c3d `confirmHelpDuplicate` hidden primary/original, then other duplicate writers, recovery/planning and real PG two-order races and deactivation/lock compatibility. Whole B2 not complete.
- **B2.3c3c author PASS / Lira STOP before B2.3c3d.** Continue only on owner command. After full B2: author self-check/exact-head CI → Mira bounded checkpoint; no Leva until folded final feature. B1/B2 Draft/unmerged.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
