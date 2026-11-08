# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — SET06-MIRA-01 bounded author correction delivered; awaiting fresh Mira whole-PR review**
- Implementation: **[Ready PR #311](https://github.com/iliya1947/vico-forum/pull/311)**, frozen corrected exact head **`11639e79ae67b61062d05bf3f05e32526204a056`**, open/mergeable.
- Previous reviewed head `b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc`: Mira **CHANGES REQUIRED**, one finding **SET06-MIRA-01** ([review](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6724292614)). Former CI/Chromium PASS was superseded by correction.
- **Лира correction delivered:** only `db/hyperdrive-user-privacy.ts` and new `db/hyperdrive-user-privacy.test.ts` changed since reviewed head. Cause-chain traversal for Drizzle-wrapped PostgreSQL availability/transport, cycles handled; wrapped schema/auth/programming defects remain unexpected. **No author whole-PR self-review**, no coordinator PASS claimed.
- **Corrected-head [CI #42504491033](https://github.com/iliya1947/vico-forum/actions/runs/42504491033) SUCCESS:** 167 app test files / 2114 tests incl. 17 new regressions, 52 PG17 test files / 605 tests, lint/typecheck/build/migrations/runtime privileges/provisioning/Worker.
- **Corrected-head [Chromium #42504491099](https://github.com/iliya1947/vico-forum/actions/runs/42504491099) SUCCESS:** 4/4 jobs, 13 connected Privacy scenarios in existing `settings_browser` with real unavailable/read/no-store/ON/OFF/cross-session/EN-RU-HE/RTL/mobile.
- **Next: Мира** — fresh coordinator whole-PR review on exact `11639e79ae67b61062d05bf3f05e32526204a056` against approved SET-06 and SET06-MIRA-01. **Лира:** stopped, no active author changes until verified review findings. **Лёва:** independent technical review only after Mira PASS. **Марк:** unassigned. Agents do not invoke one another.
- Owner merge blocked pending coordinator PASS and subsequent independent Lev PASS; permanent docs/project-state closeout remains separate post-merge.
- No production/Neon/Stage6/live Google/Owner binding or Owner visual acceptance.
