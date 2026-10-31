# Actual Complaints Queue / triage

Opt-in Chromium → built Worker → Better Auth → PermissionResolver → PostgreSQL check.
Use an isolated loopback PostgreSQL 17 database ending in `_test`, migrate it through
0053, and point both local Hyperdrive overrides at it. Configure task-owned dummy auth
vars with BETTER_AUTH_URL matching the preview URL. Keep proxy/CA settings; never copy
existing credential files. Requires pinned Node/pnpm, Python Playwright and Chromium.

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5551/vico_pkg3_browser_test \
  python tests/browser/complaints-queue/check.py --url http://127.0.0.1:4184 \
  --output /tmp/complaints-queue-results
```

The harness admits only loopback application/database addresses and disposable test DBs.
It creates two review-only actors and native forum/complaint fixtures through the actual
repositories/service with default submission budgets. It checks multi-page global counts,
priority/reason aggregation, privacy, independent Signals/Security admission, real priority
Form/clear/stale rejection, non-exclusive activity, next-request revocation/lease expiry,
EN/RU/HE keyboard and 320/390/768/1280 layouts, a real bounded DB lock timeout and recovery.
Also checks global reason-priority settings, separate management-only access, actual full-map save, stale configuration rejection, recalculation/manual override semantics and EN/RU/HE settings layouts. No responses are mocked. Existing foundation decisions are used only to seed a closed Case;
no decision/review/notes/history UI is implemented here. Destroy the whole fixture database
(immutable evidence), stop preview/PostgreSQL and remove task-owned dummy vars afterward.
Evidence stays outside tracked source. Owner acceptance/production rollout are separate.
