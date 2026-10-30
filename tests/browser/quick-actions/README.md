# AP-05 real application verification

Run only on an isolated built Worker and a disposable loopback PostgreSQL 17
`*_test` database migrated through 0051, with synthetic local auth configuration.
Use pinned Node/pnpm, Python Playwright and Chromium (`CHROMIUM` override supported).

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55473/vico_ap05_browser_test \
  python tests/browser/quick-actions/check.py --url http://127.0.0.1:4187 \
  --output /tmp/vico-ap05-browser
```

The harness uses real Better Auth sessions and canonical topic Forms for pin/unpin,
answer selection, solved, all three moderation actions, source-locale correction,
duplicate confirmation/removal and both appeal resolutions. Correction regressions cover
dual-capability author confirmation, explicit admin self-action, an opened own source
form followed by an Any grant, and pending-appeal removal identity/outcome in one event.
C covers Any-only own denial for solution/title/post source operations, administrative
self-actions, author redirect/forced prompt URL, and Own revocation with opened forms. It checks resulting
PostgreSQL History, repeated no-ops, stale answer/revision/relationship rejection,
own controls, permission revocation and forged actor rejection. EN/RU/HE ×
320/768/1280 checks cover keyboard disclosure, RTL, overflow and actual History;
screenshots/results are written outside tracked source. React Router data redirects
may return its protocol status 202; resulting state and events are asserted separately.
Fixtures and cleanup use only the explicit disposable test database and this run's
unique IDs. Stop the task-owned Worker/database after verification.
This is author engineering verification, not independent review, owner visual acceptance
or external rollout. The existing admin-history harness remains a separate regression check.
