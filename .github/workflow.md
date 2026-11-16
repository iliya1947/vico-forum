# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Cumulative SA05 implementation PR:** Draft #337, branch `chatgpt/sa05-owner-deactivation`.
- **Stable exact head:** `213dc8bb6583439cd8ea7efbd9872e98aa638b36`; 3 commits / 5 paths; behind main 0; exact-head CI 43861391964 SUCCESS.
- **SA05 decomposition:** SA05-1 command core → SA05-2 protected HTTP action → SA05-3 read-side/History → SA05-4 Owner UI → SA05-5 connected closure. Checkpoints are not merge units.
- **SA05-1:** Лёва AUTHOR READY; Мира coordinator whole-checkpoint review **PASS, 0 confirmed current-scope defects**.
- **Current state:** STOP after completed SA05-1 checkpoint. #337 stays Draft/unmerged.
- **NEXT only after explicit developer continuation:** assign/activate SA05-2 on the same cumulative #337 branch/head lineage.
- **Boundary:** no merge at this checkpoint; no SA05-3+, SA06+, #315, deployment, Stage6, production or real Owner/Google external acceptance.
