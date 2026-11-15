# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge.
- **Current main / cumulative SA04 M–S base:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Delivered in main:** SA01–03 and SA04 A–L. L is the already-merged historical delivery-boundary exception (#333).
- **Accepted technical scope:** SA04 **M → N → O → P → Q → R → S**, then SA05 → SA06 → SA07 → SA08; architecture/acceptance unchanged.
- **Merge boundary:** remaining SA04 uses **one cumulative Draft implementation PR M–S**. No Owner merge between M/N/O/P/Q/R; final merge only after S closure and final whole-SA04 Mira + Lev review.
- **Current slice:** **M1 ACTIVE** — native AccountState admission for all five AP-10 measure/appeal writers and its native fact/race matrix.
- **Lira:** ACTIVE. Create the cumulative M–S Draft from current main and implement M1 only.
- **Implementation PR:** not yet created at handoff; once created it remains the same cumulative PR through S.
- **Mira:** STOP until M1 author checkpoint; then bounded M1 acceptance only.
- **Lev:** inactive; no replanning needed because M locators/SoTs are unchanged from accepted baseline and L is the expected adjacent dependency.
- **Mark:** inactive.
- **Next checkpoint:** M1 author evidence/STOP → Mira bounded M1 review → on PASS M2 continues in the same cumulative PR. **No merge.**
- **Final SA04 gate:** S AUTHOR STOP → Mira whole-SA04 coordinator review → Lev independent same stable exact candidate → Owner merge once.
- **Boundary:** M2/N+ not implemented in M1; no SA05, #315 remediation, permanent docs, production/deployment or Stage6.
