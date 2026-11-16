# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **Mira whole-package coordinator review:** PASS — 0 confirmed current-SA05 defects.
- **ACTIVE:** Лира / ChatGPT-6 independently reviews whole SA05 on the same exact head.
- **Mark:** not assigned yet; developer deferred him until later.
- **Developer override for next work:** after Lira finishes her SA05 review, **Lira may immediately start SA06 implementation on top of the current SA05 head**, without waiting for Mark or SA05 merge.
- **If SA05 changes later:** Lev handles SA05 fixes; Lira rebases/adapts dependent SA06 and reruns affected checks.
- **SA06 acceptance boundary:** dependent work may proceed early, but cannot be treated as accepted against main before the SA05 prerequisite is accepted/merged.
- **Merge:** developer only.
- **Boundary:** no SA07+, #315, deployment/Stage6/production/external work.
