# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Active bounded package: **SA-03** — canonical public/Admin/Owner profile. Mira accepted Lev technical plan #6796912006, scope/fit PASS.
- **Implementation:** Draft PR **#324**, branch `feat/sa03-unified-profile`; current author checkpoint head `e23d33cd6571e08c231b989c1dd8952a505a9345`.
- **Completed:** SA03-D1 readonly exact-Owner target identity/method/session capability and independent Admin section admission; **SA03-D2** source-attributed fixed per-user Owner History, target/resource-bound 25-row cursor, index-only migration 0064 and native tests.
- **Verified exact-head checks:** CI #43035916317 SUCCESS (2,229/2,229 app; 688/688 PostgreSQL 17; 69-table manifest parity, migrations, runtime privileges, Worker smoke); SA-01 connected Chromium #43035916259 SUCCESS. AP-10 connected browser #43035916310 still in progress at the moment of this checkpoint.
- **Next bounded step, only after developer continuation:** Lira implements **SA03-D3** in the same Draft PR #324: canonical ProfileView public/Admin/Owner composition, reuse existing authorization/measures UI and writers, directory links and guarded legacy Admin detail redirect, cache/privacy/recovery tests.
- **D4** full connected SA03 acceptance and stable author handoff to Mira is not started. Mira coordinator whole-PR review is after D4, not at these checkpoints. Lev/Mark remain unassigned.
- SA-04+, deactivation, #315 Stage6 isolation/activation, production and deferred History occupancy/archive/clear excluded.
