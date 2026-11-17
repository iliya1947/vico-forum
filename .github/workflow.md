# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **SA06 implementation:** Draft #338 exact `ce71892dc30d8e9ef03833031c29e8519ca7627d`, open/unmerged.
- **Fresh Mira WHOLE SA06 coordinator review:** **FAIL M2 — 1 confirmed current-SA06 defect.** Profile History `moot-terminal-time-unproven` coverage incorrectly attributes untimed/invalid moot appeal anomalies to a parent `lifted_by_user_id`; accepted contract permits person-filtered unknown-time coverage only for the appeal subject. Previous History-filter and AP-10 counter corrections are independently reverified closed on this head.
- **ACTIVE SA06 correction:** Lira / ChatGPT-6 applies one bounded #338 fix: person coverage counts untimed/invalid moot anomalies only by subject; preserve global/scoped coverage and valid timed lift-actor timeline attribution; add PG regressions for NULL + earlier-than-created time with distinct subject/lift actor. Then publish new stable exact #338 head + AUTHOR READY.
- **Review gate after correction:** Mira fresh WHOLE SA06 coordinator review → only after PASS, Mark / Codex-6 Sol independent non-author whole-SA06 review. Mark is not active yet.
- **SA07:** Lev continues dependent Draft #339; exact `1afb8954e435eeb2edb098ff77a8dd56035927fe` (B1/L/F/D/I source).07-I native9 and focusedapp69/8 PASS; corrected prior History association expectation7 PASS; full local application/native and cumulative connected acceptance ACTIVE. Predecessor22f all13 exact workflows SUCCESS (app2555/205,native1388/102,manifest69,connected32). New exact CI ACTIVE. **Whole SA07 not AUTHOR READY**; final acceptance/reconciliation remains. Base338ce71892d; update/recheck after prerequisite changes.
- **Boundary:** no #338 merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
