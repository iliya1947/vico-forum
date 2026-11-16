# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Implementation PR:** Draft/open/unmerged #334, reviewed head `c86edbd7d42fef18ee550a7ac5225d26a02eb52d`, base `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Merge chunk:** SA04-M + SA04-N only. O absent.
- **Latest verdict:** Lev independent **whole-M+N RETURN**, one confirmed current-N P2 **SA04-MN-LEV-01**, [complete packet](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6902833450). Review completed across all24 paths; no other current-M/N defects confirmed.
- **Historical coordinator status:** Mira whole-M and whole-N PASS on the reviewed head; these do not close the merge gate after independent RETURN.
- **Current active executor:** **Lira (ChatGPT-6)** — correct the single bounded packet **SA04-MN-LEV-01** in #334: triage operationId preservation after success→401/503→manual retry, meaningful regression and applicable gates. Full reproduction is in #331 comment #6902833450.
- **Lev:** independent review complete / STOP; no implementation edits.
- **Mira:** STOP until Lira produces a new stable head/checks; then fresh whole-M+N coordinator review.
- **Mark:** inactive.
- **Review route:** correction → new stable exact head + applicable checks → fresh Mira whole-M+N coordinator review → Lev independent whole-M+N same-head review.
- **Merge:** blocked until current packet closed and both required reviews PASS. Only Owner merges #334.
- **Developer route override retained:** merge the M+N chunk after required gates; then refresh main/reread AGENTS and resume O in a fresh PR/branch.
- **O:** paused before implementation; no O+ before #334 merge.
- **Boundary:** no SA05, #315 remediation, permanent docs, production/deployment or Stage6 as part of this correction.
