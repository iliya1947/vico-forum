# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339, branch `chatgpt/sa07-native-operations`, base `main` at `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`, new exact head `4d29735f915adb69cbe641c95d259c904e7114cd`; GitHub `mergeable=true`. Comparison main…head has exactly 102 SA07 changed paths, behind 0.
- **Reconciliation completed (Lira):** integrated the accepted SA06 M2 subject-only native History predicate and its two PG regressions; recorded `main` as second parent via a bounded merge commit while preserving cumulative SA07 source. No redesign, schema/dependency/runtime activation or unrelated change.
- **Stage 2/3 COMPLETE:** applicable exact-head repository CI, PostgreSQL 17, runtime privilege and connected browser checks verified against SA07 head `4d29735f915adb69cbe641c95d259c904e7114cd`; detailed check/review information remains withheld under Developer publication hold.
- **Stage 3/3 COMPLETE; RESULT PUBLISHED:** Lira published the whole-SA07 author/self review of stable exact Draft #339 `4d29735f915adb69cbe641c95d259c904e7114cd` in #331 [comment #6948418719](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6948418719) by Developer's `...` continuation command. It is not an independent review gate; implementation unchanged during review.
- **NEXT:** Developer decides whether an additional independent review / visual acceptance is required before considering #339 merge. Only Developer may merge.
- **Review classification:** Lira's subsequent whole-SA07 review is author/self review, not independent, under explicit Developer override.
- **Publication hold:** previously held author/self review result was published on the Developer's continuation command in #331 comment #6948418719. No new review findings or unrelated output are authorized by that one-off release.
- **Escalation boundary:** substantive technical redesign outside accepted SA07 scope requires stopping and escalating.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains implementation-PR merge authority.
