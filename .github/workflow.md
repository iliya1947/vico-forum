# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **Original 05-A composition:** SA05-1 command core + SA05-2 protected HTTP action + SA05-3 read/event projections.
- **Current stable exact head:** `7a0ce7f4ec4dbf224aa99b3375b18542630bdb81`.
- **Mira coordinator review:** **PASS — 0 confirmed current-scope defects** for SA05-3 / cumulative original 05-A.
- **Current state:** STOP after coordinator PASS. #337 remains Draft/unmerged and must not change before independent review.
- **NEXT after developer continuation:** independent review of the same exact head by non-authors. Lev is not eligible because he authored the cumulative implementation. No SA05-4 implementation is active yet.
- **After independent 05-A acceptance:** SA05-4 begins original 05-B under the standing sole-implementer assignment to Lev.
- **Boundary:** no SA05-4 UI/control, SA05-5 connected closure, SA06+, #315, deployment, Stage6 or production work now.
