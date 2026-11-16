# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **Mira whole-package coordinator review:** PASS — 0 confirmed current-SA05 defects.
- **Lira independent whole-SA05 review:** PASS — 0 confirmed current-SA05 defects on the same exact head.
- **ACTIVE SA05:** **Mark / Codex-6 Sol independently reviews whole SA05** on exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **If Mark PASS:** developer merges #337. Merge is developer-only.
- **Lev:** WAIT for SA05 review completion and merge. After #337 is merged, refresh against the new `main` and continue SA06 implementation.
- **If Mark finds current-SA05 defects:** return one complete packet to Mira/Lev; Lev fixes SA05, then the whole-SA05 review cycle is rerun on the new stable exact head before merge.
- **Boundary:** no SA06 implementation before SA05 merge; no SA07+, #315, deployment/Stage6/production/external work or permanent docs.
