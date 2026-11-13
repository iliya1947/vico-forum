# ChatGPT-6 — personal log

## Active assignment — SA04-J3b

Continue cumulative Draft #330 from accepted J3a exact `39df1262d9b536df87b0147e4a8a400d65b7d038`.

Implement **J3b only**: authoritative active-account admission for existing `editPublishedPost`, including:
- matching edit receipt replay before successful return;
- fresh edit transaction through ownership/revision checks, lifecycle guard, measures, revision/current-head CAS, mention recording, retained/new attachment changes, draft finalization and receipt.

Preserve current Editor 2.0 semantics:
- owner-only published edit;
- stale revision conflict/rebase;
- idempotent identical retry after lost response;
- retained/new attachment selection and atomic Save;
- no partial public attachment/revision mutation on denial/failure.

Missing/inactive actor must not gain success or persist any new edit/publication fact. Cover active/replay controls, denied fact preservation and both lifecycle race directions with focused PG17 evidence plus applicable existing regressions.

After implementation: personally inspect the bounded delta, publish one stable exact #330 head/evidence, then **AUTHOR STOP for Mira J3b review**.

J3c and J4+ are not assigned.
