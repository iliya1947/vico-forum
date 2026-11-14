# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Current package:** SA04-K attachment lifecycle admission.
- **Accepted technical plan:** Lev complete plan #6877583725; **Mira scope/fit PASS**.
- **Prepared bounded queue:** K1 → K2 → K3 → K4 → K5. K2–K5 remain inactive.
- **Current slice / actor:** **K1 — Lira**.
- **K1 result:** add authoritative transaction-local AccountState admission to attachment metadata/replay boundaries `admitUpload` and `createDraftAttachment`, preserve stable-ID replay/AP-10/fence/publication contracts, and add focused native/HTTP evidence.
- **Implementation PR:** none yet. Lira creates a **new cumulative Draft implementation PR from current main**; #330 is closed/merged and must not be reused.
- **K1 AUTHOR STOP:** one stable exact head with applicable CI/checks and focused source/evidence inspection → Mira bounded K1 review. On Mira PASS, K2 is activated in the same cumulative PR.
- **Lev:** planning complete / STOP until final whole-K independent review or technical escalation. **Mark:** inactive.
- **No merge/deploy.** K2–K5, L–S, SA05, #315, permanent docs and Stage6 remain outside active K1.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
