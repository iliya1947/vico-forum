# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339 new exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`, base `main`, open/Draft, GitHub mergeable=true.
- **Mark independent WHOLE SA07 review:** prior exact head `4d29735f...` had confirmed current-SA07 M1, as documented in #331.
- **M1 bounded correction COMMITTED (Lira):** `db/owner-sa02-history.ts` now admits `task.reconciliationPass` in `integrations.translation` kind filters, consistent with existing retained task-event projection; added real reconciler scoped unfiltered, kind-filtered, Background/global original-ID regression in `tests/database/sa07-task-monitoring.test.ts`. Two changed files, no redesign.
- **AUTHOR M1 CORRECTION ACCEPTANCE COMPLETE:** 13/13 relevant workflow runs SUCCESS on exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`, including CI application 2568/2568 (208 files, successful unchanged-job rerun after one unrelated first-attempt SET-02 test failure), native PostgreSQL 17 1400/1400 (103 files), SA07 connected Chromium, AP-10 4/4. Handoff published in #331 comment #6949923350.
- **ACTIVE NEXT:** Mira / ChatGPT-5.6 Sol fresh WHOLE-SA07 coordinator review of the cumulative Draft #339 on the unchanged exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`. Only after coordinator PASS, Mark / Codex-6 Sol performs independent whole-SA07 review on same exact head. Lira AUTHOR STOP; no implementation changes during review.
- **Boundary:** no merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
