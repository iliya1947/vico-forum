# agents/lira.md — B9 HOLD; pre-fold current-main sync only

## Confirmed blocker

- Draft #376 exact `108e0ba31ed34f891e8b46e411991b893b9da56b` remains valid B8-C evidence, but the stacked feature merge-base is old main `6fa2a43...`.
- Current main is `9cff976...`; the final head is ahead 314 / behind 5.
- Missing main commits include #362/#363 manual PR test controls. Current main changes `ci.yml`, SA04-N and SA04-K5; B8 also changes SA04-N/K5. The final fold cannot be reviewed from the pre-sync head.

## Current assignment — sync only

1. Integrate current main `9cff976a9621d9fe5dfef28ea5367e390ff435b1` into the existing final B8 branch. Choose the technically clean integration method, but do not rewrite unrelated product scope.
2. Reconcile overlapping workflow files so both contracts survive:
   - current-main agent-triggered `run:ci` / `run:acceptance` and workflow_dispatch behavior;
   - B8 SA04-N C1/C2/C3 Chromium invocations and SA04-K5 B8-B2 local-R2 invocation.
3. Reconcile final diff against **current main**, not the old stack merge-base.
4. Use the current main manual PR-test controls to run final CI and applicable connected acceptance on the resulting exact head.
5. Record the new exact SHA, integration scope, same-head checks/workflows and any conflict resolution in #376/#342.

**Mandatory STOP after the synced exact-head author self-check.** Do not fast-forward B1, close intermediate PRs, start Mira/Leva whole-feature review, merge, docs or deploy.
