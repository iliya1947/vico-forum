# B8-A PostgreSQL acceptance — initial coverage inventory (A1)

Status: **scoped source inventory only, not a test run, not B8-A acceptance/PASS**. Reviewed on 2026-11-22 against accepted B7 #371 exact `f92778606f1c8ea4e64f53c1660910f34c48b84c` and V8 acceptance matrix in `stages/moderation-visibility/PLAN.md`. New B8 implementation branch `feature/moderation-visibility-b8-acceptance` created from that exact SHA; currently zero code diff. The B8 Draft PR is created after the first test commit.

## Existing real PostgreSQL evidence to reuse

| Contract | Existing inspected coverage |
| --- | --- |
| Topic/post Hide + Restore, CAS/no-op, reasons, overflow, History rollback | `tests/database/moderation-visibility-commands.test.ts` lines ~108–230: topic/post transitions, version/revision and membership, current grant and Owner, AP-10, inactive actor, two moderators, forced History failure. `tests/database/visibility-history-append.test.ts` adds History event reason/neutral-label/rollback constraints. `tests/database/moderation-visibility-foundation.test.ts` has actual PG schema/grant/CHECK assertions. |
| Visibility-dependent content writer admission | `tests/database/moderation-visibility-commands.test.ts` lines ~232–1523: hidden parent/reply, published edit, own/any title, source locale, closure/pin, Help signal, solution moderation, best answer, solved, duplicate confirm/removal/appeal and edit recovery. These mostly test **state gating**, not necessarily concurrent interleavings. |
| Real PG topic Hide/Restore ordering | Same suite lines ~1524–1683: title translation planning Hide/Restore × both writer-before-manager and manager-before-writer orders, PostgreSQL `pg_blocking_pids` barriers. Lines ~1684–1903: body-plan/reply/edit/Complaint post/title × Hide/Restore × both orders, actual topic row-lock/History/side effects. |
| Real PG actor and FK boundaries | Same suite lines ~1904–2088: actor deactivation before/admitted-after visibility transaction, two kinds of FK KEY SHARE compatibility, inactive content author. |
| Real PG post Hide/Restore ordering | Same suite lines ~2089–2293: body-plan/direct-reply/edit/Complaint × Hide/Restore × both orders using actual row blockers; verifies posts/revisions/receipts/tasks/budget/History. |
| Public state projections | Same suite ~2294–end checks Help/discovery/SQL list/search/tombstone projection; acceptance belongs primarily to earlier B3/B5 and B8 transport, not duplicate all for B8-A. |

## Remaining verification for B8-A (not yet claimed missing globally)

1. Read the adjacent dedicated PG tests for source correction, solved/best/duplicate, History, user-measure/authority, translation planning and **accepted execution**, and protected Complaint. Determine which V8 *real two-order PG lock/barrier* matrix cells are not actually covered. Do not infer absent coverage solely from the visibility suite.
2. Fill only confirmed gaps with real PostgreSQL contention assertions (not JS-only Promise ordering), prioritizing solution/duplicate/source and accepted-task execution where needed. Reuse existing `pg_blocking_pids` and fixture setup; do not copy unrelated suites.
3. Verify fresh actor/Owner/effective current grant negative generic Admin/History/Complaint and two-moderator cases are supported by real PG assertions, and state/History no unrelated mutation. Add bounded missing tests only.
4. Run **targeted PG tests on B8-A exact head**, resolve only confirmed *current B8 visibility* defects. B8-B Worker/Better Auth/R2 and B8-C Chromium/UI/cache stay inactive.

This is an initial inventory, not evidence of B8 acceptance. Updated working assignment is maintained in `WORKFLOW.md` and `agents/lira.md`.

## A2 — adjacent suites cross-check and first real-PG test commit

- Source correction: `tests/database/source-locale-correction.test.ts` covers authority, same-locale admission, source revision invariants and actor deactivation, but not topic Hide/Restore row-lock ordering. Main visibility suite covers hidden denial/Restore state, not concurrent source no-op admission.
- Solution and duplicate: `tests/database/sa04-forum-solution-lifecycle.test.ts` and `sa04-forum-duplicate-lifecycle.test.ts` cover existing signal/appeal/actor/Complaint races. The visibility suite covers hidden state denials and protected appeal exception; full Hide/Restore crossed ordering remains a separate matrix verification.
- Accepted execution: `content-topic-title-execution.test.ts` and `content-post-body-task-planning.test.ts` already verify private translation completion during Hide provider window and reuse on Restore. Provider-window concurrency is not by itself a PG row-lock-barrier test. Existing title/body planning barriers in the visibility suite already cover fresh task admission and budget; do not duplicate.
- Authority: visibility suite currently covers Owner, overrides, AP-10 and actor deactivation with real PG locks. Cross-check finer generic Admin/history/Complaint-only and fresh-revoke cases before adding more.

**Confirmed first gap:** Hide/Restore × topic same-locale source-correction no-op had no real PostgreSQL two-order test in inspected suites. No-op must revalidate visibility inside its own transaction despite not changing the revision. Implemented `it.each` with four cases in `tests/database/moderation-visibility-commands.test.ts`: a real topic `FOR UPDATE` holder, `pg_blocking_pids` observation of both contenders, release, admitted/denied outcome, exact visibility version/History and unchanged current title revision; Restore readmission. Commit `20df9b8d3601b75372e3395cca5dbdaf35f11f15`, stacked [Draft #376](https://github.com/iliya1947/vico-forum/pull/376). Test diff +110 lines only; B7 baseline unchanged.

**Verification status:** new PG tests **not executed**, CI **not launched**. B8-A not PASS. A3 remains for remaining bounded matrix and targeted PG execution; do not infer missing global coverage solely from neighboring suite names.
