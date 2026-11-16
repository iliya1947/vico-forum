# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / #335 base:** `c7f2538ce1d4d37152bc3d503587dc9dabd28f24`.
- **Implementation:** Draft/open/unmerged/mergeable #335, exact stable head `fa0c95105c00449ca72c7fd21a5045929d59542e`, 4 commits / 47 changed paths. Scope: complete remaining **SA04 O→P→Q→R→S** authored by Lev.
- **Lev author status:** O–S AUTHOR READY / STOP. Lev does not independently review his own implementation.
- **Mira coordinator whole-PR review:** **PASS — 0 confirmed current-SA04 O–S defects** on exact `fa0c95105c00449ca72c7fd21a5045929d59542e`.
- **Mira scope checked:** all 47 paths; accepted O/P/Q/R/S plan; current AGENTS/PROJECT/PROJECT_STATE and relevant Settings/Authorization/translation SoTs; O atomic locale predicate/classification; P held subject lock + lifecycle gate; Q Owner/actor/singleton/CAS/History order; R transient actor through direct capability/planners/stores without persistent identity change, content→actor lock order, rollback/replay/budget/enqueue/consumer semantics; S auth private/no-store correction, registration Form correction and cumulative connected acceptance.
- **Exact-head evidence checked:** CI #43827656491 — PG17 **1073/1073 (92 files)**, application **2363/2363 (189 files)**, lint/typecheck/build, actual 69-table manifest; SA04-S #43827656616 — all 10 connected groups + final PASS; AP10/SA01/SA03/J12/K5/L3/M2/N exact-head regressions all SUCCESS. Known Drizzle BigInt generator exit0 caveat remains non-substantive parity evidence.
- **Synthetic merge tree:** equals implementation tree on the reviewed head.
- **ACTIVE independent reviewers:** **Mark (Codex-6 Sol) + Lira (ChatGPT-6)**. Both independently review the **entire #335 O–S implementation and cumulative SA04 interaction** on the exact same stable head above. Neither relies on Mira PASS, Lev author evidence or green CI as proof.
- **Review rule:** first finding does not end review; classify confirmed issues as current-SA04 vs future-only. Reviewers do not edit implementation during review.
- **After both reviews:** if either has confirmed current defects, Mira reconciles findings into one correction packet to Lev. If **Mira + Mark + Lira PASS**, STOP at **Owner merge #335**.
- **Lev:** inactive during review; next only on correction packet.
- **Boundary:** no merge by agents; no SA05/#315/permanent docs/production/deployment/Stage6. Permanent docs only separate closeout after implementation acceptance.
