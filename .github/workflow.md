# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339 new exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`, base `main`, open/Draft, GitHub mergeable=true.
- **Mark independent WHOLE SA07 review:** prior exact head `4d29735f...` had confirmed current-SA07 M1, as documented in #331.
- **M1 bounded correction COMMITTED (Lira):** `db/owner-sa02-history.ts` now admits `task.reconciliationPass` in `integrations.translation` kind filters, consistent with existing retained task-event projection; added real reconciler scoped unfiltered, kind-filtered, Background/global original-ID regression in `tests/database/sa07-task-monitoring.test.ts`. Two changed files, no redesign.
- **ACTIVE exact-head verification:** 13 applicable GitHub workflows started on new `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`; no acceptance claim until all complete.
- **After green exact-head checks:** Lira publishes author correction/acceptance handoff → Mira fresh WHOLE SA07 coordinator review → only after PASS, Mark independent WHOLE SA07 review on same stable exact head.
- **Boundary:** no merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
