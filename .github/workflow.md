# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Current stage: **SA-03 technical plan accepted by Mira — PASS, 0 confirmed current-scope plan defects. Implementation is not assigned yet.**
- SA-02 is fully closed in repository/local-CI: implementation #319 and factual docs #323 are merged.
- Accepted Super-admin SA-01→SA-08 decomposition remains authoritative.
- **Current bounded package: SA-03 only** — canonical `/:locale/users/:userId` public/Admin/Owner composition, safe target identity/methods/sessions, available source-aware per-user Owner summary, guarded legacy Admin-detail redirect. **Deactivate is not enabled.**
- Lev's package-specific technical plan: #6796912006 against current main. Lev planning complete and stopped.
- Mira scope/fit review: **PASS**. The plan matches accepted SA-03 and current repository seams; proposed target-scoped index-only migration is current-package work, not future foundation. No source/schema/permanent docs changes have been made.
- **Next bounded step:** assign Lira implementation of the accepted SA-03 plan in a separate implementation PR from current main. Mira performs coordinator whole-PR review only after Lira publishes a stable head.
- Lev and Mark are unassigned. SA-04+, #315 security foundation/activation, production and deferred journal occupancy/archive/clear remain outside scope.
