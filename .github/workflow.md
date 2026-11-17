# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 merged.
- **SA07 implementation:** Draft #339 head `98f6ce48bc0efce465d89eff5267db3e82524fe1`, base `main`, GitHub currently `mergeable=false`.
- **ACTIVE — developer override:** Lira / ChatGPT-6 resolves the #339↔main conflict, preserves merged SA06 + accepted SA07 scope, runs applicable recheck, then performs whole-SA07 review on the resulting stable exact head. Lev is not used for this reconciliation.
- **Review classification:** if Lira changes implementation during conflict resolution, her subsequent whole-SA07 review is author/self review, not independent; developer explicitly accepts this for the current route.
- **Developer publication hold:** no SA07 PASS/FAIL/findings/intermediate conclusions published anywhere until explicit developer command; on completion Lira reports only that work/review is complete and result is held.
- **Escalation boundary:** only if reconciliation requires substantive redesign beyond accepted SA07 scope does Lira stop and report that escalation is required.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
