# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Текущее состояние authentication lifecycle

1. AUTH-01–AUTH-04 прошли coordinator checkpoints.
2. AUTH-05 #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` принят; F01 email-enumeration через registration challenge закрыт.
3. AUTH-06 #395 синхронизирован поверх corrected AUTH-05. Exact head `615d93598daf78945a86fbdc4255bc778ae3403f`.
4. Лёва завершил AUTHOR PASS; Мира завершила повторный whole-feature **COORDINATOR PASS**. Confirmed current-scope blockers: 0.
5. CI #45897164115 и 20/20 applicable connected acceptance завершились SUCCESS на новом head; ключевые logs подтверждают whole-lifecycle 62/62, F01 differential и полный AUTH-06 browser flow.
6. Repository/local-CI PASS не является external/deployed acceptance.

## Роли после реализации

Лёва участвовал в AUTH-06 sync/reverification. Ада участвовала в AUTH-05 correction. Поэтому ни Лёва, ни Ада не могут выполнять independent final whole-feature review этой assembled feature. Reviewer назначается отдельно после final assembly/coordinator stage.

## Следующий процессный переход

Final AUTH-06 head должен быть перенесён в первый implementation PR #388 согласно stacked workflow; intermediate PRs закрываются superseded. После assembly нужен stable-head final author/review/security gate. Переход пока не активирован; AUTH-07 и external Stage-6 действия не начинать.
