# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; assembled implementation PR #388 open/unmerged.
2. Stable exact: `5b29469fe51e716b483d4e610dd90705f5409029`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. AUTH-07 bounded correction Лены завершён AUTHOR SOURCE SELF-CHECK PASS / STOP.
4. Exact-head automated gate подтверждён: CI SUCCESS; 3347 standard + 1998 PostgreSQL tests; **20/20 applicable connected acceptance SUCCESS**.
5. **Whole-feature coordinator review Миры — PASS.** Подробности: `stages/AUTH-07/COORDINATOR-REVIEW.md`.
6. Все три прежних AUTH-07 findings закрыты; новых current-scope blockers в correction delta не подтверждено.
7. По прямой команде владельца следующий reviewer — **Лёва / Codex-6.1 Sol**. Марк и Лира из текущего маршрута исключены; до отдельного решения владельца работаем только с Лёвой и Леной.
8. Лёва участвовал в AUTH-06 implementation, поэтому его следующий review является **owner-assigned final technical review**, а не independent whole-feature review по стандартному workflow.
9. Лена STOP после correction; она не review собственную implementation.
10. Main merge, docs closeout и Stage-6 activation остаются заблокированы до отдельного следующего решения владельца после результата Лёвы.

## Следующий переход

**Лёва активирован** на final technical review exact `5b29469fe51e716b483d4e610dd90705f5409029`. Вход: `stages/AUTH-07/FINAL-TECHNICAL-REVIEW-PLAN.md` → `stages/AUTH-07/COORDINATOR-REVIEW.md` → актуальный root PLAN/source-of-truth по необходимости. Review-only: implementation не менять. Результат записать в `stages/AUTH-07/FINAL-TECHNICAL-REVIEW.md` как PASS/HOLD → STOP → вернуть Мире.
