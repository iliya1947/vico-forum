# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; assembled implementation PR #388 open/unmerged.
2. Reviewed exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `6f154a2489913165c088dfa25a20818b62c13662`.
3. Final automated gate на этом head — PASS: CI #45926789854; 3342 standard + 1998 PostgreSQL tests; auth-whole-lifecycle 62/62; 20/20 applicable connected acceptance.
4. **AUTH-07 first whole-feature review Лены — HOLD / STOP.** Три current-scope defects зафиксированы в `stages/AUTH-07/REVIEW.md`.
5. Мира независимо перепроверила все три findings против root PLAN и actual source: **все три подтверждены**; Stage-6/future-only finding среди них нет.
6. Technical-plan correction не требуется: saved-locale contract в root PLAN однозначен и не superseded.
7. Активирован единый bounded correction route: `stages/AUTH-07-CORRECTION/PLAN.md`.
8. По прямой команде владельца **Лена / GPT-6.2 назначена исполнителем correction в assembled PR #388 вместо Лиры**. Лира STOP.
9. Поскольку Лена теперь участвует в implementation correction, она не выполняет review нового corrected head.
10. K5 correction остаётся accepted; без нового основания её не менять.
11. Марк / Codex-6 Sol не активирован. Independent gate, main merge, docs closeout и Stage-6 activation заблокированы.

## Следующий переход

Лена выполняет только bounded correction по `stages/AUTH-07-CORRECTION/PLAN.md` в #388 → author self-check → применимые exact-head CI/acceptance → `stages/AUTH-07-CORRECTION/RESULT.md` → STOP. После AUTHOR PASS новый stable head проходит whole-feature review Миры. Только после PASS Миры отдельным следующим переходом назначается Марк / Codex-6 Sol как independent final technical reviewer на том же exact head.