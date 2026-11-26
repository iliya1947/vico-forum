# stages/README.md — индекс самостоятельных этапов authentication lifecycle

1. `AUTH-01/PLAN.md`, `AUTH-01/RESULT.md` — Mail foundation; coordinator PASS.
2. `AUTH-02a/PLAN.md`, `AUTH-02a/STORAGE-DECISION.md`, `AUTH-02a/RESULT.md` — lifecycle transaction/state/limits/constraints foundation; coordinator PASS.
3. `AUTH-02b/PLAN.md`, `AUTH-02b/RESULT.md` — mandatory email verification + resend + UI; coordinator PASS.
4. `AUTH-03/PLAN.md`, `AUTH-03/RESULT.md` — recovery/reset + authenticated password creation for Google-only; coordinator PASS.
5. `AUTH-04/PLAN.md`, `AUTH-04/RESULT.md` — own Account & security completion; coordinator PASS on corrected exact head.
6. `AUTH-05/PLAN.md`, `AUTH-05/RESULT.md` — anti-abuse completion; coordinator PASS.
7. AUTH-06 — следующая stacked-ступень, whole-lifecycle/security acceptance; активируется отдельным переходом.
8. AUTH-07 — финальный review/security gate, не обычная implementation-ступень.
