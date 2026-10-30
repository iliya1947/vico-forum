# AP-03 real application verification

Run only against an isolated built Worker and a disposable loopback PostgreSQL 17
`*_test` database migrated through 0049, with synthetic local auth configuration.
No production credentials, provider or external destinations are needed. Use the
pinned Node/pnpm, Python Playwright and Chromium (or `CHROMIUM` override).

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55473/vico_ap03_browser_test \
  python tests/browser/admin-history/check.py --url http://127.0.0.1:4187 \
  --output /tmp/vico-ap03-browser
```

The harness uses real Better Auth sessions and six real management POST intents,
checks no-op/retry/lockout/denial event suppression, deleted-role context, independently
permissioned History and Overview, next-request revocation, keyset navigation, and
EN/RU/HE keyboard/mobile/tablet/desktop presentation. A local table lock checks true
History timeout/degradation/recovery. Fixture setup/cleanup SQL is restricted to the
explicit disposable database; it removes only this run's rows. Screenshots/results
stay outside tracked source. Stop the task-owned Worker/database afterward.
This is engineering verification, not owner visual acceptance or external rollout.
