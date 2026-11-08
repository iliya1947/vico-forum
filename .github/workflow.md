# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — Lira implementation in progress, slice 1/4 completed**
- SET-05 implementation #309 + docs #310: merged; SET-05 fully closed.
- Approved SET-06 Lev plan: [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280); Mira plan review PASS [#6723059320](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6723059320).
- Implementation: **[Draft PR #311](https://github.com/iliya1947/vico-forum/pull/311)**, latest working head **`0b66123cb8e8dfda10e1e174bb5a550358ca02fc`**. **NOT stable final implementation, not Ready for review.**
- **Slice 1/4 complete:** forward migration 0061 `user_privacy_preferences`, Drizzle schema/snapshot/journal, PostgreSQL catalog manifest, web runtime grants for preference SELECT/INSERT/UPDATE and presence DELETE, migration and privilege tests.
- Slice-1 exact-head [CI #42494398945](https://github.com/iliya1947/vico-forum/actions/runs/42494398945): **SUCCESS**, 2084 app and 598 PostgreSQL 17 tests, lint/typecheck/build. Existing [AP-10 Chromium #42494398926](https://github.com/iliya1947/vico-forum/actions/runs/42494398926): **SUCCESS**, all four unchanged browser jobs. These results do NOT verify new privacy behavior.
- **Лира**: next implement slice 2/4 — authoritative privacy read/save, OFF↔heartbeat locking, fresh public online list/count filtering + native PG concurrency evidence.
- Slice 3/4: authenticated Privacy Settings route/UI, homepage/heartbeat no-store boundaries, translations and route tests.
- Slice 4/4: connected Worker/PG17/Chromium acceptance, final exact-head CI and Ready handoff.
- **Мира**: whole-PR coordinator review only after final stable implementation delivery; **Лёва**: planning complete, independent review only after Mira PASS; **Марк**: unassigned.
- SET-06 implementation remains incomplete. No permanent docs changes, production/Neon/Stage6/live Google or real Owner binding.
