# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Main / implementation baseline:** `c7f2538ce1d4d37152bc3d503587dc9dabd28f24`, Owner merge #334.
- **M+N:** delivered/merged #334 after Mira coordinator + Lev independent PASS on `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`; SA04-MN-LEV-01 CLOSED.
- **Remaining SA04 O→P→Q→R→S:** **AUTHOR READY / STOP**, Lev authored whole package in [Draft #335](https://github.com/iliya1947/vico-forum/pull/335), stable exact head `fa0c95105c00449ca72c7fd21a5045929d59542e`,4commits/47paths. [Complete handoff and evidence matrix](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6910913927).
- **ACTIVE NEXT:** **Mira coordinator whole-PR review**, complete O–S plus cumulative A–R/S integration against accepted technical plan/current SoTs. All applicable exact-head checks complete. Lev does not independently review own implementation.
- **After Mira PASS:** Mark and Lira independent reviews on the same stable exact head. Any confirmed current defects → one consolidated correction cycle to Lev; fresh coordinator/reviews after implementation changes.
- **Final Owner merge:** only after Mira + Mark + Lira PASS on final stable implementation. No review verdict exists yet for #335.
- **Acceptance:** full PG17 1073/92files, app2363/189files; CI, AP10all4, SA01attempt2, SA03/J12/K5/L3/M2/N/S SUCCESS. Actual69-table manifest PASS; unchanged Drizzle BigInt generator/exit0 remains qualified. No Owner visual/deployed acceptance claim.
- **Lev:** implementation complete / STOP; clean source/hash verification and own disposable runtime cleanup complete. Other agents are not launched by agents; developer only connects Mira, context already in service.
- **Architecture:** accepted technical O–S and shared lifecycle/transaction/replay/error contracts unchanged; newest delivery/review assignments override historical plan routing.
- **Permanent docs:** separate closeout PR after SA04 acceptance per AGENTS; no premature permanent-doc changes.
- **Boundary:** no SA05, #315, production/deployment or Stage6; no new recovery/last-manager policy.
