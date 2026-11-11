# Admin panel — current workflow

- Service PR: **#251**.
- **Current stage: SA-03 implementation merged; factual documentation closeout pending.**
- Implementation PR **#324** is merged into `main` from exact reviewed head `4ad17beae65da338f5efcb2a1596e7fafc3b67c5`; merge commit `5992885e78b1642e41c9805116fcc256002b649c`.
- Mira-authored docs PR **#326** remains open only as an erroneous non-authoritative draft. It is not the active docs implementation and must not be merged or used as the source of truth for the replacement work.
- Correct recovery is non-destructive: leave #326 untouched until a proper replacement exists.
- **Assigned now: Lira — SA03-DOC-A only.** Start a fresh docs-only PR from current `main` and update only `PROJECT_STATE.md` to the factual post-SA-03 state. Publish the PR/head and STOP.
- This first subtask must not change any other project file and must not start SA-04+, deactivation, Stage6/production, #315 activation, broad security remediation or deferred journal-storage work.
- Mira reviews SA03-DOC-A after Lira STOP. Lev and Mark remain unassigned.
- **Handoff granularity gate:** only one bounded docs result is assigned; later docs files are separate continuations after explicit developer continuation.
