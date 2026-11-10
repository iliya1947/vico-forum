# Admin panel — current workflow

- Service PR: **#251**.
- Current main: `56358c517cd4456e4421d56e022fce70431b00c1`.
- Current stage: **Admin/Super-admin routing foundation merged; factual docs-only closeout assigned to Lira.**
- Implementation PR **#317** merged from exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605` as merge commit `56358c517cd4456e4421d56e022fce70431b00c1`.
- Final implementation reviews: Mira PASS #6764695060; Lev PASS #6765085755; FOUNDATION-LEV-01/-02 CLOSED.
- Accepted implementation scope: outgoing AdministrativeRouting foundation only; independent typed Admin/Super-admin destination families and replaceable UI/request resolver seam. Current default URLs, route registrations, Worker ingress, authorization, Router 8.3.1/`initial`, schema and dependencies remain unchanged. #315 Stage-6 security activation remains separate.
- Docs implementer: **Lira assigned** by [#6765810801](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765810801).
- Docs-closeout expected factual surfaces: `PROJECT_STATE.md`; only necessary permanent boundary updates in `docs/ADMIN_PANEL.md` / `docs/SUPER_ADMIN.md`; next `docs/PROJECT_HISTORY/PROJECT_HISTORY_##.md` + history index. No implementation changes.
- **Next: Lira publishes a separate docs-only PR stable head + applicable checks in #251, then stops for Mira docs-only review.**
- Lev/Mark unassigned. SA02 remains paused until docs closeout merge; telemetry/source-attribution correction #6759312425 remains open.
