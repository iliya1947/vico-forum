# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **Mira whole-package coordinator review:** PASS — 0 confirmed current-SA05 defects.
- **Lira independent whole-SA05 review:** PASS — 0 confirmed current-SA05 defects on the same exact head.
- **ACTIVE SA05:** **Mark / Codex-6 Sol independently reviews whole SA05** on exact `a465cbd379b9c3f92b504658001c698bce3fa505`. Lev is ineligible as author.
- **ACTIVE SA06 in parallel:** **Lev / Codex-6.1 Sol implements SA06** on a dependent branch/PR based on current SA05 head `a465cbd379b9c3f92b504658001c698bce3fa505`, without waiting for Mark or SA05 merge.
- **Lira:** reviewer role complete for SA05; not assigned SA06 implementation.
- **If SA05 changes:** Lev fixes SA05 and updates/rechecks the dependent SA06 work against the corrected SA05 head.
- **SA05 merge:** developer only, after Mark's result and the completed whole-SA05 review chain.
- **SA06 acceptance boundary:** dependent implementation may proceed early, but cannot be treated as accepted against main before its SA05 prerequisite is accepted/merged.
- **Boundary:** no SA07+, #315, deployment/Stage6/production/external work or permanent docs.
