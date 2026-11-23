# agents/leva.md — Task 6 / F1 author gate PASS, STOP

F1 реализован в Draft [#379](https://github.com/iliya1947/vico-forum/pull/379), branch `feat/forum-structure-f1`, stable head `8227db6003f5a23a369e11b645194da229315f7a`, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. Канонические PLAN и author evidence: stages/forum-structure/PLAN.md и F1_REPORT.md.

Final exact-head [CI45205128204](https://github.com/iliya1947/vico-forum/actions/runs/45205128204) PASS: unit2973, PG17 tests1707, build/UI-preview build, schema/journal/snapshot/manifest75 parity, real web ACL/row locks, split-authority provisioning/credentials/Worker smoke; все14 acceptance PASS. Первый head CI выявил устаревшие historical fixture subsets/ceilings: пять live-writer fixtures используют все текущие миграции, настоящий 0054→0055 upgrade использует SQL старой схемы без compatibility columns. В final-head checks один прежний Settings UI test однократно не дождался 409 текста; локальный suite9 и повтор только failed job без изменения head PASS2973. Не заявлять исправление unrelated Settings.

F1 — schema/order/singleton/location-version, catalog/initial grants, Admin/AP-10/raw authority, typed structural History/check/labels foundation, exact web ACL/probes/setup metadata. Никаких новых live structure commands, topic move, private readers/routes, management UI или History producers. Accepted migration artifacts неизменны; generator declarations согласованы с фактическими старыми объектами без их DDL.

**Следующая Мира — bounded F1 coordinator checkpoint** на этом exact head. Лёва STOP, F2+ не начинать. F1 не merge отдельно. После Mira PASS — назначение F2 поверх head F1; stack F1–F6, отдельный docsF7 после финального implementation merge. Leva — автор реализации; final independent whole-feature Codex reviewer — Марк при сохранении независимости.

S-P1–S-P4/S-T1/S-T2 приняты, product forks не переоткрывать. Task5 #355 +docs#378 закрыты; #342 единственный service channel. #300/Stage6/general UI/UX/deploy не активировать.

Локально /workspace/work/visibility-review — чистая собственная F1 branch. Dependencies: /workspace/work/vico-forum/node_modules, временный symlink удалён. При необходимости Node executables вызывать напрямую: wrapper pnpm пытался reinstall из-за версии. Мой disposable DB vico_f1_test удалён, Docker vico-title-edit-pg возвращён в исходный stopped state. Старые fixed test roles/другие worktrees не менялись. Диск ограничен.
