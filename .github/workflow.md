# Admin panel — current workflow

- Service PR: **#251**. **Current stage: SA-03 implementation merged; docs-only PR #326 corrected after independent factual review; fresh independent re-review pending.**
- Implementation PR **#324** merged from reviewed exact head `4ad17beae65da338f5efcb2a1596e7fafc3b67c5` into main merge `5992885e78b1642e41c9805116fcc256002b649c`.
- Docs-only PR **#326** remains open, exact current head `9714e06c2d6030b26a54d6c1287255226c4c186a`.
- Lira's prior independent review on `dc9f846bf1fd4224b600fccfa3528f9a518fb8bd` found two current-scope documentation defects, both in `docs/ADMIN_PANEL.md`.
- Mira applied only the two requested documentation corrections in `docs/ADMIN_PANEL.md`; no other file in #326 was changed by the correction.
- **SA03-DOC-LIRA-01 / -02 are corrected by author but remain pending independent verification.**
- **Assigned next: Lira — fresh independent factual whole-PR re-review of #326 on exact head `9714e06c2d6030b26a54d6c1287255226c4c186a`.**
- Review only: verify both prior findings and sweep the full 9-file docs diff for any remaining current-scope factual/documentation defect; report all findings or PASS, then STOP. Do not edit #326 during review.
- No ordinary code/test CI is used as proof of documentation correctness.
- No SA-04+, deactivation, Stage6/production, #315 activation, broad security remediation or future journal-storage work. Lev and Mark unassigned.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
