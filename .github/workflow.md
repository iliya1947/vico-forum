# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1 checkpoint:** stable head `213dc8bb6583439cd8ea7efbd9872e98aa638b36`; Лёва author; Mira coordinator PASS, 0 confirmed defects.
- **SA05 decomposition:** SA05-1 command core → SA05-2 protected HTTP action → SA05-3 read-side/History → SA05-4 Owner UI → SA05-5 connected closure. Checkpoints are not merge units.
- **ACTIVE:** Лира implements **SA05-2 only** on the same cumulative #337 branch. Whole SA05 architecture is already accepted; only current-main locator refresh is allowed before implementation.
- **SA05-2 deliverable:** trusted request-context/Worker construction + dedicated protected POST action + exact request/error/cache contract + route-level acceptance over the existing SA05-1 core.
- **NEXT after Lira AUTHOR READY:** Mira coordinator whole-SA05-2 checkpoint review on the new stable exact #337 head.
- **Review independence note:** Лёва authored SA05-1 inside cumulative #337 and therefore cannot be the independent whole-cumulative reviewer for that authored code; final reviewer assignment will follow AGENTS when the relevant review gate is reached.
- **Boundary:** #337 remains Draft/unmerged; no SA05-3+, SA06+, #315, deployment, Stage6, production or real Owner/Google connected acceptance during SA05-2.
