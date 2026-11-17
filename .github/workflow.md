# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `1e4bcf83ff7bda0ec772a8098671ca9afe63888a`; SA06 #338 merged by Developer.
- **SA07 implementation:** Draft #339 stable exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`, base `main`, open/Draft, GitHub `mergeable=true`.
- **M1 correction:** complete on this head; `task.reconciliationPass` Integrations History projection/filter mapping is aligned and covered by real reconciler PG17 regression.
- **Mira fresh WHOLE SA07 coordinator review:** **PASS — 0 confirmed current-SA07 defects** on exact head above. Whole `07-B1 → 07-L → 07-F → 07-D → 07-I` scope and exact-head acceptance rechecked.
- **ACTIVE independent gate:** Mark / Codex-6 Sol repeats independent WHOLE SA07 review of exact `8cc0ecea5ad8a725d570abdb8958de96020ee4e0`. Entire cumulative SA07 scope; no implementation edits during review.
- **After Mark:** if independent PASS and exact head remains unchanged, SA07 review cycle is complete and Developer decides merge. Any implementation change resets the review cycle.
- **Boundary:** no merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
