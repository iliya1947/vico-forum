# AP-06 real application verification

Use an isolated built Worker, synthetic Better Auth configuration and a disposable
loopback PostgreSQL 17 `*_test` database migrated through 0051. Build after writing
local `.dev.vars`; set both Hyperdrive local overrides to this database when starting
preview. Pinned Node/pnpm, Python Playwright and Chromium are required.

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55473/vico_ap06_browser_test \
  python tests/browser/admin-forum/check.py --url http://127.0.0.1:4187 \
  --output /tmp/vico-ap06-browser
```

The harness uses real Better Auth sessions, arbitrary custom-role grants and next-request
revocation. It checks independent index/category/section GET gates, private no-store
responses, bounded stable paging, literal name/ID search, empty/invalid/missing states,
POST 405, protected Help service-section projection, old-placeholder redirect,
EN/RU/HE × 320/768/1280, encoded slash/Unicode IDs, long names, one shell/main/h1,
keyboard hierarchy navigation, real PostgreSQL query timeout and recovery. Outgoing
browser requests are blocked and page errors recorded. Fixture SQL is restricted to
the explicit disposable database; cleanup removes only this run's rows. Screenshots
and JSON evidence stay outside source. Stop the task-owned Worker/database afterward.
This is author engineering verification; it does not replace independent whole-PR
review, owner visual acceptance or production rollout.
