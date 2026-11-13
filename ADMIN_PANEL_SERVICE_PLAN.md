# Admin / Super-admin — active service plan

This is service PR #331, the compact continuation of service PR #251. PR #251 is historical evidence only; do not continue operational work there.

## Current project boundary

- Source of truth remains current `main`, `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, and the applicable profile contracts.
- Current main at channel rotation: `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- Permanent project docs still describe SA-01–SA-03 as delivered and SA-04+ as not yet delivered because SA-04 is not complete. Interim SA-04 implementation progress is tracked here until final factual documentation closeout.
- Stage 6 remains paused. #315 security remediation remains a separate service task and is not silently folded into this channel.

## Stable product decisions that still matter

1. Super-admin is exact server-bound Owner only; it does not create a second RBAC or duplicate Admin/Settings/Attention mutation backends.
2. Approved monitoring model: current state + adjacent per-monitor History + contextual applicable actions, plus the global Event log.
3. Approved monitoring areas: System; Accounts & authentication; Security; Forum; Localization & translations; Notifications; Files & attachments; Administration; Moderation; Background processes; Data; Integrations; Infrastructure.
4. Account deactivation is a later exact-Owner-only action: no self-deactivation, no mandatory reason, published content stays, public identity becomes Deleted user, retained private/account data stays at least one year.
5. Deactivation is not hard deletion. Reactivation, purge/end-of-retention behavior, forced-session termination, foreign credential/provider mutation and a second Owner/recovery model are not implied.
6. After the current Super-admin plan is fully complete, a separate future phase must add truthful per-journal/history storage occupancy plus per-source Download archive and Clear history actions. Do not pull that future phase into current SA-04.

## SA-04 master result

Accepted master technical plan: PR #251 comment #6806249892.

SA-04 establishes account-state storage, closed active-account admission and neutral public identity. A deactivated user must not continue as an active actor through stale sessions, new auth, direct auth APIs or authoritative application writers; retained published content remains readable with neutral public identity.

Package decomposition:

- A–H: account-state/public identity/projection preparation.
- I: Better Auth active-account closure.
- J: Forum authoritative actor writes.
- K: attachment upload/draft/finalization admission.
- L: authorization mutations.
- M: AP-10 mutations/appeals.
- N: Complaints mutation/participation.
- O: own locale save.
- P: Privacy save.
- Q: registration settings write.
- R: new user generation-plan admission.
- S: connected end-to-end SA-04 closure on one stable exact head.

A–I are already implemented in current `main`. SA-05 remains blocked until the whole SA-04 package has completed its final acceptance/review cycle.

## SA04-J — accepted technical plan

Full technical plan: PR #251 comment #6858869802.

Core invariant: authoritative Forum mutation admission checks the actual trusted actor on the same transaction/connection as protected writes and holds the lifecycle user-row lock through COMMIT/ROLLBACK. Existing domain locks/dependencies come before the actor guard where required by the accepted lock graph. No Owner exemption exists from AccountState.

Current J decomposition for Lira execution:

