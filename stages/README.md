# stages/README.md — индекс самостоятельных этапов authentication lifecycle

1. `AUTH-01/PLAN.md`, `AUTH-01/RESULT.md` — Mail foundation; coordinator PASS.
2. `AUTH-02a/PLAN.md`, `AUTH-02a/STORAGE-DECISION.md`, `AUTH-02a/RESULT.md` — lifecycle transaction/state/limits/constraints foundation; coordinator PASS.
3. `AUTH-02b/PLAN.md`, `AUTH-02b/RESULT.md` — mandatory email verification + resend + UI; coordinator PASS.
4. `AUTH-03/PLAN.md`, `AUTH-03/RESULT.md` — recovery/reset + authenticated password creation for Google-only; coordinator PASS.
5. `AUTH-04/PLAN.md`, `AUTH-04/RESULT.md` — own Account & security completion; coordinator PASS.
6. `AUTH-05/PLAN.md`, `AUTH-05/RESULT.md` — anti-abuse completion; corrected exact `dbbfe1c05...`, PASS.
7. `AUTH-06/PLAN.md`, `AUTH-06/RESULT.md`, `AUTH-06/REVIEW.md` — whole-lifecycle/security acceptance; accepted pre-assembly exact `615d93598...`.
8. `FINAL-ASSEMBLY/PLAN.md`, `FINAL-ASSEMBLY/RESULT.md` — stack assembled in #388.
9. `K5-CORRECTION/PLAN.md`, `K5-CORRECTION/RESULT.md` — final exact `71cdb70d...`; targeted K5 PASS; final CI + 20/20 applicable acceptance PASS.
10. Final whole-feature review — blocked pending owner assignment of a qualifying non-implementer because Мира authored the K5 correction.
11. AUTH-07 — only after required final whole-feature review cycle on the same stable exact head.
