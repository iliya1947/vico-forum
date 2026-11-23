# agents/leva.md — F2 author gate PASS, STOP

F1 coordinator accepted: Draft #379 / feat/forum-structure-f1 / exact `8227db6003f5a23a369e11b645194da229315f7a`, unmerged. Реализовал только F2: stacked Draft #380 с этой base; F2 stable head `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, branch feat/forum-structure-f2. 4 файла, F1/schema/migrations/grants не менялись. Канонический plan/report: stages/forum-structure/PLAN.md / F2_REPORT.md.

Final exact-head [CI45235340129](https://github.com/iliya1947/vico-forum/actions/runs/45235340129) PASS с первой попытки: 3010 unit,1743 PG17,lint/typecheck,build/UI-preview build,schema parity/manifest75/runtime ACL/provisioning/credential/Worker smoke. Все4 applicable path-filtered acceptance (title,Watch,Bookmarks,Mute/Block) PASS.

PostgresStructureWriter + native last-write appendStructureHistory: all7 ordinary structure operations, global mutex/CAS, parent NKU→actor→History, raw DB/request permission/AP-10/active/Owner guards; bigint strings/name validation/global neighbor/no-op/overflow. PG tests доказывают actual acquired row locks + pg_blocking_pids, same-version races/revoke/AP10/deactivation обеих очередностей+no-op/publication FK compatibility, all7 web-role commands, negative DELETE/singleton INSERT/DDL, all7 History rollback cases. Локально36 PG/37 unit +type/lint/migration guard PASS.

**Следующая Мира — bounded F2 coordinator checkpoint** на этом exact head. Лёва STOP; F3+ не начинать до её PASS/назначения. F1/F2 не merge отдельно. Нет live wiring/routes/readers/topic move/Owner projection. Final independent whole-feature reviewer — Марк, если остаётся code-independent. #342 единственный service channel; #300/Stage6/deploy/general UI/UX inactive.

Локально /workspace/work/visibility-review — чистая собственная F2 branch. Временный node_modules symlink удалён; dependencies /workspace/work/vico-forum/node_modules, executable напрямую вместо pnpm wrapper. Мой disposable DB vico_f2_test удалён, Docker vico-title-edit-pg возвращён в исходный stopped state. Старые fixed роли и другие worktrees не трогались.