1. **J1 — shared Drizzle mutation guard.** Mira PASS exact `35902e3ebd7636121b3a4af1e67b3da8ec365be2`.
2. **J2 — publication:** `createTopic`, `createTopicWithInitialPost`, `createPost`, matching receipt replay and final publication binding/receipt. Mira PASS exact `22a6733ee661e22665406974d5a3ac515866fd51`.
3. **J3a — low-level revisions:** `reviseTopicTitle`, `revisePostBody`, own/any paths. Mira PASS exact `39df1262d9b536df87b0147e4a8a400d65b7d038`.
4. **J3b — published-post edit:** `editPublishedPost`, matching edit receipt replay, revision/CAS, mentions, retained/new attachment binding, draft finalization and receipt. **Mira bounded PASS on `b407f93f54b7f7e1073218dd63b4f6235b1bb417`.**
5. **J3c — source-locale service no-op + canonical HTTP boundary.** **Mira bounded PASS on `cb1df03d00038fdf414b9d0d650d908a58167098`.**
6. **J4 — profile writer.** **Mira bounded PASS on `84b5124f948895e3e211b81b1d6bd2082ddc531f`.**
7. **J5 — read-state writer.** **Mira bounded PASS on `af25adf18fd065e5af4a7e6da2c670f28613a10f`.**
8. **J6 — inbox acknowledgement writers.** **Mira bounded PASS on `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.**
9. **J7 — topic close/pin/unpin state writers.** **Mira bounded PASS on `5e76474908156d6acbab1d2cf98138e6a37cabc8`.**
10. **J8 — solved/best-answer writers.** **Mira bounded PASS on `41e26f191357aacde3de2dae3a3c7fed20756a30`.**
11. **J9 — Help Signals submit/withdraw/resolve.** **Mira bounded PASS on `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`.**
12. **J10 — Help solution moderation.** **Assigned to Lira from J9 PASS baseline `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`.**
13. **J11 — duplicate/appeal family.** Ready next assignment; not active until J10 Mira PASS.
14. **J12 — cumulative J closeout/evidence.** Ready next assignment; not active until J11 Mira PASS.

## Ready remaining J assignments

These assignments are fixed now so the coordinator does not reconstruct them after each PASS.

### J10 — Help solution moderation — ACTIVE

Baseline: J9 Mira PASS exact `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`.

Required result: close authoritative AccountState admission for `setHelpSolutionModeration` without changing its product contract. Preserve expected-best-answer validation, existing reason semantics, unchanged-state History suppression and the exact pending-signal supersession rules. The accepted J lock graph applies: target topic and every existing post/signal row the operation can mutate must be secured before the trusted actor lifecycle mutex; then existing `admin.forum` measure, effects and real History last. The topic/post lock strength must remain compatible with the already accepted J7–J9/Complaint FK graph; do not introduce actor→content reversal, actor lock upgrade or a second connection.

Ready evidence: active moderation states including clear/no-op-equivalent History suppression; inactive/missing fact preservation; state-first and writer-first lifecycle races; answer-post and affected-signal contention; same-actor Complaint/content compatibility where applicable; canonical late lifecycle denial through the existing route as generic private/no-store 401; applicable existing Help/Admin History/AP-10 regressions and exact-head CI/browser gates.

Scope: J10 only. J11/J12, Complaint N, #315, K, SA-05, permanent docs and Stage 6 stay out.

### J11 — duplicate/appeal family — READY AFTER J10 PASS

Methods: `confirmHelpDuplicate`, `removeHelpDuplicate`, `appealHelpDuplicate`, `resolveHelpDuplicateAppeal`.

Required result: add authoritative same-transaction active-actor admission to all four methods while preserving current relationship/appeal identity, ownership, expected-ID, canonical-root, pending uniqueness, accepted/rejected effects and History semantics. Existing domain dependencies that can later be mutated must be locked before actor admission. In particular, confirmation must include the complete pending duplicate-signal set its bulk supersession can affect in stable order; removal must include any pending appeal it may resolve; appeal keeps its no-measure/no-History product behavior; resolution keeps its exact expected pending appeal and accepted relationship-removal behavior. Then actor → applicable existing measure → effects → History last. Keep the accepted non-key lock/FK compatibility and no reverse actor→content ordering.

Ready evidence: active behavior for all four methods and materially different appeal outcomes; inactive/missing fact preservation; state-first/writer-first races; overlapping relationship/appeal/signal operations in bounded stable order; canonical late lifecycle 401 mapping; existing duplicate/appeal/History/AP-10 regressions and exact-head CI/browser gates.

Scope: J11 only. J12 and all non-J domains stay out.

### J12 — cumulative J closeout/evidence — READY AFTER J11 PASS

No speculative new feature work. On one stable exact Draft #330 head, close the accepted full-J evidence contract: inventory every J actor-owned Forum writer plus both source-locale no-op entrypoints and presence regression; verify actual transaction/lock graph and absence of actor lock upgrades/second connections; verify active/inactive/missing, replay/no-op, state-first/writer-first and required cross-writer compatibility coverage; verify canonical HTTP/Worker error handling and applicable full regression gates. If this sweep finds a real current-J defect, correct only that defect and regenerate evidence; future K+ or #315 work is not a J finding.

Deliver AUTHOR STOP with the stable exact head and concise cumulative evidence packet for Mira whole-J coordinator review. Only after Mira whole-J PASS does Lev perform the independent whole-J review of that same exact head.

After the implementation decomposition is complete, Mira performs the coordinator whole-J review on one stable exact head. Only after Mira PASS does Lev perform the independent technical whole-J review of that same head. Lev's technical planning/review work is not to be fragmented into the small Lira implementation slices unless the developer explicitly changes that rule.

## J3b contract — Mira bounded PASS

Implementation PR: cumulative Draft #330. Accepted baseline: `39df1262d9b536df87b0147e4a8a400d65b7d038`.

Required behavior:

- Preserve draft-scope-first/replay ordering and existing Editor 2.0 behavior.
- Matching edit receipt replay must not return success to an inactive/missing actor.
- Fresh edit path keeps authoritative post/ownership/revision checks, then active-actor admission before the first protected edit write.
- Denied lifecycle request must not create a revision, move the current revision, change public attachment refs, create mentions, retire/finalize the operation or create/alter the receipt.
- Active behavior, owner-only edit rule, expected-revision conflict/rebase behavior, measure enforcement, retained/new attachment selection, idempotent lost-response retry and attachment atomicity remain unchanged.
- Evidence must include active fresh/replay controls, missing/inactive denial, before/after fact preservation, both lifecycle race directions through final attachment/receipt work, and applicable PostgreSQL/HTTP/editor/attachment regressions.
- Lira published stable exact Draft #330 head `b407f93f54b7f7e1073218dd63b4f6235b1bb417`; Mira completed J3b bounded review with PASS and zero confirmed current-scope defects.
- J3c is not a J3b defect. J4+ are not current scope.

## J3c — Mira bounded PASS

Lira completed the two service-level same-locale source-correction admission paths and canonical late AccountState HTTP denial mapping in cumulative Draft #330 at exact `cb1df03d00038fdf414b9d0d650d908a58167098`. Same-locale topic/post operations keep validation, owner/any authorization, revision consistency and zero revision/History writes while transactionally locking the actual actor. Changed-locale writers are unchanged from accepted J3a.

Native PostgreSQL 17 tests: 799/799 (seven new J3c cases). Application/unit: 2269/2269. CI lint/typecheck/build/schema PASS. Separate AP-10 browser workflow: 4/4 PASS. Lira completed AUTHOR STOP; Mira independently completed J3c bounded coordinator review with PASS and zero confirmed current-scope defects. J4 was subsequently assigned to Lira.

## J4 — Mira bounded PASS

Lira completed the existing public-profile `updateProfile` authoritative AccountState admission under its original user-row `FOR UPDATE` mutex and on the same transaction before `profile.edit` and profile upsert, plus the canonical late inactive/missing private/no-store 401 mapping. Active save/validation, existing missing-user handling, AP-10 measure checks, public Deleted-user projection and bounded HTTP failure behavior remain intact.

Cumulative Draft #330 exact `84b5124f948895e3e211b81b1d6bd2082ddc531f`: PostgreSQL 17 **804/804** (five new J4 tests), application/unit **2270/2270**; lint/typecheck/build/schema PASS; SA-03 unified profile Chromium SUCCESS; AP-10 browser four jobs PASS. Lira completed AUTHOR STOP and Mira independently accepted bounded J4 with PASS and zero confirmed current-scope defects. J5 was subsequently assigned to Lira. J6–J12 remain unassigned.

## J5 — Mira bounded PASS

Cumulative Draft #330 exact `af25adf18fd065e5af4a7e6da2c670f28613a10f` passed Mira bounded review with zero confirmed current-scope defects. `advanceTopicReadState` now uses the accepted topic/post `FOR KEY SHARE` dependency order, same-transaction AccountState admission, unchanged monotonic timestamp/ID upsert and same-transaction readback. Same/backward no-op requires active actor. Native PG17 **811/811** (J5 7/7), application/unit **2271/2271**, CI/SA-03/AP-10 checks green. #315 `READSTATE-CACHE-01` remains separate.

## J6 — Mira bounded PASS

Cumulative Draft #330 exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08` passed Mira bounded review with **zero confirmed current-scope J6 defects**.

