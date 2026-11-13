# Admin panel — current workflow

- **Service PR #251. Current main: `44d6b69a8d235cc8b1ee30953839be71e6ab836a`. SA04-I #329 merged.**
- **SA04-J technical plan accepted:** Lev plan [#6858869802](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6858869802), Mira scope/fit PASS.
- **Developer-fixed execution rule:** Lev plans the full technical stage; Lira implementation is split into bounded checkpoints.
- **J implementation decomposition:**
  1. **J1 — shared Drizzle AccountState mutation admission seam** for Forum transactions; no Forum mutation integration yet.
  2. **J2 — publication:** createTopic / createTopicWithInitialPost / createPost, including replay and transaction-side final bind/receipt.
  3. **J3 — revisions/edit/source-locale:** reviseTopicTitle / revisePostBody / editPublishedPost + the two same-locale service success paths.
  4. **J4 — profile write:** updateProfile.
  5. **J5 — read-state write:** advanceTopicReadState.
  6. **J6 — inbox acknowledgement:** markNotificationRead / markReplyNotificationRead.
  7. **J7 — topic state moderation:** setTopicClosed / pinTopic / unpinTopic.
  8. **J8 — solved/best answer:** markTopicSolved / selectBestAnswer.
  9. **J9 — Help Signals:** createHelpSignal / withdrawHelpSignal / resolveHelpSignal.
  10. **J10 — Help solution moderation:** setHelpSolutionModeration.
  11. **J11 — duplicates/appeals:** confirm/remove duplicate, appeal, resolve duplicate appeal.
  12. **J12 — cumulative J closure:** preserve F presence, complete cross-family lock/race map and connected native/HTTP/Worker/browser evidence for the full cumulative J head; no new family unless a verified J gap is found.
- **Active checkpoint: J1 only. Lira owns J1.**
- **J1 result:** extend the existing AccountState mutation admission so a Drizzle Forum transaction can perform authoritative active/missing/inactive admission and hold the lifecycle row lock through caller commit/rollback, while preserving the existing native AccountState API and error classification.
- **J1 done when:** focused tests prove active/inactive/missing, unavailable-vs-unexpected classification and transaction-local lock behavior; no ForumRepository mutation is wired to the new seam yet; no schema/migration/dependency/public-contract change.
- Lira starts a new cumulative **Draft SA04-J implementation PR from current main**, implements J1 only, personally inspects the bounded result, publishes exact head/evidence, then **STOPs for Mira J1 checkpoint review**.
- **Lev/Mark unassigned. J2+ are not assigned.**

## I5 author checkpoint decomposition

1. **I5a — native core connected chain:** Mira PASS exact `58130793d05f6eb2a8b867b2fb546ccddcd6fb59`.
2. **I5b — SET-05 stale/deactivated chain:** Mira PASS exact `705519ce10f78801c2614a1cafa13347e0d2a75b`.
3. **I5c — Google callback/link and observer/failure composition:** **Mira PASS** exact `23554aad29ddd23edb540cddc2069533ebe99329`.
4. **I5d — built Worker/browser connected acceptance:** **Mira PASS** exact `74c6f43ae2d67526e2ad17aa50392aebf41abbca`.
5. **I5e — final connected sweep/evidence map:** **Lira AUTHOR STOP → Mira cumulative whole-I review**, exact `74c6f43ae2d67526e2ad17aa50392aebf41abbca`.

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


## 2026-11-12 — SA04-G Mira checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `f6a2c1ef378bfd5f30ece746f65253963f4d6125` against accepted SA-04 row G and current source-of-truth.
- Both notification readers neutralize inactive reply/mention actor identity through the accepted A4 lifecycle projection before public DTO serialization; active actors remain unchanged.
- Recipient membership, reply/mention and complaint-system notification kinds, unread-first ordering, pagination/counts, targets, timestamps/read state and mark-read semantics remain intact. No recipient lifecycle admission, producer/fanout/replay, auth/session or later writer scope leaked into G.
- The notifications loader uses an explicit allowlist and defensive deleted-actor mask; presentation localizes Deleted user and emits no retained-name avatar initial. Malformed/private lifecycle or identity fields are not serialized.
- Native PostgreSQL 17, route/.data and EN/RU/HE DOM regressions cover mixed active/inactive actors and system notifications. Exact-head CI #43291399256, SA01 #43291399192, SA03 #43291399357 and AP10 #43291399295 were independently rechecked as SUCCESS.
- **PASS — 0 confirmed current-scope SA04-G defects.**
- #328 remains Draft/cumulative. Lira STOP; H+ and Lev/Mark remain unassigned until the next explicit continuation.


## 2026-11-12 — SA04-H Mira checkpoint review PASS

- Independently reviewed cumulative Draft #328 exact H head `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85` against accepted row H and the G→H seven-commit/six-file delta.
- `readPostHistory` now projects same-row revision-author lifecycle through accepted A4 before returning the direct DTO; inactive authors expose only stable `authorId`, neutral Deleted user name and the narrow deleted marker. Active authors remain unchanged.
- Existing revision membership, original content/source locale, timestamps and newest-first ordering are preserved. The existing `forum.post.history.read` gate remains before the reader; no RBAC/auth/session/writer/schema behavior changed.
- Action/.data uses an explicit field allowlist and masks a deleted-marked stale name; shared Quick actions presentation localizes `deletedUser` without changing retained revision text.
- Native PostgreSQL, protected action/.data and shared DOM regressions cover mixed active/inactive authors and preservation/privacy boundaries.
- Exact-head workflows independently rechecked: CI #43296996996, SA03 #43296997015, SA01 #43296997261 and AP10 #43296997445 — all completed **SUCCESS**.
- **PASS — 0 confirmed current-scope SA04-H defects.**
- #328 remains cumulative Draft/open/unmerged. I+ is not started. Lira STOP. Reviewer/next enforcement transition is deliberately not assigned in this checkpoint.


## 2026-11-12 — SA04-A2–H cumulative coordinator gate PASS; Lev review assigned

- Final Draft #328 exact head for this review gate: `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85`, 49 changed files from merged A1 main baseline `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Mira completed the required cumulative whole-PR review on this exact head after the bounded A2–H checkpoint cycle. Final source/inventory review confirmed the shared AccountState/A4 invariants, all assigned public/read-side consumers B–H, preservation boundaries, and absence of I+ Better Auth/authoritative-writer scope.
- Exact-head CI #43296996996, SA03 #43296997015, SA01 #43296997261 and AP10 #43296997445 remain SUCCESS.
- **Coordinator verdict: PASS — 0 confirmed current-scope A2–H defects.**
- A1 is already merged and had its own Lev independent PASS before merge; it is the baseline contract, not a review target to spend again.
- **Lev is now assigned one meaningful independent review:** cumulative A2–H in #328 exact `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85`. Review the whole current slice independently against the accepted SA04 plan/current Stage; classify only confirmed current-scope defects, and report the complete findings packet or PASS. Do not implement fixes during review.
- SA04-I and later enforcement, SA05+, docs closeout, merge, Stage6/production and #315 remediation remain unassigned.


## 2026-11-12 — SA04-A2–H implementation gate closed

- Lev independent whole-PR PASS accepted on exact `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85`; Mira cumulative PASS and Lev PASS cover the same 49-file implementation head.
- #328 metadata was corrected to final reviewed scope and converted from Draft to **Ready for review** without changing implementation head.
- Under the Lev-review granularity rule, #328 is frozen: do not append SA04-I+ and force repeat review of A2–H.
- No docs closeout is started because the overall SA04 package is not complete. No production/Stage6 action.
- **Next action: Owner merge #328.** After merge, synchronize main and only then scope the next SA04-I enforcement implementation separately.


## 2026-11-12 — SA04-A2–H post-merge synchronization

- Verified #328 merged from the exact reviewed implementation head `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85`.
- Merge commit and current `main`: `13456a17f23c1385bef8ab11c735f43d201edd02`.
- Reviewed SA04-A2–H lifecycle/public-projection slice is now delivered in repository main together with previously merged A1.
- Permanent docs remain intentionally deferred until full SA04 closeout; current source-of-truth still describes SA04 as future and must not be silently treated as already updated.
- No SA04-I implementation, SA05+, Stage6/production or #315 remediation is started by this synchronization.
- Next continuation performs the SA04-I granularity/scope gate from current main before any Lira handoff.


## 2026-11-12 — SA04-I scope/granularity gate

- Current main remains `13456a17f23c1385bef8ab11c735f43d201edd02`; merged A1–H are baseline.
- Rechecked accepted SA04 §4 against current `app/auth/auth.server.ts`, request/session context, `/api/auth/*` route, Worker pre-routing session initialization and existing native auth acceptance inventory. Better Auth remains pinned to 1.7.7.
- Row I is **too broad for one Lira handoff**. It combines distinct session-resolution, endpoint-admission, session-creation, adapter-target-write and connected acceptance boundaries.
- Operational split for one new cumulative Draft implementation PR:
  1. **I1 — pre-routing session resolution admission.** Inactive/missing persisted account cannot become request identity through `AuthRuntime.getSession`; classified account-state storage outage remains unavailable/503 path, unexpected faults are not guest fallback. Existing Set-Cookie ordering/session semantics preserved.
  2. **I2 — authenticated Better Auth endpoint/direct-API admission.** Canonical request hook rejects inactive authenticated actors across HTTP/direct calls while preserving existing link-social/signup behavior and the explicit own-sign-out exception.
  3. **I3 — new-session target admission.** Session creation admission is unconditional and independent of telemetry; inactive target cannot receive a new email/Google/directly-created session. Existing auth facts remain observers, not enforcement.
  4. **I4 — atomic target-write closure.** Existing-user/account/session target mutations resolve the authoritative target server-side and close check/write races on the canonical adapter/writer boundary without introducing a second auth backend or holding locks across external OAuth exchange.
  5. **I5 — connected I closure.** Whole Better Auth HTTP/direct/native acceptance for old sessions, new sign-in, link/password/session paths, own sign-out, outage/error/cookie semantics and preservation of existing registration/linking/rate-limit/telemetry contracts.
- I1–I4 are intermediate Draft checkpoints only. **None is mergeable or may be described as completed SA04-I.** I5 closes row I, after which Mira performs cumulative I whole-PR review before any independent Codex review.
- J+ remains outside this split. No implementation PR or agent assignment is created by this gate.


## 2026-11-12 — SA04-I1 bounded author handoff

- Baseline: current main `13456a17f23c1385bef8ab11c735f43d201edd02`; merged A1–H are accepted baseline.
- **Only I1 is assigned to Lira:** pre-routing session-resolution admission on the existing `AuthRuntime.getSession → initializeAuthContext → Worker` chain.
- Required result: a persisted inactive account must not become request identity from an old Better Auth session. Active-account session behavior remains unchanged.
- Preserve current session-storage failure semantics: classified availability/connection/query-timeout remains the existing unavailable/503 path; unexpected schema/programming/configuration failures must not degrade to guest. Preserve existing Better Auth session cleanup/sliding `Set-Cookie` behavior and endpoint-last cookie ordering.
- Scope is limited to the session-resolution/request-context boundary and focused tests/evidence. Do **not** implement I2 request/direct endpoint hooks, I3 session-create admission, I4 adapter target-write enforcement, or any J+ application writers.
- Start a **new cumulative Draft implementation PR** from `13456a17f23c1385bef8ab11c735f43d201edd02`; it remains Draft through I1–I4. No merge/readiness claim at I1.
- Ready for checkpoint when focused unit/native auth-runtime/session-context coverage and applicable existing regressions are green, Lira personally inspects the completed I1 diff/behavior, publishes stable exact head/evidence, and **STOPs**.
- Lev/Mark remain unassigned.


## 2026-11-12 — SA04-I1 Mira checkpoint PASS

- Mira reviewed the complete main→I1 two-file delta in Draft PR #329 on exact stable head `649dada0e2dfc5333c7c072170c0fd8c71a4501a`.
- The pre-routing chain remains canonical Better Auth `getSession` first, then A2 `readAccountState` on the same request-owned PostgreSQL client, before identity can enter `authSessionContext`.
- Active session identity and original Better Auth cleanup/sliding headers remain unchanged. Deactivated/non-active state returns no request identity and does not delete retained user/session data.
- A2 classified availability failures become the existing `AuthSessionUnavailableError` path consumed by Worker safe no-store 503; unexpected state/schema/programming failures remain unexpected.
- The added third callback argument to internal `useAuth` exposes only the already-owned client; existing callbacks remain behaviorally unchanged.
- I2 direct/HTTP auth admission, I3 session-create gate and I4 authoritative target-write/session-update closure are intentionally future checkpoints and are **not** I1 defects.
- Exact-head CI #43309142541, SA01 #43309142501, SA03 #43309142598 and AP10 #43309142441 are SUCCESS.
- **PASS — 0 confirmed current-scope I1 defects.**
- #329 remains Draft/cumulative. Lira/Lev/Mark STOP; I2 is not assigned until a separate continuation.


## 2026-11-12 — SA04-I2 bounded author handoff

- Baseline: current main `13456a17f23c1385bef8ab11c735f43d201edd02`; cumulative Draft #329 accepted I1 head `649dada0e2dfc5333c7c072170c0fd8c71a4501a`.
- **Only I2 is assigned to Lira:** authenticated Better Auth HTTP/direct-API actor admission.
- Required result: once Better Auth resolves a current authenticated actor for an auth endpoint/direct `auth.api.*` operation, an inactive/missing account must be denied before private auth data or authenticated mutation is served/performed.
- Preserve active-user behavior, existing signup/sign-in guest paths, registration policy, explicit Google-link identity/mismatch checks, password rate limit/freshness, and current error classification.
- **Own sign-out exception is required:** an inactive account may still sign out its own current session and clear its cookie. This does not authorize list/revoke/change/link/update operations.
- Keep controlled inactive denial free of retained/private account data. Preserve private/no-store and existing Set-Cookie ordering semantics.
- **Outside I2:** I1 pre-routing resolution is already accepted; I3 session-create target admission, I4 atomic server-resolved target writes, I5 connected closure and J+ remain unassigned. Do not solve guest existing-user sign-in/callback target races in I2.
- Continue in existing cumulative Draft #329; do not create another implementation PR and do not mark it Ready.
- Ready for checkpoint when focused HTTP + direct-API tests prove inactive denial/active preservation/sign-out exception and applicable existing auth regressions are green; Lira performs author inspection, publishes stable exact head/evidence, then **STOP**.
- Lev/Mark remain unassigned.


## 2026-11-13 — SA04-I2 Mira checkpoint: CHANGES REQUIRED

- Reviewed cumulative Draft #329 exact `5ac398f472d18e32e9ab836eef99f6f62a6de4ee`, complete accepted-I1→I2 delta and applicable auth/session contracts.
- **I2-MIRA-01 — confirmed current-scope defect.** For protected authenticated endpoints other than `/get-session`, the new pre-hook calls `getAuthoritativeSessionFromCtx(ctx)` before A2 AccountState admission. That helper performs the authoritative session lookup with cookie-cache bypass but **without disabling session refresh**. A due inactive session can therefore be slid/updated and emit Set-Cookie **before** `readAccountState` rejects the inactive actor.
- This violates accepted SA04 §4/I2 requirements that preliminary auth admission disable refresh and that inactive authenticated operations be denied before private response/mutation. It is not I3/I4 future work: the mutation is caused by the I2 actor preflight itself.
- Existing I2 tests prove active sliding and inactive denial, but do not stage a due inactive session on a non-`get-session` protected endpoint, so they do not catch this ordering defect.
- Required correction result: inactive actor preflight must not refresh/update session or issue a refreshed session cookie before AccountState admission; active-user canonical endpoint/session behavior must remain unchanged after successful admission. Implementation method is left to Lira within the accepted I2 boundary.
- Add focused native regression proving a **due inactive** session on at least one non-`get-session` protected HTTP/direct path is denied with unchanged persisted expiry/update state and no pre-admission refresh cookie, while the corresponding active path retains canonical behavior.
- No other current-scope I2 defects confirmed in the completed sweep. I3/I4 gaps remain correctly future checkpoints.
- Lira corrects only `I2-MIRA-01` in existing Draft #329, performs author inspection, publishes new stable exact head/evidence and STOPs. Mira then repeats the bounded I2 checkpoint review. Lev/Mark remain unassigned.

## 2026-11-13 — SA04-I2-MIRA-01 correction author complete; Lira STOP

- From Mira CHANGES REQUIRED head `5ac398f472d18e32e9ab836eef99f6f62a6de4ee`, Lira corrected only the due-inactive preflight refresh defect in cumulative Draft #329. Stable new exact head `b7dc303ee0d10312e5d41af9889d26d6b264a6e6`, unchanged base/main.
- Read-only no-cache preflight; inactive 401 with no retained session refresh/Set-Cookie, active due normal endpoint refresh and normal session/link-state one-read preservation. Added one due inactive/active real BA/PG17 regression, 3 correction commits, only `app/auth/auth.server.ts` and `tests/database/auth-runtime.test.ts`.
- First CI database failed four existing OAuth-link one-lookup assertions; root-cause was unconditional active reread. Fixed by rerunning canonical refresh only for due active sessions. Final exact-head Actions **all SUCCESS**: CI #43379564521 (2269 app, 722 PG17), SA01 #43379564649, SA03 #43379564578, AP10 #43379564500 (4 jobs).
- Lira personally inspected all three correction commits and final bounded diff/upstream pinned Better Auth behavior; **not** Mira/Lev review. **Next Mira repeat I2 checkpoint on exact `b7dc303ee0d10312e5d41af9889d26d6b264a6e6`**. I3+/Lev/Mark STOP; PR remains Draft/unmerged.


## 2026-11-13 — SA04-I2 repeat Mira checkpoint PASS

- Re-reviewed cumulative Draft #329 exact `b7dc303ee0d10312e5d41af9889d26d6b264a6e6` after the bounded `I2-MIRA-01` correction, including the full three-commit correction delta and preservation of previously reviewed I2 behavior.
- The actor preflight now resolves every protected actor session with cookie cache bypassed and refresh disabled, then performs the A2 persisted AccountState admission on the same request-owned PostgreSQL client.
- Inactive/missing actor is denied before session refresh/update; the new real Better Auth 1.7.7 + PostgreSQL regression proves a staged due inactive `/list-sessions` request returns 401 with no Set-Cookie and unchanged session id/token/expiry/update timestamp.
- After active admission, a due active session releases the temporary request context so the canonical endpoint retains its original refresh/Set-Cookie ownership; non-due active paths keep the one authoritative preflight session and existing Google-link behavior.
- Existing own sign-out exception, I1 pre-routing behavior, direct API admission, state-failure classification and cookie ordering remain intact.
- Exact-head CI #43379564521, SA01 #43379564649, SA03 #43379564578 and AP10 #43379564500 are SUCCESS.
- `I2-MIRA-01` is **CLOSED**. **PASS — 0 remaining confirmed current-scope I2 defects.**
- I3–I5/J+ remain separate future checkpoints, not I2 defects. #329 stays cumulative Draft; no Lev review is spent on this intermediate checkpoint.


## 2026-11-13 — SA04-I3 bounded author handoff

- Baseline: current main `13456a17f23c1385bef8ab11c735f43d201edd02`; cumulative Draft #329 accepted I2 exact head `b7dc303ee0d10312e5d41af9889d26d6b264a6e6`.
- **Only I3 is assigned to Lira:** authoritative target admission immediately before Better Auth creates a new session.
- Required result: if the server-resolved target user is persisted inactive or missing, **no new Better Auth session may be created or issued**, including guest/returning flows with no prior active request session.
- The admission must be unconditional with respect to SA-02 telemetry/observer configuration and must compose with the existing session-create `after` fact/evidence machinery rather than replacing it. Refused creation must not emit a successful `auth.sessionCreated` fact; successful active creation semantics/facts remain intact.
- Acceptance must cover the real pinned Better Auth 1.7.7 creation seam for at least: returning email/password sign-in, existing-user Google callback through the existing synthetic provider boundary, and direct/native internal session creation. New active signup/session creation remains unchanged.
- Preserve the existing I1/I2 actor gates, registration flags, explicit Google-linking rules, password/rate-limit behavior, session cookies/order and classified account-state unavailable vs unexpected failure semantics.
- **I3 stops at session creation.** Existing-user `user`/`account` updates or provider/password writes that can happen earlier in a sign-in/callback are **not** claimed closed here; their authoritative atomic target-write protection is I4. Do not widen I3 to an adapter-wide target-write decorator.
- Continue in existing cumulative Draft #329; do not create another implementation PR and do not mark it Ready/mergeable-complete.
- Ready for checkpoint when focused real Better Auth + PostgreSQL tests prove inactive/missing target no-session/no-session-cookie across the required creation paths, active controls remain intact, applicable existing auth/SA regressions are green, Lira personally inspects the bounded diff/behavior, publishes stable exact head/evidence, then **STOP**.
- I4–I5/J+ remain unassigned. Lev/Mark remain unassigned.
## 2026-11-13 — SA04-I3 author checkpoint complete; Lira STOP

- Implemented I3 only after Mira assignment from accepted I2 `b7dc303e...`. Cumulative Draft #329 exact `ba2337d788161915dbeb2de49ff320b4dad61768`, unchanged main/base; six I3 commits modify three files: `app/auth/auth.server.ts`, `tests/database/auth-runtime.test.ts`, `tests/database/sa02-auth-oauth-rollback.test.ts`.
- Server-resolved session target checked with shared A2 persisted active state by native BA session-create before hook, before cookie/INSERT, without observer dependency; merged with SA02 successful after-hook/evidence and preexisting I1/I2 admission. Inactive/missing denies, active controls preserved.
- Initial native I3 suite found native direct `betterAuth(betterAuthOptions(...))` bypass when hook existed only in `createAuth`; corrected by moving into canonical options. Existing Google callback denial is HTTP 401, not assumed 302; corrected test only. Final exact-head CI #43384252236 SUCCESS (2269 app/725 PG17); SA01 #43384252121, SA03 #43384252107, AP10 #43384252129 all SUCCESS.
- Lira inspected all six I3 commits/final 3-file diff and pinned BA 1.7.7 source; author evidence only, not Mira/Lev review. **Next Mira I3 checkpoint**. I4+/Lev/Mark unassigned; STOP.



## 2026-11-13 — SA04-I3 Mira checkpoint PASS

- Reviewed cumulative Draft #329 exact `ba2337d788161915dbeb2de49ff320b4dad61768`, complete accepted-I2→I3 six-commit delta across the three changed project files.
- The canonical Better Auth configuration now has an always-on `databaseHooks.session.create.before` lifecycle gate, independent of SA-02 observer configuration. It reads persisted A2 AccountState on the same request-owned PostgreSQL client and rejects inactive/missing targets before canonical session persistence/cookie issuance.
- `createAuth` correctly composes the existing SA-02 `session.create.after` observer with the I3 `create.before` hook by nested spreading the existing session/create hook; successful `auth.sessionCreated` evidence remains intact.
- Native coverage proves returning email/password HTTP sign-in, direct `internalAdapter.createSession`, existing-user synthetic Google callback, active controls, inactive/missing no-session/no-cookie, and classified lifecycle-storage outage vs unexpected failure. Exact-head CI #43384252236, SA01 #43384252121, SA03 #43384252107 and AP10 #43384252129 are SUCCESS.
- The remaining check/write race and atomic target-write protection belong to the already-separated **I4** checkpoint. They are not promoted to an I3 defect; I3 neither claims nor implements that atomic closure.
- **PASS — 0 confirmed current-scope I3 defects.**
- #329 remains cumulative Draft. No Lev review is spent on this intermediate checkpoint. I4–I5/J+ remain unassigned.


## 2026-11-13 — SA04-I4 granularity gate

- Purpose: preserve the accepted §4 target-write atomicity contract without handing Lira one oversized cross-model/race package.
- Verified pinned Better Auth **v1.7.7** release tag at commit `db02f233918ad1233bf0753e437e1c0da353273d` and inspected its `internal-adapter.ts`/OAuth seams. Current target writes use materially different authoritative selectors: session create has `userId`, session refresh/update is token-selected, user updates can be id/email-selected, account writes can be userId/id-selected, and session deletion/revoke needs the explicit inactive own-signout exception.
- Therefore former I4 is operationally split into four bounded author checkpoints in the **same cumulative Draft #329**:
  - **I4a — session create/update atomic closure.** Close AccountState check/write races for canonical session creation and refresh/update writes. Preserve I3 always-on create gate and active sliding/cookie behavior. No session deletion/revoke yet.
  - **I4b — existing-user write atomic closure.** Protect current Better Auth updates to an already-persisted user using the server-resolved target, including selectors that are not safely derivable from submitted identity. New-user creation remains normal; physical user deletion is not introduced.
  - **I4c — account write atomic closure.** Protect current account create/link/update/updateMany/delete shapes that target an existing user/account, including password/provider-token/linking paths, while preserving new-registration account creation for its active newly-created user and all canonical Better Auth validation/facts. No transaction/lock spans OAuth network exchange.
  - **I4d — session destructive writes + connected I4 closure.** Protect revoke/delete/deleteMany races while preserving the sole inactive exception: own current sign-out may still end/delete that session and clear its cookie. Then sweep all current configured user/account/session write shapes and prove the accepted short same-connection transaction/per-user-lock race contract end-to-end.
- I4a–I4c are intermediate Draft checkpoints only and cannot be called completed I4. I4d closes I4.
- Missing later model families in an earlier checkpoint are future I4 sub-checkpoints, not defects of that earlier bounded result.
- After each author STOP Mira performs a bounded checkpoint review; no Lev review until full I is complete and Mira cumulative whole-I PASS.
- **No I4 sub-checkpoint is assigned by this granularity-gate step.**


## 2026-11-13 — SA04-I4a assigned

- Starting point: cumulative Draft #329 exact accepted I3 head `ba2337d788161915dbeb2de49ff320b4dad61768`; main/base remains `13456a17f23c1385bef8ab11c735f43d201edd02`.
- **Lira owns I4a only:** close the AccountState admission→write race for canonical non-destructive session writes — new session creation and session refresh/update.
- Required result: the authoritative session target must remain active through the corresponding session write; a concurrent lifecycle transition must not slip between admission and persistence. Preserve the accepted I3 always-on create admission, active sliding/session/cookie semantics and existing successful SA-02 auth-fact behavior.
- Focused evidence must exercise the real Better Auth 1.7.7 create and token-selected refresh/update seams with active controls and concurrent deactivation ordering. Keep lifecycle-storage unavailable vs unexpected failure semantics intact.
- **Boundary:** no session revoke/delete/deleteMany or own-signout exception work (I4d), no existing-user writes (I4b), no account/link/password/provider writes (I4c), no I5/J+, no schema/product expansion unless strictly required by I4a.
- I4a is an intermediate Draft checkpoint and does not close I4 or I. After implementation, Lira personally inspects the bounded cumulative delta, runs applicable checks, publishes one stable exact head/evidence, and **STOPs for Mira I4a checkpoint review**. Lev/Mark remain unassigned.

## 2026-11-13 — SA04-I4a author checkpoint complete; Lira STOP

- Accepted I3 head `ba2337d788161915dbeb2de49ff320b4dad61768`. Cumulative Draft #329 exact `84885a2029267d31fa5b89bf84ef85fc2e9b72be`, 5 new I4a commits, 4 changed I4a paths: `app/auth/auth.server.ts`, `app/auth/session-write-guard.ts`, `tests/database/sa04-session-atomic.test.ts`, `tsconfig.node.json`.
- Canonical BA1.7.7 session `create/update` only: same native connection transaction + A2 active user-row lock through adapter write and commit; token-selected target for update, server-resolved target for create; no session deletion, user/account writes, extended OAuth transaction, schema or dependencies. Preserves I1–I3 and SA02 facts/cookies/error classification.
- 5 new real native PG17 tests prove both concurrency orderings, active INSERT/UPDATE lock duration, due HTTP refresh denial after deactivation with no new cookie/mutation, and classified/nonclassified locked-state failure. First exact-head CI found missing explicit Node tsconfig entry for new file; added one entry; no product workaround.
- Lira personally inspected all 5 I4a commits/final four-file diff and pinned BA source. Final exact head CI #43391363415 **SUCCESS: 2269 app, 730 PG17**; SA01 #43391363426, SA03 #43391363695, AP10 #43391363500 all SUCCESS, AP10 four jobs. PR #329 body updated; service I4a handoff follows.
- **Lira AUTHOR STOP, Mira I4a checkpoint next** on `84885a2029267d31fa5b89bf84ef85fc2e9b72be`. I4b–I4d/I5/J+ and Lev/Mark remain unassigned, no merge/docs/production.



## 2026-11-13 — SA04-I4a Mira checkpoint review: CHANGES REQUIRED

Reviewed exact `84885a2029267d31fa5b89bf84ef85fc2e9b72be`, the complete accepted-I3→I4a four-path delta, preserved I1–I3 runtime chain, and the pinned Better Auth v1.7.7 adapter/internal-adapter/get-session/sign-up transaction seams. Exact-head CI/SA01/SA03/AP10 Actions are all SUCCESS, but green checks do not close the following verified I4a defects.

1. **I4A-MIRA-01 — transaction-context session create bypasses the I4a guard.** Current project Drizzle adapter does not enable native adapter transactions; Better Auth v1.7.7 therefore uses its as-is transaction fallback, whose callback receives the underlying adapter. `guardBetterAuthSessionWrites` passes `transaction` through without re-wrapping that callback adapter, while `createWithHooks` deliberately uses the current transaction adapter. The real v1.7.7 `/sign-up/email` route runs inside `runWithTransaction` and creates its session there, so its session INSERT can bypass the Proxy. With transaction=false the earlier user/account writes are already persisted; I3's create.before is only an unlocked read. A concurrent deactivation can therefore commit after that read and before the unguarded session INSERT, leaving a session/cookie for an inactive target. This violates the assigned I4a create atomicity.
2. **I4A-MIRA-02 — losing the refresh/deactivation race breaks accepted pre-routing I1 semantics.** For pre-routing `runtime.getSession`, a due session refresh that reaches the new update guard after deactivation is translated by the guard to Better Auth `APIError(UNAUTHORIZED)`. Direct `auth.api.getSession` rethrows that APIError; `runtime.getSession` only maps storage-unavailable failures and therefore propagates it. The Worker only converts `AuthSessionUnavailableError` to 503, so the request fails instead of resolving the retained inactive session as guest/null as accepted I1 requires. The new test covers HTTP `/get-session` 401, not this pre-routing path.
3. **I4A-MIRA-03 — wrapper-owned PostgreSQL availability failures bypass the existing unavailable classification.** New raw `BEGIN`, token-target SELECT and transaction-control queries sit outside `assertActiveAccountForMutation`; the wrapper reports only existing `AccountStateUnavailableError/UnexpectedError` to `onAccountStateError`. On normal `runtime.handle` the database-error recorder is not enabled, so an availability error on these new wrapper-owned steps does not follow the established safe no-store 503 path. The current fault regression injects only at the locked account-state SELECT and therefore misses this branch. Unexpected failures must remain unexpected.

**Correction packet only:** make all current configured session create paths honor the atomic lifecycle closure even inside Better Auth transaction context; preserve guest/null pre-routing behavior when deactivation wins a due-refresh race while keeping canonical HTTP denial semantics; route availability failures from the new wrapper-owned SQL through the existing unavailable classification without masking unexpected errors. Add focused regressions for each chain.

Full remaining I4a sweep found no additional confirmed current-scope defect. Missing I4b/I4c/I4d model families remain future accepted sub-checkpoints, not I4a findings. **Verdict: CHANGES REQUIRED.** No Lev review.


## 2026-11-13 — SA04-I4a Mira repeat checkpoint PASS

- Re-reviewed cumulative Draft #329 exact `7e80479e03167a8856fe1b2094b8c17678f4ce22` from accepted I3 `ba2337d788161915dbeb2de49ff320b4dad61768`, including the full 11-commit/four-path I4a delta and the six corrective commits after prior `84885a2029267d31fa5b89bf84ef85fc2e9b72be`.
- Rechecked current `AGENTS.md`, project/Stage source-of-truth and official pinned Better Auth v1.7.7 transaction/adapter/session sources.
- **I4A-MIRA-01 CLOSED:** the adapter Proxy now also wraps `transaction(cb)`; Better Auth's as-is transaction fallback therefore stores a guarded callback adapter in AsyncLocalStorage, so transaction-context session creation (real `/sign-up/email`) cannot bypass the same-client active-user lock/INSERT boundary.
- **I4A-MIRA-02 CLOSED:** only the typed late inactive/missing I4a write denial is translated to guest/null by pre-routing `AuthRuntime.getSession`; canonical HTTP/direct Better Auth still receives Unauthorized. Real due-refresh race evidence preserves the retained row and emits no new cookie.
- **I4A-MIRA-03 CLOSED:** wrapper-owned BEGIN/token SELECT/COMMIT/ROLLBACK failures are cause-chain classified into existing unavailable vs unexpected account-state errors; normal runtime handling returns controlled no-store 503 only for classified availability failures and propagates unexpected failures.
- Writer-first and deactivation-first create/update races still hold the authoritative active target through persistence; I1–I3, active sliding/cookie behavior and successful SA-02 session facts remain preserved. Session destructive writes, user writes and account/provider/password writes remain correctly outside I4a.
- Independent exact-head evidence: CI #43395760369 SUCCESS — 184/184 files, 2269/2269 app tests; 69/69 files, 734/734 PostgreSQL17 tests including 9/9 I4a; lint/typecheck/build/schema/migration/Worker steps SUCCESS. SA01 #43395760261, SA03 #43395760395 and AP10 #43395760289 Chromium runs all SUCCESS.
- **PASS — 0 remaining confirmed current-scope I4a defects.** I4a is an intermediate checkpoint only; no Lev review until full I is complete and Mira cumulative whole-I PASS. Stop before I4b assignment.


## 2026-11-13 — SA04-I4b assigned

- Starting point: cumulative Draft #329 exact Mira-accepted I4a head `7e80479e03167a8856fe1b2094b8c17678f4ce22`; main/base remains `13456a17f23c1385bef8ab11c735f43d201edd02`.
- **Lira owns I4b only:** close the AccountState admission→write race for every current Better Auth mutation that updates an already-persisted `user`.
- Required result: resolve the authoritative target from the actual Better Auth write shape/selector, require that target to remain active through the corresponding user write and commit, and prevent concurrent deactivation from slipping between admission and persistence. Do not derive authority from submitted email/name/user identity when the canonical write target is resolved elsewhere.
- Preserve accepted I1–I4a behavior, active user-update semantics, existing Better Auth validation/hooks/facts and classified lifecycle-storage unavailable vs unexpected handling.
- Focused evidence must cover the real pinned Better Auth 1.7.7 existing-user update seams/selectors used by the current configuration, including concurrency in both writer-first and deactivation-first order, plus active controls. New-user creation remains unchanged.
- **Boundary:** no physical user deletion; no account/link/password/provider writes (I4c); no session revoke/delete/deleteMany or inactive own-signout exception work (I4d); no I5/J+, schema/product expansion or unrelated refactor unless an actual I4b blocker proves it necessary.
- Continue in the same cumulative Draft #329. After implementation and author inspection, Lira publishes one stable exact head with applicable green evidence and **STOPs for Mira bounded I4b checkpoint review**. Lev/Mark remain unassigned; no Lev review until full I is complete and Mira cumulative whole-I PASS.

## 2026-11-13 — SA04-I4b author checkpoint complete; Lira STOP

- Mira I4a checkpoint PASS exact `7e80479e03167a8856fe1b2094b8c17678f4ce22`, then separate bounded I4b assignment. Cumulative Draft #329 exact `bd717165685095efac74ddd12a9a3339c6008df2`, unchanged base, 3 I4b commits/2 changed I4b files, 35 cumulative commits/six cumulative project files.
- Native Better Auth1.7.7 existing-user `updateUser(id)` and `updateUserByEmail(email)` selectors recognized at canonical adapter `user.update/updateMany`. Target row selected by exact `id` or persisted `email`, locked `FOR NO KEY UPDATE`, rechecked active via shared A2 helper, then original adapter UPDATE and COMMIT on the same request-native PG client. I4a transaction callback rewrap retained. No new-user create/delete, account/provider/password or destructive session writer touched.
- New five native PG17 tests demonstrate writer-first id lock/deactivation timeout, email-selected deactivation-first denial and active success, real HTTP update-user actor preflight→deactivation race, updateMany unique/missing/unsupported and new-user control, plus selector SQL availability 503/no-store vs unexpected propagation. First CI typecheck showed local `update.id` missing from command TS shape; corrected single type annotation without runtime change, first DB 739/739 green.
- Exact final CI #43400246709 SUCCESS (**2269 app +739 PG17**), SA01 #43400246683, SA03 #43400246745 and AP10 #43400246722 Chromium all SUCCESS (four AP10 jobs). Lira inspected three I4b patches/current two-file delta, pinned upstream BA user update hooks/selectors and I1–I4a preservation. PR #329 description updated.
- **Lira AUTHOR STOP, Mira bounded I4b checkpoint next** on `bd717165685095efac74ddd12a9a3339c6008df2`; I4c–I4d/I5/J+, Lev/Mark, docs closeout/merge/production/#315/SA05+ remain unassigned.



## 2026-11-13 — SA04-I4b Mira checkpoint PASS

- Reviewed cumulative Draft #329 exact `bd717165685095efac74ddd12a9a3339c6008df2` from accepted I4a `7e80479e03167a8856fe1b2094b8c17678f4ce22`: complete three-commit/two-path I4b delta, shared A2 mutation guard, current auth composition, task/Stage source-of-truth and pinned Better Auth v1.7.7 existing-user write seams.
- Better Auth v1.7.7 `internalAdapter.updateUser` resolves the target by one logical `id` selector and `updateUserByEmail` by one normalized logical `email` selector; `updateWithHooks` / `updateManyWithHooks` hand those canonical selectors to the current adapter. The I4b guard intercepts those actual `user.update/updateMany` persistence calls, resolves the persisted row, holds `FOR NO KEY UPDATE`, rechecks A2 active state and executes the original adapter write on the same native PostgreSQL connection through COMMIT.
- Writer-first target-id evidence proves competing deactivation cannot pass the held user-row lock; deactivation-first email/HTTP evidence proves a target that becomes inactive after earlier request admission is denied at the final write seam without changing the user row or issuing a new session cookie. Missing unique targets preserve adapter null/zero semantics; active controls and new-user creation remain unchanged.
- Lifecycle columns remain server-owned and outside Better Auth additional fields. Physical user deletion is not introduced. Password/provider/account writes remain I4c; destructive session paths remain I4d. Those omissions are accepted later checkpoints, not I4b defects.
- Wrapper-owned target-resolution SQL preserves the accepted availability→controlled no-store 503 vs unexpected propagation semantics. The I4b fail-closed rejection of unsupported non-unique user-update shapes does not break any current Better Auth v1.7.7 configured user-write seam.
- Independent exact-head Actions checked: CI #43400246709 SUCCESS — 184/184 app files, 2269/2269 app tests; 69/69 PostgreSQL17 files, 739/739 tests, including 14/14 focused I4a+I4b and 5/5 I4b. SA01 #43400246683, SA03 #43400246745 and AP10 #43400246722 are SUCCESS; AP10 all four browser jobs passed.
- **PASS — 0 confirmed current-scope I4b defects.** #329 remains cumulative Draft. No Lev review until full I is complete and Mira cumulative whole-I PASS.


## 2026-11-13 — SA04-I4c assigned

- Starting point: cumulative Draft #329 exact Mira-accepted I4b head `bd717165685095efac74ddd12a9a3339c6008df2`; main/base remains `13456a17f23c1385bef8ab11c735f43d201edd02`.
- **Lira owns I4c only:** close the lifecycle admission→write race for current Better Auth account mutations that target an existing user/account — account create/link/update/updateMany/delete, including current password, provider-token and linking paths.
- Required result: derive the authoritative target from the canonical Better Auth account write/selector, keep the relevant existing user active atomically through the corresponding account persistence/commit under concurrent deactivation, and preserve new-registration account creation for its active newly-created user plus current Better Auth validation, hook/fact, password/provider/linking semantics.
- Do not extend a database transaction or lifecycle lock across OAuth/provider network exchange; protect only the actual bounded persistence phase.
- Focused evidence must exercise the real pinned Better Auth 1.7.7 account write seams and relevant selectors with active controls and both writer-first/deactivation-first ordering, including the currently configured password/provider/linking paths and lifecycle-storage unavailable-vs-unexpected handling.
- **Boundary:** no physical Better Auth user deletion; no session revoke/delete/deleteMany or inactive own-signout exception work (I4d); no I5/J+, schema/product expansion unless strictly required by I4c, docs closeout, #315, SA05+ or Stage6/production.
- I4c is an intermediate Draft checkpoint and does not close I4 or I. After implementation, Lira personally inspects the bounded cumulative delta, runs applicable checks, publishes one stable exact head/evidence, and **STOPs for Mira I4c checkpoint review**. Lev/Mark remain unassigned.


## 2026-11-13 — SA04-I4c Mira checkpoint PASS

- Reviewed cumulative Draft #329 exact `0c36648638a11e69e657a83dcfd54b9cf06d2e84` from accepted I4b `bd717165685095efac74ddd12a9a3339c6008df2`: complete two-commit/two-path I4c delta, shared A2 mutation guard, current Better Auth composition/hooks and pinned Better Auth v1.7.7 account persistence seams.
- Official BA v1.7.7 current core shapes verified: `createAccount/linkAccount` persist resolved `data.userId`; `updateAccount` and `deleteAccount` target persisted account primary-key `id`; `updatePassword` uses `userId + providerId=credential + accountId=userId`; `deleteAccounts` uses `userId`. Current project has no extra Better Auth plugin account-writer family; configured auth is email/password + Google with implicit linking disabled.
- The I4c guard intercepts the actual account `create/update/updateMany/delete/deleteMany` adapter seam. It resolves/validates the authoritative owner, holds the existing user's `FOR NO KEY UPDATE` lifecycle lock, executes the original Better Auth adapter mutation on the same native request connection and keeps the lock through COMMIT. Owner/id transfer and unsupported multi-owner selectors fail closed; missing targets retain null/zero semantics.
- Real current password/link/provider paths converge on those shapes: `/change-password` uses account-id update; server-only set-password uses link/update; unlink resolves a persisted account id; Google returning/link flows use account create/update; provider token refresh persists by account id. Provider/OAuth network work occurs before the guarded persistence call, so no lifecycle transaction/lock spans the network exchange.
- Project auth observers remain success-only after the actual account mutation; I4c does not invent a pre-write fact. Shared actor-state observer restores classified lifecycle-storage failures even when a BA token route wraps the thrown adapter error; unavailable remains controlled no-store 503 while unexpected errors propagate.
- Seven I4c PG17 tests cover writer-first/deactivation-first create, account-id update/password/provider token, credential updateMany, unlink/delete/deleteMany, active controls and target-SQL failure classification. Accepted I4a/I4b tests remain green. No physical user deletion or I4d session-destructive closure is claimed.
- Exact-head Actions independently checked: CI #43404347307 SUCCESS — 184/184 app files, 2269/2269 app tests; 69/69 PostgreSQL17 files, 746/746 tests, including 21/21 focused I4a–I4c. SA01 #43404347457, SA03 #43404347332 and AP10 #43404347259 are SUCCESS; AP10 all four browser jobs passed.
- **PASS — 0 confirmed current-scope I4c defects.** #329 remains cumulative Draft. I4d is the next separate bounded author checkpoint and closes I4; no Lev review until full I is complete and Mira cumulative whole-I PASS.


## 2026-11-13 — SA04-I4d assigned

- Starting point: cumulative Draft #329 exact Mira-accepted I4c head `0c36648638a11e69e657a83dcfd54b9cf06d2e84`; main/base remains `13456a17f23c1385bef8ab11c735f43d201edd02`.
- **Lira owns I4d only:** close the current Better Auth destructive session persistence family — revoke/delete/deleteMany — and preserve the already accepted inactive user's own-signout cleanup exception.
- Required result: destructive session operations must use the authoritative persisted session target/owner and retain correct lifecycle/deactivation ordering without allowing an inactive account to regain protected use. Own sign-out of an already inactive account must still be able to remove/revoke its own session and clear the client-side session state as currently approved.
- After the destructive-session closure, perform the connected **I4 write-shape/race sweep** over every current configured Better Auth session/user/account mutation family covered by I4a–I4d. A missing current write seam or race found by that sweep is part of I4 closure; future/unconfigured families are not.
- Preserve accepted I1–I4c behavior, Better Auth validation/hooks, successful SA-02 facts, active session semantics, and lifecycle-storage unavailable-vs-unexpected handling. Focused evidence must use the real pinned Better Auth 1.7.7 + PostgreSQL17 paths and cover relevant concurrent orderings, active controls and the inactive own-signout case.
- **Boundary:** no physical user deletion, no reactivation, no separate forced-session Owner action, no schema/product expansion unless a verified I4d blocker requires it, and no I5/J+, docs closeout, #315, SA05+ or Stage6/production.
- Continue in the same cumulative Draft #329. After implementation and personal author inspection, Lira publishes one stable exact head with applicable green evidence and **STOPs for Mira bounded I4d checkpoint review**. Lev/Mark remain unassigned; I4 is not closed until Mira reviews this final I4 checkpoint.


## 2026-11-13 — Lev I5 technical planning complete; Mira plan review next

- Plan [#6851946924](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6851946924), anchored to exact #329 `85104942e75071a67b4a4b37212ce5bca7361fe4` and main `13456a17f23c1385bef8ab11c735f43d201edd02`.
- Source-based I5 plan: one bounded connected Better Auth lifecycle closure on current configured subsystem, preserving I1–I4 and SET05.
- No source-confirmed mandatory runtime rewrite; prefer targeted connected native tests + extension of existing Settings Account browser harness + read-only disposable PR CI. Runtime corrections only for reproduced current-scope gaps, with smallest fix/regression.
- Required composition evidence: two old cookies, inactive pre-routing/HTTP/direct/SET05 denial, pending Google link/callback with existing native provider seam, final persistence ordering, active/expired/sliding cookie ordering, telemetry on/off, classified failure restoration, signed one-session own-signout exception.
- Current I4 family proofs are reused rather than multiplied across every endpoint. No entire-OAuth transaction/lock and no invented global rollback of earlier committed work. J–R, SA05, #315 remediation and external activation stay separate.
- Planning only: no implementation edits or local tests/build/browser executed; not an I5 or whole-I PASS. Next Mira plan scope/fit/granularity review; Lira/Mark unassigned.


## 2026-11-13 — Lev independent SA04-I whole-PR PASS; STOP

- Report [#6857634901](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6857634901), exact #329 `74c6f43ae2d67526e2ad17aa50392aebf41abbca`; main/base unchanged.
- Full eight-file cumulative scope against accepted SA04/I5 and current configured BA1.7.7 checked independently; 0 confirmed current-scope findings.
- Local native69, application65, build/manifest and Chromium17 PASS plus original signed-cleanup/failure/fact probe. No implementation changes; own runtime/DB cleaned.
- Mira next; Lira/Mark/J+ remain unassigned by Lev. Whole-SA04/SA05 and production are not closed.
