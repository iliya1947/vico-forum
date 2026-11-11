# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA02-D / D1 in progress — Lira implementing in Draft PR #319.**
- Accepted SA02 plan: #6768069279 (§§9/11/12). Lev D proposal: #6789135043. Mira D handoff review: **PASS, 0 confirmed current-scope plan defects**.
- Accepted A/B/C backend snapshot: **`25ac41573847f9fbce79897b2e019fd246b400cc`**; Mira PASS #6788548049, Lev PASS #6788696141, closeout #6788764135. Current D implementation head: **PR #319 `e6bd846fba28f6ba633415094e54c6991b324479`**.
- PR strategy: D continues as descendant commits in the same #319 branch against main. The A/B/C PASS remains evidence only for `25ac415...`; any D head requires fresh cumulative A/B/C/D review.
- Technical planner: **Lev — completed/stopped**.
- Implementer: **Lira — active for SA02-D only**.
- Review sequence after author STOP: **Mira coordinator whole-PR review → Lev independent whole-PR review** of the same stable exact head. Mark unassigned.
- D sequence: reader/route wiring → typed current navigation/UI → shared History/Overview/localization → expanded connected/browser acceptance and stable-head author handoff.
- D1.1 delivered: same existing Hyperdrive facade now exposes accepted SA02 current/history readers via a separate typed request-scoped capability; Worker supplies both SA01 and SA02 from one facade; a request-isolation test was added. Exactly four files changed. New-head CI/SA01/AP10 checks were in progress when recorded; **no PASS claimed**. D1 routes/UI are not yet implemented.
- **Next recipient Lira:** finish D1 Owner-only routes, strict history scope/query/cursor/private-error handling and connected read paths per #6789135043; continue D2–D4 in PR #319, run applicable checks, publish final stable exact head, then STOP for Mira.
- Full SA02 incomplete until D and cumulative review gates close. No merge/production, SA03+, Stage6 #315 activation or deferred journal occupancy/archive/clear work is authorized.
