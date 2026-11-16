# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **Current inherited head:** `7a0ce7f4ec4dbf224aa99b3375b18542630bdb81`.
- **Delivered inside cumulative SA05:** original 05-A = command core + protected action + lifecycle/read/event projections. Mira's prior 05-A PASS is a useful intermediate check, **not a gate that stops implementation**.
- **ACTIVE:** Лёва continues **all remaining SA05 / original 05-B through whole-SA05 closure**, without intermediate independent-review stops.
- **Whole-SA05 completion:** canonical Owner lifecycle/retention presentation + deactivation confirmation/control + required genuine Worker/Better Auth/PostgreSQL17/Chromium stale-session/race/rollback acceptance on one stable exact #337 head.
- **NEXT after whole-SA05 AUTHOR READY:** Mira whole-package coordinator review. If PASS, final same-head independent reviews by **Лира and Марк**; Лёва is ineligible as author.
- **Merge:** only the developer performs merge after the complete package review chain.
- **Boundary:** no SA06+, #315, deployment, Stage6, production/external work or permanent docs during this implementation.
