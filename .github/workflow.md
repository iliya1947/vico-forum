# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** **Лёва / Codex-6.1 Sol is the sole implementer for all further implementation work in this service task until the developer explicitly changes that decision.** This concrete assignment overrides default implementer routing for #331; it does not waive independent-review requirements.
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **SA05-1 checkpoint:** stable head `213dc8bb6583439cd8ea7efbd9872e98aa638b36`; Лёва author; Mira coordinator PASS, 0 confirmed defects.
- **SA05 decomposition:** SA05-1 command core → SA05-2 protected HTTP action → SA05-3 read-side/History → SA05-4 Owner UI → SA05-5 connected closure. Checkpoints are not merge units.
- **ACTIVE:** Лёва implements **SA05-2 only** on the same cumulative #337 branch.
- **SA05-2 deliverable:** trusted request-context/Worker construction + dedicated protected POST action + accepted request/error/cache contract + route-level acceptance over the existing SA05-1 core.
- **NEXT after Lev AUTHOR READY:** Mira coordinator whole-SA05-2 checkpoint review on the new stable exact #337 head.
- **Review independence:** Лёва is implementation author and cannot serve as independent reviewer for his authored implementation. Independent reviewers are assigned separately at the applicable gate.
- **Boundary:** #337 stays Draft/unmerged; no SA05-3+, SA06+, #315, deployment, Stage6, production or real Owner/Google connected acceptance during SA05-2.
