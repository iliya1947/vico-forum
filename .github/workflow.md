# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.**
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1:** command core — Mira coordinator PASS.
- **SA05-2:** protected HTTP/request-context action — accepted head `8f3693a60bd627ac615defbb6b742f38a92fecfb`, Mira coordinator PASS.
- **Accepted-boundary mapping:** SA05-1 → SA05-2 → SA05-3 subdivide original **05-A**; SA05-4 → SA05-5 subdivide original **05-B**.
- **SA05-3 / original05-A AUTHOR READY, Lev STOP:** exact `7a0ce7f4ec4dbf224aa99b3375b18542630bdb81`,5commits/36paths. [Whole checkpoint handoff/evidence](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6918077490).
- **Delivered:** Owner lifecycle DTO, accounts.users lifecycle counters/versioned-compatible samples, same-original account.deactivated projection to accounts/global/actor+target History; no visible Owner deactivation control. Cumulative original05-A implementation awaits coordinator closure review.
- **Evidence:** targeted native102/app84 PASS; full local+CI native1152/95files + app2458/191files PASS; actual69-table manifest and existing63guestresource smoke PASS. CI43876918945 + all applicable existing Chromium regressions SUCCESS,14jobs/10runs; actual steps/logs inspected. Unchanged Drizzle BigInt generator/exit0 is non-proof.
- **ACTIVE NEXT:** Mira coordinator whole-SA05-3 / original05-A closure review on the new stable exact head. Confirmed current-checkpoint defects return to Lev in one packet.
- **Review independence:** Lev is cumulative author and cannot independently review his implementation.
- **Boundary:** Draft #337 remains unmerged; no SA05-4 control/confirmation/revalidation UX, SA05-5 genuine Owner connected closure, SA06+, #315, permanent docs, deployment, Stage6 or production work.
