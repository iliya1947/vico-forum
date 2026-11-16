# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1:** command core — Mira coordinator PASS.
- **SA05-2:** protected HTTP/request-context action — stable exact head `8f3693a60bd627ac615defbb6b742f38a92fecfb`; Mira coordinator **PASS, 0 confirmed current-scope defects**.
- **Accepted-boundary mapping:** SA05-1 → SA05-2 → SA05-3 are internal subdivisions of original **05-A**; SA05-3 completes Owner account-event mapping to accounts/profile/global and closes 05-A. SA05-4 → SA05-5 are subdivisions of original **05-B**; SA05-5 closes whole SA05.
- **Current state:** STOP after completed SA05-2 checkpoint. #337 stays Draft/unmerged.
- **NEXT only after developer continuation:** Лёва implements **SA05-3 only** on the same cumulative #337 lineage.
- **Review independence:** Лёва is implementation author and cannot independently review his authored implementation; independent reviewers are assigned separately at the applicable final gate.
- **Boundary:** no SA05-4/UI or SA05-5 connected closure, SA06+, #315, deployment, Stage6 or production work at the SA05-3 checkpoint.
