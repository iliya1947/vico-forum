# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 accepted plan; implementation decomposed; SA02-A assigned to Lira only.**
- Routing foundation implementation #317/docs #318 merged/closed; FOUNDATION-LEV-01/-02 CLOSED.
- Active package: **SA-02 — Accounts & authentication + Security monitoring**.
- Accepted full technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279).
- Mira plan PASS: [#6768166517](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768166517). **SA02-PLAN-MIRA-01 CLOSED. SA02-PLAN-MIRA-02 CLOSED.**
- Previous whole-SA02 implementation handoff in #6768166517 is **superseded** by decomposition correction [#6777211866](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777211866).
- SA-02 implementation sequence: **SA02-A telemetry/storage foundation → SA02-B producers/source collection → SA02-C current readers/History projection → SA02-D routes/UI/integration acceptance**.
- **Only SA02-A is active/assigned now.** Lira implements the bounded telemetry/storage foundation in a separate implementation PR, publishes stable exact head + actual checks in #251, then stops for Mira coordinator review.
- SA02-B/C/D are not assigned and must not start without explicit developer continuation after the preceding subtask is completed/reported.
- Source #315 head `e394f1586b4f857f2160e291a9b8fb3915067ead`; Stage-6 Owner Worker/Access/isolated Owner auth/DB-deploy/route-concealment activation remain separate.
- Deferred Owner #6767828181: History/journal occupancy + per-journal archive download/clear is post-current-plan work, **not current SA scope**.
- Lev/Mark unassigned during SA02-A implementation. No SA02-A implementation PR/head has been published yet.
