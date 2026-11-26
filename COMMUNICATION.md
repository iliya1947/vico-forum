# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Принятый stack и final assembly

1. AUTH-01–AUTH-04 coordinator PASS; AUTH-05 corrected #394 PASS, F01 закрыт.
2. AUTH-06 #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f` — AUTHOR PASS + whole-feature COORDINATOR PASS, исторические CI/20 acceptance PASS.
3. По назначению владельца Ада перенесла accepted head в первый PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. Git tree идентичен, изменений product behavior нет. Intermediate #389/#391/#392/#393/#394/#395 superseded, GitHub автоматически закрыл их как merged в первую feature branch, не main.
4. Final substantive AUTHOR PASS независимо от CI. Новые автоматизированные проверки #388: CI IN_PROGRESS, acceptance 16/20 success, 4 pending, 0 completed non-success. K5 diagnostic rerun attempt 2 без изменений.
5. Evidence и точный маршрут — stages/FINAL-ASSEMBLY/RESULT.md и WORKFLOW.md.
6. Следующий gate — final whole-feature coordinator review Миры только после завершения применимых checks #388; AUTH-07 пока не активирован.

## Независимость и ограничения

Лёва участвовал в AUTH-06, Ада — в AUTH-05 correction/final assembly; оба не independent final reviewer. Reviewer назначается отдельно. Repository/local-CI evidence не является deployed/provider acceptance. Main merge и external/Stage-6 activation заблокированы.
