# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main/base:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Whole-SA06 implementation:** cumulative Draft #338, reviewed exact head `522951ec164fda237b52e9777de846e32e86d47d`.
- **Completed reviews on that head:**
  - Lira / ChatGPT-6: FAIL — confirmed AP-10 effective-count defect in `administration.measures`.
  - Mira / ChatGPT-5.6 Sol: FAIL — confirmed incomplete SA06 History filter foundation.
  - Mark / Codex-6 Sol: FINDING — independently confirmed the same History filter foundation defect.
- **Confirmed unique current-SA06 defects:** 2.
- **Developer reassignment:** the corrective package is assigned to **Lira / ChatGPT-6**, not Lev.
- **ACTIVE implementer:** **Lira fixes both confirmed defects in #338 as one corrective package.**
- **Lev / Codex-6.1 Sol:** corrective implementation assignment superseded; WAIT. He remains original SA06 author and is not an independent reviewer of the corrected head.
- **Correction 1:** complete the accepted SA06 History filter foundation: typed/query support for `origin`, `kind`, `from`, `until`; v2 cursor binding/validation; compatible source-branch predicate pushdown before branch LIMIT; preserve compatible old cursors. SA08 UI controls remain out of scope.
- **Correction 2:** make `administration.measures` effective and per-restriction counts follow actual AP-10 applicability, including the raw-authority-floor rule for administrative restrictions; active count may remain while effective/admin-key counts cease to apply after authority changes.
- **Acceptance:** focused PostgreSQL proof for both defects plus applicable/full SA06 acceptance required by changed code. Then one new stable exact head and WHOLE SA06 AUTHOR READY.
- **Fresh review after correction:** Mira coordinator whole-SA06 review first; after Mira PASS, Mark is the independent non-author reviewer. Lira and Lev are ineligible as independent reviewers of the corrected head because both authored SA06 implementation.
- **Boundary:** no merge #338, no SA07+, permanent docs, #315, Stage6/production/deploy/external work before the new review cycle passes.
