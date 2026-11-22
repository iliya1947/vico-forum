# agents/lira.md — B9 final exact-head author self-check; STOP before fold

## Accepted base

- B8-A/B/C coordinator PASS.
- Existing Draft #376 pre-B9 exact `108e0ba31ed34f891e8b46e411991b893b9da56b`, stacked on accepted B7 #371 `f92778606f1c8ea4e64f53c1660910f34c48b84c`.
- Continue in the same B8 branch; no new implementation PR.

## Current assignment — B9 only

Perform the final author closeout of the complete B8 PR on one stable exact SHA.

Done criteria:

1. Reconcile the complete #376 diff and V1–V9/B8 acceptance matrix; confirm no unauthorized Stage6/deploy/docs/product-scope changes.
2. On the final exact SHA, obtain final lint/typecheck/unit/full PostgreSQL/build/preview plus migration-history/metadata/schema-manifest/runtime privilege/provisioning evidence required by current CI.
3. Run/confirm the dedicated connected Worker + Better Auth + Chromium + local-R2 visibility acceptance on that same final SHA; do not combine evidence from different heads.
4. If a real current-stage defect appears, correct only that defect and rerun affected final evidence.
5. Record final exact SHA, scope and complete check/workflow evidence in #376 and service #342.

**Mandatory STOP after B9 author self-check.** No stack fold, intermediate PR closure, Mira whole-feature review, Leva review, merge, docs closeout or deploy.
