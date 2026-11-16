# Admin panel — current workflow

- **Service PR:** #331, coordination-only, never merge.
- **Current main:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Implementation merge candidate:** Draft/open/unmerged #334, exact stable head `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`, base current main above; mergeable. Scope is frozen **SA04-M+N only**; O absent.
- **SA04-MN-LEV-01:** independently **CLOSED** on this head; original and extended actual Worker/BA/PG17/Chromium probes PASS. Only triage UI/browser regression differ from prior RETURN;22 other paths hash-identical.
- **Mira fresh whole-M+N coordinator review:** **PASS — 0 confirmed current-M/N defects** on exact `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`.
- **Coordinator review basis:** current main/AGENTS/PROJECT/PROJECT_STATE + accepted M/N plan/SoTs; complete current production delta; correction cause/fix; all other 22 PR paths unchanged from prior reviewed head; exact-head CI and connected evidence; synthetic merge tree equals implementation tree.
- **Exact-head evidence:** CI #43815395365 PG17 **1011/1011**, app **2359/2359**, lint/typecheck/build/Worker; SA04-N #43815395376 SUCCESS with success→503→manual retry→healthy-new nonce and success→401→manual retry; SA04-M2 #43815395374 SUCCESS; AP10 #43815395392 4/4 SUCCESS; SA03 #43815395406 SUCCESS. Actual 69-table manifest parity green.
- **Known unchanged qualification:** Drizzle generator still prints BigInt TypeError/exit0; it is not substantive parity evidence. M+N do not alter generator/schema/migrations/dependencies; actual manifest check is separate and green.
- **Lev fresh independent whole-M+N review:** **PASS — 0 confirmed current-M/N defects**, same exact `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`; [verdict](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6909332856). Whole scope reviewed; prior RETURN superseded on this corrected head.
- **Current gate / developer action:** **Owner merge #334**. Both required same-head reviews PASS. No agent merge.
- **Lev:** current review completed / STOP until Owner merge; future implementation role below retained.
- **Lira/Mira/Mark:** STOP/inactive at the Owner merge gate.
- **After Owner merge:** refresh main/reread AGENTS, then **Lev becomes implementer for the entire remaining SA04 O→P→Q→R→S** in one fresh implementation PR based on merged main. Do not hand O back to Lira package-by-package.
- **Post-merge review model for Lev-authored remaining SA04:** Mira coordinator whole-PR review first; after Mira PASS, **Mark and Lira both independently review the same stable exact head**. Lev cannot independently review his own implementation. Current-scope defects from any reviewer return as one consolidated correction cycle to Lev. Final Owner merge only after all three reviewers PASS.
- **Boundary:** no O+, SA05, #315 remediation, permanent docs, production/deployment or Stage6 before #334 merge.
