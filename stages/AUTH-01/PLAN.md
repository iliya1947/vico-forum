# stages/AUTH-01/PLAN.md — bounded scope и критерии готовности первой stacked-ступени Mail foundation

## Цель

Создать безопасный provider-neutral mail foundation для будущих auth-писем без изменения текущего signup/session/verification поведения и без внешней активации.

## Scope

1. Server-only boundary `sendAuthMail({ purpose, recipient, locale, actionURL, operationId })`.
2. Результаты transport: `accepted | rejected | unavailable | uncertain | disabled`; публичный ответ не раскрывает recipient/provider/raw error.
3. Resend adapter и Brevo adapter через injected transport/fetch; один provider выбирается конфигурацией, automatic fallback отсутствует.
4. Explicit fake/test transport только для local/CI; production fallback на fake запрещён.
5. HTML + text templates с escaping, CRLF protection, locale/fallback/direction support и безопасной bidi-подачей.
6. Server-built allowlisted auth action URLs от trusted `BETTER_AUTH_URL`; reject foreign/protocol-relative/backslash/control/credential/unsafe-return inputs.
7. Runtime/config seams для будущей Stage-6 активации без provider SDK/dependency, если текущих Web APIs достаточно.
8. Bounded timeout/response parsing; timeout/connection loss после возможной отправки классифицируется как uncertain без blind retry/failover.
9. Tests: adapter request mapping, accepted/4xx/429/timeout/uncertain/no-retry, bad config, fake isolation, URL abuse, escaping/Unicode/RTL/fallback, secret absence/client-bundle safety, no real egress.

## Не входит

1. Mandatory email verification, resend verification lifecycle, password recovery/reset.
2. Email change, password creation, unlink, session-policy changes.
3. Anti-bot provider/challenge implementation.
4. Schema/migrations без новой подтверждённой необходимости.
5. Реальные Resend/Brevo accounts, keys, DNS или outbound send.
6. Изменение текущего signup/session behavior.

## Done

1. Implementation PR — первая ступень stack, base = текущий main.
2. Scope ограничен AUTH-01 и не содержит AUTH-02+.
3. Targeted/local tests подтверждают transport/config/template/URL/security boundaries без real egress.
4. Existing auth signup/signin/session/linking regressions текущего поведения не сломаны применимыми checks.
5. Stable exact head и фактические checks записаны в #320.
6. Лира останавливается; следующая ступень только после coordinator checkpoint Миры.
