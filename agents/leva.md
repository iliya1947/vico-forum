# agents/leva.md — Task6 corrective package ACTIVE

Base for correction: final Draft #379 exact `f601e91dcab19ee1992012564e9a0b557c2ea596`, main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

Lena independent review ended HOLD. Mira independently reconciled the findings. Implement **only** this six-item corrective package:

1. R2a-01: ordinary admitted topic → reserved/Help destination returns controlled 409 per S7; preserve neutral 404 for absent/protected/hidden/non-movable Help-source and do not widen disclosure.
2. R3b-01: hidden Help-domain inspector must not advertise Move; ordinary hidden dual-authority Move remains.
3. R4a-01: six structural forms consume early typed generic `operation:"structure"` failures, preserve draft/destination and expose controlled recovery; no retry.
4. R4a-02: CategoryPicker controlled 400/503 remains local and preserves form state; q contract is ≤200 Unicode code points.
5. R4a-03: unrelated revalidation must not clear stale/unconfirmed Move state; only explicit fresh verification or matching confirmed receipt releases it; no automatic POST.
6. R4b-01: ordinary Admin full/recent History renders bounded before/after details and target navigation for all eight structural actions without privacy/source leakage.

Add targeted regressions for the concrete failing branches and preserve WF-01/F6-01, privacy/authority/editor-lifetime/no-replay guarantees.

No architecture/schema/dependency/docs/Stage expansion. After correction: stable #379 exact → author self-check + applicable exact-head CI/acceptance → **STOP → Mira whole-feature coordinator review**. Lena re-reviews only after Mira PASS. No merge/F7/#300/#320/deploy.
