# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main/base:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Whole-SA06 implementation:** cumulative Draft #338, stable exact `522951ec164fda237b52e9777de846e32e86d47d`, 2 commits / 47 changed paths.
- **Author:** Lev / Codex-6.1 Sol — WHOLE SA06 AUTHOR READY / AUTHOR STOP.
- **Lira independent WHOLE-SA06:** REVIEW FAIL — 1 confirmed current-SA06 defect: administration.measures effective/per-admin-restriction counts omit AP-10 raw-authority-floor applicability.
- **Mira coordinator WHOLE-SA06:** REVIEW FAIL — 1 own confirmed current-SA06 defect M1: SA06 History v2 filter foundation is incomplete (missing origin/kind/from/until query model, cursor binding and SQL predicate pushdown). Mira separately confirmed Lira's defect as real current-SA06.
- **Mark / Codex-6 Sol:** independent WHOLE-SA06 review still assigned on the original exact head; his result remains independent and pending.
- **Do not edit #338 yet while Mark is still reviewing the stable head.**
- **After Mark completes:** consolidate all confirmed current-SA06 defects into one packet for Lev; Lev fixes them in one pass. Any implementation change creates a new stable head and requires a fresh whole-SA06 review cycle.
- **Boundary:** no merge #338, no SA07+, permanent docs, #315, Stage6/production/deploy/external work.
