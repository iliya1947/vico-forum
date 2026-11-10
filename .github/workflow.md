# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 backend A/B/C coordinator review completed; CHANGES REQUIRED — 3 current-scope defects.**
- Active implementation: Draft **PR #319**, reviewed exact head **`c86b7e43ec1cb5c48a8c0475cd326eeba5b68cf4`**.
- Accepted technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279); recovery scope A/B/C: [#6777700709](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777700709).
- Mira whole-PR review: [#6777896661](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777896661) — **CHANGES REQUIRED**.
- **SA02-IMPL-MIRA-01 OPEN:** bulk session exact-fact collection/proof/persistence is unbounded; accepted plan requires bounded chunks + recording gap.
- **SA02-IMPL-MIRA-02 OPEN:** auth exact `occurred_at` is assigned at later persistence time, so async flush can misorder real transitions; occurrence and recording time must remain distinct.
- **SA02-IMPL-MIRA-03 OPEN:** `accounts.registration.coverageFrom` omits retained `registration-admission` attempt History.
- Exact-head evidence on reviewed head: CI #42887473479 SUCCESS; SA-01 Chromium #42887473457 SUCCESS; AP-10 Chromium #42887473380 SUCCESS all 4 jobs.
- **Implementer: Lira — fix all three findings together in PR #319, add focused regressions, run applicable checks, publish new stable exact head, then stop.**
- **SA02-D is not started/assigned.** #315 Stage-6 activation and deferred History/journal occupancy/archive/clear remain outside scope.
- Lev/Mark unassigned until fresh Mira coordinator PASS on the corrected exact head.
