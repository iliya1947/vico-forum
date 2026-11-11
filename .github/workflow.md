# Admin panel — current workflow

- Service PR: **#251**. Current stage: **SA-03 implementation #324 merged; docs-only PR #326 independently factually reviewed PASS; Owner-merge coordination pending.**
- Implementation PR **#324** merged from exact reviewed head `4ad17beae65da338f5efcb2a1596e7fafc3b67c5` into main merge `5992885e78b1642e41c9805116fcc256002b649c`.
- Docs-only PR **#326** remains **open/unmerged** at exact stable reviewed head `9714e06c2d6030b26a54d6c1287255226c4c186a` (9 Markdown files).
- **Lira independent factual whole-PR repeat review: PASS — 0 open confirmed current-scope docs defects.** Previous `SA03-DOC-LIRA-01` (current permission/recovery boundaries) and `SA03-DOC-LIRA-02` (AP-11 historical scope) both independently verified **CLOSED**. Only `docs/ADMIN_PANEL.md` changed after first review; other eight docs blobs identical.
- **Lira STOP. Assigned next: Mira**, coordinator closeout of independent PASS and handoff of exact stable docs PR #326 for **developer/Owner merge**, without claiming self-review. Mira authored #326; developer alone merges. Any docs-head change invalidates this exact-head review.
- Docs CI is not the factual correctness gate. No SA-04+, deactivation, Stage6/production, #315 activation, broad security remediation or future journal-storage work. Lev/Mark unassigned.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
