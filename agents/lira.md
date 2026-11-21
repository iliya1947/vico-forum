# agents/lira.md — текущий контекст Лиры в #342

## Moderation visibility B5 — STOP после исправления M3 concurrency

B1 #355 / B2 #357 / B3 #359 / B4 #365 имеют Mira bounded PASS, stacked Draft/unmerged. B4 exact base `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Owner разрешил только B5.

B5 [Draft #367](https://github.com/iliya1947/vico-forum/pull/367), exact `a2269fb0294feaccb433e76b66e800f3e869658d`. Реализованы B5.1 Watch, B5.2 Bookmarks, B5.3 Mute/Block, B5.4a/b inbox; описание всего scope и тестов в #367 body и `WORKFLOW.md`.

### PostgreSQL current issue and correction

- Prior exact `fbe1b931…`: 17/18 check-runs SUCCESS; PostgreSQL `database` FAIL: 26 M3/M4/M5 timeouts in `tests/database/personal-filters-concurrency.test.ts` plus afterAll pool close timeout. Prior protected Complaint notification test now PASS.
- Confirmed first failure causal chain by comparing B4/B5 implementation and inherited M3 test: publication `createPost`/`editPublishedPost` retains topic `FOR NO KEY UPDATE` while its candidate SQL is paused; B5 `setTopicMute(muted:true)` newly takes `FOR SHARE` (must serialize with Hide), which cannot complete before publication commits. Inherited test awaited Mute before releasing its own publishing gate, creating a test-owned interlock. B4 mute `FOR KEY SHARE` did not block publication. Subsequent suite timeouts plausibly cascade from the uncompleted first operation; **not yet proven that all later timeouts disappear**.
- **One-file fix** in current head: in M3 four Mute ON cases, run Mute on separate node-postgres client, prove actual PG blocker with `pg_blocking_pids(mutePid)` pointing to publishingPid, release publishing gate, await publication and then Mute; assert notice remains delivered and no suppression receipt (Mute commits later). Block before/after candidate assertions unchanged. Cleanup now settles both promises. No production logic, lock protocol or timeout values changed. GitHub exact-head source/compare static PASS.
- New `a2269fb0294feaccb433e76b66e800f3e869658d` **18 check-runs registered**, current-head PostgreSQL/author PASS **not established**. Do not claim M3/M4/M5 all corrected until exact-head DB suite exits SUCCESS.

## Next

**Лира STOP.** Next owner `...` checks all current-head CI/acceptance, especially `database`; correct only confirmed further current-B5 failures and rerun exact-head as needed. After all PASS + author self-check → #342 handoff STOP → **Мира bounded coordinator checkpoint**. B6/B7, merge, deployment prohibited.
