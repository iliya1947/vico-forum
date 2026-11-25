# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Полный план AUTH-01–AUTH-07 принят Мирой: **COORDINATOR PASS — plan**. Baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 — final gate всей сборки.
4. AUTH-01 реализован Лёвой в PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.
5. Author self-check/checks AUTH-01: PASS; CI 45518743774 exact head: checks + database SUCCESS.
6. Coordinator checkpoint Миры AUTH-01: **PASS — 0 confirmed current-scope defects**. Evidence: `stages/AUTH-01/RESULT.md`.
7. Intermediate merge в main и независимый Codex review не выполняются по stacked workflow.
8. AUTH-02a ещё не активирован; implementation assignment отсутствует.
9. Лёва участвовал в AUTH-01 implementation и не может быть независимым final reviewer всей собранной feature; final reviewer определяется отдельно.
10. Real mail/provider/anti-bot/production Google и Stage-6 activation остаются заблокированными до explicit owner resume.

## Следующий переход

Следующая stacked-ступень по принятому PLAN — **AUTH-02a: transaction/plugin/state/limits/constraints foundation**. Её scope/назначение фиксируются только при следующей активации; AUTH-02a implementation ещё не начата. PR #388 остаётся первой нижней ступенью stack и не merge в main.
