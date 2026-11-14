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
- **K:** attachment upload/draft/finalization admission — **K1–K3 Mira PASS; K4 Lira AUTHOR STOP on cumulative Draft #332 exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`, pending Mira bounded review; K5 prepared/inactive**.
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

### K4 — Lira AUTHOR STOP / Mira bounded review pending

Result: authoritative active-account admission for whole-operation `cancelOperation`, preserving current idempotent operation retirement, temporary-ref cleanup and local editor Cancel/Remove behavior.

Readiness:
- repository order remains draft advisory scope → actor NKU → existing retire/delete logic in the same short transaction;
- inactive/missing actor receives no `cancelled` success, no new completion marker and no temporary-ref deletion, including empty/already-terminal operations;
- active Cancel remains idempotent for empty/live/already-terminal operation and is not blocked by AP-10 `attachments.upload`;
- only temporary refs of the exact owner/context/operation may be removed; published/shared bindings, publication receipts, foreign refs and physical bytes remain untouched synchronously;
- real PostgreSQL evidence covers state-first/writer-first Cancel plus overlap with upload/finalization and existing cleanup/ref behavior; no new actor lock is added to system cleanup/shared generation helpers;
- canonical whole-operation DELETE maps lifecycle inactive/missing to private/no-store 401, classified unavailable to 503, unexpected remains unexpected; unsupported/per-file DELETE remains 405;
- existing local editor Cancel/Remove still resets local intent/XHR state without claiming a server commit on denied Cancel;
- K5 connected closure remains inactive. No per-file server delete, schema/storage/publication redesign, L–S, SA05, #315, permanent docs or Stage6 work.

**K4 author evidence (not Mira PASS):** cumulative Draft #332 exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`; one production AccountState guard in Cancel, native K4 7/7 with both state-race and real Cancel↔metadata finalization orderings; route denial/unavailable/unexpected plus editor local denial; [CI 43616566018](https://github.com/iliya1947/vico-forum/actions/runs/43616566018) SUCCESS — PG17 956/956, app 2306/2306, lint/typecheck/build/schema/Workers. AP-10/SA-01/SA-03/SA04-J12 exact-head browser workflows SUCCESS. Mira reviews this exact head; only her K4 PASS activates K5.


