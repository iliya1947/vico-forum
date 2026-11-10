# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 retention/admission correction delivered; Mira re-review pending.**
- Routing foundation implementation#317/docs#318 merged/closed; FOUNDATION-LEV-01/-02 CLOSED.
- Active package: **SA-02 — Accounts & authentication + Security monitoring**.
- Corrected full plan [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279) supersedes#6767391552 after Mira#6767512074; only attempt model and dependent count/History/schema/acceptance wording changed.
- **SA02-PLAN-MIRA-01 CLOSED by Mira**; remains closed. **SA02-PLAN-MIRA-02 addressed in proposed correction; acceptance pending**, not declared closed.
- Proposed correction: DB-assigned UTC recording-hour;512 new attributed groups/hour split256 authenticated/anonymous; finite per-window overflow/gap state; automatic lazy renewal each hour, no lifetime admission gate. Retained previous windows stay indefinitely; no TTL/delete/eviction. Total archive may grow with time at bounded rate, not request volume.
- Prior-window exhaustion cannot permanently block later admission; active flood can still saturate a current window with visible incomplete attribution. Renewal never depends on manual cleanup/Owner visit.
- Source#315 head `e394f1586b4f857f2160e291a9b8fb3915067ead`; Stage6 Owner-plane protection separate.
- Deferred Owner#6767828181: journal occupancy/download archive/clear phase only after current Super-admin plan, outside SA02; current retention unchanged.
- Planner **Lev finished/stopped**; Lira/Mark unassigned. No SA02 implementation PR/head, code/migration/tests/build/runtime acceptance or implementer assignment.
- **Next recipient: Mira — review correction SA02-PLAN-MIRA-02 and dependent consistency, determine coordinator continuation.**
