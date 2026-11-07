# AP-03/AP-04 real application verification

Run only against an isolated built Worker and a disposable loopback PostgreSQL 17
`*_test` database migrated through the current repository head (0059 through SET-01),
with synthetic local auth configuration. No production
credentials, provider or external destinations are needed. Use the pinned Node/pnpm,
Python Playwright and Chromium/Chrome (`CHROMIUM` or `PLAYWRIGHT_CHANNEL` override).

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55473/vico_ap03_browser_test \
  python tests/browser/admin-history/check.py --url http://127.0.0.1:4187 \
  --output /tmp/vico-ap03-browser
```

The harness uses real Better Auth sessions, with its writing session bound to the
synthetic server-side Owner ID, and all six real management Forms inside
AdminShell plus direct POST gates. An ordinary manager with
`access.authorization.manage` retains protected Roles reads but has no mutation
Forms and receives private `403` for direct POST. It checks no-op/retry/denial
event suppression, deleted-role context, independently permissioned History and
Overview, fresh recipient permission changes, keyset navigation (including a late equal-timestamp/lower-UUID event in a
controlled fixture), EN/RU/HE keyboard/mobile/tablet/desktop History and Roles
presentation, single-shell composition, active navigation and controlled
stale/invalid/assigned-role-conflict feedback.

The SET-01 terminal case records an actual bound Owner `deny` override of
its own raw `access.authorization.manage`: the change commits a History event,
but the Owner's next fresh management GET and POST remain authorized through
server-bound effective authority. The same ordinary manager stays read-only and
its direct POST stays forbidden. Fresh recipient grant/revoke, no-op, atomic
History rollback and History timeout/degradation/recovery are also exercised.
The former successful ordinary-manager self-revoke scenario is superseded.

A local table lock checks real History timeout/degradation/recovery. Fixture setup/cleanup
SQL is restricted to the explicit disposable database and removes only this run's rows.
Screenshots/results stay outside tracked source. Stop the task-owned Worker/database
afterward. This is engineering verification, not owner visual acceptance or external rollout.
