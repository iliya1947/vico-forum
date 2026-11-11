# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Accepted SA-03: unified canonical public/Admin/Owner profile, Lev technical plan #6796912006; Mira plan scope/fit **PASS**.
- Implementation: Draft PR **#324**, branch `feat/sa03-unified-profile`, exact current head `9bf2541a646de47d1a18dc24b57ccbdb7e1c494d`.
- **Completed bounded checkpoints:** D1 readonly exact-Owner target identity/method/session + independent permission admission; D2 source-attributed per-user History and index-only migration 0064; **D3 canonical public/Admin/Owner profile composition, guarded legacy Admin detail redirect, directory links, reuse of AP-10 and authorization controls/writers, EN/RU/HE UI and route/component/browser regression updates**.
- **Verified on D3 exact head:** CI #43043169812 SUCCESS (2,231 app tests; 688 native PostgreSQL 17 tests; 69-table schema manifest parity; typecheck/build/migrations/Worker smoke); SA-01 connected Chromium #43043169774 SUCCESS; AP-10 connected browser #43043169691 SUCCESS (all 4 jobs).
- **Next bounded step only after developer continuation:** Lira implements **SA03-D4** connected full SA-03 acceptance (built Worker, real Better Auth, disposable migrated PostgreSQL 17 and Chromium across actors, source/privacy/cursor/error/route matrix), then exact-head checks and stable author handoff to Mira.
- Mira coordinator whole-PR review starts after D4, not now. Lev and Mark remain unassigned.
- SA-04+, Deactivate, production, #315 Stage6 isolation/activation and deferred History occupancy/archive/clear excluded. No merge; permanent docs closeout is separate.
