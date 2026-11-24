# WORKFLOW.md — Task6 / corrective package after Lena HOLD

## Активный gate

**Lena independent whole-feature review: HOLD → Leva corrective implementation ACTIVE.**

Reviewed implementation remains Draft #379 exact `f601e91dcab19ee1992012564e9a0b557c2ea596` against main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

Lena completed R0–R5 and found five implementation defects plus one HTTP-contract discrepancy, all current Task6. Mira independently reconciled them against canonical PLAN/current code. No future-only item is included.

## Corrective package — Leva

Fix the six confirmed current-Task6 items as one bounded package on final #379:

1. **R2a-01 — Help/reserved HTTP classification.** Preserve neutral 404 for genuinely absent/protected/hidden/non-movable Help-source cases. For an otherwise admitted ordinary topic whose requested destination is a reserved/Help target, honor S7 and return controlled 409 conflict. Do not broaden private disclosure.
2. **R3b-01 — hidden Help inspector Move entry.** A hidden Help-domain topic/post inspection must not offer a Move entry that the authoritative move context/writer rejects. Ordinary hidden topic + required dual authority remains available.
3. **R4a-01 — early structural action failures.** The six category/section forms must consume early typed admission/parsing failures instead of silently ignoring truthy fallback `operation:"structure"` responses. Preserve entered name/destination and present controlled recovery; no automatic retry.
4. **R4a-02 — CategoryPicker error containment.** Controlled picker 400/503 must stay local to the structural form and preserve its local state rather than throwing the whole Admin page into the route error boundary. Search input must respect the accepted q≤200 code-point contract.
5. **R4a-03 — Move uncertainty fence.** Unrelated same-page revalidation (including Watch) must not clear stale/unconfirmed Move state or silently replace expectations. Only the accepted explicit fresh-read path or matching confirmed receipt may release the fence; no POST replay.
6. **R4b-01 — ordinary Admin structural History presentation.** Render the stored bounded before/after context for all eight new structural actions in ordinary Admin History/recent History, with appropriate target navigation, while preserving existing privacy boundaries and no hidden source leakage.

## Done

- Focused regressions cover each failed branch, including:
  - ordinary→Help target 409 while protected/Help-source 404 behavior stays neutral;
  - hidden Help inspector no Move link;
  - early 401/403/503/generic invalid structural responses are visible/recoverable;
  - picker over-bound query/unavailability preserves form state;
  - lost/stale Move remains fenced across an unrelated Watch/revalidation until explicit Refresh;
  - all eight structural Admin History actions render truthful bounded context/targets.
- Existing WF-01/F6-01 privacy, authority, editor-lifetime and no-replay guarantees remain green.
- No unrelated architecture/schema/dependency/docs/Stage changes.
- New stable exact #379 → Leva author self-check + applicable exact-head CI/acceptance → STOP → Mira whole-feature coordinator review.
- Only after Mira PASS does Lena independently review the new exact head. Prior independent HOLD/PASS does not carry across implementation changes.

## Границы

- Do not merge #379 or #342.
- F7 docs inactive until owner merge.
- #300/Stage6/general UI/UX/deploy/#320 inactive.
