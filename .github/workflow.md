# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 technical plan accepted; Lira implementation assigned.**
- Routing foundation implementation #317/docs #318 merged/closed; FOUNDATION-LEV-01/-02 CLOSED.
- Active package: **SA-02 — Accounts & authentication + Security monitoring**.
- Accepted full technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279).
- Mira re-review: [#6768166517](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768166517) — **PASS, 0 open plan defects**.
- **SA02-PLAN-MIRA-01 CLOSED. SA02-PLAN-MIRA-02 CLOSED.**
- Accepted attempt model: DB-assigned UTC recording-hour; 512 new attributed groups/hour split 256 authenticated/anonymous; finite per-window overflow/gap state; automatic lazy renewal each hour; retained previous windows remain under current indefinite-retention policy.
- Source #315 head `e394f1586b4f857f2160e291a9b8fb3915067ead`; Stage-6 Owner Worker/Access/isolated Owner auth/DB-deploy/route-concealment activation remain separate.
- Deferred Owner #6767828181: History/journal occupancy + per-journal archive download/clear is post-current-plan work, **not SA-02 scope**.
- **Implementer: Lira — implement accepted SA-02 in a separate implementation PR, complete applicable checks, publish stable exact head in #251, then stop for Mira coordinator whole-PR review.**
- Lev/Mark unassigned during implementation. No SA-02 implementation PR/head has been published yet.
