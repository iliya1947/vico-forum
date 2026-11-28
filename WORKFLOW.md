# WORKFLOW.md — текущее оперативное состояние stale/legacy audit

## Активное состояние

**TRANSFER COMPLETE / HOLD before current-main reconciliation.**

- Dedicated service PR: #390, branch `service/stale-legacy-audit-2`.
- Current main at transfer: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
- Baseline audit: 80 exact A on `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; B/C/D/E separately classified.
- Эти 80 **не считаются current exact** после main drift без reconciliation.
- Main advanced by 4 commits and touched audited surfaces, including `app/localization/catalog.ts`, `manual-values.ts`, `manual-fingerprints.ts`, `.github/scripts/runtime-privileges.mjs`, `app/forum/public-read.test.tsx`, `app/styles.css` and multiple Admin/forum projections.
- Existing C1 Draft #377 exact `d4f820166bc905e28e2ae818854e6f8038c96ea1`: previous author PASS + CI were on old base; now PR is diverged, ahead 3 / behind 4 relative to current main.
- #342 is complete and no longer owns this audit.

## Next bounded step

R0: reconcile the baseline registry against current main, starting with changed audited surfaces and C1 A-011…A-026. No implementation change in this transfer step.

## Gate

**STOP after transfer.** Do not sync/edit #377 or start C2 until owner continues this new service task.
