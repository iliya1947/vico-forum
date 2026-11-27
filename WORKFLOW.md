# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; final implementation PR #388 остаётся open/unmerged.
2. Stable final exact: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`, base main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `6f154a2489913165c088dfa25a20818b62c13662`.
3. Final automated gate — PASS: CI #45926789854; 3342 standard tests; 1998 PostgreSQL tests; auth-whole-lifecycle 62/62; 20/20 applicable connected acceptance; relevant failures/cancelled/in-progress = 0.
4. **AUTH-07 активирован. По прямому назначению владельца первый final whole-feature review выполняет Лена / GPT-6.2.**
5. Лена участвовала в AUTH-02a implementation и начинала AUTH-02b, поэтому её review **не является independent final technical review** и не закрывает обязательный independent gate.
6. Лира снята с AUTH-07 до начала review.
7. Scope Лены: whole AUTH-01–AUTH-06 + D-01–D-10, review-only, без implementation changes; findings классифицировать и пройти весь scope.
8. Handoff: `stages/AUTH-07/PLAN.md`.
9. При PASS Лена записывает `stages/AUTH-07/REVIEW.md` и STOP.
10. После PASS Лены отдельным следующим переходом назначается **Марк / Codex-6 Sol** как independent final technical reviewer на том же exact head. Марк пока не активирован.
11. При HOLD findings одним пакетом возвращаются в correction route; implementation changes требуют нового exact-head cycle.
12. Main merge, docs closeout и external/Stage-6 activation ещё не разрешены.

## Следующий переход

Лена выполняет first final whole-feature review exact `71cdb70d...` по `stages/AUTH-07/PLAN.md`. После PASS/HOLD — STOP и возврат Мире.
