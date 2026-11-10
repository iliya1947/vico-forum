# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA02 backend A/B/C independent review completed — CHANGES REQUIRED, 3 confirmed current-scope findings.**
- Active implementation: Draft **PR #319**, reviewed stable exact head **`c9ff7b660fc40924f6adfd649b1daa0d80acb045`**.
- Accepted technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279); recovery A/B/C scope: [#6777700709](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777700709).
- Prior Mira coordinator PASS/assignment: #6779377295 after correction packet #6779256211.
- **Lev independent result: [#6779818918](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6779818918).**
- **SA02-IMPL-LEV-01 OPEN:** production Hyperdrive auth-fact factory drops trusted occurredAt; MIRA-02 behavior remains incomplete in actual Worker path.
- **SA02-IMPL-LEV-02 OPEN:** four Accounts coverage boundaries incorrectly include current-row timestamps absent from retained History.
- **SA02-IMPL-LEV-03 OPEN:** auth History projection drops known safe actor/target/entity refs already stored in owner_events.
- Evidence: exact-head CI/SA01/AP10 SUCCESS; independent local build, 99 application tests, 123 PG17 tests, 69-table schema parity, runtime privileges and 16 Chromium checkpoint groups PASS. Separate native semantic probes reproduce all three findings.
- **Next recipient: Mira — assess the combined confirmed A/B/C findings and continue the coordinator cycle. Lev completed/stopped; Lira/Mark not assigned by Lev.**
- **SA02-D remains not started/assigned.** Full SA02 is not accepted/ready for merge. #315 Stage6 activation, production and deferred journal occupancy/archive/clear remain outside scope.
