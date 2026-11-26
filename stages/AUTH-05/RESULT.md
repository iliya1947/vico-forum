# AUTH-05 — anti-abuse completion

Draft stacked implementation [PR #394](https://github.com/iliya1947/vico-forum/pull/394), branch `feat/auth-05-anti-abuse`, base accepted AUTH-04 `e9f8bad85694321f3279a72b604546a813a856b8`.
Candidate exact head `cedd19dc6b2b23c8877ac3374f3b1eecd383e8e2`. Author final PASS ожидает exact-head CI/acceptance.

## Реализация против bounded PLAN

1. Provider-neutral required/disabled config. `AUTH_REGISTRATION_CHALLENGE_MODE` unset/disabled сохраняет disabled; required/unknown value без verifier fail closed. Runtime не создаёт fake/provider fallback. Только server-injected verifier может дать passed/rejected/unavailable. Exchange ограничен 5 s; поздний passed не авторизует и retry не запускается. Provider format/TTL/replay остаются adapter contract, exchange input ограничен.
2. Email canonical/direct wrapper удаляет raw `registrationChallengeProof` из native user body. Required mode проверяет proof до identity transaction только для потенциально нового email; actual native create-user gate перечитывает SET-02 policy и требует scoped server receipt, bound к email/method/purpose/nonce.
3. Google native sign-in/callback keys переиспользованы через public dispatch. Redirect-init exchange сохраняет receipt только в native `serverContext` через public `addOAuthServerContext`; client additionalData/serverContext не имеет authority. Raw proof в state не сохраняется. Callback читает native validated/consumed state через public `getOAuthState`, проверяет receipt method/purpose/nonce/expiry и actual create policy. ID-token path использует server invocation scope. Missing/wrong/expired/old-policy receipt fail closed.
4. Native OAuth transaction seam расходует signup budget перед identity BEGIN только при фактической fresh creation. Existing Google login/linking не расходуют signup budget и не требуют successful challenge; SET-02 flags независимы. Domain errors сохраняют native callback redirect; только admission failure восстанавливается из swallowed native error. Нет второго transaction owner или OAuth backend.
5. Common budgets сохраняют AUTH-02a storage/HMAC/DB-clock/cleanup contract и native rate_limit без изменения native limits. Найденный пропуск own admission при password-create mail issuance закрыт: own admission коммитится отдельно перед mail admission, как в own email flow. Request/create + email phases могут исчерпать 5/min own window; UI сохраняет explicit retry после реального Retry-After, без reset counters/auto retry.
6. Own retry headers включают Retry-After и X-Retry-After. AUTH-04 native read-error preservation вынесен в общий readOwnSession и применён к credential issuance/confirmation: classified read outage даёт 503, genuine missing session — 401. Signed-cookie/fresh/current-session/transaction checks сохраняются.
7. Raw signup/social HTTP body ограничен 32 KiB до native parser, включая encoded/case/trailing aliases; native JSON/form semantics сохраняются. Own endpoint duplicate validation сохранена и использует тот же normalized path selection.
8. Реальный closed producer `registration-challenge` пишет только denial/unavailable attempts, без ambient actor/private proof. HTTP/direct/native nesting не дублирует ту же admission denial. Forward migration 0078 + snapshot/schema/manifest расширяют CHECK; History/registration retained coverage и EN/RU/HE label обновлены. Monitoring не вызывает verifier/provider.
9. Request-scoped Worker injection — server capability. Default application не получает fake. Новые fixtures импортируются отдельным CI-only entrypoint, проверяют loopback/disposable DB и хранят только proof digest/method/purpose/expiry/one-use state. Real provider/SDK/widget/sitekey/edge resources не выбраны и не активированы.

## Локальный evidence

- 23 actual PG challenge/admission tests — canonical/direct email/Google, native signed OAuth state/cookie, passed/rejected/unavailable/uncertain, binding/expiry/replay, changed policy, independent flags, existing login/link/recovery, shared budgets/no double count, aliases/oversized body, classified budget/session outages.
- Выбранные integrated PG suites прошли, включая 41 lifecycle tests; дополнительный набор budget/History/current-state — 30 tests PASS. Budget coverage включает separate-client recipient burst, escaped receipt rejection, DB-clock despite app skew, fixed-window denial/expiry, real native sweep, bounded cleanup/locked/renewed rows, secret rotation и fail-closed errors.
- 54 выбранных unit/component tests и отдельные challenge/collector tests PASS; typecheck PASS; lint без errors, существующий unrelated warning no-eval в app/forum/ui.test.tsx не менялся.
- Schema manifest parity на clean migrated PostgreSQL 17 — 76 tables PASS. Manifest delta ограничен target 0078 и фактическим CHECK hash; accepted migrations не переписаны.
- Новый local built Worker/Chromium AUTH-05 PASS: required-no-verifier без fake fallback, one-use SQL proof, expiry/binding/replay, unavailable/uncertain/timeout, committed verification mail, real browser verify/login, recovery, spoofed forwarding → общий unknown 5/min, 429 headers/UI/explicit retry, private observations, no egress/page errors.
- Полный прежний Worker/Chromium AUTH-02b/03/04 PASS, включая new own-budget 429 и явный retry после real expiry. Counters в flow не сбрасывались. Реальная доставка писем/Google OAuth этой synthetic проверкой не утверждается.

## Remaining verification / переход

CI и применимые connected workflows запущены на candidate exact head. После завершения записать IDs/фактические results и AUTHOR PASS на stable head, затем остановиться для coordinator checkpoint Миры. AUTH-06 самостоятельно не начинать. External/Stage-6 gates сохраняются.
