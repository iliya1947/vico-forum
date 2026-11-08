# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — Lira implementation in progress, slices 1–2/4 completed**
- SET-05 implementation #309 + docs #310: merged; SET-05 fully closed.
- Approved SET-06 Lev plan: [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280); Mira plan review PASS [#6723059320](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6723059320).
- Implementation: **[Draft PR #311](https://github.com/iliya1947/vico-forum/pull/311)**, latest working head **`316cf2a47a35d804d59128155bb6b01aed7f6351`**. **NOT stable final implementation, not Ready for review.**
- **Slice 1/4 complete:** forward migration 0061 `user_privacy_preferences`, Drizzle schema/snapshot/journal, PostgreSQL catalog manifest, web runtime preference SELECT/INSERT/UPDATE and presence DELETE grants, migration/privilege tests.
- **Slice 2/4 complete:** authoritative own-account privacy read/save request capability, atomic OFF cleanup, shared per-user row lock with heartbeat, fresh preference read after lock, SQL public list/count filtering before window count/LIMIT 12, stale heartbeat actor 409. Native PG17 evidence includes hidden stale row, ON without synthetic activity, >12/count, rollback and two contention orderings.
- Slice-2 exact-head [CI #42495819973](https://github.com/iliya1947/vico-forum/actions/runs/42495819973): **SUCCESS** (2085 app, 605 PostgreSQL 17 tests, lint/typecheck/build, migration/runtime/privilege probes). Existing [Chromium #42495819947](https://github.com/iliya1947/vico-forum/actions/runs/42495819947): **SUCCESS**, all four existing browser jobs. **New SET-06 Privacy browser acceptance has not run.**
- **Лира**: next implement slice 3/4 — authenticated Privacy Settings route/UI, form guards/account isolation, EN/RU/HE and RTL, homepage/heartbeat private/no-store and focused route/UI tests.
- Slice 4/4: connected Worker/PG17/Chromium Privacy acceptance, final exact-head CI and Ready handoff.
- **Мира**: whole-PR coordinator review only after final stable implementation delivery; **Лёва**: planning complete, independent review only after Mira PASS; **Марк**: unassigned.
- SET-06 implementation remains incomplete. No permanent docs changes, production/Neon/Stage6/live Google or real Owner binding.
