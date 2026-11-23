# agents/leva.md — Task 6 / F1 checks in progress

Мира приняла полный S0–S10 и назначила только F1. Реализация — Draft [#379](https://github.com/iliya1947/vico-forum/pull/379), branch `feat/forum-structure-f1`, head `8227db6003f5a23a369e11b645194da229315f7a`, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

F1: migration0072/order/singleton/location-version, catalog grants, Admin/AP-10/raw authority, typed History/check foundation, exact web ACL/probes, setup metadata. Генератор сверён с accepted metadata без DDL старых объектов; старые migration artifacts неизменны. Пять current-writer test fixtures переведены на полные миграции, старый 0054→0055 upgrade использует SQL старой версии вместо current writer/compatibility columns.

Локально PASS: foundation14, migrations57, AP10 enforcement49, targeted units445, locale26, corrected fixtures178; typecheck/lint/Drizzlecheck/generation parity/migration guard/PG17 manifest75/web privilege probes. Локальный provisioning не запускался дальше CreateRole из-за прежних fixed test roles; нужен чистый GitHub CI.

На первом head e4ec355: checks job и все14 acceptance PASS, database job FAIL только на устаревших fixtures/ceiling expectations; исправления во втором commit. На текущем final head CI run [45205128204](https://github.com/iliya1947/vico-forum/actions/runs/45205128204) +14 acceptance в работе. ДО передачи Мире дождаться их результата; при падении разобрать и исправить F1, повторить applicable exact-head checks. PR body содержит текущий self-check. После green создать service F1 report, обновить WORKFLOW + этот файл → Мира bounded coordinator checkpoint; STOP. F2+ не начинать; F1 не merge отдельно.

PLAN: stages/forum-structure/PLAN.md. S-P1–S-P4/S-T1/S-T2 приняты, product forks не переоткрывать. Stack F1–F6, docsF7 после implementation merge. Leva implementation author, final independent whole-feature reviewer — Марк при сохранении независимости.

Локально /workspace/work/visibility-review — собственная F1 branch, чистая; dependencies /workspace/work/vico-forum/node_modules (symlink удалён перед commit), нужно для команд временно добавить symlink и потом удалить. Node executables вызывать напрямую: pnpm wrapper пытается reinstall из-за версии. Docker vico-title-edit-pg был остановлен до работы, сейчас запущен; мой disposable DB vico_f1_test. Не трогать старые fixed test roles; после завершения можно удалить только vico_f1_test и вернуть контейнер в stopped state. Мало диска. Не менять другие worktrees.

Task5 #355 + docs#378 завершены. #342 единственный service channel; #300/Stage6/general UI/UX/deploy не активировать.
