# Admin / Super-admin — active service plan

Service PR #331 is the active Admin/Super-admin coordination channel. PR #251 is archive/history only and retains the accepted SA-04 planning comments referenced below.

## Current boundary

- Current source-of-truth baseline: `main = 398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- Stage 6 remains paused; no external deployment, production migration, real R2/Google/provider setup or production data work is authorized here.
- #315 security remediation remains a separate service task.
- Permanent SA-04 factual/project documentation is updated only in the separate documentation closeout required by `AGENTS.md`; interim package progress is tracked here.
- SA-05 remains blocked until full SA-04 A–S completion and final acceptance.

## Stable product decisions

1. Super-admin remains exact server-bound Owner only; SA-04 does not create a second RBAC.
2. Deactivation is not hard deletion: published content remains, public identity is neutral, private/account data retention is at least one year.
3. SA-04 contains no user-accessible deactivate control. Deactivated state for SA-04 verification is fixture/test state only.
4. No Owner exemption exists from AccountState lifecycle admission.
5. Reactivation, purge/end-of-retention, forced-session termination, foreign credential/provider mutation and additional Owner/recovery models remain outside SA-04.
6. Repository/local-CI acceptance does not imply Stage-6/deployed acceptance.

## SA-04 master sequence

Accepted master technical plan: predecessor #251 comment **#6806249892**.

- **A–H:** account-state storage + neutral public identity/projection foundation — delivered in current main.
- **I:** Better Auth active-account closure — delivered in current main.
- **J:** Forum authoritative actor writes — **delivered/merged by PR #330**, merge commit `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`; Mira cumulative whole-J PASS + Lev independent whole-J PASS on implementation head `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`.
- **K:** attachment upload/draft/finalization admission — **Lev independent whole-K RETURN on exact `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`; confirmed current-K finding `SA04-K-LEV-01 / P3`; bounded Lira correction active in #332**.
- **L:** authorization mutations.
- **M:** AP-10 mutations/appeals.
- **N:** Complaints mutation/participation.
- **O:** own locale save.
- **P:** Privacy save.
- **Q:** registration settings write.
- **R:** new user generation-plan admission.
- **S:** connected end-to-end SA-04 closure on one stable accepted state.

## SA04-K — scope for technical planning

**Goal:** close authoritative AccountState admission for actor-owned attachment lifecycle operations that can create, retain, mutate or finalize private temporary upload/draft facts, while preserving the already-delivered Editor 2.0 attachment/publication contracts.

Relevant permanent contracts are current `docs/EDITOR.md`, `docs/ADMIN_PANEL.md`, `docs/auth/AUTHORIZATION.md`, plus the SA-04 master plan #251 comment #6806249892.

Planning must establish from current `main`:

1. the complete authoritative attachment mutation/finalization entrypoint and caller inventory that belongs to K, distinguishing it from the already-merged J publication/edit final bind path;
2. where lifecycle admission must be transactionally authoritative versus request/preflight-only, including replay/no-op/cancel/cleanup boundaries;
3. lock/transaction ordering and races with draft scope, attachment refs, cleanup/delete claims, publication/edit, AP-10 `attachments.upload` restriction and future SA-05 state mutation;
4. handling of the external object PUT boundary so a late upload cannot create publication capability after account deactivation, without pretending an already completed external PUT can be rolled back;
5. canonical HTTP/error/privacy behavior and preservation of mounted editor text/selection/retry/cancel semantics;
6. required native PostgreSQL, repository/route/Worker/browser evidence and exact-head acceptance;
7. a bounded Lira implementation decomposition, with no implementation started during planning.

**Out of K:** J rework without a confirmed K dependency, authorization L, AP-10 M, Complaints N, locale/privacy/settings/generation O–R, S final closure, SA-05, #315, permanent docs, Stage 6/external R2, new AV provider, schema/dependency/public-contract expansion unless Lev proves it is required for K.

If current code/source-of-truth conflicts with the accepted master plan or a correct K solution requires a broader architectural change, Lev stops with a technical escalation instead of silently expanding scope.

### Whole-K coordinator review — HISTORICAL PASS; superseded by independent RETURN

Mira coordinator whole-K review **PASS** on stable cumulative Draft #332 exact `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`: **0 confirmed current-K defects**.

Reviewed cumulative production delta, all seven lifecycle-gated attachment entrypoints, deliberately ungated public/security/cleanup boundaries, J publication/finalization composition, lock ordering, AP-10 semantics, all four authoring contexts, cleanup/claim/lease rules, late PUT/ambiguous ACK behavior, private error privacy and connected local-R2 runtime evidence.

Independent exact-head evidence rechecked:
- CI 43638470727 SUCCESS — PG17 **956/956** (84 files), app **2306/2306** (186 files), K1/K2/K3/K4 **7/7 each**, attachment fence **22/22**, route/editor/Worker focused suites green, typecheck/build/schema/migration/Worker gates green;
- K5 connected run 43638470788 SUCCESS — **29/29** built Worker + genuine Better Auth + PostgreSQL 17 + local-only R2 + Chromium cases;
- exact-head AP-10, SA-01, SA-03 and SA04-J12 browser workflows SUCCESS.

Lev subsequently returned one confirmed current-K defect `SA04-K-LEV-01 / P3`; this historical coordinator PASS no longer closes the merge gate. After the bounded correction lands on a new stable head, Mira repeats cumulative whole-K review, then Lev independently reviews that same new head.


### SA04-K-LEV-01 — CONFIRMED / correction active

Mira independently verified Lev's P3 finding against current #332 source, the actual Worker reproducer and current React Router v8 route semantics. The new Worker failure wrapper classifies raw `request.url` pathname literally, while the attachment routes accept route-equivalent case/trailing/encoded static-segment variants; on those variants an unexpected private GET/HEAD 500 can therefore miss the required `private, no-store` header.

This is a **current-K privacy/cache-contract defect**, not future #315 work. Confirmed scope is only the new attachment resource 5xx classifier and regressions. Required correction result: classify every attachment URL variant actually accepted by Router as the same private attachment resource for GET/HEAD 5xx; preserve status/body/cookies, successful responses, public GET caching and all auth/lifecycle/storage semantics; malformed encoding must not make the wrapper throw. Add focused alias/malformed regressions plus representative actual Worker unexpected-500 proof. No routing/auth/storage redesign.

After correction: new stable exact #332 head + applicable gates → fresh Mira cumulative whole-K review → Lev independent whole-K review. No merge before both PASS.

## Remaining accepted Super-admin package sequence after SA-04

Source: accepted Lev bounded decomposition in predecessor #251 comment **#6745289141**.

- **SA-05:** the single Owner-only deactivate operation + Owner profile control + lifecycle event/retention view. Includes authoritative user lock/atomic event/presence cleanup/idempotency/exact-Owner target restriction. Explicitly excludes forced logout, reactivation and mandatory reason.
- **SA-06:** Monitoring for **Forum + Administration + Moderation + Notifications**, with History mapping and canonical contextual links/actions using existing authoritative domain operations.
- **SA-07:** Monitoring for **Localization & translations + Files & attachments + Background processes + Data + Integrations**, using real source-specific observability and honest disabled/unbound states; no production provider/Queue controls.
- **SA-08:** full Overview + cross-area filters/History/actions + end-to-end Super-admin integration/closeout. All 13 approved Monitoring areas must be accounted for; **Infrastructure remains Stage-6-only** until Stage 6 is explicitly resumed.

SA-05–SA-08 are already accepted future packages; they are not invented follow-up work. They remain blocked until the preceding package is fully accepted/merged according to the active workflow.

**Developer planning gate:** after full SA-04 closure and before any SA-05 implementation, the remaining **SA-05–SA-08 must be technically planned as one complete dependency chain** to sufficient implementation depth (cross-package contracts, data/seams, critical interaction/race/security boundaries and acceptance). Package implementation must follow that accepted complete plan; only details that genuinely depend on the then-current `main` may be refined later. Do not use per-package just-in-time planning as a substitute for this full remaining-chain plan.

## Historical anchors

- SA-04 master plan: #251 comment #6806249892.
- SA04-J full plan: #251 comment #6858869802.
- A2–H implementation history: #328.
- I implementation: #329.
- J implementation/review/merge: #330; operational review history remains in #331.

## SA04-K — accepted technical plan

Lev's complete technical plan is accepted by Mira: predecessor/service comment **#6877583725** on #331, baseline `main=398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.

