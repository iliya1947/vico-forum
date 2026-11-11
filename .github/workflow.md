# Admin panel — current workflow

- Service PR: **#251**. **Current stage: SA-03 implementation merged; factual documentation PR #326 independent review CHANGES REQUIRED.**
- Implementation PR **#324** merged from reviewed exact head `4ad17beae65da338f5efcb2a1596e7fafc3b67c5` into main merge `5992885e78b1642e41c9805116fcc256002b649c`.
- Docs-only PR **#326** remains **open, unchanged, unmerged**, exact reviewed head `dc9f846bf1fd4224b600fccfa3528f9a518fb8bd`, exactly 9 Markdown files.
- **Lira independent factual whole-PR review: CHANGES REQUIRED — two confirmed current-scope documentation defects in `docs/ADMIN_PANEL.md`**:
  1. **SA03-DOC-LIRA-01 (P2)**: current Users/measure admission matrix says `admin.users.read` gates general detail, and stale post-403/recovery wording makes canonical profile/authorization contingent on Users-read. Merged canonical route has independent public/measures/authorization/Owner gates; directory permission gates only index and guarded legacy redirect.
  2. **SA03-DOC-LIRA-02 (P3)**: AP-11 historical connected check is incorrectly relabeled as checking SA-03 canonical profile; AP-11 actually exercised former `AdminUserDetail` in #292, canonical composition came later in #324.
- No implementation or test defect asserted; no other current-scope doc findings confirmed in the reviewed diff. Nine-file docs PR was **not edited** by reviewer. CI green is not a factual gate.
- **Lira STOP. Next recipient: Mira**, author/coordinator, for a **single bounded docs-only correction** of the two findings in existing #326. Mira must not self-review the resulting head. After correction and a new stable exact head, route another independent factual review to Lira; no merge/close/replacement without applicable review and developer authority.
- No SA-04+, account deactivation, Stage6/production, #315 activation, broad security remediation or future journal-storage work. Lev and Mark unassigned.


## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
