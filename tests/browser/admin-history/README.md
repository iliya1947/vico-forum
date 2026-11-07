# AP-03/AP-04 real application verification

Run only against an isolated built Worker and a disposable loopback PostgreSQL 17
`*_test` database migrated through the current repository head (0059 for the Stage 1
owner/authorization closeout), with synthetic local auth configuration. No production
credentials, provider or external destinations are needed. Use the pinned Node/pnpm,
Python Playwright and Chromium/Chrome (`CHROMIUM` or `PLAYWRIGHT_CHANNEL` override).

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55473/vico_ap03_browser_test \
  python tests/browser/admin-history/check.py --url http://127.0.0.1:4187 \
  --output /tmp/vico-ap03-browser
```

The harness uses real Better Auth sessions and all six real management Forms inside
AdminShell plus direct POST gates. It checks no-op/retry/denial event suppression,
deleted-role context, independently permissioned History and Overview, next-request
revocation, keyset navigation (including a late equal-timestamp/lower-UUID event in a
controlled fixture), EN/RU/HE keyboard/mobile/tablet/desktop History and Roles
presentation, single-shell composition, active navigation and controlled
stale/invalid/assigned-role-conflict feedback.

The Stage 1 terminal case performs a real canonical self-revoke of
`access.authorization.manage`: the mutation commits exactly one History event and the
same actor's following management GET/POST requests are denied from fresh authorization
state. This intentionally replaces the old expected last-manager lockout rejection.

A local table lock checks real History timeout/degradation/recovery. Fixture setup/cleanup
SQL is restricted to the explicit disposable database and removes only this run's rows.
Screenshots/results stay outside tracked source. Stop the task-owned Worker/database
afterward. This is engineering verification, not owner visual acceptance or external rollout.
