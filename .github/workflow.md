# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `45406723c4b53ceba9392d3fb7dc84e8adaa9768`; SA06 #338 + SA07 #339 merged.
- **SA08 package:** **08-A → 08-B** in cumulative Draft #340.
- **SA08-A target:** Draft #340 stable exact `cb09523ce050d97f1eab59b41b40c471a2cde20f`, base `main`, open/Draft/unmerged, mergeable=true.
- **Latest review:** Mira bounded08-A FAIL M1 on63e624fb; correction published and AUTHOR READY. New acceptance pending.
- **Evidence:** all14 exact runs/18 latest jobs SUCCESS; app2569/208, native1410/104,69-table manifest/runtime probes, local+CI connected19 PASS. Initial SA04-S socket reset passed on same-head rerun; cause not established, preserved in handoff.
- **ACTIVE next:** Mira fresh bounded08-A review of complete08-A scope; M1 explicit existing-source time/actor coverage + preserved resource/snapshot/sampling/partial/privacy boundaries. Task/evidence/qualified legacy fixture: #331 comment6953336666.
- **Lev:** implementation edits STOP during bounded acceptance; author, not independent reviewer.
- **08-B blocked until bounded08-A PASS**; then Lev immediately continues08-B in the same cumulative PR, no intermediate merge/replan. Whole-SA08 independent review is later.
- **Boundary:** no agents launched, merge, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.
