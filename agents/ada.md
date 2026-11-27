# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Активное назначение

**K5-CORRECTION — test/evidence-only correction final assembled PR #388.**

Мира приняла FINAL-ASSEMBLY HOLD и независимо подтвердила synchronization defect K5: product operationId стартует пустым и получает UUID только в React effect, а тест читает hidden value сразу после form visibility. Successful #395 и failed #388 используют один SHA и идентичные K5/test/product blobs; branch/base-dependent path не найден.

Полный scope и Done: `stages/K5-CORRECTION/PLAN.md`.

Граница: не менять product/runtime/schema/dependencies. Исправить только test/evidence synchronization и diagnostics без ослабления 33-case matrix. Сначала targeted K5 на новом exact head. При PASS — один final run:ci + run:acceptance #388; при failure — HOLD/STOP без blind retry. После полного PASS — RESULT и STOP для Миры.

AUTH-07, independent review, merge и Stage-6 не начинать.
