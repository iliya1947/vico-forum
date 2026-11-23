# agents/leva.md — independent whole-feature re-review assigned

## Target

- Draft #355 exact `66b1bb7ec0f4a1f5bed17583398d5acc041da143`
- base/current main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`
- previous reviewed head `fdad1930...` is superseded.

## Assignment

Independently re-review the whole moderation-visibility feature on this exact head after Lira's bounded correction of:
1. VIS-FINAL-LEVA-01 — protected own pending Help withdrawal under hidden dependencies;
2. VIS-FINAL-LEVA-02 — ordinary Admin sanitized tombstone chronology/root/numbering/relations/candidates.

Explicitly verify both corrections against accepted V5/V6 and check for regressions introduced by the 8-file delta. Continue review beyond those two points; first finding does not end the review.

Fresh exact-head evidence already exists and Mira independently checked it, but do not treat green CI as proof of correctness.

Do not modify implementation during review. Return PASS/HOLD on the same exact head and update service state. If the head changes, stop and invalidate the assignment.
