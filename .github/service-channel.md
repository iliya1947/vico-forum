# Admin panel — communication

## SA04-J4 — Lira AUTHOR STOP → Mira bounded review

- Cumulative implementation Draft #330 exact `84b5124f948895e3e211b81b1d6bd2082ddc531f` (open/unmerged), from J3c accepted baseline `cb1df03d00038fdf414b9d0d650d908a58167098`.
- `updateProfile` retains validated fields and existing trusted-actor `user FOR UPDATE` mutex; within the same Drizzle transaction it checks the authoritative AccountState before any measure admission/upsert. Missing-user precondition remains a 404; inactive actor cannot write new/existing profile rows.
- Canonical profile route handles late `AccountInactiveError`/`AccountMissingError` with generic `unauthenticated` 401 `private, no-store` and no `?saved=1` redirect or private detail leakage. Existing Origin/self-only checks, bounded submitted draft for validation/transient failures, `profile.edit` measure 403, unavailability 503 and unexpected exceptions remain distinct.
- Native PG17 J4 tests (5 new) directly cover active create/update, inactive/missing fact preservation with/without profile row, validation, measure ordering, public Deleted-user projection, state-first denial and writer-first lock held through upsert/COMMIT. Canonical route unit coverage also extends both late lifecycle variants and retained 404.
- Exact-head `CI` SUCCESS: native PostgreSQL 17 **804/804**, application/unit **2270/2270**, lint, typecheck, builds, schema/migration checks PASS. `SA-03 unified profile connected Chromium acceptance` SUCCESS. `AP-10 isolated browser acceptance` SUCCESS all four jobs.
- Lira inspected bounded six-commit J4 delta and recorded **AUTHOR STOP**. **Next actor Mira** for bounded J4 coordinator review on this exact head. J5–J12, Lev/Mark not assigned; no whole-J review yet.

## J3c — Mira bounded coordinator review: PASS

- Reviewed exact Draft #330 head `cb1df03d00038fdf414b9d0d650d908a58167098` against accepted J3c assignment, Lev's full-J no-op/lock/error plan, current Admin source-locale contract and CNT-03 revision semantics.
- Delta from J3b PASS `b407f93f54b7f7e1073218dd63b4f6235b1bb417`: four commits / four files only — no-op admission seam, two service integrations, canonical lifecycle mapping and focused tests.
- `admitSourceLocaleNoop` uses one Drizzle transaction: existing topic/post target `FOR NO KEY UPDATE` → expected current revision → Own authorization when applicable → authoritative actor `FOR NO KEY UPDATE`. It performs no revision/History write and holds the actor lock through COMMIT/ROLLBACK.
- The service invokes that seam only after existing locale validation, target/current-revision checks and Own/Any authorization, and only when normalized requested locale equals the immutable current revision locale. Changed-locale corrections still use the accepted J3a revision writers.
- Concurrent changed revision cannot silently pass the no-op seam: the locked current revision is rechecked against `expectedRevisionId`. The lock order remains content → actor, matching the accepted J lock graph.
- Active own/any same-locale remains a true no-op; inactive/missing actors cannot receive success. State-first and writer-first PG barriers cover both topic and post and preserve revision/head/History facts.
- `runSourceLocaleCorrection` now maps late `AccountInactiveError`/`AccountMissingError` to the existing generic `unauthenticated` 401 with `private, no-store`; classified unavailable stays 503 and unexpected faults propagate.
- AP-10 `admin.forum` semantics are not regressed: request-level Any permission remains projected by the existing measure-aware resolver; the accepted J plan explicitly defines the no-op seam as lifecycle admission only, independent of injected measure admission.
- Exact-head GitHub Actions independently rechecked: CI SUCCESS (`database`, `checks`); AP-10 isolated browser acceptance SUCCESS 4/4.
- **Verdict: PASS — 0 confirmed current-scope J3c defects.** STOP. J4–J12 remain unassigned; Lev/Mark remain inactive.

## SA04-J3c — Lira AUTHOR STOP → Mira bounded coordinator review

- Current stable exact Draft #330 head: `cb1df03d00038fdf414b9d0d650d908a58167098`, open/unmerged; accepted starting J3b Mira PASS exact `b407f93f54b7f7e1073218dd63b4f6235b1bb417`.
- Only J3c changed: the two service-level same-locale success returns now require transaction-local current-revision/content-lock and authoritative active-actor admission on the same connection. The actor row lock stays through COMMIT/ROLLBACK; active own/any same-locale remains a true no-op without revision/History.
- Changed-locale writes still delegate to J3a; existing source-locale validation, Own/Any permission, CAS and History behavior are preserved.
- Canonical `runSourceLocaleCorrection` now handles late inactive/missing actor with generic `unauthenticated` 401, `private, no-store`; unavailable 503 and unexpected behavior remain distinct.
- Focused PG17 evidence: seven new tests (source-locale suite 11/11) for active own/any no-op, inactive/missing denial, unchanged revision/head/History, permission/validation and changed-locale regressions, typed HTTP errors and state-first/writer-first races for both topic and post.
- Exact-head GitHub Actions: `CI` SUCCESS (native PG17 **799/799**, application/unit **2269/2269**, lint/typecheck/build/schema all PASS); `AP-10 isolated browser acceptance` SUCCESS all 4 jobs.
- Lira inspected all bounded commit diffs and recorded **AUTHOR STOP**. **Next Mira J3c bounded review** on this exact head. No J4+ changes or assignment; Lev/Mark remain inactive.

