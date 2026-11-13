# Admin panel — communication

## J8 — Mira bounded coordinator review: PASS

- Reviewed cumulative Draft #330 exact `41e26f191357aacde3de2dae3a3c7fed20756a30` against the accepted J8 assignment, Lev's full-J solution lock graph and current Stage4/AP-05/AP-10 solution contracts.
- Delta from J7 PASS `5e76474908156d6acbab1d2cf98138e6a37cabc8`: four bounded commits / three files. Production delta is only `markTopicSolved` and `selectBestAnswer`; remaining changes are focused native PG lifecycle/lock tests and canonical route regression. No J9+, Complaint-domain, #315, K, schema/migration/permission/dependency or Stage-6 work.
- Both writers keep the topic mutex first, now `FOR NO KEY UPDATE`. Help real solution effects pre-lock old/new answer rows by stable post ID and the exact affected pending signal rows by stable signal ID before actor admission. `markTopicSolved` similarly pre-locks the pending duplicate-signal set it can supersede.
- Shared AccountState actor admission is then taken on the same transaction/connection for both Own and Any. Existing Any-only `admin.forum` measure admission remains after lifecycle; Own keeps no punitive admin measure.
- Existing fail-closed precedence is preserved: missing topic, Own author mismatch, already-solved, active confirmed duplicate, missing/cross-topic candidate and original first post all reject before success. No actor identity comes from form input.
- Active same-answer selection is now an explicit no-effect return after lifecycle/Any measure admission. It preserves `topicAuthorId/isSolved`, does not re-update topic/post/signal state and does not append History. Inactive/missing actor cannot reach this success boundary.
- Real Help replacement preserves prior behavior: old answer becomes `outdated / best-answer-replaced`, selected answer moderation is cleared, old-answer needs-review/outdated signals and topic duplicate signals are superseded, unrelated new-answer signal remains pending, then topic best-answer changes. Any real change appends `topic.bestAnswerChanged` last; Own emits no Admin History. Solved Any similarly appends only its real `topic.solved` event last.
- Native state-first barriers pause after domain dependencies and before AccountState, commit deactivation and prove typed denial with unchanged topic/post/signal/History facts. Writer-first barriers pause COMMIT after effects/History and prove lifecycle update cannot acquire the actor row until the writer commits.
- Lock compatibility: existing J3-style post `NO KEY UPDATE` holders serialize with J8 old/new answer locks; existing withdrawal-style signal writer locks serialize before J8 actor admission. Actual Complaint submit code was cross-checked: it takes reported post/topic `FOR UPDATE`, then actor mutex, then inserts target rows whose FK requires `KEY SHARE`. J8's topic/post `NO KEY UPDATE` allows that FK to complete, so the actor/content cycle identified in Lev's plan is not introduced.
- Non-Help best-answer does not need an old/new moderation-row mutex: after actor its only new post dependency is the FK `KEY SHARE` for the topic best-answer update, which is compatible with ordinary post `NO KEY UPDATE` edits and with the accepted Complaint completion ordering.
- Canonical `markSolved` / `selectBestAnswer` Own/Any late lifecycle denial remains shared generic private/no-store `401 unauthenticated`, with no redirect, `solutionPrompt`, false success, lifecycle detail or forged actor use. Existing permission/scope/origin/unavailable/unexpected behavior is unchanged.
- Exact-head GitHub Actions independently rechecked: J8 PG **13/13**; Admin History **28/28**; Stage4 core solution flow green; PostgreSQL **844/844**; application/unit **2275/2275**; CI SUCCESS; SA-03 Chromium SUCCESS; AP-10 browser/history/settings/administrator jobs all SUCCESS.
- No red-run remediation or production correction occurred during J8.
- The previously recorded J7 permanent-doc `FOR UPDATE`→`FOR NO KEY UPDATE` wording mismatch remains a docs-closeout item, not a J8 implementation defect.
- **Verdict: PASS — 0 confirmed current-scope J8 defects.** STOP. J9–J12 remain unassigned; Lev/Mark remain inactive.

## SA04-J8 — Lira AUTHOR STOP → Mira bounded coordinator review

