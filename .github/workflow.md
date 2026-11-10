# Admin panel — current workflow

- Service PR: **#251**. Current main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current bounded stage: **Admin/Super-admin Stage-6 protection foundation — Lev plan correction after Mira review**.
- SA01 implementation PR #313 and factual docs PR #314 are merged; SA01 complete.
- Technical planner: **Lev** — initial minimal foundation plan `#6759936344`; correction assigned via `#6760232469`.
- Mira verdict: **CHANGES REQUIRED — FOUNDATION-PLAN-MIRA-01**. Current `app/routes.ts` is already the single build-time registration point; do not add a new route-registration composition layer. Keep it as a future Stage-6 ingress touchpoint.
- Accepted direction pending corrected plan: centralize scattered Admin/Super-admin address construction through one typed AdministrativeRouting boundary while preserving current URLs, React Router 8.3.1/`initial`, authorization and local/CI behavior.
- Real route concealment/security activation remains deferred to Stage 6.
- SA-02 remains the next product package after this bounded foundation decision. Owner Security requirement `#6759312425` remains mandatory: useful authoritative user/network-source attribution + first/last/count with bounded/coalesced persistence.
- Implementer: **Lira — unassigned**. Mark unassigned. No foundation or SA02 implementation PR/head exists yet.
- Next: **Lev removes the unnecessary route-registration refactor from the foundation plan and stops for Mira re-review.**
