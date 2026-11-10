# Admin panel — current workflow

- Service PR: **#251**. Main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current stage: **Admin/Super-admin foundation — Lev plan correction required after Mira cross-plan re-review**.
- SA01 implementation#313 and docs#314 merged/complete.
- Planner: **Lev**. Latest Owner scope [#6759703177](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6759703177).
- Corrected plan [#6761206804](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804) fixes FOUNDATION-PLAN-MIRA-01 by removing route-registration extraction/recomposition.
- Mira re-review [#6761433938](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761433938): **CHANGES REQUIRED — FOUNDATION-PLAN-MIRA-02**.
- Cross-plan source: security service PR **#315**. Stage-6 target separates ordinary Admin on the Public Forum Worker from Super-admin on a separate Owner Worker. #315 is reference only; its security implementation is not absorbed into #251.
- Required foundation correction: keep current app/routes.ts/Worker/current URLs unchanged now; keep outgoing AdministrativeRouting centralization, but do not model one permanent shared Admin+Super-admin ingress/origin. Preserve Admin and Super-admin as distinct logical destination families so future Owner-plane separation does not require rewriting consumers.
- Real concealment, Owner Worker split, Access, isolated Owner auth/session, separate DB capability, deploy isolation, secrets/dynamic routing and protection activation remain Stage6/security work.
- **Next: Lev — publish minimal corrected plan/delta for FOUNDATION-PLAN-MIRA-02, explicitly accounting for #315, then stop for Mira re-review.** Lira/Mark unassigned. No foundation implementation PR/head.
- SA02 remains next product package after bounded foundation decision. SA02-PLAN-MIRA-01/source-attribution correction remains open under Owner/Mira#6759312425: bounded/coalesced persistence + useful authoritative user/network-source attribution/first/last/count.
