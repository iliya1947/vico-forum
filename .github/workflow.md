# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — implementation delivered, awaiting Mira coordinator whole-PR review**
- SET-01–SET-05: previously implemented and closed in main. SET-06 approved Lev plan [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280), Mira plan PASS [#6723059320](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6723059320).
- **Implementation [Ready PR #311](https://github.com/iliya1947/vico-forum/pull/311)**, frozen exact head **`b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc`**. **Code/author acceptance delivered; no coordinator or independent technical whole-PR verdict yet.**
- Delivered SET-06: `user_privacy_preferences` migration 0061/schema/manifest/runtime privileges; atomic own OFF and locked heartbeat, SQL-filtered public online list/count; authenticated Privacy Settings, EN/RU/HE, guarded form and home/heartbeat no-store; connected Worker/Better Auth/PG17/Chromium acceptance.
- **Exact-head [CI #42501120430](https://github.com/iliya1947/vico-forum/actions/runs/42501120430): SUCCESS**: 166 application files / 2097 tests; 52 PostgreSQL17 files / 605 tests; lint/typecheck/build, catalog/migration/privilege/provisioning/Worker checks.
- **Exact-head [Chromium #42501120499](https://github.com/iliya1947/vico-forum/actions/runs/42501120499): SUCCESS**: 4/4 jobs, including 13 real Privacy acceptance scenarios in existing `settings_browser`, no external requests/browser errors; PG17 query-timeout→Privacy503 and home unavailable-card evidence.
- **Next: Мира** — coordinator whole-PR review of frozen `b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc` against approved SET-06 scope and source-of-truth. **Лира**: implementation delivered, stopped; no whole-PR author self-review. **Лёва**: independent technical review only after Mira PASS; **Марк**: unassigned. Developer connects the next agent; agents do not invoke one another.
- No merge, production/Neon, Stage6, live Google/Owner binding or owner visual acceptance. Permanent project-state/domain docs follow separately after implementation merge; do not change implementation PR merely to update docs.