Unified `markNotificationRead` keeps its existing short transaction but now performs authoritative AccountState admission before the recipient-owned notification `FOR UPDATE`, ordinary complaint membership read and idempotent `read_at` update. Legacy `markReplyNotificationRead` now uses one short transaction with the same actor-first lifecycle admission before its recipient-owned reply/mention-only UPDATE/RETURNING. Active already-read keeps the original timestamp; inactive/missing receives neither write nor no-op success. Unified reply/mention and complaint Decision/Appeal-result targets, recipient/membership checks, legacy kind restriction and canonical private/no-store 401 behavior remain intact.

Exact-head evidence: J6 native PG17 **9/9**, PostgreSQL total **820/820**, application/unit **2272/2272**, CI SUCCESS and SA-03 Chromium SUCCESS. AP-10 browser final run is SUCCESS: the first attempt's unrelated general-browser topic POST produced Playwright `socket hang up` while Worker logs recorded the request as 403 and continued serving; the same exact head's failed browser job rerun passed without implementation changes. Root cause of that recovered transport/test failure remains unconfirmed and it is not classified as a J6 defect.

J7–J12 remain unassigned. Complaint commands N, #315, K, SA-05, docs and Stage 6 remain separate.

## J7 — Mira bounded PASS

Cumulative Draft #330 exact `5e76474908156d6acbab1d2cf98138e6a37cabc8` passed Mira bounded review with **zero confirmed current-scope J7 defects**.

