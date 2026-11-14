# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **SA04-J:** merged via #330 from reviewed `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`; Mira + Lev whole-J PASS retained.
- **Current package:** SA04-K attachment upload/draft/finalization admission.
- **Current stage / actor:** **Mira scope/fit review** of Lev's complete [K technical plan #6877583725](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6877583725).
- **Lev:** planning complete / STOP. Full inventory, transactional lifecycle/lock graph, external PUT/unknown-COMMIT, replay/Cancel/cleanup/AP10 semantics, evidence contract and bounded author decomposition delivered. No implementation.
- **Mira next:** review the complete K plan; if accepted, prepare/activate **only K1** in a new cumulative Draft implementation PR from current main. Proposed ready queue: K1 metadata/replay + POST lifecycle result; K2 journal; K3 private reads; K4 Cancel; K5 cumulative connected evidence. Do not assign all K in one author slice.
- **Lira/Mark:** inactive/unassigned until Mira handoff. K2–K5 prepared, not active. No K implementation PR/head exists yet. #330 must not be reused.
- **No merge/deploy.** L–S, SA05, #315, permanent docs and Stage6/external R2 remain outside current planning. Whole SA04 is incomplete.

## Continuation rule for #331

- A single `...` continues the current workflow.
- Once a prepared bounded implementation slice later receives Mira PASS, Mira records it and activates the next already-prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.
