# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **Current stable implementation head:** `a465cbd379b9c3f92b504658001c698bce3fa505`, cumulative Draft #337,6commits/43paths; remaining05-B source published.
- **ACTIVE:** Lev final whole-SA05 author checks (full local suites, new connected acceptance and exact-head CI). Not AUTHOR READY yet. Mira whole-package review follows final handoff; context supplied in [#6920247047](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6920247047) while CI runs.
- **Delivered inside cumulative SA05:** original 05-A = command core + protected action + lifecycle/read/event projections. Mira's prior 05-A PASS is a useful intermediate check, **not a gate that stops implementation**.
- **ACTIVE:** Лёва continues **all remaining SA05 / original 05-B through whole-SA05 closure**, without intermediate independent-review stops.
- **Whole-SA05 completion:** canonical Owner lifecycle/retention presentation + deactivation confirmation/control + required genuine Worker/Better Auth/PostgreSQL17/Chromium stale-session/race/rollback acceptance on one stable exact #337 head.
- **NEXT after whole-SA05 AUTHOR READY:** Mira whole-package coordinator review. If PASS, final same-head independent reviews by **Лира and Марк**; Лёва is ineligible as author.
- **Merge:** only the developer performs merge after the complete package review chain.
- **Boundary:** no SA06+, #315, deployment, Stage6, production/external work or permanent docs during this implementation.
