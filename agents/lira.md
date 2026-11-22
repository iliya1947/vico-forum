# agents/lira.md — B8-C1 only; STOP after connected Chromium core UI packet

## Accepted base

- B8-B coordinator PASS on Draft #376 exact `cd9ffd1adc30853ecf297fea15ea6188f851ca98`.
- Continue in existing B8 branch `feature/moderation-visibility-b8-acceptance`; no new implementation PR.

## Current assignment — B8-C1 only

Build the connected Chromium acceptance for the core moderation-visibility UI on the actual Worker/Better Auth/PostgreSQL stack.

Done criteria:

1. Topic and post visible → Hide → guarded private inspection/Restore → visible through rendered UI controls; no direct HTTP mutation shortcut for the action under test.
2. Representative EN/RU/HE UI; HE must prove RTL at a narrow viewport as part of the same connected acceptance.
3. Keyboard reachability and activation for the relevant visibility controls/navigation.
4. Hidden public source must disappear from the rendered public DOM after Hide; guarded private inspector may show only the already-authorized private content/reason.
5. Queue/inspector navigation and Restore must run under a real current Better Auth session.
6. Reuse the established connected Playwright/Worker fixture where practical. Do not duplicate B8-B transport/R2 checks.
7. If Chromium exposes a real current-stage defect, correct only that bounded defect and prove it.
8. Run the applicable connected Chromium checks and update #342/#376.

**Mandatory STOP after B8-C1.** B8-C2 lifecycle states, B8-C3 browser cache/fault completeness, B9, fold, final reviews, merge and deploy are not authorized.
