# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. AUTH-01→AUTH-06 stacked implementation завершён. AUTH-05 corrected #394 PASS, F01 закрыт; AUTH-06 #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f` — AUTHOR PASS + whole-feature COORDINATOR PASS, исторические CI/20 acceptance PASS.
3. **FINAL ASSEMBLY выполнена** в первом PR #388 к неизменному main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; exact head `615d93598daf78945a86fbdc4255bc778ae3403f`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd` идентичен accepted AUTH-06; non-forced fast-forward без product changes.
4. #389/#391/#392/#393/#394/#395 superseded: GitHub автоматически закрыл и отметил их merged в assembled feature branch, не в main; descriptions помечены superseded. #388 остаётся open/unmerged.
5. Final substantive author self-check **AUTHOR PASS**, confirmed current-scope blockers 0; отдельно от автоматизированных проверок.
6. Fresh exact-head #388 CI #45912881134 — IN_PROGRESS; connected acceptance 16/20 success, 4 pending, 0 completed non-success. K5 #45912884312 attempt 1 failed on прежнем editorOperationId assertion; failed-job rerun attempt 2 инициирован без code/test change.
7. Handoff evidence: `stages/FINAL-ASSEMBLY/RESULT.md`.
8. Исполнитель — Ада. Coordinator final review Миры только после выполнения применимых отдельных checks #388. Лёва и Ада исключены из independent final reviewer.
9. AUTH-07, merge #388 в main и external/Stage-6 activation ещё не разрешены.

## Следующий переход

Ада проверяет завершение новых CI/20 connected acceptance именно #388 (не старые #395 с тем же SHA), квалифицирует результаты, включая K5 retry. Авторскую проверку не повторять из-за ожидания CI при неизменном exact head. При PASS отдельно зафиксировать actual CI/job/acceptance results, проверить unchanged head/base/tree и передать Мире final whole-feature coordinator review; Ада STOP. При подтверждённом product defect или расхождении assembly — HOLD/evidence/STOP, не исправлять попутно. AUTH-07 самостоятельно не начинать.
