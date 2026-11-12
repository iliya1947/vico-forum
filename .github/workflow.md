# Admin panel — current workflow

- Service PR **#251**; merged SA04-A1 main/base `593a03964b8407b249f7c9f5eb117ddb8b07736d`. A2/A3/A4/B are **Mira checkpoint PASS**; SA04-A4-MIRA-01 CLOSED.
- **Current checkpoint: SA04-C1 author-complete. Next Mira C1 bounded checkpoint/scope review of exact stable head.** Lira STOP; C2/C3, Lev/Mark independent review and merge remain unassigned.
- [Cumulative Draft implementation PR #328](https://github.com/iliya1947/vico-forum/pull/328): **stable exact head `306319bb506bb95ddda776dbc1a0b04a9c3e8fe3`**, base unchanged, **21 changed files**, open/Draft/unmerged.
- **C1 only:** `DrizzleForumRepository.readTopicPage` neutralizes both topic author and every current post author using accepted A4 lifecycle projector on each joined-user SQL row. Deactivated: stable IDs/profile URLs and published content/state/attachments preserved, public name `Deleted user`, avatar null, private raw identity/lifecycle excluded from DTO. Active and mixed-author topics unchanged. Canonical route serializes safe identity; topic UI localizes the generic label and keeps fresh identity across post-edit recovery.
- **Regression evidence:** native PG17 secret-marker snapshots and EN/HE route/DOM/serialization tests. Added existing A1 `0065` migration to exactly three historical PostgreSQL fixtures with current topic-reader calls; restored unchanged active-topic object identity after initial application test failure.
- **Mandatory personal author inspection:** read C1 source/patches, cumulative 21-file inventory/diff, retained public fields and the focused regression coverage; no confirmed current-scope C1 defect. Author inspection does **not** replace Mira's coordinator review.
- **Exact-head [CI #43198894729](https://github.com/iliya1947/vico-forum/actions/runs/43198894729) SUCCESS**: 2248/2248 application, 702/702 native PG17, 69-table manifest parity, lint/typecheck/build/Worker smoke. Connected Chromium: [SA03 #43198894476](https://github.com/iliya1947/vico-forum/actions/runs/43198894476), [SA01 #43198894492](https://github.com/iliya1947/vico-forum/actions/runs/43198894492), [AP10 #43198894423](https://github.com/iliya1947/vico-forum/actions/runs/43198894423) all SUCCESS.
- **CI caveat:** pinned DrizzleKit 0.31.10 `generate` still prints its previously seen BigInt error while returning success; independent native PostgreSQL/69-table schema manifest parity PASS, no schema or migration change in C1.
- **Boundaries:** C2 category/section/latest/pinned lists; C3 discovery/Help summaries; post-history, notifications, Admin Users, mentions, presence; auth/session or writer enforcement, deactivation action, SA05+, Stage6/production, #315, docs closeout all untouched.
- **Active recipient: Mira — bounded SA04-C1 checkpoint review; next step solely her review/verdict on this stable head.**

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
