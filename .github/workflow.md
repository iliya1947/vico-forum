# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Prerequisite SA06:** Draft #338 exact `ce71892dc30d8e9ef03833031c29e8519ca7627d`, open/unmerged. Lira WHOLE SA06 AUTHOR READY; Lev completed technical verification of the entire cumulative50-path package with0confirmed current-SA06 defects. Author verification, not independent review. [Evidence/result](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6933791252).
- **ACTIVE:** Lev implements accepted SA07, 07-F Files/cleanup/fixed13 R2 observations after07-L source/author checkpoint.
- **SA07 branch/base:** separate dependent `chatgpt/sa07-native-operations` from exact SA06 head above. [Draft #339](https://github.com/iliya1947/vico-forum/pull/339), current head `2fb4c7bc5d41d6bfea021f9c891d4a1600953830`;07-B1+L native43/app42/local connected18 PASS; prior source head2f9d6e01 CI13runs17jobs/app2533/native1361 PASS, current harness-only head exact CI ACTIVE. Continue07-F→D→I; whole SA07 not AUTHOR READY. No prerequisite merge wait under the explicit overnight override.
- **Dependency:** rebase/update and recheck SA07 if #338 changes before acceptance. Coordinator/independent review may occur later; Owner alone merges.
- **Boundary:** no SA08+, permanent docs, #315, Stage6/production/deploy/external work, enabling background runtime, or #338 merge. Local code-only acceptance does not claim deployed/Owner visual acceptance.
