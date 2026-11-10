# Admin panel — current workflow

- Service PR: **#251**. Current main/base: `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`.
- Current bounded stage: **Super-admin route-discoverability hardening — technical planning by Lev; SA-02 paused**.
- SA01 implementation PR #313 and factual docs PR #314 are merged; SA01 complete.
- Technical planner: **Lev** — route-hardening plan assigned via `#6759368876`.
- Plan: Accounts & authentication + Security on existing SA01 event/observation foundation;7 code-backed monitors, real auth/access producers, native registration/attachment-security History reuse, precision-safe shared pagination and existing canonical links. No second auth/RBAC/mutation/history backend.
- **Result recipient / next: Mira** — review SA02 bounded scope/technical fit, then decide on implementation assignment. Lev stops after publishing plan.
- Implementer: **Lira — unassigned**. Mark unassigned. No SA02 implementation PR/head, code/migration or runtime acceptance delivered; no implementation PASS claimed.
- Proposed persistence: reuse Owner relations; forward time/id indexes and manifest only as specified in plan; runtime grants remain bounded. Exact migration number rechecked at implementation start.
- Important source-checked seams: HTTP/direct auth dispatch differ in rate-limit coverage; after-hooks are not complete endpoint-outcome coverage;200 may be a session no-op; evidence timestamps can retain microseconds. Plan defines compatible collection/reader acceptance.
- Planning evidence: `/workspace/work/sa02-plan-evidence/`; clean detached source checkout `/workspace/work/sa02-plan`; main and installed Better Auth1.7.7 + official docs checked.
- Out of scope: canonical privileged profile/deactivation/enforcement/SA03+, Stage6/live infrastructure, visual polish. External Cloudflare/Neon/Google/real Owner binding remains paused.
- Owner alone merges. No last-manager/count/recovery rule. Reviewer/planner does not assign an implementer or activate another package.
