# Admin panel — current workflow

- Service PR: **#251**. Current main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current bounded stage: **Admin/Super-admin Stage-6 protection foundation — planning only**.
- SA01 implementation PR #313 and factual docs PR #314 are merged; SA01 complete.
- Technical planner: **Lev** — prepare the minimal current-code foundation plan via `#6759703177`.
- Owner decision: real administrative-route concealment/security activation is **deferred to Stage 6**. Current work must only reduce future integration cost without adding production secrets, dynamic hidden routes, external bindings or live concealment.
- Foundation scope covers both ordinary Admin and Super-admin and must preserve current authorization/local-CI behavior.
- SA-02 remains the next product implementation package after this bounded foundation decision; its product scope remains Accounts & authentication + Security on the SA01 monitoring/history/event foundation.
- Implementer: **Lira — unassigned**. Mark unassigned. No foundation or SA02 implementation PR/head exists yet.
- Out of scope now: production route hiding, runtime secret tokens, Cloudflare secret configuration, external rollout, Stage-6 observability/logging policy, DB-backed executable code, visual polish.
- Next: **Lev publishes the minimal foundation plan in #251 and stops for Mira review.**
