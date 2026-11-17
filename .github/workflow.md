# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Prerequisite SA06:** Draft #338 exact `ce71892dc30d8e9ef03833031c29e8519ca7627d`, open/unmerged. Lira WHOLE SA06 AUTHOR READY; Lev completed technical verification of the entire cumulative50-path package with0confirmed current-SA06 defects. Author verification, not independent review. [Evidence/result](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6933791252).
- **ACTIVE:** Lev implements accepted SA07, beginning07-B1 (real task-store/executor/reconciler instrumentation paired with Background reader and SELECT-only task capability).
- **SA07 branch/base:** separate dependent `chatgpt/sa07-native-operations` from exact SA06 head above. Implementation PR not published yet; source/acceptance ACTIVE, not AUTHOR READY. No prerequisite merge wait under the explicit overnight override.
- **Dependency:** rebase/update and recheck SA07 if #338 changes before acceptance. Coordinator/independent review may occur later; Owner alone merges.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work, enabling background runtime, or #338 merge. Local code-only acceptance does not claim deployed/Owner visual acceptance.
