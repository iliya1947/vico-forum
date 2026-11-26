# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. AUTH-01→AUTH-06 stacked implementation завершён до final assembly.
3. AUTH-05 / #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — PASS; F01 закрыт.
4. AUTH-06 / #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f` — AUTHOR PASS + whole-feature COORDINATOR PASS; CI и 20/20 applicable connected acceptance PASS; current-scope blockers = 0.
5. Current main и base первого PR #388: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
6. **FINAL ASSEMBLY активирована. Исполнитель — Ада / Business GPT-6.2 по прямому назначению владельца.**
7. Handoff: `stages/FINAL-ASSEMBLY/PLAN.md`.
8. Ада собирает accepted final AUTH-06 state в первый implementation PR #388, затем закрывает #389/#391/#392/#393/#394/#395 как superseded и выполняет final author self-check + applicable exact-head CI/acceptance на assembled #388.
9. Если main сдвинулся, assembled tree отличается от accepted stack или найден product defect — HOLD/evidence и STOP; не исправлять попутно в assembly.
10. После assembly PASS Ада STOP. Следующий gate — final whole-feature coordinator review Миры на stable exact head.
11. Лёва участвовал в AUTH-06, Ада — в AUTH-05 correction/final assembly; оба исключены из independent final reviewer.
12. AUTH-07, merge #388 в main и external/Stage-6 activation ещё не разрешены.

## Следующий переход

Ада выполняет только `FINAL-ASSEMBLY` по stage plan. При PASS записывает `stages/FINAL-ASSEMBLY/RESULT.md`, final exact head/tree и фактические CI/acceptance results, затем STOP для Миры. AUTH-07 самостоятельно не начинать.
