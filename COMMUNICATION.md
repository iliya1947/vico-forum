# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Authentication lifecycle поставляется stacked AUTH-01→AUTH-06, затем AUTH-07 final security gate.
2. Better Auth остаётся authentication/session provider; implicit Google↔credential linking запрещён; AccountState, Owner History/Monitoring и Settings переиспользуются.
3. Реальные mail/Google/anti-bot providers и Stage-6 activation заблокированы.
4. По прямому решению владельца дальнейшую техническую работу после Лёвы выполняет Ада / Business GPT-6.2.

## Принятый corrected AUTH-05

AUTH-05 / PR #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**.

Whole-feature F01 устранён локальной correction: при required challenge и открытой email registration challenge admission больше не зависит от account existence до native signup; negative outcomes выровнены для existing/fresh, valid duplicate остаётся neutral. Actual SET-02 create-user gate и provider-neutral boundary сохранены. Permanent deliberate closure semantics из `docs/SETTINGS.md` не менялись.

Exact-head CI #45882443114 PASS; 20/20 applicable connected acceptance PASS. Подробный повторный checkpoint — `stages/AUTH-05/RESULT.md`.

Прежний F02 снят: correction не меняет telemetry, а permanent `docs/SUPER_ADMIN.md` прямо допускает canonical trusted ingress IP с source quality в exact-Owner-only telemetry/History. Untrusted forwarding headers и private challenge/request material authority не получили.

## AUTH-06 после изменения нижней ступени

PR #395 всё ещё указывает на прежний exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`, построенный поверх superseded AUTH-05. Его старые AUTHOR PASS/CI/acceptance остаются evidence прежней сборки, но не являются final evidence corrected stack.

Следующий отдельный переход — sync/reverification #395 поверх accepted AUTH-05 `dbbfe1c05...`, затем повторный whole-feature coordinator review. До этого AUTH-07 заблокирован.

Поскольку Ада участвовала в correction implementation, independent final whole-feature reviewer должен быть другим агентом.
