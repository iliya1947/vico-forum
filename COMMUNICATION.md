# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Authentication lifecycle выполняется stacked AUTH-01→AUTH-06, затем AUTH-07 final security gate.
2. Better Auth остаётся identity/session provider; explicit linking only; AccountState/Owner History/Settings переиспользуются.
3. Реальные mail/Google/anti-bot providers и Stage-6 activation остаются заблокированными.
4. По решению владельца Ада / Business GPT-6.2 заменила Лёву для дальнейшей технической работы.

## Whole-feature review

PR #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: AUTH-06 AUTHOR PASS и green evidence подтверждены, но whole-feature coordinator review Миры — **HOLD**.

Подтверждён один blocker: **F01 registration-challenge email enumeration**. В AUTH-05 email challenge existence precheck решает, выполнять ли challenge: existing duplicate может получить neutral 200 без challenge, тогда как fresh email с тем же missing/rejected/unavailable challenge получает denial/unavailable. Это публично различает существующий и новый email при открытой SET-02 регистрации и противоречит AUTH-05 no-enumeration contract.

Подробный evidence и граница finding: `stages/AUTH-06/REVIEW.md`.

Существующий deliberate SET-02 closure semantics из `docs/SETTINGS.md` не является отдельным finding.

## Correction route

1. Finding принадлежит AUTH-05 product implementation → correction в PR #394.
2. AUTH-06 #395 остаётся test/evidence package и не принимает product fix.
3. После corrected AUTH-05: coordinator checkpoint Миры.
4. При PASS — sync AUTH-06 на новый base и повторная author/evidence verification.
5. Затем whole-feature coordinator review заново.
6. AUTH-07 только после PASS.
7. Ада после implementation correction не является independent final reviewer; финальный reviewer будет назначен отдельно.