- **Stable implementation:** cumulative Draft #330 exact `41e26f191357aacde3de2dae3a3c7fed20756a30`, open/draft/unmerged, based on J7 Mira PASS `5e76474908156d6acbab1d2cf98138e6a37cabc8`.
- `markTopicSolved` and `selectBestAnswer` retain existing short Drizzle transactions. Solution topic mutex now `FOR NO KEY UPDATE` (preserves serialization, allows Complaint FK `KEY SHARE`). Domain checks precede authoritative actor guard: missing/Own author, already-solved/confirmed duplicate, missing/cross-topic/first-post candidate. In Help, all rows that can be mutated are prelocked in fixed order: existing old/new answer posts sorted by ID `FOR NO KEY UPDATE`, then pending affected signals sorted by ID `FOR NO KEY UPDATE`; `markTopicSolved` prelocks pending duplicate signals in ID order. Only then trusted actor AccountState guard in **same transaction**, followed by existing Any-only `admin.forum` measure, effects and real Any-only History last.
- **Existing solution semantics preserved:** Own/Any real operations; solved Help duplicate signal supersession; old selected answer `outdated` with system `best-answer-replaced` reason-kind, new answer moderation cleared, old answer needs-review/outdated and topic duplicate pending signals superseded (unrelated new-answer pending signals preserved). Best-answer return `topicAuthorId/isSolved`, canonical confirmation prompt/redirect, confirmed-duplicate restrictions, Any-only significant History. Same-answer is an active-user no-op after actor admission and Any measure, without redundant UPDATE/History; inactive/missing gets neither real nor no-op success and changes no domain or History facts.
- **Native PostgreSQL17 J8 13/13:** active Own/Any; replacement moderation/signals/History; same-answer facts; ownership/missing/duplicate/cross-topic/first post; inactive/missing before/after; both lifecycle race directions for both writers (actor lock through COMMIT); deterministic old/new J3-style post `NO KEY UPDATE` contention, pending signal mutation overlap, and same-actor Complaint post→actor→FK `KEY SHARE` compatibility with solution topic/post locks. Existing Admin History suite **28/28**.
- Canonical `markSolved` and `selectBestAnswer` Own/Any route regression proves late inactive/missing generic **401 unauthenticated**, **private, no-store**, no false `solutionPrompt`/redirect/lifecycle detail. Canonical action itself unchanged; existing Stage4 solution prompt, permission, origin, error and redirect behaviors remain covered.
- **Exact-head GitHub Actions all SUCCESS:** CI [43518908957](https://github.com/iliya1947/vico-forum/actions/runs/43518908957): PG17 **844/844**, application/unit **2275/2275**, lint/typecheck/build/schema/migrations PASS. SA-03 Chromium [43518908959](https://github.com/iliya1947/vico-forum/actions/runs/43518908959) SUCCESS. AP-10 isolated browser [43518908974](https://github.com/iliya1947/vico-forum/actions/runs/43518908974) **4/4 SUCCESS**. Final code required no post-CI corrections.
- Lira inspected all **four bounded J8 commits**, three files only, records **AUTHOR STOP → Mira bounded J8 coordinator review** of same exact head. J9–J12/Lev/Mark unassigned; Complaint N, #315, K, SA-05, schema/migrations/permission/dependency, permanent docs, Stage 6 excluded. J7 permanent-doc lock wording alignment remains due in separate docs closeout. No merge/deployment.

## J7 — Mira bounded coordinator review: PASS

- Reviewed cumulative Draft #330 exact `5e76474908156d6acbab1d2cf98138e6a37cabc8` against the accepted J7 assignment, Lev's full-J lock graph and current AP-05/AP-08/AP-10 contracts.
- Delta from J6 PASS `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`: seven bounded commits / four files. Production delta is limited to the three topic-state writers; remaining changes are focused native PG and canonical route tests. No Complaint-domain mutation, J8+, #315, K, schema/migration/permission/dependency or Stage-6 work.
- All three writers now lock the existing topic `FOR NO KEY UPDATE`, then take the shared AccountState actor `FOR NO KEY UPDATE` on the same transaction/connection before success/effect. This preserves the accepted content→actor order and avoids actor→content reversal.
- Closure retains missing-topic and expected `closureVersion` CAS before actor admission. A stale version therefore remains 409/conflict even for an inactive actor; a current-version same-state request reaches lifecycle admission and cannot return `changed:false` to inactive/missing.
- Pin/unpin take lifecycle admission before `admin.forum` measure admission and insert/delete. Active idempotent retry remains a no-op with no fictitious History; inactive/missing receives no success and leaves pin/History facts unchanged.
- Real close/reopen transitions preserve version increment/ABA/overflow behavior. `appendForumHistory` remains the final write; synthetic append failure rolls back the state transition.
- Lock compatibility is proven with barriers, not sleep timing: close holds topic `NO KEY UPDATE` and a fresh reply waits; after close commit it observes closed. In the reverse Complaint-compatible shape, Complaint holds reported post `FOR UPDATE` + actor `NO KEY UPDATE`, closure holds topic `NO KEY UPDATE` while waiting for actor, and Complaint can still insert its target/FKs (`KEY SHARE`) and commit, allowing closure to continue. This breaks the accepted potential cycle without weakening close↔reply serialization.
- State-first barriers for close/pin/unpin pause immediately before actor admission, commit deactivation, then prove typed denial with unchanged facts. Writer-first barriers pause COMMIT and prove lifecycle update cannot acquire the actor row until the writer completes.
- Canonical close/reopen (including inline) and pin/unpin late lifecycle denial remains shared generic private/no-store `401 unauthenticated`, with no success redirect, lifecycle detail or new HTTP policy. Existing permissions, Origin/session identity, CAS 409, storage 503 and unexpected propagation remain unchanged.
- Intermediate CI head `48edb1f7e68d29256890969d0e5ad7da31e64782` had PG 830/831 solely because the new writer-first closure test expected `AccountInactiveError` while submitting stale `expectedClosureVersion:0`; production correctly returned `ForumStateConflictError`. Final `5e764749...` only corrected that test and separately asserts current-version inactive denial. No production-code change was required after the red run.
- Exact-head evidence independently rechecked: J7 PG **11/11**; AP-08 closure races **4/4**; forum History suite **28/28**; PostgreSQL total **831/831**; application/unit **2274/2274** including closure/write-action routes; CI SUCCESS; SA-03 Chromium SUCCESS; AP-10 browser/history/settings/administrator jobs all SUCCESS.
- Documentation note: current `main` `docs/ADMIN_PANEL.md` still truthfully describes the pre-J implementation using `FOR UPDATE`; candidate #330 intentionally changes the technical lock strength. If J is accepted for merge, the separate permanent-docs closeout must align that wording with the accepted `NO KEY UPDATE` protocol while preserving the same serialization product contract.
- **Verdict: PASS — 0 confirmed current-scope J7 implementation defects.** STOP. J8–J12 remain unassigned; Lev/Mark remain inactive.

## SA04-J7 — Lira AUTHOR STOP → Mira bounded coordinator review

- **Stable implementation:** cumulative Draft #330 exact `5e76474908156d6acbab1d2cf98138e6a37cabc8`, open/draft/unmerged, from J6 Mira PASS `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.
- `setTopicClosed`, `pinTopic`, `unpinTopic` retain their existing short Drizzle transactions but take the target topic mutex with `FOR NO KEY UPDATE` (rather than `FOR UPDATE`) to preserve reply/closure serialization without blocking Complaint FK `KEY SHARE`. Shared authoritative AccountState actor guard runs on that same transaction after topic mutex, before any no-op success, measure, insert/delete or History. Closure specifically preserves missing-topic → expected-version CAS → actor guard → same-state `changed:false` order. `admin.forum` measure on real closure changes, version/ABA/overflow, pin/unpin active idempotency and transition-only History last remain unchanged.
- **PG17 evidence:** 11 native tests in `tests/database/sa04-forum-topic-state-lifecycle.test.ts`: active closure CAS/no-op/reopen/ABA/overflow and pin/unpin real/no-op + History rollback; inactive/missing actor with unchanged state/pin/History facts including closure same-state; six state-first/writer-first race cases across all three writers; close mutex rejects fresh reply after COMMIT; complaint-style post FOR UPDATE → actor FOR NO KEY UPDATE → target FK KEY SHARE succeeds while concurrent close holds topic NO KEY UPDATE and waits on that actor. Existing AP-08 close↔reply race suite 4/4 passed unchanged.
- Canonical `closeTopic`/`reopenTopic` (including inline Quick action) and `pinTopic`/`unpinTopic` route tests assert late inactive/missing generic **401 unauthenticated**, **private, no-store**, no false success/redirect/lifecycle details, trusted session actor. Existing guest/origin, permissions, CAS 409, classified unavailable 503, unexpected and success redirects remain covered. No production action changes.
- **Intermediate correction:** initial code placed guard before closure CAS; fixed at `4770f3de0090c843fbcd0140d365e9bcf9fd86eb` to preserve accepted CAS-first ordering. Intermediate CI PG failure `830/831` was one stale expected-version race test incorrectly expecting inactive rather than conflict after committed version increment. Corrected test at final `5e76474908156d6acbab1d2cf98138e6a37cabc8` distinguishes stale 409 from current-version inactive 401. This was a test assertion issue, not an unresolved production defect.
- **Final exact-head GitHub Actions:** CI [43515712068](https://github.com/iliya1947/vico-forum/actions/runs/43515712068) **SUCCESS**: native PG17 **831/831** (new J7 **11/11**), app/unit **2274/2274**, lint/typecheck/build/schema/migrations PASS. SA-03 Chromium [43515711933](https://github.com/iliya1947/vico-forum/actions/runs/43515711933) **SUCCESS**; AP-10 isolated Chromium [43515711815](https://github.com/iliya1947/vico-forum/actions/runs/43515711815) **SUCCESS 4/4**.
- Lira personally inspected all **seven bounded J7 commits** / four files. **AUTHOR STOP; Mira next** for bounded J7 coordinator review of stable exact head. J8–J12, Lev/Mark unassigned. Exclusions: Complaint mutations N, #315, K, SA-05, schema/migration/permission/dependency changes, docs and Stage 6. No merge or production deployment.

## J6 — Mira bounded coordinator review: PASS

- Reviewed cumulative Draft #330 exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08` against the accepted J6 assignment, Lev's full-J Inbox lock/error plan and current unified Complaints notification contract.
- Delta from accepted J5 `af25adf18fd065e5af4a7e6da2c670f28613a10f`: six bounded commits / three files only — repository lifecycle integration, focused native PG lifecycle/race coverage and canonical notifications action error regression. No Complaint command change, new legacy route, schema/migration/permission/dependency, J7+, #315, K or Stage-6 work.
- Unified `markNotificationRead` now uses the accepted **actor guard → own notification lock/update** order: shared AccountState `FOR NO KEY UPDATE` first, then recipient-owned notification `FOR UPDATE OF n`, ordinary complaint membership read when applicable, then idempotent `read_at` update.
- Legacy `markReplyNotificationRead` now owns one short transaction: actor AccountState guard first, then its existing recipient-owned reply/mention-only UPDATE/RETURNING. The UPDATE itself acquires the notification row write lock; no second connection or reverse notification→actor ordering remains.
- Active reply/mention, complaint-decision and complaint-appeal-result acknowledgements preserve target shapes and redirects. Complaint participant membership remains affected-author OR actual reporter; nonmember/wrong-recipient/missing active actor paths still fail 404 and roll back.
- Active already-read acknowledgement remains idempotent for both writers and preserves the original `read_at`. Inactive/missing actors cannot acknowledge a fresh notification or receive already-read success; before/after facts remain unchanged.
- State-first barriers for both writers prove committed deactivation before actor admission is observed before notification locking/writing. Writer-first already-read barriers prove the actor lock remains held through result and COMMIT, forcing lifecycle update to wait.
- Canonical `/:locale/notifications` action is unchanged and continues through shared `runForumMutation`; late inactive/missing maps to generic private/no-store `401 unauthenticated`, classified unavailable to 503, unexpected faults propagate, and successful reply/complaint redirects remain unchanged.
- Exact-head GitHub Actions independently rechecked: J6 native PG **9/9**; PostgreSQL total **820/820**; application/unit **2272/2272** including notifications route tests; CI `database` and `checks` SUCCESS; SA-03 Chromium SUCCESS.
- AP-10 browser evidence: attempt 1 failed only the unrelated general `browser` job at a topic POST with Playwright `APIRequestContext.post: socket hang up`. Worker logs for that same request recorded a 403 response and continued serving subsequent requests; no Worker/PostgreSQL crash was observed. The same exact head's failed browser job rerun passed, while the other AP-10 jobs were already successful. Root cause remains unconfirmed; because J6 changes only notification repository/tests and the exact-head retry passed without code changes, this recovered failure is **not classified as a J6 current-scope defect**.
- **Verdict: PASS — 0 confirmed current-scope J6 defects.** STOP. J7–J12 remain unassigned; Lev/Mark remain inactive.

## SA04-J6 — Lira AUTHOR STOP → Mira bounded coordinator review

- Cumulative Draft #330 exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08` (open/draft/unmerged), from J5 Mira PASS `af25adf18fd065e5af4a7e6da2c670f28613a10f`.
- Unified `markNotificationRead`: existing short Drizzle tx now begins with trusted actor `assertActiveAccountForDrizzleMutation(tx, userId)`, then original own notification `FOR UPDATE OF n` → complaint Case participant membership or reply/mention target validation → original idempotent `read_at = coalesce(read_at, statement_timestamp())`. The lock lasts until COMMIT/ROLLBACK, including already-read.
- Legacy `markReplyNotificationRead`: existing recipient-owned reply/mention-only UPDATE/RETURNING is now enclosed in a short Drizzle tx preceded by the same authoritative actor guard. Existing `coalesce(read_at, now())` and no new legacy route.
- Native PG17 J6 **9/9**: unified reply, mention, complaint Decision, Appeal-result active unread/already-read and preserved timestamp/targets; legacy reply/mention; missing/wrong recipient/nonmember and active 404; inactive/missing no write or already-read success, fact preservation; state-first and writer-first lifecycle races for **both** methods.
- Canonical notifications action remains unchanged and uses shared `runForumMutation`. Route regression verifies late lifecycle generic private/no-store `401 unauthenticated` with no redirect or detail, and existing unavailable 503/unexpected paths. Existing recipient, complaint-domain and reply/mention regressions remain green.
- Exact-head CI run `43510115276` SUCCESS: PG17 **820/820**, application/unit **2272/2272**, lint/typecheck/build/schema PASS; SA-03 Chromium run `43510115184` SUCCESS.
- AP-10 browser run `43510115118`: three jobs initially PASS; general browser first attempt failed at unrelated topic POST with Playwright `socket hang up`. Targeted same-exact-head rerun of only failed job SUCCESS without any code change; final AP-10 workflow SUCCESS all **4/4**. Transient transport explanation remains unverified; original failure and recovery retained in evidence.
- Lira personally inspected all six bounded J6 commit diffs and records **AUTHOR STOP**. **Mira next** for J6 bounded coordinator review of stable exact head. J7–J12 / Lev / Mark unassigned. Excludes Complaint mutations (N), #315, new legacy route, K, SA-05, schema/migration/permission/dependency, docs, Stage 6.

## J5 — Mira bounded coordinator review: PASS

- Reviewed cumulative Draft #330 exact `af25adf18fd065e5af4a7e6da2c670f28613a10f` against the accepted J5 assignment and Lev's full-J read-state/lock graph.
- Delta from accepted J4 `84b5124f948895e3e211b81b1d6bd2082ddc531f`: exactly three bounded commits / three files — repository transaction reshaping, focused native PG lifecycle/lock tests, and canonical action mapping regression. No schema, migration, permission, dependency, J6+, #315 remediation or Stage-6 work.
- `advanceTopicReadState` now owns one short transaction. It locks existing topic then matching post with `FOR KEY SHARE`, preserving the accepted dependency-before-actor order and avoiding a SHARE→UPDATE upgrade; only then it calls the shared Drizzle AccountState mutation guard for the trusted `userId`.
- Existing marker SQL is preserved: advance only by later post `created_at`, then lexicographically greater post ID on timestamp ties. Active first/forward/same/backward behavior and `new / unread / read`, `firstUnreadPostId`, `latestPostId` semantics remain unchanged. Same/backward no-op preserves the existing marker row/timestamp.
- Readback now uses the same transaction/connection before COMMIT, so the actor `FOR NO KEY UPDATE` lifecycle lock remains held through the returned result. No second connection or actor→content reversal was introduced.
- Inactive/missing actor cannot create/advance a marker or obtain success from same/backward no-op. State-first barrier proves deactivation can commit after content dependencies but before actor admission and is then observed; writer-first barrier proves lifecycle update waits through no-op readback/COMMIT.
- Lock compatibility test holds an existing J3a post `FOR NO KEY UPDATE` content writer while J5 takes post `FOR KEY SHARE`; read-state completes without lock upgrade/deadlock, matching the accepted PostgreSQL lock graph.
- Cross-topic/missing post still fail before marker mutation. Existing migrations read-state regression remains green and covers prior monotonic/concurrent behavior.
- Canonical `markTopicRead` still derives actor only from the authenticated session and uses shared `runForumMutation`; late inactive/missing becomes generic private/no-store `401 unauthenticated` with no false `ok:true` or lifecycle detail.
- Exact-head GitHub Actions independently rechecked: J5 native PG **7/7**; migrations DB suite includes the existing read-state test; PostgreSQL total **811/811**; application/unit **2271/2271** including `write-actions` and Unread route regressions; CI `database` and `checks` SUCCESS; SA-03 Chromium SUCCESS; AP-10 isolated browser acceptance all four jobs SUCCESS.
- #315 `READSTATE-CACHE-01` is a separate previously known finding and was intentionally not modified or claimed closed by J5.
- **Verdict: PASS — 0 confirmed current-scope J5 defects.** STOP. J6–J12 remain unassigned; Lev/Mark remain inactive.

## SA04-J5 — Lira AUTHOR STOP → Mira bounded coordinator review

- Cumulative Draft #330 exact `af25adf18fd065e5af4a7e6da2c670f28613a10f` (open, unmerged); baseline J4 Mira PASS exact `84b5124f948895e3e211b81b1d6bd2082ddc531f`.
- `advanceTopicReadState` now uses one short Drizzle transaction: target topic then matching post `FOR KEY SHARE` FK dependency locks → authoritative active `userId` AccountState guard under user `FOR NO KEY UPDATE` on the same connection → existing monotonic `created_at`/post-ID tiebreak UPSERT → same-tx readback before COMMIT. The readonly `readTopicReadState` API is unchanged.
- Active first/forward/same/backward and `new/unread/read`, firstUnread and latest post semantics are preserved. Inactive/missing actor cannot create/advance marker or receive same/backward no-op success. Missing/cross-topic target fails before mutation.
- New PG17 tests cover monotonic concurrent winner and equal-timestamp ID ordering, state-first denial after dependency locks, writer-first actor lock held through no-op result/COMMIT, and KEY SHARE compatibility with J3a content writer holding post `FOR NO KEY UPDATE`. Canonical `markTopicRead` continues using shared `runForumMutation`, with late inactive/missing 401 generic `unauthenticated`, `private, no-store`, no `ok:true`.
- Exact-head `CI` SUCCESS: PostgreSQL **811/811** (J5 new **7/7**), application/unit **2271/2271**, lint/typecheck/build/schema PASS. `SA-03 unified profile connected Chromium acceptance` SUCCESS. `AP-10 isolated browser acceptance` SUCCESS all **4/4** jobs.
- Lira personally inspected the three bounded commit diffs and recorded **AUTHOR STOP**. **Next actor Mira** for J5 bounded review on stable exact head. #315 `READSTATE-CACHE-01` is excluded; J6–J12 / Lev / Mark unassigned. No schema, migrations, broader read-state/cache remediation or Stage 6 work.

## J4 — Mira bounded coordinator review: PASS

- Reviewed exact Draft #330 head `84b5124f948895e3e211b81b1d6bd2082ddc531f` against the accepted J4 assignment, Lev's full-J profile lock/lifecycle/error plan, current AP-10 profile restriction contract and canonical SA-03 profile behavior.
- Delta from accepted J3c `cb1df03d00038fdf414b9d0d650d908a58167098`: six bounded commits / four files only; no schema, migration, permission, dependency, Privacy P, SA-05 or J5+ work.
- `updateProfile` preserves input validation before transaction, existing user `FOR UPDATE` mutex and missing-user 404. On the same Drizzle transaction it then performs authoritative AccountState admission before `profile.edit` measure admission and profile upsert. No second connection or alternate lifecycle predicate is introduced.
- The existing stronger user lock is held through AccountState verification, measure admission, upsert and COMMIT/ROLLBACK. State-first deactivation is observed and denies with unchanged profile facts; writer-first admission may complete while lifecycle update waits for that row lock.
- Active actor create/update semantics remain intact. Inactive actor with or without an existing profile row cannot create/update profile facts; public projection remains neutral Deleted-user identity. Existing AP-10 `profile.edit` denial still follows active-account admission and leaves facts unchanged.
- Canonical profile action maps late `AccountInactiveError`/`AccountMissingError` to generic `unauthenticated` 401 with `private, no-store`, no `?saved=1`, draft/lifecycle leakage or false success. Existing prior missing-user 404, validation handling, AP-10 403, storage 503 and unexpected propagation remain distinct.
- Hyperdrive availability semantics remain valid: AccountState availability wrappers retain the original classified failure in the cause chain, and the existing forum availability classifier walks that chain to `ForumStorageUnavailableError`; AccountState unexpected faults are not classified as unavailable or unauthenticated.
- Exact-head evidence independently rechecked from GitHub Actions logs: new J4 native PG suite 5/5; native PostgreSQL total 804/804; application/unit 2270/2270; CI `database` and `checks` SUCCESS; SA-03 unified-profile Chromium SUCCESS; AP-10 browser acceptance all four jobs SUCCESS.
- **Verdict: PASS — 0 confirmed current-scope J4 defects.** STOP. J5–J12 remain unassigned; Lev/Mark remain inactive.

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
