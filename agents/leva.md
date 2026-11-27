# agents/leva.md — личная рабочая память Лёвы

## Текущее назначение

**Repeat AUTH-07 owner-assigned final technical review.**

1. PR #388 stable exact: `5d8bdaad117e59326f5eae61ea13613b0d45df7c`.
2. Previous HOLD head: `5b29469fe51e716b483d4e610dd90705f5409029`; findings F-B2-03/F-B2-04.
3. Correction-2 Лены меняет только reset page + AUTH-02b browser regression; Мира coordinator re-review PASS.
4. Вход: `WORKFLOW.md` → `stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2-PLAN.md` → при необходимости предыдущий `FINAL-TECHNICAL-REVIEW.md`.
5. Exact-head CI и 20/20 applicable connected acceptance SUCCESS; повторно не запускать без нового основания.
6. Review-only: implementation не менять.
7. Проверить closure двух findings и affected invariants; unchanged feature не перепроверять механически без причины.
8. Результат: `stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2.md` PASS/HOLD → STOP → Мира.
9. Поскольку Лёва участвовал в AUTH-06 implementation, verdict не называть independent PASS.
10. Merge/docs/Stage-6 не выполнять.
