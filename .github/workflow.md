# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Current stage: **SA-03 technical plan accepted by Mira; implementation decomposed into small sequential subtasks. No implementation is assigned yet.**
- SA-02 is fully closed in repository/local-CI: implementation #319 and factual docs #323 are merged.
- Accepted Super-admin SA-01→SA-08 decomposition remains authoritative.
- **Current bounded package: SA-03 only** — canonical `/:locale/users/:userId` public/Admin/Owner composition, safe target identity/methods/sessions, available source-aware per-user Owner summary, guarded legacy Admin-detail redirect. **Deactivate is not enabled.**
- Lev's package-specific technical plan: #6796912006. Mira scope/fit review: **PASS, 0 confirmed current-scope plan defects.**
- The previous coordinator wording implying one whole-SA-03 implementation assignment is **superseded**. SA-03 implementation must proceed as sequential bounded subtasks:
  1. **SA03-A — server contracts/admission foundation only:** profile composition contracts, viewer/target/Owner admission seams, section DTO states and request-context boundaries; tests only; no new Owner data reader, no per-user History reader, no UI composition/redirect/migration.
  2. **SA03-B — Owner target account reader:** readonly private identity + sign-in methods + bounded session metadata, secret-free DTO and native tests; no per-user History/UI/redirect.
  3. **SA03-C — per-user Owner summary + indexes:** fixed source-attributed target-scoped reader, cursor/pagination and only the required index migration; native tests; no canonical UI integration yet.
  4. **SA03-D — canonical profile integration:** public/Admin/Owner sections, reuse existing measures/authorization controls, directory links and guarded legacy Admin-detail redirect; route/component tests.
  5. **SA03-E — connected acceptance/closeout:** built Worker + Better Auth + migrated PG17 + Chromium, exact-head checks and stable author handoff.
- **Only one subtask may be assigned at a time.** After each subtask Lira stops and Mira records the result before any next assignment.
- Next bounded step: assign **SA03-A only** to Lira. Lev and Mark remain unassigned.
- SA-04+, #315 security activation, production and deferred journal occupancy/archive/clear remain outside scope.
