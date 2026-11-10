# Admin panel — current workflow

- Service PR: **#251**. Main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current stage: **Admin/Super-admin foundation — #315 cross-plan correction delivered, awaiting Mira re-review**.
- SA01 implementation#313 + docs#314 complete/merged.
- Planner: Lev. Latest Owner scope#6759703177; Mira cross-plan notice#6761087988 and re-review#6761433938.
- Current plan = [base reduction #6761206804](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804) **as overridden by [#315 alignment delta #6761588752](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761588752)**.
- FOUNDATION-PLAN-MIRA-01 closed by Mira; FOUNDATION-PLAN-MIRA-02 correction delivered, coordinator acceptance pending.
- Current work remains outgoing AdministrativeRouting/address centralization only; Admin/Super-admin are distinct typed destination families with independent base/origin contract. Current static same-origin URLs/guards/Router8.3.1/initial/local-CI unchanged.
- app/routes.ts and Worker ingress unchanged now; no registration extraction/recomposition/new router. Their combined current state is **not** the final Stage6 ingress.
- Future source **#315**, checked head `5329ef027c7f477067154218349077d75b763c8a`: ordinary Admin stays in Public Forum Worker; Super-admin moves to separate Owner Worker; after activation Public Worker no longer registers Super-admin routes.
- #315 implementation not absorbed here: Owner Worker split, Access, isolated Owner auth/session, DB/deploy capabilities/secrets/protection remain separate security work. Acceptance only adds independent-public-test-origin resolver proof, no real external topology.
- **Next: Mira re-reviews corrected contract.** Lev stopped after delivery; Lira/Mark unassigned. No implementation PR/code/runtime acceptance.
- SA02 remains next product package after foundation decision; source-attribution/bounded-retention correction#6759312425 remains open and unchanged.
- Evidence: /workspace/work/admin-routing-plan-evidence/FOUNDATION_CROSS_PLAN_DELTA.md + SECURITY_REFERENCE_315.md. #315 was read as reference only; its service files were not changed.
