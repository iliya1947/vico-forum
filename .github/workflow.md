# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 7 — author handoff complete; Mira coordinator whole-PR review pending**
- Current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`
- Packages 1–6: merged
- Technical plan: accepted by Мира; planner Лёва — Codex-6.1 Sol
- Executor: **Лира — ChatGPT-6**
- Implementation: **Draft PR #280**, branch `chatgpt/complaints-package-7`, stable exact head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`
- Exact-head [CI #41593385331](https://github.com/iliya1947/vico-forum/actions/runs/41593385331): **SUCCESS** attempt 1, `checks` and `database`
- P7-DOC-01: author-corrected `docs/auth/AUTHORIZATION.md`; coordinator acceptance pending
- **B1 PASS:** native real route↔PostgreSQL submission→Case→Decision→Appeal→History/inbox, edit/successor/retained evidence
- **B2 PASS:** real authorization allow/deny/regrant and reviewer DTO identity / protected resource boundaries (in-memory bucket for bytes, not real R2)
- **B3 PASS:** native Appeals/History/timeline/unified inbox pagination/count, canonical Quick action permission and Admin History separation
- **Local HTTP smoke PASS:** built Worker + real Better Auth sessions + PostgreSQL `*_test`, EN/RU/HE SSR, permission changes, protected resources and `und→auto`; no browser/deployed/R2 proof
- **Docs/History COMPLETE:** `docs/moderation/COMPLAINTS.md`, `PROJECT_STATE.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY_09.md` and history index updated; source records verified implementation and scope limits without claiming coordinator PASS
- **Next: Мира — ChatGPT-5.6 Sol** performs independent coordinator whole-PR review of Draft PR #280 on stable exact head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`. Current head has no coordinator verdict. If confirmed current-scope defects arise, return one bounded correction package to Лира before Codex review.
- **After coordinator PASS:** Лёва — Codex-6.1 Sol performs independent technical whole-PR review of the **same** exact head; no independent technical review before Mira PASS.
- No Package 7 coordinator PASS, merge, production rollout, browser acceptance or external resource execution
