# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; assembled implementation PR #388 open/unmerged.
2. Stable exact: `5b29469fe51e716b483d4e610dd90705f5409029`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. AUTH-07 bounded correction Лены завершён AUTHOR SOURCE SELF-CHECK PASS / STOP.
4. Exact-head automated gate подтверждён: CI SUCCESS; 3347 standard + 1998 PostgreSQL tests; **20/20 applicable connected acceptance SUCCESS**.
5. **Whole-feature coordinator review Миры — PASS.** Подробности: `stages/AUTH-07/COORDINATOR-REVIEW.md`.
6. Все три прежних AUTH-07 findings закрыты; новых current-scope blockers в correction delta не подтверждено.
7. Лена участвовала в implementation correction и не является reviewer corrected head.
8. Лира STOP.
9. **Марк / Codex-6 Sol — следующий independent final technical reviewer, но пока не активирован.**
10. Main merge, docs closeout и Stage-6 activation остаются заблокированы до independent PASS.

## Следующий переход

По отдельной команде владельца активировать Марка / Codex-6 Sol на independent final technical review exact `5b29469fe51e716b483d4e610dd90705f5409029`. Вход: `stages/AUTH-07/COORDINATOR-REVIEW.md` → `stages/AUTH-07/PLAN.md` и актуальный root PLAN по необходимости. Марк не меняет implementation во время review и возвращает PASS/HOLD Мире.
