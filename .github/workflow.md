# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Implementation PR:** cumulative Draft #332, open/draft/unmerged; accepted K2 head `eaf57c46ca28baff9a11ae637f37d7d850934ab9`, current **K3 AUTHOR STOP exact `dae431fc920c79cad654627052365a3fd2380fe4`**.
- **Package:** SA04-K attachment lifecycle admission; accepted Lev plan #6877583725 and Mira scope/fit PASS.
- **Bounded status:** K1 PASS → K2 PASS → **K3 AUTHOR STOP / Mira bounded review pending** → K4 → K5.
- **K2 verdict:** 0 confirmed current-K2 defects on exact `eaf57c46ca28baff9a11ae637f37d7d850934ab9`. CI 43601817617 final attempt SUCCESS — PG17 **942/942**, K2 **7/7**, K1 **7/7**, fence **22/22**, app **2286/2286**, lint/typecheck/build/migrations/Workers PASS.
- **Current actor:** **Mira — bounded K3 coordinator review** on stable #332 head; Lira AUTHOR STOP.
- **K3 result:** add transaction-local active AccountState admission to `listDraftAttachments` and `readDraftAttachment`; controlled private list/file lifecycle failures; preserve public published-file branch and no bucket GET after state-first private denial.
- **K3 AUTHOR STOP evidence:** [CI 43608804921](https://github.com/iliya1947/vico-forum/actions/runs/43608804921) SUCCESS: native K3 7/7, PG17 949/949, fence 22/22, app 2300/2300, all standard build/schema/Worker gates; AP-10/SA-01/SA-03/SA04-J12 exact-head browser workflows SUCCESS. Mira reviews exact `dae431fc920c79cad654627052365a3fd2380fe4`; only on PASS may K4 activate.
- **Lev:** STOP until whole-K independent review or technical escalation. **Mark:** inactive.
- **No merge/deploy.** K4–K5, L–S, SA05, #315, permanent docs and Stage6 remain outside active K3.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
