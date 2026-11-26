# stages/README.md — индекс самостоятельных этапов authentication lifecycle

1. `AUTH-01/PLAN.md`, `AUTH-01/RESULT.md` — Mail foundation; coordinator PASS.
2. `AUTH-02a/PLAN.md`, `AUTH-02a/STORAGE-DECISION.md`, `AUTH-02a/RESULT.md` — lifecycle transaction/state/limits/constraints foundation; coordinator PASS.
3. `AUTH-02b/PLAN.md`, `AUTH-02b/RESULT.md` — mandatory email verification + resend + UI; coordinator PASS.
4. `AUTH-03/PLAN.md`, `AUTH-03/RESULT.md` — recovery/reset + authenticated password creation for Google-only; coordinator PASS.
5. `AUTH-04/PLAN.md`, `AUTH-04/RESULT.md` — own Account & security completion; coordinator PASS.
6. `AUTH-05/PLAN.md`, `AUTH-05/RESULT.md` — anti-abuse completion; corrected exact `dbbfe1c05...`, AUTHOR PASS + COORDINATOR PASS after F01 correction.
7. `AUTH-06/PLAN.md`, `AUTH-06/RESULT.md`, `AUTH-06/REVIEW.md` — whole-lifecycle/security acceptance; previous head superseded as final stack evidence by corrected AUTH-05. Pending separate sync/reverification activation.
8. AUTH-07 — final pre-Stage-6 security gate only after corrected assembled AUTH-06 whole-feature coordinator PASS.
