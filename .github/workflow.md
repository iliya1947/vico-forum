# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge.
- **Current main / cumulative SA04 M–S base:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Delivered in main:** SA01–03 and SA04 A–L. L is the already-merged historical delivery-boundary exception (#333).
- **Accepted technical scope:** SA04 **M → N → O → P → Q → R → S**, then SA05 → SA06 → SA07 → SA08; architecture/acceptance unchanged.
- **Merge boundary:** remaining SA04 uses **one cumulative Draft implementation PR M–S**. No Owner merge between M/N/O/P/Q/R; final merge only after S closure and final whole-SA04 Mira + Lev review.
- **Current slice:** **M1 COMPLETE / Lira AUTHOR CHECKPOINT STOP** — native actor admission for all five AP-10 writers and PG17 fact/race/History acceptance, Mira bounded M1 review next.
- **Internal decomposition:** Lira may split M1 into smaller author work units/checkpoints as needed. This does not create extra PRs or merge gates.
- **Lira:** M1 AUTHOR CHECKPOINT STOP; reactivates only on bounded confirmed current-M1 RETURN or after Mira M1 PASS and new developer activation for M2.
- **Implementation PR:** [cumulative Draft #334](https://github.com/iliya1947/vico-forum/pull/334), branch `chatgpt/sa04-ms-cumulative-accountstate`; exact M1 checkpoint head `81b20db40454b302689dc9dedb4bc764f62963d6`, from exact `main=859ea69165f51cd997e61b1d1f30f6663f045965`. This same Draft remains through M–S with no intermediate merge.
- **Mira:** ACTIVE NEXT for bounded M1 acceptance of two files on exact `81b20db40454b302689dc9dedb4bc764f62963d6`; no whole-SA04 review yet.
- **Lev:** inactive between ordinary package checkpoints; activate only for a genuine technical escalation or the final independent whole-SA04 review after S.
- **Mark:** inactive.
- **M1 completed source/evidence:** only `db/user-measures.ts` + `tests/database/sa04-user-measures-m1.test.ts`, 2 commits, no schema/permission/dependency/HTTP changes. Shared native `assertActiveAccountForMutation(client,actorId)` immediately after `authz_mutation_lock FOR UPDATE` in existing `withLockedTransaction`; all five command paths including own appeal and replay. [CI #43741372398](https://github.com/iliya1947/vico-forum/actions/runs/43741372398) SUCCESS — native PG17 **979/979 in 87 files**, including M1 **9/9**, existing AP10 transitions **16/16**, L↔M mutex **11/11**, app **2337/2337 in 186 files**, lint/typecheck/build/migrations/Worker. [AP10 #43741372426](https://github.com/iliya1947/vico-forum/actions/runs/43741372426) **SUCCESS 4/4 browser jobs**. Source/current main exact stable `81b20db40454b302689dc9dedb4bc764f62963d6` / `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Next checkpoint:** **Mira bounded M1 review** → on PASS, developer `...` activates M2 in **same PR #334**. No merge before S.
- **Final SA04 gate:** S AUTHOR STOP → Mira whole-SA04 coordinator review → Lev independent same stable exact candidate → Owner merge once.
- **Boundary:** M2/N+ not implemented in M1; no SA05, #315 remediation, permanent docs, production/deployment or Stage6.
