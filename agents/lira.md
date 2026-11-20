# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility B2 stacked Draft [#357](https://github.com/iliya1947/vico-forum/pull/357) over B1 [#355](https://github.com/iliya1947/vico-forum/pull/355). B1 Mira bounded PASS. **B2.1/B2.2/B2.3a/B2.3b/B2.3c1 author PASS; Лира STOP before B2.3c2.**

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
- Work confined to Draft #357; no B3+.

## Следующий шаг только по явной команде владельца

**B2.3c2: narrow Help writer visibility admission** per `stages/moderation-visibility/PLAN.md` (start with Help attention/signal state only). Preserve existing topic lock, actor/AP-10, transition/no-op/History; then STOP. Subsequent slices: further Help/solution/duplicate writers, recovery/planning, and real PostgreSQL two-way lock graph.

B2 overall not complete or ready for Mira checkpoint. B1/B2 Draft/unmerged. After full B2: author self-check/exact-head CI → Mira bounded checkpoint; after B9 final folded feature Mira → Leva → owner merge. Service #342 never merge.

## Границы

V-P1–V-P3 accepted; V-T1/V-T2 PASS. Stage6/#300/general UI/UX excluded.
