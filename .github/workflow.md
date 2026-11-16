# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **Mira whole-package coordinator review:** PASS — 0 confirmed current-SA05 defects.
- **ACTIVE independent whole-SA05 review: Лира checkpoint 2/4 COMPLETE — REVIEW STOP.** Stable exact #337 head `a465cbd379b9c3f92b504658001c698bce3fa505`, base main `efae8111a13aefbf72b4d20972dac461acc602e3`; no code/PR-head changes. 1/4 covered accepted contract/all 44 paths. 2/4 independently checked actual native Owner command/facade, trusted active actor + target locks, one-transaction state/presence/event, idempotency/replay/conflict/original event, bounded timeouts/ambiguous COMMIT, shared AccountState, DB counters/versioned observations, source-aware global/target/actor History, retained data and real writer-vs-deactivation tests. Direct exact-head CI logs: command 59, whole-SA05 writer/race 159, read/projections 10 tests PASS; database 1311/1311 PASS; actual migrated 69-table manifest parity PASS. **No confirmed current-SA05 defect in checkpoint 2 scope; full independent whole-PR verdict remains PENDING.**
- **Next only on developer `...`: checkpoint 3/4** independent HTTP/Worker/private-resource/cache, canonical Owner UI/confirmation/viewer-target invalidation and genuine built Worker+Better Auth+PG17+local R2+Chromium evidence. Then STOP. 4/4 later whole 44-path/CI synthesis and final independent PASS or full confirmed defects packet via Mira.
- **Mark:** not assigned yet; developer deferred him until later.
- **Developer override for next work:** after Lira finishes her SA05 review, **Lira may immediately start SA06 implementation on top of the current SA05 head**, without waiting for Mark or SA05 merge.
- **If SA05 changes later:** Lev handles SA05 fixes; Lira rebases/adapts dependent SA06 and reruns affected checks.
- **SA06 acceptance boundary:** dependent work may proceed early, but cannot be treated as accepted against main before the SA05 prerequisite is accepted/merged.
- **Merge:** developer only.
- **Boundary:** no SA07+, #315, deployment/Stage6/production/external work.
