# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Authentication lifecycle поставляется stacked AUTH-01→AUTH-06, затем AUTH-07 final security gate.
2. Better Auth остаётся authentication/session provider; implicit Google↔credential linking запрещён; AccountState, Owner History/Monitoring и Settings переиспользуются.
3. Реальные mail/Google/anti-bot providers и Stage-6 activation заблокированы.

## Принятый corrected AUTH-05

AUTH-05 / PR #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**. F01 устранён: при required challenge и открытой email registration negative challenge outcomes больше не зависят от account existence до native duplicate/create branch; actual SET-02 create-user gate и provider-neutral boundary сохранены. CI #45882443114 PASS; 20/20 applicable connected acceptance PASS.

## Активная задача

По прямому решению владельца **AUTH-06 sync/reverification передана Лёве / Codex-6.1 Sol**.

PR #395 сейчас ещё находится на старом head `2eb3f9c303ad1b67d5348664267eca665f079cf7` поверх superseded AUTH-05 `ac59e3d2...`. Лёва должен синхронизировать существующий AUTH-06 test/evidence package с corrected AUTH-05 `dbbfe1c05...`, разрешая только реальные последствия изменения нижней ступени, без новой product functionality.

После sync нужен новый stable exact head, author self-check и применимые exact-head CI/acceptance. При blocker — HOLD и STOP; при PASS — обновлённый RESULT и STOP для повторного whole-feature coordinator review Миры.

Ада завершила AUTH-05 correction; AUTH-06 ей не назначен. Поскольку Лёва теперь участвует в AUTH-06, а Ада участвовала в AUTH-05 correction, independent final reviewer должен быть другим агентом.

AUTH-07, merge и external/Stage-6 activation не начинать.
