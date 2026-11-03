# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 6 — final bounded verification correction**
- Current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`
- Implementation PR: Draft #279, branch `chatgpt/complaints-package-6`
- Reviewed stable exact head: `0d6bdbb465148875e02663c4c27c56e099a415e4`
- Exact-head CI #41557641455 attempt 2: SUCCESS
- Repeat coordinator verdict: **FAIL only on remaining P6-VERIFY-01 evidence gap**
- Closed: `P6-RTL-01`, `P6-VERIFY-02`, concurrent resolve, submit↔resolve race, rollback fanout
- Remaining blocker: native PostgreSQL concurrent Appeal submissions test must use **different actual reporters** on the same Decision and prove one slot/event
- Correction executor: **Лира — ChatGPT-6**
- Correction type: **test-only unless the corrected test exposes a real implementation defect**
- Лёва independent review: do not start before new coordinator PASS
- Next step: Лира updates #279, runs applicable CI, records new stable exact head/results in #254; then Мира reruns coordinator whole-PR review.
