# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Current stage: **SA-03 technical plan ready; Mira scope/fit review is next. No implementation is authorized yet.**
- SA-02 is fully closed in repository/local-CI: implementation #319 and factual docs #323 are merged.
- Accepted Super-admin SA-01→SA-08 decomposition remains authoritative.
- **Current bounded package: SA-03 only** — canonical `/:locale/users/:userId` public/Admin/Owner composition, safe target identity/methods/sessions, available source-aware per-user Owner summary, guarded legacy Admin-detail redirect. **Deactivate is not enabled.**
- Lev's package-specific technical plan: [#6796912006](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6796912006), against current main. Planning complete; no source/schema/permanent docs changes made.
- Plan reuses current AP-10/authz writers/readers, adds a narrow Owner target reader and fixed source-scoped summary; proposes one forward index-only migration, no dependencies/tables/new mutations.
- **Next recipient: Mira** — review plan scope/fit before implementation assignment. Lev stopped after planning; Lira and Mark remain unassigned. No implementation PR/head exists for SA-03.
- SA-04+, #315 security foundation/activation, production and deferred journal occupancy/archive/clear remain outside scope.
