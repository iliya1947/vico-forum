# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.** This overrides default implementer routing for #331; independent-review requirements remain.
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1 checkpoint:** `213dc8bb6583439cd8ea7efbd9872e98aa638b36`; Lev author; Mira coordinator PASS,0 confirmed defects.
- **SA05-2 AUTHOR READY / Lev STOP:** stable exact head `8f3693a60bd627ac615defbb6b742f38a92fecfb`,4commits/19paths. [Whole-checkpoint handoff/evidence](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6917206647).
- **SA05-2 delivered:** trusted Worker/request context + dedicated protected POST action + strict request/error/cache contract + route acceptance; SA05-1 native behavior preserved.
- **Checks:** local+CI native1142/94files and app2454/191files PASS; targeted route/core69 and app110 PASS; real built Worker guest63smoke PASS; CI43871236043 and all applicable existing browser regression runs SUCCESS.14jobs/10runs, actual logs inspected. Unchanged Drizzle BigInt generator/exit0 remains non-proof; actual69-table manifest PASS.
- **ACTIVE NEXT:** Mira coordinator whole-SA05-2 checkpoint review on the exact head above. Confirmed current-checkpoint defects return to Lev in one packet.
- **Review independence:** Lev authored the implementation and cannot independently review it. Further independent reviewers are assigned separately at the applicable gate.
- **SA05 sequence:** command core → protected HTTP action → read-side/History → Owner UI → connected closure. Checkpoints are not merge units.
- **Boundary:** #337 stays cumulative Draft/unmerged. No SA05-3+, SA06+, #315, production/Stage6, permanent documentation or real Owner/Google SA05 connected acceptance is active. Existing browser regressions are not full-SA05/Owner visual/deployed acceptance.
