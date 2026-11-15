# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge.
- **Current main / cumulative SA04 M–S base:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Delivered in main:** SA01–03 and SA04 A–L. L is the already-merged historical delivery-boundary exception (#333).
- **Accepted technical scope:** SA04 **M → N → O → P → Q → R → S**, then SA05 → SA06 → SA07 → SA08; architecture/acceptance unchanged.
- **Merge boundary:** remaining SA04 uses **one cumulative Draft implementation PR M–S**. No Owner merge between M/N/O/P/Q/R; final merge only after S closure and final whole-SA04 Mira + Lev review.
- **Current slice:** **M1 COMPLETE / Lira STOP** on exact head `81b20db40454b302689dc9dedb4bc764f62963d6`; M2 is the next author work unit, not a Mira review gate.
- **Internal decomposition:** M1.1–M1.4 completed; M2 may be further split into author work units. Internal units require Lira stop/continuation but **no Mira/Lev review gate**. Whole-M is the first coordinator gate.
- **Lira:** M1 author STOP; next developer continuation activates M2 on **the same cumulative Draft #334**. After whole M, AUTHOR STOP for Mira whole-M coordinator review.
- **Implementation PR:** [cumulative Draft #334](https://github.com/iliya1947/vico-forum/pull/334), branch `chatgpt/sa04-ms-cumulative-accountstate`; exact M1 checkpoint head `81b20db40454b302689dc9dedb4bc764f62963d6`, from exact `main=859ea69165f51cd997e61b1d1f30f6663f045965`. This same Draft remains through M–S with no intermediate merge.
- **Mira:** STOP during internal M1/M2; **NEXT after whole M** for whole-M coordinator review of cumulative #334, then after whole N/O/P/Q/R and final whole-SA04 according to current package cadence.
- **Lev:** inactive between ordinary package checkpoints; activate only for a genuine technical escalation or the final independent whole-SA04 review after S.
- **Mark:** inactive.
- **M1 completed source/evidence:** only `db/user-measures.ts` + `tests/database/sa04-user-measures-m1.test.ts`, 2 commits, no schema/permission/dependency/HTTP changes. Shared native `assertActiveAccountForMutation(client,actorId)` immediately after `authz_mutation_lock FOR UPDATE` in existing `withLockedTransaction`; all five command paths including own appeal and replay. [CI #43741372398](https://github.com/iliya1947/vico-forum/actions/runs/43741372398) SUCCESS — native PG17 **979/979 in 87 files**, including M1 **9/9**, existing AP10 transitions **16/16**, L↔M mutex **11/11**, app **2337/2337 in 186 files**, lint/typecheck/build/migrations/Worker. [AP10 #43741372426](https://github.com/iliya1947/vico-forum/actions/runs/43741372426) **SUCCESS 4/4 browser jobs**. Source/current main exact stable `81b20db40454b302689dc9dedb4bc764f62963d6` / `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Next checkpoint:** developer `...` → M2 author work in **same Draft #334**; after whole M is implemented and evidenced, Mira **whole-M** coordinator review. Mira PASS → Lira begins N in same PR; no merge before S.
- **Package cadence:** whole M → Mira whole-M; whole N → Mira whole-N; whole O/P/Q/R → Mira respective whole-package review, **no merge**; S closes SA04 → Mira whole-SA04 → Lev independent same-head review → Owner merge once.
- **Boundary:** M2/N+ not implemented in M1; no SA05, #315 remediation, permanent docs, production/deployment or Stage6.
