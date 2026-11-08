# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — Lira implementation in progress, slices 1–3/4 completed**
- SET-05 implementation #309 + docs #310: merged; SET-05 fully closed.
- Approved SET-06 Lev plan: [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280); Mira plan review PASS [#6723059320](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6723059320).
- Implementation: **[Draft PR #311](https://github.com/iliya1947/vico-forum/pull/311)**, latest working head **`a5f321459599497b3426a0a13dafe69056550a78`**. **NOT stable final implementation, not Ready for review.**
- **Slice 1/4 complete:** forward migration 0061 `user_privacy_preferences`, Drizzle schema/snapshot/journal, catalog manifest, runtime grants and tests.
- **Slice 2/4 complete:** authoritative own-account privacy read/save, atomic OFF presence cleanup, same user-row lock with heartbeat/fresh preference read, SQL filter of hidden users before count/LIMIT12, PG17 concurrency/rollback/count tests.
- **Slice 3/4 complete:** authenticated `/:locale/settings/privacy`, independent exact own-account form guards, Settings navigation and EN/RU/HE, account-keyed state, homepage document/data no-store and heartbeat controlled no-store, unit/UI/route inventory tests.
- Slice-3 exact-head [CI #42497895714](https://github.com/iliya1947/vico-forum/actions/runs/42497895714): **SUCCESS** (166 app files/2097 tests, 52 PostgreSQL 17 files/605 tests, lint/typecheck/build, schema/privilege/provisioning/Worker smoke). Existing [Chromium #42497895687](https://github.com/iliya1947/vico-forum/actions/runs/42497895687): **SUCCESS** all four existing browser jobs. **New Privacy connected-browser/runtime acceptance has not run.**
- **Лира**: next implement slice 4/4 — connected built Worker/Better Auth/PG17/Chromium Privacy acceptance in existing settings_browser, real HTTP cache headers, final exact-head checks and Ready handoff.
- **Мира**: whole-PR coordinator review only after final stable implementation delivery; **Лёва**: independent review only after Mira PASS; **Марк**: unassigned.
- SET-06 implementation incomplete. No permanent docs changes, production/Neon/Stage 6/live Google or real Owner binding.
