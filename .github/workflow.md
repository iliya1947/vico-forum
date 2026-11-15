# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Implementation PR under review:** Draft #334, exact stable head `c86edbd7d42fef18ee550a7ac5225d26a02eb52d`, base `859ea69165f51cd997e61b1d1f30f6663f045965`; open/draft/unmerged/mergeable.
- **Scope of this merge chunk:** completed **SA04-M + SA04-N only**. No O implementation is present on this head.
- **Coordinator status:** Mira whole-M PASS and whole-N PASS; cumulative M↔N boundaries were checked, with 0 confirmed current-M/N defects.
- **Developer route override:** stop the previous O handoff. #334 is now the merge candidate for the M+N chunk.
- **Current active role:** **Lev (Codex-6.1 Sol)** — independent technical review of the complete #334 M+N implementation on the exact stable head above.
- **Review scope:** whole implementation PR #334 as it exists now, including M, N and their cumulative interaction/regression boundaries; not just N delta. Verify against accepted M/N plan, current main/Stage/SoTs, exact-head CI and connected evidence. Classify findings current-M/N vs future groundwork.
- **On confirmed current defect:** return one correction packet to Lira; no merge.
- **On PASS:** STOP at Owner merge gate for #334. No O/P/Q/R/S work starts before that merge.
- **Lira:** STOP. O assignment superseded/paused before implementation.
- **Mira:** STOP during Lev independent review.
- **Mark:** inactive.
- **After Owner merge:** refresh main, reread AGENTS, then resume from O in a new implementation PR/branch based on merged main.
- **Boundary:** no O+, SA05, #315 remediation, permanent docs, production/deployment or Stage6 before #334 merge.
