# AP-10 isolated browser acceptance

This is an opt-in real Chromium → built Worker → Better Auth → disposable PostgreSQL 17 check.
GitHub's scoped AP-10 browser workflow uses the installed Google Chrome from its pinned
Ubuntu runner image, synthetic credentials, migrations, and exact implementation-head evidence. Browser interaction is real, not jsdom
or static GitHub Pages; no user browser, production, external provider or shared database is used.

Run only with a loopback application URL and a loopback database whose name ends in
`_test`, after the current repository migrations and local dummy Worker build:

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vico_ap10_browser_test \
  python tests/browser/user-measures/check.py --url http://127.0.0.1:4188 \
  --output /tmp/vico-ap10-evidence
```

The script creates actual Better Auth accounts, explicitly scoped authority grants, independent
measures, a private appeal and a real forum topic. It checks active-session policy, own-only
privacy, admin-family revocation, accepted appeal/lift, overlapping restriction removal,
stale form 409/no replay, EN/RU/HE at 320/768/1280, keyboard focus and overflow.
Evidence JSON and synthetic-data screenshots are written outside the tracked source.
The disposable CI database and test Worker are destroyed after the run.

Engineering browser evidence does not substitute for independent review, owner visual
acceptance or production deployment verification.
