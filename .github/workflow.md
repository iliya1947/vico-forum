# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main/base:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **Whole-SA06 implementation:** cumulative Draft #338, reviewed exact head `522951ec164fda237b52e9777de846e32e86d47d`.
- **Review results on that head:**
  - Lira / ChatGPT-6: FAIL — confirmed AP-10 effective-count defect in `administration.measures`.
  - Mira / ChatGPT-5.6 Sol: FAIL — confirmed incomplete SA06 History filter foundation.
  - Mark / Codex-6 Sol: FINDING — independently confirmed the same History filter foundation defect.
- **Confirmed unique current-SA06 defects:** 2.
- **ACTIVE:** Lev / Codex-6.1 Sol fixes both defects in #338 as one corrective package.
- **Correction 1:** complete the accepted SA06 History filter foundation: typed/query support for `origin`, `kind`, `from`, `until` in addition to existing scope; v2 cursor binding/validation; compatible source-branch predicate pushdown before branch LIMIT; preserve compatible old cursors. SA08 UI controls remain out of scope.
- **Correction 2:** make `administration.measures` effective and per-restriction counts follow actual AP-10 applicability, including the raw-authority-floor rule for administrative restrictions; active count may remain while effective/admin-key counts cease to apply after authority changes.
- **Acceptance for correction:** add focused PostgreSQL proof for both defects and rerun affected/full SA06 acceptance required by changed code. When complete, publish one new stable exact head and WHOLE SA06 AUTHOR READY.
- **After code changes:** fresh whole-SA06 review cycle is required on the new exact head. No merge #338 and no SA07+ before that cycle passes.
- **Boundary:** no permanent docs, #315, Stage6/production/deploy/external work.
