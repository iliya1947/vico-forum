# Admin panel — current workflow

- Service PR: **#251**. Base/main for SA02 backend A/B/C: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 backend A/B/C — Lira completed combined corrections for three confirmed Lev findings; fresh Mira coordinator whole-PR review pending.**
- Active implementation: [Draft PR #319](https://github.com/iliya1947/vico-forum/pull/319), exact stable head **`25ac41573847f9fbce79897b2e019fd246b400cc`**.
- Accepted technical plan: [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279); backend A/B/C recovery boundary [#6777700709](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6777700709).
- Independent Lev review [#6779818918](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6779818918), Mira validation/assignment [#6788204269](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6788204269) — LEV-01/02/03 accepted current-scope findings on previous `c9ff7b66...`.
- **LEV-01 corrected by Lira:** production Hyperdrive auth fact factory forwards trusted `occurredAt`; native collector→factory→PG History chronology regression.
- **LEV-02 corrected by Lira:** Accounts coverage starts only at retained matching History sources/samples, not legacy user/account/session/settings row timestamps; native regression.
- **LEV-03 corrected by Lira:** auth History projects authoritative allowlisted actor/target/entity refs, unknown actor stays null; global/scoped native regression.
- Exact-head evidence: [CI #42968881718](https://github.com/iliya1947/vico-forum/actions/runs/42968881718) **SUCCESS** (application 177/2181, native PG17 63/679, lint/typecheck/build, privilege/migrations/Worker smoke); [SA-01 Chromium #42968881704](https://github.com/iliya1947/vico-forum/actions/runs/42968881704) **SUCCESS**; [AP-10 Chromium #42968881701](https://github.com/iliya1947/vico-forum/actions/runs/42968881701) **SUCCESS, all four jobs**.
- **Lira STOP. Next: Mira fresh coordinator whole-PR A/B/C review on stable exact head `25ac4157...`.** Coordinator PASS is not claimed; Lev/Mark unassigned during correction. SA02-D not started or assigned; no SA03+, Stage6 #315 activation, production, merge or deferred Owner journal occupancy/archive/clear.
