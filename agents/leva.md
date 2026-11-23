# agents/leva.md — F3 author gate PASS, STOP

F1 #379 accepted8227db6, F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Draft/unmerged. F3 implemented in stacked Draft #381 / feat/forum-structure-f3, base feat/forum-structure-f2 exact11a2808. Stable F3 head `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`. Dependency повторно проверен до/после author gate, unchanged. Plan/report: stages/forum-structure/PLAN.md / F3_REPORT.md.

Final exact-head [CI45252637056](https://github.com/iliya1947/vico-forum/actions/runs/45252637056) PASS с первой попытки: 3014 unit /1791 PG17,lint/typecheck,build/UI-preview build,schema parity/manifest75/runtime ACL/provisioning/credentials/Worker smoke; все10 applicable acceptance PASS.

PostgresTopicMoveWriter: structure→actual topic→sorted containers NKU→active actor/AP10/current permission→neutral History last; hidden both keys before CAS/details, only section/location update, global unchanged. Existing effectivePermission exported (SQL unchanged) for reuse. Original receipt plain SELECT returns persisted section; original fingerprint/receipt semantics unchanged, no topic/structure lock after actor. F4 contexts/Hyperdrive/routes/readers and F5 UI/Owner not wired.

Локально PASS48 F3 PG,36 F2 regressions+closure/visibility regressions,41 validation unit,typecheck/lint/migration guard. Actual PG blockers prove both orders for visibility/reply/Watch/closure/title+post edit/planning/accepted translation publication/reparent/deactivation, same-actor receipt×move; state/rollback/exact web ACL prove movement boundary. Shared PG test helper extracted from F2; query snapshot refreshed in polling. Filled published/draft/evidence/content/personal states preserved, hidden public/Admin/assets still blocked.

**Следующая Мира — bounded F3 checkpoint** на exact head #381. Лёва STOP; F4+ не начинать без PASS/назначения. Stack stages не merge. Final independent whole-feature reviewer — Марк, если code-independent; #342 единственный service channel; #300/Stage6/deploy/general UI/UX inactive.

Локально /workspace/work/visibility-review — clean F3 branch; deps /workspace/work/vico-forum/node_modules, temporary symlink removed. Direct Node executables instead of pnpm wrapper. Disposable vico_f3_test удалён; Docker vico-title-edit-pg возвращён в исходный stopped state. Старые роли и другие worktrees не трогались.
