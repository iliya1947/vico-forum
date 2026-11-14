# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Implementation PR:** cumulative Draft #332, open/draft/unmerged; current accepted K1 exact head `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`.
- **Package:** SA04-K attachment lifecycle admission; accepted Lev plan #6877583725 and Mira scope/fit PASS.
- **K1:** **Mira bounded PASS** on exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`, 0 confirmed current-K1 defects. Exact-head CI 43599514990 SUCCESS — PG17 **935/935**, K1 **7/7**, attachment fence **22/22**, app **2282/2282**, lint/typecheck/build/migrations/Workers PASS.
- **Prepared queue:** K1 PASS → **K2 active** → K3 → K4 → K5.
- **Current actor:** **Lira — K2 PREPARING/READY journal admission** in the same cumulative #332.
- **K2 result:** mandatory trusted actor for `recordUploadObject` and `activateUploadObject`; record uses short actor→INSERT tx, activate uses existing journal FOR UPDATE→actor→conditional READY update; route callbacks thread only session `scope.userId`.
- **K2 AUTHOR STOP:** new stable exact #332 head + focused native/fence/HTTP evidence + applicable exact-head CI → Mira bounded K2 review. On PASS, K3 activates same turn.
- **Lev:** STOP until whole-K independent review or technical escalation. **Mark:** inactive.
- **No merge/deploy.** K3–K5, L–S, SA05, #315, permanent docs and Stage6 remain outside active K2.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
