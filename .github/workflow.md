# Admin panel — current workflow

- **Service PR:** #331, coordination-only, never merge.
- **Current main:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Implementation merge candidate:** Draft/open/unmerged #334, exact stable head `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`, base current main above; mergeable. Scope is frozen **SA04-M+N only**; O absent.
- **Lira correction:** SA04-MN-LEV-01 COMPLETE on this head. Correction delta from Lev-return head touches only `app/complaints/queue-view.tsx` and `tests/browser/sa04-complaints/check.py`.
- **Mira fresh whole-M+N coordinator review:** **PASS — 0 confirmed current-M/N defects** on exact `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`.
- **Coordinator review basis:** current main/AGENTS/PROJECT/PROJECT_STATE + accepted M/N plan/SoTs; complete current production delta; correction cause/fix; all other 22 PR paths unchanged from prior reviewed head; exact-head CI and connected evidence; synthetic merge tree equals implementation tree.
- **Exact-head evidence:** CI #43815395365 PG17 **1011/1011**, app **2359/2359**, lint/typecheck/build/Worker; SA04-N #43815395376 SUCCESS with success→503→manual retry→healthy-new nonce and success→401→manual retry; SA04-M2 #43815395374 SUCCESS; AP10 #43815395392 4/4 SUCCESS; SA03 #43815395406 SUCCESS. Actual 69-table manifest parity green.
- **Known unchanged qualification:** Drizzle generator still prints BigInt TypeError/exit0; it is not substantive parity evidence. M+N do not alter generator/schema/migrations/dependencies; actual manifest check is separate and green.
- **NEXT ACTIVE ROLE:** **Lev (Codex-6.1 Sol)** — independent fresh whole-M+N review of the **same exact corrected head `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`**. Prior Lev RETURN was on old head and is superseded only if this fresh same-scope review PASSes.
- **On Lev current defect:** one correction packet to Lira; no merge.
- **On Lev PASS:** STOP at **Owner merge #334**.
- **Lira/Mira/Mark:** STOP/inactive during Lev review.
- **After Owner merge:** refresh main/reread AGENTS, then resume O in a fresh implementation PR.
- **Boundary:** no O+, SA05, #315 remediation, permanent docs, production/deployment or Stage6 before #334 merge.
