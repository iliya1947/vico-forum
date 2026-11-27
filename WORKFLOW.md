# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; final implementation PR #388 остаётся open/unmerged.
2. Stable final exact: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`, base main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `6f154a2489913165c088dfa25a20818b62c13662`.
3. K5 correction — test/evidence-only; product/runtime/schema/dependencies/workflow unchanged.
4. Final automated gate — PASS:
   - CI #45926789854 SUCCESS;
   - 3342 standard tests PASS;
   - 1998 PostgreSQL tests PASS;
   - auth-whole-lifecycle 62/62 PASS;
   - 20/20 applicable connected acceptance SUCCESS;
   - relevant failures/cancelled/in-progress = 0.
5. Мира authored final K5 correction и не может independently whole-feature-review собственный final head.
6. Лёва и Ада участвовали в implementation и не подходят для independent final review.
7. Лира не участвовала в auth implementation: её AUTH-01 assignment был снят до начала реализации.
8. **AUTH-07 активирован. Первый final whole-feature review назначен Лире / GPT-6.**
9. Handoff: `stages/AUTH-07/PLAN.md`.
10. Review-only: implementation не менять; findings классифицировать по current-scope/future-only; первый finding не завершает review.
11. При PASS Лира записывает `stages/AUTH-07/REVIEW.md` и STOP.
12. Следующий отдельный route после PASS Лиры — Марк / Codex-6 Sol как independent final technical reviewer на том же exact head. Марк пока не активирован.
13. При HOLD findings одним пакетом возвращаются в correction route; любые implementation changes требуют нового exact-head cycle.
14. Main merge, docs closeout и external/Stage-6 activation ещё не разрешены.

## Следующий переход

Лира выполняет final whole-feature review exact `71cdb70d...` по `stages/AUTH-07/PLAN.md`. После PASS/HOLD — STOP и возврат Мире.
