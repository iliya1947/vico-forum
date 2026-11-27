# stages/README.md — индекс самостоятельных этапов authentication lifecycle

1. `AUTH-01/PLAN.md`, `AUTH-01/RESULT.md` — Mail foundation; coordinator PASS.
2. `AUTH-02a/PLAN.md`, `AUTH-02a/STORAGE-DECISION.md`, `AUTH-02a/RESULT.md` — lifecycle transaction/state/limits/constraints foundation; coordinator PASS.
3. `AUTH-02b/PLAN.md`, `AUTH-02b/RESULT.md` — mandatory email verification + resend + UI; coordinator PASS.
4. `AUTH-03/PLAN.md`, `AUTH-03/RESULT.md` — recovery/reset + authenticated password creation for Google-only; coordinator PASS.
5. `AUTH-04/PLAN.md`, `AUTH-04/RESULT.md` — own Account & security completion; coordinator PASS.
6. `AUTH-05/PLAN.md`, `AUTH-05/RESULT.md` — anti-abuse completion; corrected exact `dbbfe1c05...`, PASS.
7. `AUTH-06/PLAN.md`, `AUTH-06/RESULT.md`, `AUTH-06/REVIEW.md` — whole-lifecycle/security acceptance; exact `615d93598...`, PASS.
8. `FINAL-ASSEMBLY/PLAN.md`, `FINAL-ASSEMBLY/RESULT.md` — stack assembled in #388; substantive PASS, automated HOLD on K5.
9. `K5-CORRECTION/PLAN.md`, `K5-CORRECTION/RESULT.md` — correction implemented by Мира at `71cdb70d...`; targeted runtime verification pending.
10. AUTH-07 — only after corrected final assembly automated PASS + final whole-feature coordinator PASS.
