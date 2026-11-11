# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA02-D / D1 complete; D2 pending developer continuation — Lira implementer in Draft PR #319.**
- Accepted SA02 plan: #6768069279 (§§9/11/12). Lev D proposal: #6789135043. Mira D handoff review: **PASS, 0 confirmed current-scope plan defects**.
- Accepted A/B/C backend snapshot: **`25ac41573847f9fbce79897b2e019fd246b400cc`**; Mira PASS #6788548049, Lev PASS #6788696141, closeout #6788764135. Current D implementation head: **PR #319 `e6bd846fba28f6ba633415094e54c6991b324479`**.
- PR strategy: D continues as descendant commits in the same #319 branch against main. The A/B/C PASS remains evidence only for `25ac415...`; any D head requires fresh cumulative A/B/C/D review.
- Technical planner: **Lev — completed/stopped**.
- Implementer: **Lira — active for SA02-D only**.
- Review sequence after author STOP: **Mira coordinator whole-PR review → Lev independent whole-PR review** of the same stable exact head. Mark unassigned.
- D sequence: reader/route wiring → typed current navigation/UI → shared History/Overview/localization → expanded connected/browser acceptance and stable-head author handoff.
- D1.1 delivered: existing Hyperdrive facade exposes accepted SA02 current/history readers via a separate typed request capability; Worker shares one facade across SA01/SA02. Prior head `e6bd846fba28f6ba633415094e54c6991b324479` had successful CI and SA01 Chromium (AP10 was still in progress when last checked).
- D1.2 **completed** on **PR #319 exact head `bb8cfafd4ea2959441efbfcd0df73c6f27234a1e`**: explicit Owner-only Accounts/Security current routes, one shared scoped History route preserving System URL, source-aware global/recent History, area/key/query/v1+legacy validation and private errors. Focused route tests, server/client loader split and exact route-registry expectations are included. Exact-head **CI #42980394231 SUCCESS (checks+database)**, **SA01 Chromium #42980394234 SUCCESS**, **AP10 Chromium #42980394264 SUCCESS (all 4 jobs)**. This certifies D1.2 checkpoint checks, **not** cumulative A/B/C/D review or full SA02 acceptance.
- **Next recipient Lira on developer continuation:** D2 typed navigation, semantic current monitor presentation and contextual links in #319. D3/D4 later; after final stable head, author STOP for Mira. Lira stops now at D1.2 boundary.
- Full SA02 incomplete until D and cumulative review gates close. No merge/production, SA03+, Stage6 #315 activation or deferred journal occupancy/archive/clear work is authorized.
