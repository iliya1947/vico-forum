# WORKFLOW.md — текущее состояние и следующий переход

1. Собранный PR #388 открыт, stable exact `5d8bdaad117e59326f5eae61ea13613b0d45df7c`, tree `59901b92ce2753fb69adaa9c43ff09bbbcd70dba`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Предыдущий final technical review Лёвы — HOLD на `5b29469fe51e716b483d4e610dd90705f5409029` с F-B2-03/F-B2-04.
3. **AUTH-07-CORRECTION-2 Лены — AUTHOR SOURCE SELF-CHECK PASS / STOP.**
4. Мира проверила correction delta и exact-head evidence: **COORDINATOR RE-REVIEW PASS**. Отчёт: `stages/AUTH-07/COORDINATOR-REVIEW-2.md`.
5. Exact-head automated gate: CI SUCCESS (3347 standard, 1998 PostgreSQL, auth-whole-lifecycle 62/62); **20/20 applicable connected acceptance SUCCESS**; AUTH-02b correction markers, K5, AP-10 и SA08 PASS; failures/cancelled = 0.
6. **Лёва / Codex-6.1 Sol активирован на repeat owner-assigned final technical review** нового stable head. Задача: `stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2-PLAN.md`.
7. Лена STOP. Марк и Лира не подключаются; по решению владельца текущая техническая работа ведётся только Лёвой и Леной.
8. Merge, docs closeout и Stage-6 остаются заблокированы.

## Следующий переход

Лёва выполняет review-only на exact `5d8bdaad117e59326f5eae61ea13613b0d45df7c` → записывает `stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2.md` PASS/HOLD → STOP → возвращает Мире. Implementation во время review не менять.
