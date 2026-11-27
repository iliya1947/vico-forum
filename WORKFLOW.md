# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Accepted AUTH-01–AUTH-06 assembled baseline был exact `615d93598daf78945a86fbdc4255bc778ae3403f`; substantive AUTHOR PASS, CI PASS и 19/20 connected acceptance, с единственным K5 HOLD.
3. По прямой команде владельца K5-CORRECTION выполняет Мира.
4. Current #388 correction exact: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`. Delta к accepted baseline — только `tests/browser/sa04-attachments/check.py` (+59/-6); product/runtime/schema/dependencies/workflow не менялись.
5. Source-level bounded correction self-check — PASS.
6. **Targeted K5 verification — PASS.** Temporary diagnostic PR #396 имел base accepted `615d9359...`, head exact `71cdb70d...`, ровно один changed test-file и был закрыт без merge после evidence capture.
7. K5 run #45922622929 / job #140256622743 — SUCCESS. Merge-ref `34a02f448b719396fdb6706f6cc734f7f230bed4` имеет tree `6f154a2489913165c088dfa25a20818b62c13662`, идентичный implementation head tree.
8. Runtime evidence: `SA04_K5_CONNECTED_PASS 33`; artifact #15165481754 — exact SHA `71cdb70d...`, 33 cases, `external=[]`, `page_errors=[]`, six readiness records all `outcome=ready`.
9. Targeted run подтвердил исправленный K5 test и полный K5 matrix на новом exact head. Он не воспроизвёл старое пустое operationId: во всех six readiness snapshots value уже был UUID; поэтому точное runtime-значение прежних двух failures остаётся не захваченным и не выдаётся за доказанный факт.
10. Общий final automated gate ещё не закрыт: full exact-head `run:ci` + applicable `run:acceptance` на #388 после correction **ещё не запускались**.
11. AUTH-07, independent review, main merge и external/Stage-6 activation заблокированы.

## Следующий переход

Отдельная следующая подзадача: один final exact-head `run:ci` + `run:acceptance` на PR #388 exact `71cdb70d...`, затем проверить фактически исполненные applicable workflows. Не запускать повторно без причины.
