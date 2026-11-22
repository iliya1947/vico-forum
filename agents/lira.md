# agents/lira.md — B8-A-MIRA-01 correction only

## Reviewed head

- Draft B8 #376 exact `8942509ee94927c5c0dc1014381bfcf5ad18da84`, stacked on accepted B7 #371 `f92778606f1c8ea4e64f53c1660910f34c48b84c`.
- Mira coordinator checkpoint: **HOLD with one confirmed current-B8-A acceptance blocker**.
- Existing exact-head CI #45058154131 is green; this is a semantic coverage gap, not a failed test.

## Current task — B8-A-MIRA-01 only

Close the V8 matrix cell for **real Hide/Restore × accepted translation execution**.

Current A7 limitation:
- title/body publication races use historical selective fixtures and direct SQL `UPDATE is_hidden`;
- that proves the publication/content-row lock seam but does not exercise the actual visibility transaction and its CAS/version, topic→post ordering, actor/AP-10/current permission admission and append-last History.

Done criteria:
1. Add the smallest full-schema real-PostgreSQL barrier regression(s) that race accepted title/body execution with the actual `setTopicVisibility/setPostVisibility` command in the relevant two orders.
2. Assert task/private translation completion contract, visibility final state/version and neutral History invariants; no new task on Restore where applicable.
3. Do not replace existing useful A7 low-level tests unless necessary; avoid duplicating unrelated B8-A coverage.
4. If the actual race exposes a current visibility defect, fix only that bounded defect and prove it.
5. Run applicable PostgreSQL checks on the new exact head and update #342/#376.

**Mandatory STOP after this correction.** Do not start B8-B/C, B9, fold, final review, merge or deploy.
