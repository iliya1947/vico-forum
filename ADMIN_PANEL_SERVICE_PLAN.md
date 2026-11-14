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
- **K:** attachment upload/draft/finalization admission — **implementation in progress: K1 Lira AUTHOR STOP on Draft #332 exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`, awaiting Mira bounded review; K2–K5 prepared/inactive**.
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

**K1 author evidence (not Mira PASS):** cumulative Draft [#332](https://github.com/iliya1947/vico-forum/pull/332) exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`, transaction-local AccountState in `admitUpload` and `createDraftAttachment`, controlled 401/503 and scoped fresh-key cleanup, native 7/7 PG barriers and 22/22 upload fence/route tests, [CI 43599514990](https://github.com/iliya1947/vico-forum/actions/runs/43599514990) PG17 935/935 and application 2282/2282, all checks SUCCESS. Next Mira bounded K1 review. K2–K5 not started.

### K1 — ACCEPTED

Mira bounded coordinator review **PASS** on cumulative Draft #332 exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`: 0 confirmed current-K1 defects. Exact-head CI 43599514990 SUCCESS: PG17 935/935 (K1 7/7; attachment fence 22/22), app 2282/2282, lint/typecheck/build/migrations/Workers checks PASS.

### Active K2 — PREPARING/READY journal admission

Result: make `recordUploadObject` and `activateUploadObject` authoritative AccountState-gated server commands using the trusted session actor, without changing storage schema or HTTP protocol.

Readiness:
- `recordUploadObject(actorId, objectKey)`: one short transaction, actor NKU before INSERT of the fresh server-random journal key; no reservation/PUT begins until commit succeeds;
- `activateUploadObject(actorId, objectKey, reservationEtag)`: existing journal row `FOR UPDATE` before actor NKU, then existing conditional PREPARING→READY update on the same transaction; claimed/missing/already-ready rows remain denied;
- canonical upload route threads only trusted `scope.userId` through the existing callbacks; no client actor/header and no actor persistence column;
- state-first and writer-first races are proven for both journal methods; activate/finalizer lock order cannot become actor→journal; cleanup claims/expired lease retain existing semantics;
- early lifecycle denial before reservation/PUT returns canonical 401; classified unavailable/unexpected distinctions remain;
- K3 private reads, K4 Cancel and K5 connected closure remain inactive.



Result: authoritative same-transaction AccountState admission for `admitUpload` and `createDraftAttachment`, preserving current stable-ID replay/AP-10 behavior and final metadata/ref semantics.

Readiness:
- inactive/missing actor gets no committed replay/fallback/private success and no new metadata/ref;
- active matching committed replay remains exempt from a newly active `attachments.upload` measure exactly as today;
- fresh metadata remains subject to the existing measure rule;
- lifecycle unavailable and unexpected faults retain the accepted 503-vs-unexpected distinction; canonical POST lifecycle denial is private/no-store 401;
- if final metadata admission deterministically rejects the fresh already-settled physical upload for lifecycle state, only that fresh attempt object may be best-effort deleted; ambiguous commit/storage outcome must not trigger blind deletion;
- native PostgreSQL coverage proves state-first and writer-first ordering and fact preservation for replay/fresh/fallback paths;
- K2 journal signatures, K3 private reads, K4 Cancel, K5 connected local-R2/browser closure, L–S, SA05, #315, docs and Stage6 stay out.

