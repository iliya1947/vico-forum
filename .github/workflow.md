# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — Lira subtask 2/3 implemented in Draft PR #317; exact-head validation and reviewer handoff are subtask 3/3.**
- SA01 implementation#313 + docs#314 complete/merged.
- Planner: **Lev**. Approved plan = [#6761206804](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804) as corrected by [#6761588752](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761588752).
- Mira plan re-review [#6761671562](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761671562): **PASS — 0 current-scope plan defects**. FOUNDATION-PLAN-MIRA-01 and FOUNDATION-PLAN-MIRA-02 closed.
- Current implementation scope: outgoing AdministrativeRouting/address centralization only; Admin and Super-admin remain distinct typed destination families with no permanent shared base/origin/Worker assumption.
- Current `app/routes.ts`, Worker ingress, route registrations/IDs, URLs, authorization, React Router 8.3.1/`initial`, schema/dependencies and local/CI behavior must remain unchanged.
- Future source **#315** exact head `5329ef027c7f477067154218349077d75b763c8a`: ordinary Admin stays in Public Forum Worker; Super-admin moves to separate Owner Worker. #315 remains architecture reference only; its security implementation is not absorbed into #251.
- Implementer: **Lira**. [Draft PR #317](https://github.com/iliya1947/vico-forum/pull/317), latest head `39b1b9f880397c3fb095b38a697a7a97603fffb6`. Separate Admin/Owner address families, UI provider, request-scoped accessor, consumer migration and focused tests committed. One node-tsconfig input added for new pure module; no route registrations/Worker/schema/migrations/dependencies changes. CI/Chromium on this head are not yet final. Mark unassigned. Lev stopped after plan approval.
- **Next subtask 3/3: Lira verifies exact-head CI/Chromium, corrects confirmed current-scope failures if any, marks PR #317 Ready and posts evidence in #251; then stops for Mira coordinator whole-PR review.**
- SA02 remains next product package after foundation completion; source-attribution/bounded-retention correction#6759312425 remains open and unchanged.
