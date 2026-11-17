# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **SA06 implementation:** cumulative Draft #338 stable exact `50b0a0b464546fc4887568e454d5aa9881e51ca1`, open/unmerged.
- **SA06 REVIEW COMPLETE:** Mira fresh WHOLE SA06 coordinator PASS + Mark / Codex-6 Sol independent non-author WHOLE SA06 PASS on the same exact head; **0 confirmed current-SA06 defects**. #338 is ready for Developer merge; agents do not merge it.
- **SA07 dependency update ACTIVE/NEXT:** dependent Draft #339 exact `98f6ce48bc0efce465d89eff5267db3e82524fe1` still points to obsolete #338 prerequisite `ce71892d...`. Lev / Codex-6.1 Sol must update/recheck #339 against corrected #338 `50b0a0b...` before SA07 final acceptance.
- **QUEUED SA07 independent review:** Lira / ChatGPT-6 performs WHOLE SA07 review only on the first stable exact #339 head after that dependency update/recheck. Developer publication hold applies: no PASS/FAIL/findings/intermediate conclusions published anywhere until explicit developer command; on completion only report that review is complete and held.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
