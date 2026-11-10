# Admin panel — current workflow

- Service PR: **#251**. Docs closeout main/base: `56358c517cd4456e4421d56e022fce70431b00c1`.
- Current stage: **Admin/Super-admin routing foundation — implementation merged, factual docs-only closeout completed by Lira; awaiting Mira docs-only review.**
- Implementation PR **#317** merged: stable implementation head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`, merge commit `56358c517cd4456e4421d56e022fce70431b00c1`. Final coordinator Mira PASS #6764695060; independent Lev PASS #6765085755; FOUNDATION-LEV-01/-02 CLOSED.
- Separate docs-only **[Ready PR #318](https://github.com/iliya1947/vico-forum/pull/318)** from merged main, **stable exact head `2cb5b9fa9c426513c9d9207d21d89b48b30c8d6e`**.
- Docs author: **Lira**, assigned by Mira in #6765810801. Both bounded subtasks completed: five Markdown-only files (`PROJECT_STATE.md`, `docs/ADMIN_PANEL.md`, `docs/SUPER_ADMIN.md`, new `docs/PROJECT_HISTORY/PROJECT_HISTORY_24.md`, history index). Records merged independent Admin/Super-admin outgoing routing seam, unchanged current defaults/ingress/authorization, Stage-6 isolation not implemented, FOUNDATION-LEV-01/02 corrective chain and exact-head reviews/merge. No implementation, schema, dependency, ROADMAP, PROJECT, SA02 or #315 work.
- Applicable **[docs PR CI #42806279774](https://github.com/iliya1947/vico-forum/actions/runs/42806279774) SUCCESS** on exact head: `checks` (lint/typecheck/test/build/preview/migration metadata/schema parity) and `database` (clean PostgreSQL17 migrations/constraints, production manifest parity, Worker build/smoke). PR #318 is Ready.
- **Next: Mira performs docs-only review of Ready PR #318 on stable exact head `2cb5b9fa9c426513c9d9207d21d89b48b30c8d6e`. Lira stops; no implementer coordinator review. Owner alone merges.** Lev/Mark unassigned.
- SA02 remains paused until docs PR reviewed/merged; source-attribution/bounded-retention correction #6759312425 remains open and separate.
