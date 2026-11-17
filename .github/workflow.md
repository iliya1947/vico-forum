# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a` after Developer merged #338.
- **SA06:** review complete and merged.
- **SA07 implementation:** Draft #339 head `98f6ce48bc0efce465d89eff5267db3e82524fe1`, now based/retargeted to `main`, but GitHub reports **mergeable=false** after the SA06 merge.
- **ACTIVE dependency reconciliation:** Lev / Codex-6.1 Sol resolves the #339↔current-main conflict, preserving accepted SA06 corrections and SA07 scope, then runs applicable recheck and publishes a new stable exact #339 head. No SA07 replanning or scope expansion.
- **QUEUED independent WHOLE SA07 review:** Lira / ChatGPT-6 is review-only and must not resolve the dependency conflict or modify SA07 implementation. She reviews the first stable exact #339 head after Lev's reconciliation.
- **Developer publication hold for Lira:** no PASS/FAIL/findings/intermediate conclusions published anywhere until explicit developer command; when complete, only report that review is complete and held.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
