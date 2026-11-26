# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Принятый stack

1. AUTH-01–AUTH-04 прошли coordinator checkpoints.
2. AUTH-05 #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` принят; F01 закрыт.
3. AUTH-06 #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f` — AUTHOR PASS + whole-feature COORDINATOR PASS, 0 blockers.
4. Exact-head CI и 20/20 connected acceptance на AUTH-06 — SUCCESS.
5. Repository/local-CI evidence не является Stage-6/deployed acceptance.

## Активная подзадача — FINAL ASSEMBLY

По прямой команде владельца **Ада / Business GPT-6.2** назначена исполнителем final assembly.

Задача: перенести accepted final AUTH-06 state в первый implementation PR #388 к current main, не менять product implementation, закрыть intermediate PRs как superseded и получить final stable exact head с author self-check и применимыми CI/acceptance. Детали и done criteria: `stages/FINAL-ASSEMBLY/PLAN.md`.

Если current main изменился либо assembly требует изменения accepted product code, Ада ставит HOLD и STOP вместо импровизированного исправления.

После PASS assembly следующий агент — Мира для final whole-feature coordinator review. AUTH-07 пока не активирован.

## Независимость

Лёва участвовал в AUTH-06; Ада участвовала в AUTH-05 correction и теперь final assembly. Оба не могут быть independent final whole-feature reviewer. Reviewer назначается отдельно после coordinator PASS Миры.
