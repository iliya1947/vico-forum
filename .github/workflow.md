# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339 exact `4d29735f915adb69cbe641c95d259c904e7114cd`, base `main`, open/Draft.
- **Mark independent WHOLE SA07 review:** **FAIL M1 — 1 confirmed current-SA07 defect.** `task.reconciliationPass` can appear in unfiltered `integrations.translation` History but the equivalent closed kind filter is rejected because projection and `compatibleKind()` disagree.
- **ACTIVE correction:** Lira / ChatGPT-6 fixes only this mapping inconsistency and adds scoped unfiltered + kind-filtered History regression coverage. No SA07 redesign/scope expansion.
- **After correction:** new stable exact #339 head + applicable checks → Mira fresh WHOLE SA07 coordinator review → only after PASS, Mark independent WHOLE SA07 review on the same exact head.
- **Boundary:** no merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
