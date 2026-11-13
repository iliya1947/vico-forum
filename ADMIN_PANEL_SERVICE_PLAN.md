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
4. **J3b — published-post edit:** `editPublishedPost`, matching edit receipt replay, revision/CAS, mentions, retained/new attachment binding, draft finalization and receipt. **Lira implementation complete on `b407f93f54b7f7e1073218dd63b4f6235b1bb417`; Mira bounded review pending.**
5. **J3c — source-locale service no-op + canonical HTTP boundary.** Unassigned.
6. **J4 — profile writer.** Unassigned.
7. **J5 — read-state writer.** Unassigned.
8. **J6 — inbox acknowledgement writers.** Unassigned.
9. **J7 — topic close/pin/unpin state writers.** Unassigned.
10. **J8 — solved/best-answer writers.** Unassigned.
11. **J9 — Help Signals submit/withdraw/resolve.** Unassigned.
12. **J10 — Help solution moderation.** Unassigned.
13. **J11 — duplicate/appeal family.** Unassigned.
14. **J12 — cumulative J closeout/evidence.** Unassigned.

After the implementation decomposition is complete, Mira performs the coordinator whole-J review on one stable exact head. Only after Mira PASS does Lev perform the independent technical whole-J review of that same head. Lev's technical planning/review work is not to be fragmented into the small Lira implementation slices unless the developer explicitly changes that rule.

## J3b contract — implementation complete, Mira review pending

Implementation PR: cumulative Draft #330. Accepted baseline: `39df1262d9b536df87b0147e4a8a400d65b7d038`.

Required behavior:

- Preserve draft-scope-first/replay ordering and existing Editor 2.0 behavior.
- Matching edit receipt replay must not return success to an inactive/missing actor.
- Fresh edit path keeps authoritative post/ownership/revision checks, then active-actor admission before the first protected edit write.
- Denied lifecycle request must not create a revision, move the current revision, change public attachment refs, create mentions, retire/finalize the operation or create/alter the receipt.
- Active behavior, owner-only edit rule, expected-revision conflict/rebase behavior, measure enforcement, retained/new attachment selection, idempotent lost-response retry and attachment atomicity remain unchanged.
- Evidence must include active fresh/replay controls, missing/inactive denial, before/after fact preservation, both lifecycle race directions through final attachment/receipt work, and applicable PostgreSQL/HTTP/editor/attachment regressions.
- Lira published stable exact Draft #330 head `b407f93f54b7f7e1073218dd63b4f6235b1bb417`, checked CI/browser evidence and recorded AUTHOR STOP. Mira performs bounded J3b review next.
- J3c is not a J3b defect. J4+ are not current scope.

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
