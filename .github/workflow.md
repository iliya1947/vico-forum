# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `45406723c4b53ceba9392d3fb7dc84e8adaa9768`; SA07 #339 merged by Developer.
- **SA08 package:** **08-A → 08-B** in cumulative Draft #340.
- **SA08-A implementation:** Draft #340 exact `63e624fb7fed86cd3c10dcd49d1df63f43543273`, base `main`, open/Draft, `mergeable=true`.
- **Mira bounded 08-A review:** **FAIL M1 — 1 confirmed current-08-A defect.** Overview does not expose the §15-required untimed/attribution coverage despite authoritative existing source counts.
- **ACTIVE correction:** Lev / Codex-6.1 Sol adds explicit existing-source untimed/attribution coverage to the Overview and regression evidence, preserving the accepted resource/snapshot/partial-availability boundaries. No redesign or new telemetry producers.
- **After correction:** new stable exact #340 head + applicable checks → Mira fresh bounded 08-A review.
- **08-B blocked:** do not start full-program closure matrix until bounded 08-A PASS.
- **Boundary:** no merge, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