## J3b — Mira bounded coordinator review: PASS

- Reviewed exact Draft #330 head `b407f93f54b7f7e1073218dd63b4f6235b1bb417` against accepted J3b scope and Lev's full-J transaction/lock/replay plan.
- Delta from accepted J3a `39df1262d9b536df87b0147e4a8a400d65b7d038`: exactly two commits/two files — two lifecycle-guard insertions in `editPublishedPost` plus focused native PostgreSQL lifecycle tests.
- Matching edit receipt replay keeps draft-scope lock first, validates receipt identity, then requires the actual `actorId` to remain active before success return. No replay-side write occurs before admission.
- Fresh edit keeps existing post `FOR UPDATE`, ownership and expected-revision checks; then the same transaction takes the AccountState actor lock before measures and every protected edit write. Revision/CAS, mentions, retained/new attachment mutation, draft finalization and publication receipt remain under that transaction through COMMIT/ROLLBACK.
- Confirmed denied inactive fresh/replay paths preserve revision head/count, public attachment bindings, mention facts, draft refs/completion and receipt facts. Existing stale-revision/rollback, attachment-only, retained/new selection, lost-response replay and mention regressions remain green.
- State-first race proves committed deactivation after content lock but before actor admission is observed and denies with no edit facts. Writer-first race withholds COMMIT after all edit/finalization writes and proves deactivation cannot acquire the user row until writer completion.
- Canonical edit action does not convert lifecycle denial into edit conflict; late `AccountInactiveError`/`AccountMissingError` reaches shared `runForumMutation`, which returns private/no-store unauthenticated 401. Source-locale no-op mapping remains separate J3c scope.
- Exact-head GitHub Actions independently rechecked: CI SUCCESS (`database`, `checks`); AP-10 isolated browser acceptance SUCCESS 4/4.
- **Verdict: PASS — 0 confirmed current-scope J3b defects.** STOP. J3c and J4–J12 remain unassigned; Lev/Mark remain inactive.

## Channel rotation from #251

Service PR #331 replaces #251 for ongoing Admin/Super-admin work. #251 is historical evidence only and must not receive new operational state.

### Confirmed current state

- Current main: `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- SA04-A–I implementation is already in main; permanent docs intentionally remain at SA-01–SA-03 factual closeout until the whole SA-04 package is completed and documented.
- Current implementation PR: cumulative Draft #330, open/unmerged.
- Accepted J3a baseline/head: `39df1262d9b536df87b0147e4a8a400d65b7d038`.
- J1, J2 and J3a have Mira bounded PASS.
- J3b implementation completed by Lira; current exact Draft #330 head `b407f93f54b7f7e1073218dd63b4f6235b1bb417`, AUTHOR STOP pending Mira review.
- J3c and J4–J12 are unassigned.
- Lev and Mark are not active. Lev returns for whole-J independent technical review only after Mira whole-J PASS, unless a genuine technical escalation requires plan revision.

### J3b AUTHOR STOP — handoff to Mira

- Draft #330 stable exact head: `b407f93f54b7f7e1073218dd63b4f6235b1bb417` (open, unmerged).
- Bounded changes: `editPublishedPost` active-actor admission on matching receipt replay and fresh edit transaction; the latter guard follows post ownership/revision checks and precedes edit measures and all protected writes.
- One new PG17 test file covers active fresh/replay; inactive fresh/replay and missing/non-owner denial; before/after revisions/current head, retained/new attachments, draft refs/completion, mentions and receipt facts; rollback after CAS; state-first and writer-first transaction races.
- GitHub Actions on exact head: `CI` SUCCESS (PG17 792/792 including J3b 7/7; application 2269/2269; lint/typecheck/build/schema); `AP-10 isolated browser acceptance` SUCCESS (four jobs).
- Lira inspected the bounded two-commit delta, recorded evidence in her personal log, and **AUTHOR STOP**. **Next gate: Mira bounded J3b coordinator review of the exact head**. Any confirmed current-scope findings return to Lira; J3c is not a J3b finding.
- J3c and J4–J12 remain unassigned. Lev and Mark remain inactive; whole-J Lev review only after all J slices and Mira whole-J PASS.

### Decisions worth carrying forward

- SA-04 master plan: #251 comment #6806249892.
- Full J plan: #251 comment #6858869802.
- Deactivation remains later SA-05-facing product work; SA-04 provides the closed admission foundation but no deactivate route/control.
- Exact Owner cannot deactivate self; no mandatory reason; content remains; public identity becomes Deleted user; retained private data minimum one year.
- Future post-current-plan journal-storage management requires truthful per-source occupancy plus Download archive and Clear history; it is not current SA-04 scope.
- #315 security remediation and Stage 6 remain separate.
