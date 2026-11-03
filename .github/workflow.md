# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 7 — implementation assigned**
- Current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`
- Packages 1–6: merged
- Package 7 nature: integration/closeout; no new feature work by default
- Technical plan: accepted by Мира
- Technical planner: Лёва — Codex-6.1 Sol
- Executor: **Лира — ChatGPT-6**
- Required confirmed fix: **P7-DOC-01** in `docs/auth/AUTHORIZATION.md`
- Implementation target: minimal connected/native/runtime verification for only the identified B-gaps, plus merge-stable documentation closeout; reuse existing evidence/tests where already sufficient
- No schema/migration/permission/dependency/public-contract expansion unless a newly proven current-scope defect makes it necessary
- Implementation PR: **Draft #280**, branch `chatgpt/complaints-package-7`, base `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`, current head `4c8f5954afb01836cfbb85f6897a458a3ceb43f4`
- Production/external rollout and unrelated Admin/Signals/Security work: out of scope
- P7-DOC-01 implemented in #280: localized `docs/auth/AUTHORIZATION.md` correction only, no grants/policy changes; initial exact-head CI #41580997525 pending.
- Next subtask: Лира closes only missing accepted-plan B1/B2/B3 connected verification in #280; final project state/history after actual acceptance. After implementation: stable exact head + applicable checks/evidence + handoff in #254 → Мира coordinator whole-PR review
