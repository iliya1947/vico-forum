# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** Лёва / Codex-6.1 Sol remains sole implementer until explicitly changed.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`, 6 commits / 44 paths / +2767/-24.
- **Implementation state:** whole SA05 AUTHOR READY; Lev AUTHOR STOP.
- **Mira whole-package coordinator review:** **PASS — 0 confirmed current-SA05 defects** on the same exact head.
- **Evidence:** CI 43893277138 SUCCESS (app2473/192, native1311/96, 69-table manifest, runtime probes); whole connected 43893277198 SUCCESS (actual Worker + Better Auth + PG17 + local R2 + Chromium); native writer closure159/159.
- **Current state:** STOP after coordinator PASS. #337 remains Draft/open/unmerged and implementation head must stay stable.
- **NEXT only after developer continuation:** independent whole-SA05 reviews by **Лира and Марк** on exact `a465cbd379b9c3f92b504658001c698bce3fa505`. Lev is ineligible as author.
- **After both independent PASS:** developer merge decision for #337; do not activate SA06 before accepted whole-SA05 package/merge boundary.
- **Boundary:** no SA06+, #315, deployment/Stage6/production/external work or permanent docs. Developer visual/deployed acceptance is not claimed here.
