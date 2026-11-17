# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main/base:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Cumulative SA06 implementation:** Draft #338 exact stable head `ce71892dc30d8e9ef03833031c29e8519ca7627d`, open/unmerged, 29 commits/50 paths.
- **Lira corrective stages 1/4 mapping, 2/4 History, 3/4 AP-10, 4/4 cumulative author verification: DONE. WHOLE SA06 AUTHOR READY; Lira AUTHOR STOP.** Corrected History `origin/kind/from/until`, v2 cursor/filter binding and branch pushdown; AP-10 native effective/per-key raw-authority-floor applicability. No new current-SA06 defect identified during author reconciliation; not an independent review.
- **Evidence:** 12/12 exact-head GitHub workflow runs SUCCESS; CI #43984956444 checks 2510/2510 application, database 1336/1336 PG17 including native SA06 18/18; SA06 genuine connected Chromium #43984956396 SUCCESS, final `whole-SA06-connected-pass`. DB job same-head retry PASS after Complaints unhandled rejection on first attempt (cause unverified). No deployed Owner/owner visual approval claimed.
- **NEXT ACTIVE:** Lev / Codex-6.1 Sol performs technical whole-#338 verification of the entire cumulative SA06 package on this exact head, not only corrective delta. Lev is an author, not independent reviewer. If confirmed current-SA06 defect, Lev fixes in #338, reruns required acceptance and continues verification until clean; then immediately starts SA07 as separate dependent implementation PR/branch from accepted #338 head without waiting for merge.
- **Dependency:** if #338 changes subsequently, dependent SA07 must be updated/rechecked. Coordinator/independent reviews may occur later but do not gate beginning SA07 under latest developer override. Owner retains merge authority.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work, or #338 merge.