`setTopicClosed`, `pinTopic` and `unpinTopic` now retain target-first ordering with topic `FOR NO KEY UPDATE`, then same-transaction authoritative AccountState admission before any idempotent success or protected effect. Closure keeps missing-topic and closure-version CAS precedence before lifecycle admission, then denies inactive/missing before same-state `changed:false`; pin/unpin deny before measure/effect/no-op. Existing `admin.forum`, version/ABA/overflow, transition-only History and History-last rollback behavior are preserved.

The weaker non-key-changing topic mutex is the accepted J lock correction: it still conflicts with reply/topic state `FOR NO KEY UPDATE`, preserving close↔reply serialization, while permitting Complaint target FK `KEY SHARE` to complete when Complaint already holds content→actor. Native barrier evidence proves both lifecycle race directions for all three writers and this same-actor/content lock compatibility.

Exact-head evidence: J7 native PG17 **11/11**, AP-08 closure races **4/4**, PostgreSQL total **831/831**, application/unit **2274/2274**, CI SUCCESS, SA-03 Chromium SUCCESS and AP-10 browser **4/4 SUCCESS**. Intermediate head `48edb1f...` failed only because a newly added test expected lifecycle denial from a stale closure version; actual production behavior correctly returned the accepted CAS-first `ForumStateConflictError`. Final commit changed that test expectation and added a current-version inactive assertion; no production-code correction followed that red run.

Permanent documentation is intentionally separate from the implementation PR. Current `main` documentation still describes the pre-J close/reply `FOR UPDATE` lock wording; when cumulative J is accepted for merge, the separate docs closeout must align that technical wording with the accepted `NO KEY UPDATE` lock protocol without changing the product serialization contract.

J8–J12 remain unassigned. Complaint commands N, #315, K, SA-05 and Stage 6 remain separate.

## J8 — Mira bounded PASS

Cumulative Draft #330 exact `41e26f191357aacde3de2dae3a3c7fed20756a30` passed Mira bounded review with **zero confirmed current-scope J8 defects**.

`markTopicSolved` and `selectBestAnswer` now keep the accepted domain-first solution lock graph: topic `FOR NO KEY UPDATE`; when Help effects can touch solution posts/signals, old/new posts are locked in stable ID order, then the exact affected pending signals in stable ID order; only then does the same transaction acquire authoritative AccountState actor admission. Both Own and Any scopes require active actor. Existing `admin.forum` measure admission remains Any-only and follows lifecycle admission.

Existing domain precedence and product behavior are preserved: Own ownership, already-solved conflict, confirmed-duplicate exclusion, candidate existence/topic membership and original-first-post rejection. Active same-answer selection returns the existing `topicAuthorId/isSolved` result without redundant effect or History, but only after actor admission. Help replacement preserves old-answer `best-answer-replaced` moderation, new-answer moderation clearing and only the previously affected pending signal supersession. Own solution changes do not create ordinary Admin History; Any real changes append History last.

Barrier evidence confirms state-first and writer-first lifecycle behavior for both writers, J3-style old/new post lock serialization, signal-row contention before actor, and the actual Complaint submit lock shape (reported content `FOR UPDATE` → actor → target FK `KEY SHARE`) remains compatible with the J8 topic/post `NO KEY UPDATE` protocol. Current signal paths likewise do not introduce a reverse actor→locked-signal dependency against J8.

