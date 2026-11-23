# agents/leva.md — F3 checks in progress

F1 #379 accepted8227db6, F2 #380 accepted `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Draft/unmerged. F3 implemented in stacked Draft #381 / feat/forum-structure-f3, base feat/forum-structure-f2 exact11a2808. Stable F3 head `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`. Plan/report: stages/forum-structure/PLAN.md / F3_REPORT.md.

PostgresTopicMoveWriter: structure→topic→containers NKU→active actor/AP10/current permission→neutral History; hidden both keys checked before CAS/details, only section/location update, global unchanged. Existing effectivePermission exported (SQL unchanged) for native reuse. Original receipt plain SELECT now returns persisted section; fingerprint/receipt semantics unchanged, no topic/structure lock after actor. F4 contexts/Hyperdrive/routes/readers and F5 UI/Owner not wired.

Локально PASS48 F3 PG +36 F2 regressions+closure/visibility regressions,41 validation unit,typecheck/lint/migration guard. Real PG blockers cover move×Hide/Restore/post visibility/reply/Watch/closure/title+post edit/planning/accepted publication/reparent/deactivation, receipt×move same actor, rollback/state/ACL. Snapshot preserved filled content/personal/published/draft/Complaint evidence states.

[CI45252637056](https://github.com/iliya1947/vico-forum/actions/runs/45252637056) +10 path-filtered acceptance on final head в работе. Дождаться всех applicable результатов; при current-task failure исправить и повторить applicable checks. После green update report/workflow/this memory/PR bodies → Мира bounded F3 checkpoint, STOP. F4+ не начинать без назначения; не merge stack. Если accepted F2 head изменится, STOP и согласовать dependency.

Локально /workspace/work/visibility-review — чистая F3 branch, deps /workspace/work/vico-forum/node_modules (symlink removed). Use direct Node executables instead of pnpm wrapper. Docker vico-title-edit-pg started by me; disposable vico_f3_test пока существует. После завершения удалить только эту DB и вернуть container stopped. Не менять другие worktrees/старые роли.

Final independent whole-feature reviewer — Марк, если code-independent. #342 единственный service channel; #300/Stage6/deploy/general UI/UX inactive.
