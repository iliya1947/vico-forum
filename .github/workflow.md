# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 7 — implementation in progress; B1 verified, B2 next**
- Current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`
- Packages 1–6: merged
- Technical plan: accepted by Мира; technical planner: Лёва — Codex-6.1 Sol
- Executor: **Лира — ChatGPT-6**
- Implementation PR: **Draft #280**, branch `chatgpt/complaints-package-7`, stable current head `444be574063cc00b639f560b693d175252864234`
- Exact-head [CI #41583586320](https://github.com/iliya1947/vico-forum/actions/runs/41583586320): **SUCCESS**, attempt 1, `checks` + `database`
- P7-DOC-01: corrected `docs/auth/AUTHORIZATION.md`, coordinator acceptance pending
- B1: **connected TSX route→native PostgreSQL lifecycle regression PASS** in `app/complaints/connected-lifecycle.dbtest.tsx` (one test); old standalone native foundation suite unmodified
- B2: **next subtask for Лира** — reviewer DTO/identity/retained-resource permissions bridge
- B3: pending — native pagination/count and canonical Quick action/domain separation verification
- After B1/B2/B3 acceptance: merge-stable `COMPLAINTS.md`/`PROJECT_STATE.md`/project history closeout, final exact-head CI, handoff Мире coordinator whole-PR review → on PASS Лёва independent technical review
- Browser/production/external rollout, Package 7 features, unrelated Admin/Signals/Security changes: out of scope
