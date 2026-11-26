# AUTH-05 — anti-abuse completion

Draft stacked implementation [PR #394](https://github.com/iliya1947/vico-forum/pull/394), branch `feat/auth-05-anti-abuse`, base accepted AUTH-04 `e9f8bad85694321f3279a72b604546a813a856b8`.
Stable exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` — **AUTHOR PASS**, 2026-11-26. Следующий шаг — coordinator checkpoint Миры.

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

## Финальный candidate

`ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` содержит test-only correction ожидаемого compiled migration tag в SA07 Data Monitoring: 0078 вместо 0077. Первый CI выявил только это устаревшее ожидание (1929 PG tests PASS), checks job PASS; focused Data Monitoring 13 tests затем PASS. Production code не менялся. Новый CI и все 20 applicable acceptance завершились PASS на финальном exact head. Evidence ниже.


## Stable-head verification и передача — AUTHOR PASS

Author self-check всего bounded AUTH-05 выполнен против stage/root PLAN и accepted AUTH-04. Проверены fresh-only admission, trusted native state/server invocation binding, flags/config/timeouts/errors, server-owned counter parity/transaction order, native limiter isolation, input bounds/aliases, privacy/closed observations и inherited auth/AccountState/Owner/Settings/History behavior. Подтверждённых current-scope blocking defects не осталось. Это авторский результат; независимую review собственной реализации Лёва не выполняет.

- [CI #45825184525](https://github.com/iliya1947/vico-forum/actions/runs/45825184525) — PASS. Checks: **252 files / 3342 tests**; PostgreSQL 17: **122 files / 1930 tests**. Lint/typecheck/builds/migration/schema/runtime checks jobs checks/database завершились успешно.
- PG job #139927395195 подтвердил clean schema manifest parity для 76 tables. Native rate_limit и existing budget table capabilities не расширены; новая migration меняет только closed attempt CHECK.
- Все **20/20 применимых connected acceptance workflows — PASS** на `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. Skipped duplicate label-trigger runs и Manual PR test controls не входят в 20.

- [SA04-K5 connected attachment Worker R2 Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205521) — PASS.
- [SA04-L3 connected authorization Owner Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205058) — PASS.
- [AUTH-05 connected anti-abuse Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205011) — PASS.
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205178) — PASS.
- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205083) — PASS.
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205201) — PASS.
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204689) — PASS.
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204727) — PASS.
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204812) — PASS.
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204767) — PASS.
- [Forum structure whole-feature connected Chromium and local R2](https://github.com/iliya1947/vico-forum/actions/runs/45825204907) — PASS.
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204972) — PASS.
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205039) — PASS.
- [AUTH-02b connected email verification Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205163) — PASS.
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204760) — PASS.
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204829) — PASS.
- [SA04-N connected Complaints Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825204873) — PASS.
- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205164) — PASS.
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205119) — PASS.
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45825205125) — PASS.

AUTH-05 job #139927467602 фактически выполнил все seven AUTH05_CONNECTED steps, включая required-no-verifier, expiry/binding/replay/uncertainty/timeout, real verify/login, unknown-network spoofing и UI 429/private observation. Старый auth job #139927468091 выполнил `own-rate-limit-expiry-and-explicit-UI-retry` после 429 и завершился success; counters не сбрасывались.

**K5 evidence qualification.** Первый K5 job #139927469008 завершился на прежнем immediate `len(editorOperationId)==36` assertion. Editor useEffect первоначально переводит SSR empty ID в UUID; этот editor/test код AUTH-05 не изменяет. Тот же production code на cedd19d уже прошёл K5. Перезапущен только failed job на том же final SHA, без изменения assertion/продукции: job #139930060118 / run attempt 2 — PASS. Это повторная успешная проверка; первый timing failure не скрывается и не считается пройденным.

## Coordinator checkpoint — следующий шаг

Мира проверяет весь bounded AUTH-05 в #394 на stable exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`, включая взаимодействие с accepted AUTH-04. Маршрут — этот RESULT → stage PLAN/root PLAN → bounded diff и focused tests. Особое внимание — public native OAuth serverContext/transaction seam, actual fresh-create gate, budgets до identity BEGIN, missing verifier/config/late result, raw-proof privacy и inherited request/create/mail limits.

Лёва остановился. AUTH-06 разрешается только после coordinator PASS и отдельной активации. Intermediate merge и independent intermediate review здесь не выполняются. Provider-specific adapter/widget/credentials, реальные mail/Google/anti-bot resources, edge rules и Stage-6 activation остаются за отдельным owner gate. Repository/local-CI PASS не означает real provider delivery/OAuth/challenge acceptance.


## Coordinator checkpoint Миры — PASS

**COORDINATOR PASS** на stable exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.

Проверен весь bounded AUTH-05 diff против `stages/AUTH-05/PLAN.md`, root PLAN и accepted AUTH-04, включая pinned Better Auth 1.7.7 public seams и фактическое runtime evidence.

1. Fresh email/Google account creation использует challenge admission только на create-user boundary; existing login, explicit link и recovery не требуют успешного fresh-create challenge.
2. Google redirect path хранит trusted receipt в native Better Auth `serverContext`; client `additionalData/serverContext` authority не получает. Fresh OAuth signup budget связан с native create-user transaction, а existing login/link эту ветку не расходуют.
3. Required/unknown mode без verifier, unavailable/timeout/uncertain, wrong binding, expired/replayed proof fail closed без user/session/mail effects. Late verifier result не создаёт automatic retry.
4. Raw challenge proof удаляется до native identity/state persistence; body bounds, private responses и observability не раскрывают proof/IP/target/private provider errors.
5. AUTH-02a budgets сохраняют atomic DB-clock fixed windows, HMAC keys, native `rate_limit` isolation, bounded cleanup/lock behavior, secret rotation и fail-closed storage semantics. HTTP/direct/nested paths не получают client bypass или double count.
6. Trusted-network policy не принимает `X-Forwarded-For`/`X-Real-IP` как authority; unknown network остаётся bounded.
7. Own password-create admission и Retry-After/X-Retry-After закрыты без ослабления AUTH-03/04 session/freshness/invalidation boundaries.
8. Migration 0078, closed telemetry values, History/current projections, schema manifest и runtime capability boundaries согласованы; external provider activation отсутствует.
9. Все 17 acceptance-групп bounded stage имеют source/runtime evidence на фактических путях. Whole-lifecycle matrix AUTH-06 и real provider/deployed acceptance этим PASS не утверждаются.
10. Exact-head CI #45825184525 — PASS; 20/20 applicable connected acceptance workflows — PASS.
11. K5 run #45825205521 attempt 1 действительно завершился на существующем timing assertion `len(operation)==36`; attempt 2 — PASS на том же exact head без изменения production code или assertion. Rerun квалифицирован и не маскирует AUTH-05 defect.

Подтверждённых current-scope blocking defects не установлено.

**AUTH-05 coordinator checkpoint закрыт PASS.** AUTH-06 разрешена как следующая stacked-ступень, но implementation начинается только после отдельной активации.
