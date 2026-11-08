# Admin panel — current workflow

- Service PR: **#251**
- Main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — coordinator CHANGES REQUIRED; Lira correction assigned**
- Implementation PR: **#311**
- Reviewed exact head: **`b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc`**
- Mira coordinator verdict: **CHANGES REQUIRED — 1 confirmed current-scope defect**
- Open finding: **SET06-MIRA-01** — new `db/hyperdrive-user-privacy.ts` does not traverse `cause` for generic PostgreSQL availability/transport errors; Drizzle ORM 0.45.2 wraps query failures in `DrizzleQueryError.cause`, so wrapped availability failures can escape as unexpected errors instead of controlled `503`
- All other reviewed SET-06 implementation boundaries accepted; exact-head CI #42501120430 and Chromium #42501120499 were SUCCESS but do not close SET06-MIRA-01
- **Лира**: assigned one bounded correction for SET06-MIRA-01; publish new stable implementation head + applicable exact-head checks/browser evidence, then stop
- **Мира**: after Lira delivery, fresh coordinator whole-PR review of the new exact head
- **Лёва**: stopped; independent technical review only after Mira PASS
- **Марк**: unassigned
- Owner merge blocked until coordinator PASS and subsequent independent Lev PASS
- Permanent project/domain docs remain separate post-merge closeout
- No production/Neon/Stage6/live Google/Owner binding work
