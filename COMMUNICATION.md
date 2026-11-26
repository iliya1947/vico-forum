# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Authentication lifecycle поставляется stacked AUTH-01→AUTH-06, затем AUTH-07 final security gate.
2. Better Auth остаётся authentication/session provider; implicit Google↔credential linking запрещён; AccountState, Owner History/Monitoring и Settings переиспользуются.
3. Реальные mail/Google/anti-bot providers и Stage-6 activation заблокированы.

## Принятый corrected AUTH-05

AUTH-05 / PR #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**. F01 устранён: при required challenge и открытой email registration negative challenge outcomes больше не зависят от account existence до native duplicate/create branch; actual SET-02 create-user gate и provider-neutral boundary сохранены. CI #45882443114 PASS; 20/20 applicable connected acceptance PASS.

## Передано Мире

PR #395 синхронизирован с принятым AUTH-05 `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`. Новый head `615d93598daf78945a86fbdc4255bc778ae3403f` получил локальный AUTHOR PASS Лёвы. Повторный coordinator review Миры охватывает весь стек и исправление F01. Матрица и границы результатов записаны в `stages/AUTH-06/RESULT.md`.

По указанию владельца Лёва передаёт работу без ожидания и проверки CI. Предусмотренные команды запуска выставлены. Лёва и Ада участвовали в реализации. Независимый финальный reviewer назначается после coordinator PASS.
