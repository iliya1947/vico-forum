# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339 stable exact `4d29735f915adb69cbe641c95d259c904e7114cd`, base `main`, GitHub `mergeable=true`, behind main 0.
- **Lira reconciliation + author/self review:** complete; whole-SA07 author/self PASS with 0 confirmed current-SA07 defects. Because Lira changed the branch during reconciliation, this is not the independent gate.
- **ACTIVE independent gate:** Mark / Codex-6 Sol performs independent WHOLE SA07 review of the same exact #339 head `4d29735f915adb69cbe641c95d259c904e7114cd`. Entire cumulative SA07 scope; no implementation edits during review. PASS requires 0 confirmed current-SA07 defects; otherwise one complete current-scope finding packet.
- **After Mark:** if independent PASS and #339 exact head remains unchanged, SA07 review cycle is complete and Developer decides merge. Any implementation change resets the review head/cycle.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
