# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **SA06 implementation:** Draft #338 exact `ce71892dc30d8e9ef03833031c29e8519ca7627d`, open/unmerged.
- **Fresh Mira WHOLE SA06 coordinator review:** **FAIL M2 — 1 confirmed current-SA06 defect.** Profile History `moot-terminal-time-unproven` coverage incorrectly attributes untimed/invalid moot appeal anomalies to a parent `lifted_by_user_id`; accepted contract permits person-filtered unknown-time coverage only for the appeal subject. Previous History-filter and AP-10 counter corrections are independently reverified closed on this head.
- **ACTIVE SA06 correction:** Lira / ChatGPT-6 applies one bounded #338 fix: person coverage counts untimed/invalid moot anomalies only by subject; preserve global/scoped coverage and valid timed lift-actor timeline attribution; add PG regressions for NULL + earlier-than-created time with distinct subject/lift actor. Then publish new stable exact #338 head + AUTHOR READY.
- **Review gate after correction:** Mira fresh WHOLE SA06 coordinator review → only after PASS, Mark / Codex-6 Sol independent non-author whole-SA06 review. Mark is not active yet.
- **SA07:** Lev continues dependent Draft #339; exact `22f9976ce5233d98f021b54c0d9c8a28b8690d24` (B1/L/F/D source), nativeData13/app65/local connected32 PASS with final schema-delta qualification in #331; new exact CI ACTIVE. **ACTIVE07-I Integrations** under override, whole SA07 not AUTHOR READY. Base338ce71892d; update/recheck after prerequisite changes.
- **Boundary:** no #338 merge, SA08+, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
