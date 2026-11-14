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
- **K:** attachment upload/draft/finalization admission — **next package; technical planning active**.
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