Accepted K inventory:
- lifecycle-gated: `admitUpload`, `createDraftAttachment`, `recordUploadObject`, `activateUploadObject`, `listDraftAttachments`, `readDraftAttachment`, `cancelOperation`;
- not lifecycle-gated by K: public `readPublishedAttachment`, server-owned `recordSecurityEvent`, permission-scoped `readSecurityAttachmentEvents`, and system cleanup.

Accepted bounded queue: **K1 metadata/replay → K2 PREPARING/READY journal → K3 private reads → K4 Cancel → K5 cumulative connected closure**. Only one implementation slice is active at a time. Whole-K coordinator review happens after K5 on one stable cumulative head; only after Mira PASS does Lev independently review that same head.

**K1 author evidence (historical; subsequently Mira PASS):** cumulative Draft [#332](https://github.com/iliya1947/vico-forum/pull/332) exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`, transaction-local AccountState in `admitUpload` and `createDraftAttachment`, controlled 401/503 and scoped fresh-key cleanup, native 7/7 PG barriers and 22/22 upload fence/route tests, [CI 43599514990](https://github.com/iliya1947/vico-forum/actions/runs/43599514990) PG17 935/935 and application 2282/2282, all checks SUCCESS. K1 Mira PASS recorded below; K2 author evidence follows.

### K1 — ACCEPTED

Mira bounded coordinator review **PASS** on cumulative Draft #332 exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`: 0 confirmed current-K1 defects. Exact-head CI 43599514990 SUCCESS: PG17 935/935 (K1 7/7; attachment fence 22/22), app 2282/2282, lint/typecheck/build/migrations/Workers checks PASS.

### K2 — ACCEPTED

Mira bounded coordinator review **PASS** on cumulative Draft #332 exact `eaf57c46ca28baff9a11ae637f37d7d850934ab9`: 0 confirmed current-K2 defects.

Accepted result:
- `recordUploadObject(actorId, objectKey)` uses one short actor NKU → fresh journal INSERT transaction; successful COMMIT precedes any reservation;
- `activateUploadObject(actorId, objectKey, reservationEtag)` uses existing journal `FOR UPDATE` → actor NKU → existing conditional PREPARING→READY update in one transaction;
- canonical POST threads only trusted session actor; no actor column/schema/protocol change;
- missing/claimed/already-ready rows, cleanup claims/leases, fence and metadata-finalizer journal→actor ordering are preserved.

Exact-head evidence: CI 43601817617 final attempt SUCCESS — PG17 **942/942** in 82 files, K2 native **7/7**, K1 **7/7**, fence **22/22**, app **2286/2286**, lint/typecheck/build/migrations/Workers PASS. The first database attempt on the same SHA had one unhandled rejection in unchanged `forum-online-privacy.test.ts`; source/lock inspection found no K2 causal path and the complete same-head rerun passed.

### K3 — ACCEPTED

Mira bounded coordinator review **PASS** on cumulative Draft #332 exact `dae431fc920c79cad654627052365a3fd2380fe4`: 0 confirmed current-K3 defects.

Accepted result:
- `listDraftAttachments` and `readDraftAttachment` use existing draft scope → actor NKU → generation/private query in one short transaction;
- no actor lock spans bucket GET/response streaming;
- inactive/missing private reads return no private metadata/bytes; state-first denial reaches no bucket GET;
- public published-file membership/read remains independent of author lifecycle;
- AP-10 `attachments.upload` does not become a private-read restriction;
- private attachment GET/list controlled failures remain no-store, and unexpected framework 5xx on attachment resource routes are narrowly forced private/no-store without changing public forum GET caching.

Exact-head evidence: CI 43608804921 SUCCESS — PG17 **949/949** in 83 files, K3 native **7/7**, K2 **7/7**, K1 **7/7**, fence **22/22**, app **2300/2300** in 186 files, lint/typecheck/build/migrations/Workers PASS. Exact-head AP-10, SA-01, SA-03 and SA04-J12 browser workflows also SUCCESS.

### K4 — ACCEPTED

Mira bounded coordinator review **PASS** on cumulative Draft #332 exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`: 0 confirmed current-K4 defects.

Accepted result:
- `cancelOperation` keeps existing draft advisory scope → actor NKU → retire-generation + exact temporary-ref delete in one transaction;
- inactive/missing cannot receive empty/live/terminal Cancel success or mutate completion/refs;
- active Cancel remains idempotent and AP-10 `attachments.upload` independent;
- no public/shared binding, receipt, foreign ref or physical object is synchronously removed;
- local editor Cancel/Remove semantics remain local reset/abort intent and do not claim a remote committed Cancel.

Exact-head evidence: CI 43616566018 SUCCESS — PG17 **956/956** in 84 files, K4 native **7/7**, K3 **7/7**, fence **22/22**, app **2306/2306** in 186 files, attachment route **42/42**, editor attachment operation **21/21**, lint/typecheck/build/migrations/Workers PASS. AP-10, SA-01, SA-03 and SA04-J12 browser workflows also SUCCESS on the same SHA.

### K5 — AUTHOR STOP; whole-K coordinator review pending

K5 five-subtask author closure completed at cumulative implementation Draft #332 stable exact `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`. All six exact-head workflows SUCCESS; complete evidence and handoff are in service communication and the #331 final author comment. This is not Mira/Lev whole-K review or merge authorization.

Result: close **all SA04-K evidence** on one stable cumulative #332 head and fix only confirmed current-K defects discovered during that closure.

Required cumulative acceptance:
- re-sweep all seven lifecycle-gated attachment entrypoints and excluded public/system boundaries against the accepted K plan;
- prove state-first/writer-first lifecycle races and cross-writer/fence matrix across admission, PREPARING/READY, finalization, private reads and Cancel, including cleanup claims/leases and J publication/edit interactions where current K depends on them;
- preserve late-PUT and ambiguous-ACK rules: no false success/new publication capability after deactivation; no blind deletion on unknown DB/storage commit outcome;
- connected **built Worker + genuine Better Auth + PostgreSQL + local-only R2 binding** harness using supported local Wrangler/Miniflare facilities; no production config/resource/credential change;
- deterministic actual HTTP barriers for pre-object denial, late PUT/finalizer denial, journal wait/state-win, POST/list/private-file 503 and unexpected 500 privacy, and public published bytes of inactive author;
- Chromium on actual mounted forms/BA cookies/local R2 covering active upload/retry/publish/download, deactivation after mount and during pending upload, text/File/selection preservation/no false 201, inactive list/private download/retry/Cancel denial, Remove/Cancel late-ACK isolation, AP-10 committed replay vs new-file rejection, retained published file;
- applicable native/fence/publication/J/AP10/forum-permission/route/Hyperdrive/editor/R2 suites plus standard CI gates all green on the final exact head;
- AUTHOR STOP on one final stable cumulative head with complete evidence packet. Then Mira performs **whole-K coordinator review**, and only after Mira PASS does Lev independently review that same exact head.

K5 must not expand into L–S, SA05, #315, permanent docs, production/Stage6 deployment or unrelated redesign. Any current-K defect discovered in K5 may be fixed locally in #332; broader protocol/architecture change requires Lev technical escalation first.

