# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339, branch `chatgpt/sa07-native-operations`, base `main` at `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`, new exact head `4d29735f915adb69cbe641c95d259c904e7114cd`; GitHub `mergeable=true`. Comparison main…head has exactly 102 SA07 changed paths, behind 0.
- **Reconciliation completed (Lira):** integrated the accepted SA06 M2 subject-only native History predicate and its two PG regressions; recorded `main` as second parent via a bounded merge commit while preserving cumulative SA07 source. No redesign, schema/dependency/runtime activation or unrelated change.
- **ACTIVE/NEXT:** Lira / ChatGPT-6 runs applicable exact-head recheck (CI/native/connected acceptance) before attempting the whole-SA07 package review. New-head 13 workflows were in progress on initial verification; results not yet accepted.
- **Review classification:** Lira's subsequent whole-SA07 review is author/self review, not independent, under explicit Developer override.
- **Developer publication hold:** do not publish SA07 PASS/FAIL, findings, intermediate conclusions or review details anywhere until explicit developer command. After completing review, report only that it is complete and the result held.
- **Escalation boundary:** substantive technical redesign outside accepted SA07 scope requires stopping and escalating.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains implementation-PR merge authority.
