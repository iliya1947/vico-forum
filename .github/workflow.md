# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **SA04-J:** merged via #330; J implementation head `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`, Mira whole-J PASS + Lev independent PASS, 0 confirmed current-J defects.
- **Current package:** **SA04-K — attachment upload/draft/finalization admission**.
- **Current stage:** technical planning.
- **Current actor:** **Lev**.
- **Lev assignment:** inspect current main and applicable source-of-truth, produce the complete K technical plan: authoritative mutation/caller inventory, lifecycle/transaction and lock graph, external PUT boundary, replay/no-op/cancel/cleanup semantics, AP-10 restriction compatibility, race/evidence matrix and bounded Lira decomposition. No implementation.
- **Mira:** waits for Lev plan, then performs scope/fit review and assigns only the first bounded Lira slice if accepted.
- **Lira/Mark:** inactive/unassigned.
- **No implementation PR for K yet. No merge/deploy.**
- **Out of current K planning:** L–S, SA-05, #315, permanent docs and Stage 6.

## Continuation rule for #331

- A single `...` continues the current workflow.
- Once a prepared bounded implementation slice later receives Mira PASS, Mira records it and activates the next already-prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
