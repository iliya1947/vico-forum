# Admin panel — current workflow

- Service PR **#251**; accepted SA04-A1 main/base `593a03964b8407b249f7c9f5eb117ddb8b07736d`. SA04-A2/A3/A4/B/C1/C2/C3a/C3b/C3c/C3d1 **Mira checkpoint PASS**; A4-MIRA-01 CLOSED.
- **Current checkpoint: SA04-C3d2 implementation author-complete; Лира STOP. Next: Mira bounded C3d2 checkpoint/scope review.**
- Cumulative [Draft implementation PR #328](https://github.com/iliya1947/vico-forum/pull/328), **stable exact head `f7fa1e41c9c89afce0631e3f14c661d22f626839`**, same main/base, 29 cumulative changed files; open/Draft/unmerged.
- **Only C3d2 delivered:** separate authenticated `readHelpSolutionsForMe` candidate topic-author identity projected via accepted A4 from same joined A1 lifecycle row, before direct Help question-summary DTO. Inactive author → Deleted user/narrow deleted marker; active author unchanged. Already-accepted C3d1 canonical category Help loader/DOM does safe serialization/localization without modification.
- **Preserved For-me contract:** current user derives solely from session, interest tags from persisted Help questions authored or replied to by that user, candidates are unsolved other-author Help questions with ≥1 shared interest tag. Rank match-count desc → activity desc → topic-ID desc; 100/100 bounds; no-signal/no-match truthful empty. Combined solution/answers/quality/relation filters, replies/best-answer/moderation/needs-details/duplicate state, timestamps/tags, guest 401, URL hint non-authority unchanged. No schema/migrations/writers/permissions or recommendation-model change.
- **Native PG17 tests:** independent interest-user fixture validates both authored/replied interest signals, candidate membership/ranking/ties, filters/status/tags/counts, active/deactivated identity and before/after non-identity equality, no-signal/no-match empties and secret marker absence. EN/HE authenticated category For-me route/DOM tests verify session binding vs URL hints, guest 401, existing safe field allowlist, masked/localized deleted author, active author, links and adverse raw-marked display data.
- **Mandatory author inspection:** five C3d2 commits/three changed files and 29-file cumulative PR inventory, actual reader query and accepted C3d1 route/view, native/EN-HE test logic and CI evidence personally inspected. No confirmed current-scope C3d2 defect; this is not Mira/Lev review.
- **Final exact-head checks all SUCCESS:** [CI #43255816576](https://github.com/iliya1947/vico-forum/actions/runs/43255816576) **2260 app /708 native PG17**, 69-table schema manifest parity, lint/typecheck/build/Worker local smoke. [SA03 #43255816010](https://github.com/iliya1947/vico-forum/actions/runs/43255816010), [SA01 #43255816034](https://github.com/iliya1947/vico-forum/actions/runs/43255816034), [AP10 #43255817099](https://github.com/iliya1947/vico-forum/actions/runs/43255817099) Chromium SUCCESS; AP10 four jobs.
- **Next action for Mira only:** independently review SA04-C3d2 on exact head, report PASS or confirmed current-scope defects, then separately appoint later bounded work. Лира/Лёва/Марк not active; no merge.
- **Outside C3d2:** shared Help C3d1 rewrite, Similar-question results, attention-case submitters, history/notifications/Admin Users/mentions/presence/auth enforcement, writers/deactivation action, SA05+, Stage6/production, #315, docs closeout and merge.

## Mandatory author verification

Before STOP/handoff, the implementer must personally inspect the completed work across the assigned bounded scope: the actual diff/code, logic, task fit and resulting behavior. Tests, CI, browser checks and other automated evidence support that verification but **do not replace the author's own inspection**. This author verification is not a coordinator or independent whole-PR review and does not replace those later gates.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.

## Lev review granularity

- Lira implementation granularity and Lev review granularity are different constraints.
- Keep Lira handoffs small and bounded.
- Prefer Lev independent review on a meaningful cumulative stable slice/package, not on every tiny author checkpoint, when the workflow allows waiting without losing a required gate.
- Do not waste an independent review already in progress: if Lev PASSes the current stable bounded PR and it is otherwise ready, close that PR rather than extending it and later making Lev repeat substantially the same review.

## 2026-11-11 — SA04-A1 implementation gate closed

- Lev independent technical review PASS published on exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`: 0 confirmed current-scope A1 defects.
- Mira coordinator PASS and Lev independent PASS cover the same stable head; `SA04-A1-MIRA-01` is CLOSED.
- PR #327 was converted from Draft to **Ready for review** without changing the implementation head, and its body was corrected to the final factual state.
- Because Lev has already spent a full independent review on this bounded slice, #327 must not be extended with later SA-04 work. Merge this reviewed A1 foundation first; later SA-04 implementation proceeds in a new bounded PR so Lev is not forced to re-review the same A1 work.
- No SA04-A2+, SA-05+, Stage6/production or #315 remediation is started by this closeout.
- **Next action: Owner merge of #327.**

## 2026-11-12 — SA04-A1 post-merge synchronization

- Verified PR #327 merged from the exact reviewed implementation head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`.
- Merge commit and current `main`: `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- SA04-A1 account-state schema foundation is now delivered in main.
- #327 is closed and must not be extended/reused for later SA-04 work.
- No docs closeout is started here because SA-04 as a package is not complete; factual package documentation remains an end-of-task concern.
- No active agent assignment. The next continuation begins the next bounded SA-04 implementation result in a new implementation PR, with Lira kept granular and Lev reserved for a larger meaningful review scope.

## 2026-11-12 — SA04-A2 assigned

- Granularity gate applied to the remainder of Lev's compound checkpoint A.
- Operational split for the remaining A foundation:
  - **A2:** shared server-only account-state read/predicate foundation;
  - **A3:** transaction/row-lock mutation guard primitives;
  - **A4:** neutral public-identity contract/helpers.
- Only **A2** is assigned now. A3/A4 are planning labels, not active assignments, and may be split further before handoff if needed.
- A2 starts a **new cumulative Draft implementation PR** from current main `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Later A checkpoints may be added to that PR only after separate assignments; this avoids spending Lev review on every tiny author checkpoint.
- After A2 author STOP, Mira performs the checkpoint/scope review and decides the next bounded handoff. **No Lev independent review is scheduled at A2 alone.**

## 2026-11-12 — SA04-A2 checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `f9da2033455487f25510c2ccbbb748ed5f4bf7f4`, base/current main `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Scope is exactly two files: shared account-state read/predicate foundation + focused PG17 tests.
- PASS — 0 confirmed current-scope A2 defects.
- CI #43109939829 independently confirmed SUCCESS on the same head.
- A2 stays inside cumulative Draft #328. Do not merge and do not spend Lev review on A2 alone.
- Lira STOP. A3/A4 remain unassigned until the next explicit continuation.

## 2026-11-12 — SA04-A3 assigned

- A2 remains checkpoint-PASS on `f9da2033455487f25510c2ccbbb748ed5f4bf7f4`; current main/base remains `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Only **A3** is active: one transaction-local mutation admission primitive in the shared account-state foundation, with user-row locking held by the caller-owned transaction through commit/rollback.
- Required concurrency evidence is bounded to the primitive itself; no runtime/domain integration is part of A3.
- Continue cumulative Draft #328. Lira author-inspects A2+A3, publishes stable head/evidence and STOP.
- A4 and all later SA04 checkpoints remain unassigned. Lev remains unassigned.


## 2026-11-12 — SA04-A3 author checkpoint complete; Lira STOP

- Merged main A1 unchanged; Mira A2 checkpoint PASS preserved.
- Cumulative Draft #328 exact head `0725b49dc9d9e36152670dac8368d0f83e714c82`: `FOR NO KEY UPDATE` mutation guard and four PG17 concurrency cases in same two files, no runtime integration.
- Personally inspected complete cumulative two-file code/diff. Exact-head CI #43112202261 PASS (2237 app + 700 native PG17, 69-table parity, build/typecheck/lint).
- Next Mira A3 checkpoint/scope review only. Lira STOP. A4/Lev unassigned, Draft/unmerged.

## 2026-11-12 — SA04-A3 checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `0725b49dc9d9e36152670dac8368d0f83e714c82`.
- A3 mutation guard uses `FOR NO KEY UPDATE` on an already-open caller transaction, keeps the row locked through caller commit/rollback, rejects missing/inactive state and performs no state mutation.
- Real PG17 concurrency coverage confirms competing state UPDATE blocking, writer-first ordering, reuse of existing row lock and FK KEY SHARE compatibility.
- Autocommit limitation is explicit; no runtime caller is integrated in A3.
- Exact-head CI #43112202261 SUCCESS.
- **PASS — 0 confirmed current-scope A3 defects.**
- #328 stays cumulative Draft. No Lev review/merge at this checkpoint. Lira STOP; A4 unassigned.

## 2026-11-12 — SA04-A4 assigned

- A2+A3 remain checkpoint-PASS on `0725b49dc9d9e36152670dac8368d0f83e714c82`; current main/base remains `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Only **A4** is active: shared neutral public-identity contract/helper for inactive accounts.
- Foundation requirement: stable user ID remains; inactive public name becomes the approved Deleted-user representation; raw name/avatar/bio/profile links are not carried through; active identity remains unchanged.
- This checkpoint does **not** connect the helper to any current public reader/search/presence/notification/history surface.
- Continue cumulative Draft #328. Lira author-inspects the cumulative foundation, publishes stable head/evidence and STOP.
- Reader integrations and all later SA04 checkpoints remain unassigned. Lev remains unassigned pending a larger stable review scope.


## 2026-11-12 — SA04-A4 author checkpoint complete; Lira STOP

- A2/A3 remain Mira checkpoint-PASS. Draft #328 stable exact head `11652f64df234e10bb3783fe93c8e8b3073be262`, two added A4 source/test files, no reader integration.
- Pure neutral projection, strict allowlist and ID/state invariants, 5 A4 unit regressions; no private original name/avatar/bio/external links for inactive.
- Personal cumulative author inspection complete. Exact-head CI #43157355266 **SUCCESS** (2242 app; 700 native PG17; 69-table parity).
- Next Mira A4 checkpoint/scope review; no Lev review, no A5/B+ assignment, no merge.

## 2026-11-12 — SA04-A4 checkpoint review: CHANGES REQUIRED

- Reviewed cumulative Draft #328 exact head `11652f64df234e10bb3783fe93c8e8b3073be262`.
- **SA04-A4-MIRA-01:** `projectPublicAccountIdentity` accepts deactivated lifecycle state when retention is merely later than deactivation; canonical A1 contract requires retention >= deactivation + one UTC calendar year.
- This violates A4's explicit fail-closed requirement for inconsistent lifecycle state.
- Exact-head CI #43157355266 is SUCCESS but does not prove this invariant.
- Return only this bounded correction to Lira. No A5/B+, Lev review or merge before a new stable head and repeat Mira checkpoint review.


## 2026-11-12 — SA04-A4-MIRA-01 correction author complete; Lira STOP

- Confirmed the Mira defect against `drizzle/0065_sa04_account_state_foundation.sql` and existing native PG17 migration leap-day coverage. The old A4 projector allowed retention before one UTC calendar year.
- Corrected only `db/public-identity.ts` (one UTC calendar year with PostgreSQL 29-Feb clamp) and `db/public-identity.test.ts` (one focused boundary test, six A4 tests total). Cumulative Draft #328 new exact head `9053b19425c48d38a5384a3b8620ca2a0c4b35dc`.
- Personally inspected the cumulative four-file implementation/diff and corrected code/test behavior. [Exact-head CI #43159121332](https://github.com/iliya1947/vico-forum/actions/runs/43159121332) SUCCESS: 2243 app, 700 native PG17, 69-table parity and build/lint/typecheck.
- **Next Mira repeat A4 checkpoint** and SA04-A4-MIRA-01 closure decision. **Lira STOP**, A5/B+ and Lev unassigned.

## 2026-11-12 — SA04-A4 repeat checkpoint review PASS

- Re-reviewed cumulative Draft #328 exact head `9053b19425c48d38a5384a3b8620ca2a0c4b35dc`.
- **SA04-A4-MIRA-01 CLOSED:** neutral public projection now enforces the canonical A1 UTC +1 calendar-year minimum retention boundary, including leap-day clamping.
- Focused tests cover sub-year rejection, 1 ms-before rejection, exact boundary and later acceptance across leap/non-leap/month/year edges.
- Active/deleted allowlists and no-reader-integration boundary remain intact.
- Exact-head CI #43159121332 SUCCESS.
- **PASS — 0 confirmed open current-scope A4 defects.**
- #328 stays Draft/cumulative. Lira STOP; no Lev review/merge at this checkpoint.

## 2026-11-12 — SA04-B assigned

- Original accepted Lev checkpoint B is one independently completable result in the current repository and is not split further.
- Continue cumulative Draft #328 from `9053b19425c48d38a5384a3b8620ca2a0c4b35dc`.
- Scope: canonical profile only. Inactive target public profile must preserve stable ID/URL and public structural/statistical fields while neutralizing raw name/image/bio/profile links before server serialization/presentation.
- Active profile behavior and SA-03 independent privileged composition remain unchanged.
- No other public-reader surface and no auth/session/writer enforcement is assigned.
- Lira publishes stable B head/evidence, performs author inspection and STOP. C+ unassigned; Lev remains unassigned pending a larger stable cumulative slice.


## 2026-11-12 — SA04-B author checkpoint complete; Lira STOP

- Mira A2–A4 checkpoint-PASS preserved; cumulative Draft #328 exact head `22c05bfa824a0d5284c818f92b691056fd0749f7` (base unchanged), 15 files.
- Canonical public profile reads one authoritative lifecycle+identity snapshot and projects via A4 before returning, removing original name/image/bio/external links and deactivation facts, keeping ID/URL/role/joinedAt/post statistics. Active profile and SA03 Owner/Admin private composition unchanged.
- One native PG17 direct reader test (all 701 native pass), 3 app route/view/privilege cases (all 2246 app pass); RU/HE key and matching source fingerprint added after initial typecheck found missing manual-pack entries.
- Personal author source/diff inspection complete. Exact-head CI #43164075663 SUCCESS; SA03 #43164076028, SA01 #43164075715, AP10 #43164075869 Chromium workflows SUCCESS. DrizzleKit generate BigInt message also present on previous green A4 head; no schema change in B, PG manifest 69 tables.
- **Lira STOP. Next Mira bounded B checkpoint/scope review**, C+ and Lev unassigned; no merge.

## 2026-11-12 — SA04-B checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `22c05bfa824a0d5284c818f92b691056fd0749f7` against bounded B and current source-of-truth.
- B delta is canonical profile + required localization/tests only; accepted A2–A4 foundation is preserved.
- Inactive raw name/image/bio/profile links and lifecycle-private fields are removed at repository DTO boundary before loader serialization; active profile and stable public structural/statistical fields remain.
- SA-03 privileged sections remain independently admitted and retain only their already-authorized private/evidence semantics.
- Exact-head CI #43164075663 and SA03/SA01/AP10 Chromium workflows are SUCCESS.
- **PASS — 0 confirmed current-scope B defects.**
- #328 remains cumulative Draft; no Lev review/merge at B alone. Lira STOP; C+ unassigned.

## 2026-11-12 — SA04-C decomposed; C1 assigned

- Accepted Lev checkpoint C is compound in the current repository and is operationally split before Lira handoff:
  - **C1:** canonical topic page — topic author and current post authors;
  - **C2:** category/section topic-list authors, including latest/pinned projections;
  - **C3:** remaining public discovery/Help author summaries; granularity must be checked again before assignment.
- Only **C1** is active now.
- Continue cumulative Draft #328 from `22c05bfa824a0d5284c818f92b691056fd0749f7`.
- C1 preserves stable author IDs/profile relationships and all published topic/post/content/attachment/state fields while replacing inactive public author name with Deleted user and suppressing raw author image/name before public DTO/presentation.
- Active and mixed-author behavior must remain correct.
- Post-history, notifications, directory, mentions, presence, auth/session/writers and C2+ are outside C1.
- Lira publishes stable C1 head/evidence, performs author inspection and STOP. Lev remains unassigned pending a larger stable cumulative slice.

## 2026-11-12 — SA04-C1 author complete; Mira checkpoint next

- Continued cumulative Draft #328 from Mira-accepted B head `22c05bfa824a0d5284c818f92b691056fd0749f7`; exact new head `306319bb506bb95ddda776dbc1a0b04a9c3e8fe3`, base unchanged, 21 cumulative files.
- Reader/loader/UI author-neutralization implemented only for canonical topic page/current post authors. A4 projector used, no new lifecycle policy; original identity/lifecycle not serialized. Active/mixed behavior and published topic/post state preserved.
- First exact-head CI diagnosed three historical test migrations missing accepted A1 column `deactivated_at` and an active topic object reference regression; only those 3 test fixtures and route guard corrected. A first AP10 browser run had a connection hang-up on an unrelated admin authorization operation; subsequent exact head AP10 is fully green, no AP10 product change.
- **Final exact-head CI #43198894729 SUCCESS**: 2248 app, 702 native PG17, 69-table manifest parity; SA03 #43198894476, SA01 #43198894492 and AP10 #43198894423 all SUCCESS.
- Personal C1 author inspection + cumulative changed-file inventory/diff performed. **Lira STOP; next Mira C1 bounded checkpoint/scope review**, no C2+, Lev, merge, docs or production.

## 2026-11-12 — SA04-C1 checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `306319bb506bb95ddda776dbc1a0b04a9c3e8fe3`; current main remains `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- C1 direct topic-page DTO projects inactive topic/current-post authors through the accepted A4 contract; stable IDs/content/state remain and raw identity/lifecycle fields do not cross the public DTO.
- Loader/presentation add a defensive neutral mask and localized Deleted-user rendering; edit recovery reuses the current loader identity.
- Active/mixed authors remain correct. C2/C3 and later reader families are untouched.
- Exact-head CI #43198894729 and SA03/SA01/AP10 Chromium workflows are SUCCESS.
- **PASS — 0 confirmed current-scope C1 defects.**
- #328 remains cumulative Draft. Lira STOP; C2+ and Lev remain unassigned.

## 2026-11-12 — SA04-C2 assigned

- C1 remains Mira checkpoint-PASS on `306319bb506bb95ddda776dbc1a0b04a9c3e8fe3`; current main/base remains `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- C2 is one bounded reader family in the current code: `readCategory` latest+pinned topics plus `readSection` topic summaries and their existing route/presentation boundary.
- Inactive topic authors must expose only the neutral Deleted-user public name before direct DTO/serialization; raw identity/lifecycle markers stay private.
- Topic IDs/titles/activity/pin/count/tags/read-state, selection/ranking/order and active entries remain unchanged.
- Popular/Unanswered/Tags/Search/Unread/Help and all later readers/runtime enforcement are outside C2.
- Continue cumulative Draft #328. Lira author-inspects, publishes stable C2 head/evidence and STOP.
- C3+ and Lev remain unassigned.

## 2026-11-12 — SA04-C2 author complete; Mira checkpoint next

- Previous C1 Mira PASS `306319bb506bb95ddda776dbc1a0b04a9c3e8fe3`. Continued cumulative Draft #328 only for assigned C2; main unchanged. Exact stable new head `8946b74b0271efd4ef7cfe2c2c595ee59d8061b6`, 23 cumulative changed files.
- Canonical category latest/pinned and section summaries now neutralize inactive topic authors using A4 identity projector; direct DTO, serialized routes and view render original names only for active authors. Published hierarchy, rank/selection/order and counts preserved.
- First interim PG reported PostgreSQL `42702` due nested duplicate `id` from `user.id` + topic ID; corrected author id projection to existing `forumTopics.authorId`. One secondary pin cleanup failure was a consequence of test read failure. App test remained green on interim head; final native PG fully green.
- Exact-head [CI #43203180652](https://github.com/iliya1947/vico-forum/actions/runs/43203180652) SUCCESS (2250 app/703 PG17; 69-table schema), SA03 #43203180576, SA01 #43203180622, AP10 #43203180835 Chromium SUCCESS all jobs.
- Lira personally inspected C2 source/complete cumulative changed-file inventory and affected code/tests; no confirmed current C2 defect, author STOP.
- **Next Mira bounded C2 checkpoint/scope review** on exact stable head. C3+, Lev, docs/merge/production unassigned.

## 2026-11-12 — SA04-C2 checkpoint review PASS

- Reviewed cumulative Draft #328 exact stable head `8946b74b0271efd4ef7cfe2c2c595ee59d8061b6`.
- Confirmed direct `readCategory` latest+pinned and `readSection` topic summaries neutralize inactive author identity through the accepted A4 projector without carrying raw lifecycle fields into public DTOs.
- Confirmed rank/order/count/pin/tag/revision semantics are unchanged; the interim SQL 42702 ambiguity is corrected locally on the final head.
- Defensive category/section serialization and localized UI presentation do not restore raw inactive identity.
- Exact-head CI #43203180652 and SA03/SA01/AP10 Chromium workflows are SUCCESS.
- **PASS — 0 confirmed current-scope C2 defects.**
- #328 remains cumulative Draft. Lira STOP; C3+ and Lev remain unassigned.

## 2026-11-12 — SA04-C3a author complete; Mira checkpoint next

- Accepted C2 Mira PASS exact `8946b74b0271efd4ef7cfe2c2c595ee59d8061b6`; continued cumulative Draft #328 only for assigned Popular/Unanswered C3a. New exact head `04fb2510afb0c32494509424b6b0af280c5743bc`, 25 files.
- `readPopular` three windows and `readUnanswered` eligible summaries project A4 neutral account identity from joined lifecycle before direct DTO. Correct original rank/count/order/title/locale/category semantics and active identities preserved, no C3b+ change.
- Defensive Popular/Unanswered loaders and localized UI also neutralize marked deleted authors, with native PG17 and EN/HE route/DOM secret-marker tests, raw UI fixture defense.
- Initial lint unused destructuring, incorrect new test newest-first expectation and Set literal-union typing found/fixed locally; no related product or schema alterations.
- Final exact-head CI #43208714882 SUCCESS: 2252 app/704 PG17, 69-table parity; SA03 #43208714867, SA01 #43208714997 and AP10 #43208714917 Chromium SUCCESS.
- Mandatory Lira author inspection of cumulative diff and C3a code/tests performed; no confirmed current C3a defect. **Lira STOP; Mira bounded C3a review next.** C3b+, Lev/Mark, docs/merge/production unassigned.

## 2026-11-12 — SA04-C3b author complete; Mira review next

- Previously accepted SA04-C3a Mira PASS exact `04fb2510afb0c32494509424b6b0af280c5743bc`; cumulative Draft #328 C3b Tag/Search complete on exact `6c30b6f5a51e17f3a4722e677e60d8c5150e6baf` (27 files), base unchanged.
- Direct `readTag`/`search` project joined author lifecycle using accepted A4; deleted name neutral, private lifecycle not exposed; tag order/membership/tags and Search query normalization, title/tag/post match rank/activity/limit preserved.
- Public Tag/Search loaders allowlist/mask before serialization; UI renders translated Deleted user under malformed raw author fixture. New PostgreSQL and EN/HE route/DOM tests confirm mixed identities, rank/content/counts/links and absence of private markers.
- CI #43220966986 SUCCESS (2254 application /705 native PG17 tests; 69-table parity); SA01 #43220967022, SA03 #43220967370, AP10 #43220967091 Chromium SUCCESS including four AP10 jobs. Lira author inspection done, no confirmed current-scope C3b defect.
- **Lira STOP; Mira C3b checkpoint next** on exact stable head. C3c+/Lev/Mark and merge/docs/production remain unassigned.


## 2026-11-12 — SA04-C3c author complete; Mira checkpoint next

- C3b coordinator PASS exact `6c30b6f5a51e17f3a4722e677e60d8c5150e6baf`; bounded C3c implemented in cumulative Draft #328 exact `35bbf78a91d75818318f83ddc7413a69ddc001aa` (28 changed files), main/base unchanged.
- `readUnreadForUser` projects same-row joined author A1 lifecycle via existing accepted A4 `projectForumPublicAuthor` before the public DTO. `/unread` loader selects safe fields and masks marked deleted identity; `UnreadView` uses generic translated `deletedUser`, protecting even malformed original-name fixtures.
- All existing 401, `new/unread`, first-unread/latest IDs, counters, activity/order, title, category/section and section state-only usage preserved. No new product schema/migration or writer. Native PG fixture adds existing migration 0023 only to support new test.
- New native PG and EN/HE route/DOM tests verify mixed author lifecycle, unchanged read-state and link/group behavior, and no original name/avatar/deactivation actor/time leaks. First PG run failed only fixture missing table; corrected and fully green thereafter.
- Final exact-head CI [#43226057368](https://github.com/iliya1947/vico-forum/actions/runs/43226057368) SUCCESS: 2256 app/706 PG17, 69-table parity and Worker smoke; SA01 [#43226057393](https://github.com/iliya1947/vico-forum/actions/runs/43226057393), SA03 [#43226057417](https://github.com/iliya1947/vico-forum/actions/runs/43226057417), AP10 [#43226057468](https://github.com/iliya1947/vico-forum/actions/runs/43226057468) all Chromium SUCCESS.
- Lira inspected current exact six-commit five-file C3c diff, entire 28-file cumulative inventory and relevant logic/tests; no confirmed current-scope C3c defect. **Lira STOP; Mira bounded checkpoint C3c next.** C3d+/Lev/Mark/docs/merge/production not assigned.
