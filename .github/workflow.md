# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 backend A/B/C independent review returned CHANGES REQUIRED; 3 Lev findings confirmed by Mira.**
- Active implementation: Draft **PR #319**, reviewed exact head **`c9ff7b660fc40924f6adfd649b1daa0d80acb045`**.
- Accepted technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279); recovery scope A/B/C: [#6777700709](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777700709).
- Prior Mira PASS #6779377295 is superseded by Lev independent review #6779818918 and Mira confirmation [#6788204269](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6788204269).
- **SA02-IMPL-LEV-01 OPEN:** production Hyperdrive auth-fact adapter drops trusted occurrence time.
- **SA02-IMPL-LEV-02 OPEN:** Accounts coverage uses old current-domain row timestamps that are not retained History sources.
- **SA02-IMPL-LEV-03 OPEN:** auth History projection drops already-known safe actor/target/entity refs.
- **Implementer: Lira — fix all three confirmed findings together in PR #319, add focused regressions, run applicable checks, publish new stable exact head, then stop.**
- Lev/Mark unassigned during correction.
- **SA02-D is not started/assigned.** #315 Stage-6 activation and deferred History/journal occupancy/archive/clear remain outside scope.
