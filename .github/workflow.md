# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Implementation PR:** cumulative Draft #332, open/draft/unmerged; accepted K1 head `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`; current **K2 AUTHOR STOP exact head `eaf57c46ca28baff9a11ae637f37d7d850934ab9`**.
- **Package:** SA04-K attachment lifecycle admission; accepted Lev plan #6877583725 and Mira scope/fit PASS.
- **K1:** **Mira bounded PASS** on exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`, 0 confirmed current-K1 defects. Exact-head CI 43599514990 SUCCESS — PG17 **935/935**, K1 **7/7**, attachment fence **22/22**, app **2282/2282**, lint/typecheck/build/migrations/Workers PASS.
- **Prepared queue:** K1 PASS → **K2 AUTHOR STOP / Mira bounded review pending** → K3 → K4 → K5.
- **Current actor:** **Mira — bounded K2 review** on current stable #332 head; Lira AUTHOR STOP.
- **K2 result:** mandatory trusted actor for `recordUploadObject` and `activateUploadObject`; record uses short actor→INSERT tx, activate uses existing journal FOR UPDATE→actor→conditional READY update; route callbacks thread only session `scope.userId`.
- **K2 AUTHOR STOP evidence:** [CI 43601817617](https://github.com/iliya1947/vico-forum/actions/runs/43601817617) final SUCCESS, native K2 7/7, PG17 942/942, fence 22/22, app 2286/2286, typecheck/lint/build/Worker PASS. First PG attempt had unrelated unchanged online-privacy unhandled rejection; same-head targeted rerun SUCCESS. Mira reviews exact `eaf57c46ca28baff9a11ae637f37d7d850934ab9`; only on Mira PASS may K3 activate.
- **Lev:** STOP until whole-K independent review or technical escalation. **Mark:** inactive.
- **No merge/deploy.** K3–K5, L–S, SA05, #315, permanent docs and Stage6 remain outside active K2.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
