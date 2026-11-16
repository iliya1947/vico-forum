# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1:** command core — Mira coordinator PASS.
- **SA05-2:** protected HTTP/request-context action — stable accepted head `8f3693a60bd627ac615defbb6b742f38a92fecfb`; Mira coordinator PASS.
- **Accepted-boundary mapping:** SA05-1 → SA05-2 → SA05-3 subdivide original **05-A**. SA05-4 → SA05-5 subdivide original **05-B**.
- **ACTIVE:** Лёва implements **SA05-3 only** on cumulative #337.
- **SA05-3 deliverable:** exact-Owner lifecycle read projection + `accounts.users` lifecycle counts + same-original-event mapping to accounts.users History / global Event log / target and actor Owner profile History. No visible Owner control.
- **Checkpoint purpose:** completion of original accepted **05-A**.
- **NEXT after Lev AUTHOR READY:** Mira coordinator whole-SA05-3 / original-05-A closure review on the new stable exact #337 head.
- **Review independence:** Лёва is cumulative implementation author and cannot independently review his authored work.
- **Boundary:** no SA05-4 Owner UI, SA05-5 connected closure, SA06+, #315, deployment, Stage6 or production work.
