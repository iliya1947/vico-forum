# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 7 — B1/B2/B3 + local Worker HTTP smoke author-verified; documentation closeout next**
- Current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`
- Packages 1–6: merged
- Technical plan: accepted by Мира; planner Лёва — Codex-6.1 Sol
- Executor: **Лира — ChatGPT-6**
- Implementation: **Draft PR #280**, branch `chatgpt/complaints-package-7`, stable exact head `3cd46b6583a40db5e48f317d2c798584f9e8eded`
- Exact-head [CI #41591646928](https://github.com/iliya1947/vico-forum/actions/runs/41591646928): **SUCCESS** attempt 1, `checks` and `database`
- P7-DOC-01: author-corrected `docs/auth/AUTHORIZATION.md`; coordinator acceptance pending
- **B1 PASS:** native real route↔PostgreSQL submission→Case→Decision→Appeal→History/inbox, edit/successor/retained evidence
- **B2 PASS:** real authorization allow/deny/regrant and reviewer DTO identity / protected resource boundaries (in-memory bucket for bytes, not real R2)
- **B3 PASS:** native Appeals/History/timeline/unified inbox pagination/count, canonical Quick action permission and Admin History separation
- **Local HTTP smoke PASS:** built Worker + real Better Auth sessions + PostgreSQL `*_test`, EN/RU/HE SSR, permission changes, protected resources and `und→auto`; no browser/deployed/R2 proof
- **Next subtask for Лира:** merge-stable `docs/moderation/COMPLAINTS.md`, `PROJECT_STATE.md`, `docs/PROJECT_HISTORY/` status and evidence; after final CI & stable head publish coordinator handoff in #254
- **Review after author completion:** Мира coordinator whole-PR review current exact head → after PASS Лёва independent technical review same head
- No Package 7 coordinator PASS, merge, production rollout, browser acceptance or external resource execution
