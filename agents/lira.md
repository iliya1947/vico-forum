# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility B2 stacked Draft [#357](https://github.com/iliya1947/vico-forum/pull/357) over B1 [#355](https://github.com/iliya1947/vico-forum/pull/355). B1 Mira bounded PASS. **B2.1/B2.2/B2.3a/B2.3b/B2.3c1/B2.3c2/B2.3c3a/B2.3c3b/B2.3c3c author PASS; Лира STOP before B2.3c3d.**

## Подтверждённое B2

- B2.1 `41f94434e62b59d40d7f7ebd57be5927decb23c9`: `appendVisibilityHistory` neutral ID-only labels, reason/rollback PG regressions.
- B2.2 exact stable `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`: transactional topic/post Hide/Restore, current version/revision CAS, membership, active actor, direct fresh RBAC+Owner/AP10 admission before no-op; one neutral History event per transition and rollback if append fails. Backend not exposed through public routes.
- Final [CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485) **PASS**: 22/22 check-runs, 18/18 workflows, 2758/2758 unit, 1493/1493 PG17 incl 7/7 new. No need to recheck same exact head without new cause.
- B2.3a `355c0a1de2e3032f4b3c88ff996ae680bf2f1fff`: `createPost` rejects new replies under hidden topic / hidden direct parent, allows generic reply when root hidden, preserves already-committed matching receipt replay. Topic lock remains NO KEY UPDATE; parent remains KEY SHARE; no new lock-order edge. Scope: `db/forum-repository.ts` and +3 PG tests in `tests/database/moderation-visibility-commands.test.ts`.
- [Exact-head CI 44704018502](https://github.com/iliya1947/vico-forum/actions/runs/44704018502) **PASS**: 22/22 checks, 18/18 workflows, 2758/2758 unit, 1496/1496 PG17 including visibility commands 10/10. No repeated CI polling needed.
- B2.3b exact `59eb34bd86d31bf00b960b487bed09555bbbe07d`: published edit denies hidden topic/post but preserves matching receipt replay; own title checks hidden topic; source-locale topic/post own/any and no-op check fresh visibility after topic→post locks; any no-op has AP-10 `admin.forum` admission. 6 new PG regressions; one selective title-execution fixture gains `is_hidden` column. No B3+.
- [Exact-head CI 44706419635](https://github.com/iliya1947/vico-forum/actions/runs/44706419635) **PASS**: 22/22 check-runs, 18/18 workflows, 2758/2758 unit, 1502/1502 PG17 (16/16 visibility commands). Prior intermediate fixture issue fixed; unrelated settings UI assertion passed on final SHA.
- B2.3c1 exact `c0160417f52b6c02237251c078f93248f74535ab`: hidden topic admission in `setTopicClosed`, `pinTopic`, `unpinTopic` before closure CAS/no-op and pin idempotency, retaining topic NO KEY UPDATE → actor/AP-10 → History order. +2 PG regressions for hidden open vs hidden closed+pinned, same-state/no-op, Owner/moderator denial, no History mutation, Restore recovery.
- [Exact-head CI 44709756666](https://github.com/iliya1947/vico-forum/actions/runs/44709756666) **PASS**: 22/22 check-runs, 18/18 workflows, 2758/2758 unit, 1504/1504 PG17 (18/18 visibility commands). No need to recheck unchanged head without cause.
- B2.3c2 exact `0430b1db36b90e8f28d6f3d1b2cdc7d1f66e545e`: signal create/withdraw/accepted/rejected operations deny hidden primary/duplicate original topic or selected answer under sorted topic→post→signal→actor locks. Pending status + History remain unchanged on refusal; Restore re-enables. Two modified files (`db/forum-repository.ts`, `tests/database/moderation-visibility-commands.test.ts`), +7 PG regressions. Final exact-head [CI 44711821916](https://github.com/iliya1947/vico-forum/actions/runs/44711821916) **PASS**: **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS; 2758/2758 unit, 1511/1511 PG17, 25/25 visibility**. B2.3c2 author PASS.
- B2.3c3a exact `373c1b8bab3605e73598f673ed34b9823cee6b50`: `setHelpSolutionModeration` denies hidden topic or selected answer before changed/no-op/clear, pending signal supersession, History. Existing topic→post→signals→actor lock order preserved. Two PG regressions, including Owner/moderator and Restore. [Exact-head CI 44715419604](https://github.com/iliya1947/vico-forum/actions/runs/44715419604) **PASS**: 22/22 checks, 18/18 workflows, 2758/2758 unit and 1513/1513 PostgreSQL17 (27/27 visibility).
- B2.3c3b exact `038ce369b8e29168b99b4ed8218b3e36b719a692`: `selectBestAnswer` rejects hidden topic and hidden target/current selected answer under sorted topic→post NO KEY UPDATE locks, including same-answer no-op and replacement. Preserves post→signals→actor and transition-only History; +3 PostgreSQL regressions for hidden topic/candidate/old, both own/any, state/History unchanged, Restore. [Exact-head CI 44717164926](https://github.com/iliya1947/vico-forum/actions/runs/44717164926): **22/22 checks, 18/18 workflows SUCCESS, 2758/2758 unit, 1516/1516 PG17 (30/30 visibility)**.
- B2.3c3c exact `a40d91da20d608ba18879e95bcc1a04e1133e4fe`: `markTopicSolved` reads topic hidden state under existing NO KEY UPDATE, returns generic not-found before owner/any checks, already-solved conflict, signal changes or History. +2 PG regressions: hidden unsolved with pending duplicate signal and hidden already-solved, both own/any, state unchanged, Restore. [Exact-head CI 44719055856](https://github.com/iliya1947/vico-forum/actions/runs/44719055856) **PASS**: 22/22 checks, 18/18 workflows, 2758/2758 unit and 1518/1518 PG17 (32/32 visibility).
- Work confined to Draft #357; no B3+.

## Следующий шаг только по явной команде владельца

**B2.3c3d: confirmHelpDuplicate visibility admission only** per `stages/moderation-visibility/PLAN.md`. Check both topic and canonical original under existing sorted topic NO KEY UPDATE before transition/no-op/actor; preserve duplicate relationship, pending signal and History semantics, verify hidden denial/Restore in PG and exact-head CI, then STOP. Subsequent duplicate removal/appeal/resolve writers, recovery/planning, real PG two-way races.

B2 overall not complete or ready for Mira checkpoint. B1/B2 Draft/unmerged. After full B2: author self-check/exact-head CI → Mira bounded checkpoint; after B9 final folded feature Mira → Leva → owner merge. Service #342 never merge.

## Границы

V-P1–V-P3 accepted; V-T1/V-T2 PASS. Stage6/#300/general UI/UX excluded.
