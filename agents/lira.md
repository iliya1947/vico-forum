# agents/lira.md — текущий контекст Лиры в #342

## Moderation visibility B5 — STOP после protected Complaint test fixture

B1 #355, B2 #357, B3 #359, B4 #365 имеют Mira bounded checkpoint PASS и остаются stacked Draft/unmerged. Stable B4 exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Owner разрешил только B5.

[Draft #367](https://github.com/iliya1947/vico-forum/pull/367), exact `fbe1b931c77f91d6f14ed72c8982e6e7a10ee315` на неизменной B4 base. B5.1 Watch, B5.2 Bookmarks, B5.3 Mute/Block, B5.4a/b inbox реализованы. Code scope/acceptance в PR body и `WORKFLOW.md`.

### Exact-head проверки и оставшиеся блокеры

- `998d7a964e414e24121dfd9fa1b5f979912f0acc`: 17/18 check-runs SUCCESS, включая `checks` lint/typecheck/unit/build и повторный `attachments_browser`. `database` FAILED: **27 tests failed / 1586 passed**, 2 test files.
- `tests/database/forum-notification-actor-lifecycle.test.ts`: новый B5 protected Complaint Decision test attempted `markNotificationRead(g-recipient, g-n5)`, but case member check requires affected author or reporter; fixture recipient was neither. Actual production rejection was correct. Fixed by inserting real `forum_complaints` reporter row `g-report` for `g-recipient`, existing case `g-case`. One-test-file GitHub exact-head static diff at `fbe1b931…`, **no production/authority change**.
- `tests/database/personal-filters-concurrency.test.ts`: **26 timeouts** across existing M3/M4/M5, including B5 new Mute×Hide, plus afterAll pool.end hook timeout. Root cause **not established**, do not alter production lock protocol or inflate test timeouts without tracing actual cause. Distinct next diagnostic subtask.
- 18 new-head checks registered after fixture correction. **No current-head author PASS, no Mira handoff**. Old-head CI SUCCESS does not transfer.

## Next

**Лира STOP после Case fixture.** Следующая owner `...`: investigate PostgreSQL M3/M4/M5 timeouts (barriers, pool/transaction waits, comparisons with last working base), inspect exact-head results, fix only verified current-B5 defects; rerun applicable checks if changed. After entire B5 exact-head PASS, STOP → **Мира bounded coordinator checkpoint**. B6/B7/merge/deployment запрещены.
