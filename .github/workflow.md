# Admin panel — current workflow

- Service PR: **#251**. Main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current stage: **Admin/Super-admin foundation — corrected plan delivered, awaiting Mira re-review**.
- SA01 implementation#313 and docs#314 merged/complete.
- Planner: **Lev**. Latest Owner scope [#6759703177](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6759703177); Mira correction [#6760232469](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6760232469).
- Current corrected plan: **[#6761206804](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804)**, supersedes initial#6759936344. FOUNDATION-PLAN-MIRA-01 reduction delivered; coordinator acceptance pending.
- Current scope: centralize outgoing Admin/Super-admin links/forms/redirects/path helpers through typed AdministrativeRouting resolver/accessors/provider with static public defaults.
- **app/routes.ts and Worker ingress unchanged.** No route-registration extraction/recomposition/helper/catalog; both existing files remain future Stage6 ingress touchpoints. Current URLs/module IDs/guards/Router8.3.1/initial/local-CI behavior preserved.
- Real concealment/secrets/dynamic routes/anti-enumeration/external bindings/protection activation remain Stage6; no IP/logging policy in this package.
- **Next: Mira — re-review corrected minimal plan.** Lev stopped after delivery; Lira/Mark unassigned. No foundation or SA02 implementation PR/code/runtime acceptance delivered.
- SA02 remains next product package after bounded foundation decision; production protection itself is not its blocker. SA02-PLAN-MIRA-01/source-attribution correction remains open under Owner/Mira#6759312425: bounded/coalesced persistence + useful authoritative user/network-source attribution/first/last/count.
- Evidence `/workspace/work/admin-routing-plan-evidence/FOUNDATION_PLAN_REVISED.md`; source31 hashes unchanged;11Admin+6Super-admin registrations already in app/routes.ts; one Worker dispatch; clean source checkout.