Exact-head evidence independently rechecked: J8 native PG17 **13/13**; existing Admin History **28/28**; Stage4 core solution flow green; PostgreSQL total **844/844**; application/unit **2275/2275** including canonical solution action regressions; CI SUCCESS; SA-03 Chromium SUCCESS; AP-10 browser all **4/4 SUCCESS**. Canonical late AccountInactive/Missing for Own/Any remains generic private/no-store `401 unauthenticated`, without redirect, solution confirmation prompt, lifecycle detail or forged actor use.

No J9+, Complaint-domain, #315, K, SA-05, schema/migration/permission/dependency, permanent-doc or Stage-6 changes were introduced. The existing J7 permanent-doc lock-wording closeout remains deferred to the separate docs PR required by AGENTS.md.

J9–J12 remain unassigned; Lev/Mark remain inactive.

## J9 — Mira bounded PASS

Lira completed authoritative AccountState admission for `createHelpSignal`, `withdrawHelpSignal`, rejected and accepted `resolveHelpSignal` in cumulative Draft #330 exact `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`, baseline J8 Mira PASS exact `41e26f191357aacde3de2dae3a3c7fed20756a30`.

Existing short Drizzle transactions now retain topic/post/signal dependencies before the same-transaction trusted actor guard `FOR NO KEY UPDATE`. New submissions preserve sorted topic locks and current solution post dependency with `FOR NO KEY UPDATE`, then actor → existing create-only `helpSignals.submit` → signal cooldown/uniqueness/insert. Cooldown reuses the authoritative actor mutex with no actor `FOR UPDATE` upgrade/second connection. Withdrawal retains existing signal lock/Own pending checks → actor → update without measures. Rejected review retains signal lock/pending → actor → `admin.forum` → reject → one History last. Accepted review locks sorted topics, applicable solution post, and complete affected pending signal set plus target by stable ID, including third-topic `proposedOriginalTopicId` duplicate signals, revalidates target, then actor → admin measure → existing kind-specific accepted or superseded effects → one `help.signalReviewed` History last. Inactive/missing cannot succeed or mutate any topic/post/signal/relationship/History fact.

New PG17 **32/32** cases cover all four submit kinds; withdrawal/rejected; materially different accepted/superseded outcomes; duplicate broad supersession; create-only measure/cooldown, withdrawal unaffected by blocked submission; actor lock strength; before/after inactive/missing; four state-first and four writer-first lifecycle shapes; overlapping signal/post locks and Complaint FK compatibility. Canonical all-four-intent late lifecycle denials remain private generic 401 with no redirect or status detail. Exact-head CI PG17 **876/876**, app/unit **2276/2276**, lint/typecheck/build/schema/Workers PASS; SA-03 Chromium SUCCESS; AP-10 Chromium **4/4 jobs SUCCESS**. Four bounded commits / three files inspected. **Mira bounded review: PASS — 0 confirmed current-scope J9 defects** on exact `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`. J10–J12, Lev, Mark remain unassigned; STOP before J10 assignment. No scope-expanding J10+, Complaint N, #315, K, SA-05, schema/migrations/permissions/dependencies, permanent docs or Stage 6 work; J7 doc-lock wording remains a separate docs-closeout item.

## Important cross-cutting boundaries

- Replay/no-op success is still a success boundary and requires authoritative active actor admission where the accepted plan says so.
- AccountState unavailable and unexpected failures stay distinct; inactive/missing does not become generic SQL failure.
- Canonical request errors must remain private/no-store where already required.
- Do not change architecture, schema, permissions, dependencies or public contracts merely to simplify a bounded lifecycle slice.
- Standalone attachment work belongs to K; #315 remediation, SA-05, permanent docs and Stage 6 stay separate.

## Historical anchors

- Predecessor service channel: #251.
- SA-04 master technical plan: #251 comment #6806249892.
- SA04-J full technical plan: #251 comment #6858869802.
- A2–H implementation history: #328.
- I implementation: #329, merged exact implementation `74c6f43ae2d67526e2ad17aa50392aebf41abbca`.
- Current cumulative J implementation: Draft #330.
