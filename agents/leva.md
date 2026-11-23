# agents/leva.md — F2 checks in progress

F1 accepted by Mira: Draft #379 / feat/forum-structure-f1 / exact `8227db6003f5a23a369e11b645194da229315f7a`, unmerged. Реализовал только F2, stacked Draft #380 с этой base; F2 head `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, branch feat/forum-structure-f2. Всего 4 файла, migrations/F1 не менялись. Plan/report: stages/forum-structure/PLAN.md / F2_REPORT.md.

PostgresStructureWriter + native last-write appendStructureHistory: all7 ordinary structure operations, global mutex/CAS, parent NKU→actor→History, precise raw DB/request permission/AP-10/active/Owner guards; bigint strings/name validation/global neighbor/no-op/overflow. Нет live wiring/routes/readers/topic move/Owner projection.

Локально PASS:36 PG17 tests,37 unit,typecheck,lint,migration guard(0 new migrations). PG tests доказывают actual row-lock blockers, same-version races/revoke/AP10/deactivation обеих очередностей+no-op/publication FK compatibility, all7 web-role commands и negative DELETE/singleton INSERT/DDL, all7 History rollback cases. CI/acceptance labels запрошены на #380; **дождаться всех applicable exact-head результатов**, устранить current-task failures, обновить report/workflow/memory/PR body → Мира bounded coordinator checkpoint. Пока gate не передан.

После авторского F2 gate STOP, F3+ не начинать без Mira PASS/назначения; F1/F2 не merge. Final independent whole-feature reviewer — Марк, если остаётся code-independent. #342 единственный service channel; #300/Stage6/deploy/general UI/UX inactive.

Локально /workspace/work/visibility-review — собственная F2 branch, clean; временный node_modules symlink удалён. Dependencies /workspace/work/vico-forum/node_modules, executable напрямую вместо pnpm wrapper. Docker vico-title-edit-pg запущен мной (изначально stopped), disposable DB vico_f2_test; после завершения удалить только эту DB и вернуть container stopped. Не трогать fixed старые роли и другие worktrees. Network доступен.
