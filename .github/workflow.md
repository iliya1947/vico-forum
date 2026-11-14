# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Implementation PR:** cumulative Draft #332, open/draft/unmerged; current accepted K2 exact head `eaf57c46ca28baff9a11ae637f37d7d850934ab9`.
- **Package:** SA04-K attachment lifecycle admission; accepted Lev plan #6877583725 and Mira scope/fit PASS.
- **Bounded status:** K1 PASS → **K2 Mira bounded PASS** → **K3 active** → K4 → K5.
- **K2 verdict:** 0 confirmed current-K2 defects on exact `eaf57c46ca28baff9a11ae637f37d7d850934ab9`. CI 43601817617 final attempt SUCCESS — PG17 **942/942**, K2 **7/7**, K1 **7/7**, fence **22/22**, app **2286/2286**, lint/typecheck/build/migrations/Workers PASS.
- **Current actor:** **Lira — K3 private reads** in the same cumulative #332.
- **K3 result:** add transaction-local active AccountState admission to `listDraftAttachments` and `readDraftAttachment`; controlled private list/file lifecycle failures; preserve public published-file branch and no bucket GET after state-first private denial.
- **K3 AUTHOR STOP:** new stable exact #332 head + focused native/route evidence + applicable exact-head CI → Mira bounded K3 review. On PASS, K4 activates same turn.
- **Lev:** STOP until whole-K independent review or technical escalation. **Mark:** inactive.
- **No merge/deploy.** K4–K5, L–S, SA05, #315, permanent docs and Stage6 remain outside active K3.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
