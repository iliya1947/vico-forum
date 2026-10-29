# AP-02 actual application checks

This opt-in check drives the real built Worker, Better Auth email session, current
PermissionResolver and native PostgreSQL. It covers guest/forbidden/custom-role
admission, next-request overrides, actual aggregate counts, the existing protected
Authorization screen, localized navigation/Under development, keyboard and narrow
LTR/RTL layout, plus a genuine bounded counts timeout and recovery. No route or
count responses are mocked. It is engineering validation, not owner visual acceptance.

Use an isolated application checkout and disposable loopback PostgreSQL 17 database
whose name ends in `_test`; apply the repository migrations first. Configure only
local Hyperdrive overrides and task-owned dummy auth vars. Never copy existing secret
files into the fixture. Start `vite preview` on a loopback URL matching that dummy
`BETTER_AUTH_URL`. Keep the normal session proxy and CA configuration. Dependencies:
pinned Node/pnpm, Python Playwright and Chromium (or `CHROMIUM` executable path).

From the checkout with Node on PATH:

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5548/vico_admin_browser_test \
  python tests/browser/admin-overview/check.py --url http://127.0.0.1:4182 \
  --output /tmp/vico-admin-browser-results
```

The script refuses non-loopback application/database destinations and non-test DBs.
It creates a disposable local account/role, changes only that actor's test grants,
and removes them afterward. It deliberately holds a local forum-table lock to test
classified statistics timeout; do not run it against a shared database under load.
JSON and screenshots remain outside tracked source. Stop the fixture server/database
afterward. Normal repository application/native suites and CI remain separate gates.
