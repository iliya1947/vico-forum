# Actual complaint submission flow

This opt-in check drives the built Worker, real Better Auth email session, current
PermissionResolver and PostgreSQL. It verifies guest admission, separate post/title
forms, Other validation, inline confirmation, private response, revision conflict,
next-request denial, the real ten-report budget and retry preservation, keyboard
and English/Russian/Hebrew layouts at 320/390/768/1280 pixels. Responses are not mocked.
It also uses real keyboard input for 2000 non-BMP/mixed code points, checks server
rejection of 2001, and retries corrected text with the same nonce after rejection.

Use a dedicated loopback PostgreSQL 17 database ending in `_test`, apply all migrations,
and configure both local Hyperdrive overrides to it. In a task-owned checkout create
dummy auth vars with `BETTER_AUTH_URL=http://127.0.0.1:4184`, build, then start
`vite preview --host 127.0.0.1 --port 4184`. Never copy existing credential files.
Keep the inherited proxy and CA configuration. Requires pinned Node/pnpm, Python
Playwright and Chromium (`CHROMIUM` can select its executable).

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5551/vico_pkg2_browser_test \
  python tests/browser/complaint-submission/check.py --url http://127.0.0.1:4184 \
  --output /tmp/complaint-browser-results
```

Only loopback applications and disposable local databases are admitted. The harness
creates uniquely named fixture content/accounts; immutable complaint evidence means
the whole database is the cleanup unit. Destroy it and stop the fixture server after
the run. JSON/screenshots stay outside tracked source. This is engineering validation;
owner visual acceptance and production rollout are separate.
