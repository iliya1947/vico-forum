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

## F01 correction — кандидат опубликован, проверки запущены (Ада, 2026-11-26)

Whole-feature finding F01 на AUTH-06 #395 (см. stages/AUTH-06/REVIEW.md) superseded прежний AUTH-05 PASS. В PR #394 / feat/auth-05-anti-abuse опубликованы два correction commits: b8e5d80 и `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` (текущий head, base accepted AUTH-04 e9f8bad85694321f3279a72b604546a813a856b8 не менялся).

- При required challenge и открытой email registration общая canonical HTTP/direct admission до native signup не зависит от existence: missing/rejected → 403, unavailable → 503 для обоих адресов. Valid proof допускает native signup; existing duplicate остаётся neutral 200 без нового mail/session. SET-02 deliberate closure сохраняет native semantics; actual-create hook повторно читает флаги и проверяет scoped receipt. При reopening отсутствие receipt не авторизует fresh create.
- Policy preflight переиспользует uncached SET-02 reader и существующий lifecycle owner (runAdapterOperation); challenge I/O вне identity transaction, после budget admission. Google, login/link/recovery, schema, external scope и native лимиты не изменены.
- Regression: differential HTTP/direct missing/rejected/unavailable/unconfigured, equal public outcome, no identity/session/verification/mail effects, budget accounting и observation; policy-read unavailable без verifier/identity; actual SET-02 recheck after proof; valid duplicate и closed fresh denial. Connected Worker/Chromium fixture сравнивает existing/fresh для трёх negative outcomes. Runtime results пока не установлены.
- [CI #45882443114](https://github.com/iliya1947/vico-forum/actions/runs/45882443114) и [AUTH-05 connected acceptance #45882448007](https://github.com/iliya1947/vico-forum/actions/runs/45882448007) запущены через run:ci/run:acceptance. Все применимые acceptance должны быть проверены по exact SHA (не считать skipped duplicate runs PASS). Автоматизированные результаты пока не установлены; прежние PASS относятся только к прежнему head. Содержательная авторская проверка имеет отдельный статус и ещё не завершена.

Следующее по прямой поправке владельца: Ада выполняет содержательную bounded author self-check без ожидания CI/acceptance и отдельно фиксирует её собственный результат. CI и connected acceptance проверяются самостоятельно на exact head. Ни green CI не заменяет авторскую проверку, ни незавершённый CI не блокирует её. При подтверждённых findings — отдельный corrective pass. Передача Мире и STOP после обоих положительных результатов на одном stable exact head; AUTH-06 #395 до нового coordinator PASS не синхронизировать. External/Stage-6 не активировать.

## Содержательная авторская проверка correction candidate — AUTHOR HOLD (Ада)

Exact head `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`, base accepted AUTH-04 `e9f8bad85694321f3279a72b604546a813a856b8`. Проверка проведена по существу независимо от CI и acceptance. Просмотрен bounded diff #394 (39 изменённых файлов, включая structural diff snapshots 0077/0078), relevant root/stage PLAN, F01 evidence, SET-02/SA02 source-of-truth, critical inherited transaction/budget/session boundaries и exact-version Better Auth v1.7.7 public signup/OAuth/state source. Тесты оценены по контракту и assertions; новые runtime результаты в этом проходе не проверялись и не являются причиной HOLD.

### F01 — source-level correction подтверждён

1. Canonical signup validates email/callback и списывает signup + mail budget до challenge и identity work. Удалён existence lookup из challenge admission; при required/open SET-02 одинаковые receipt decisions вызывают одинаковый отказ до native dispatch, независимо от existing/fresh. Native 1.7.7 lookup и generic duplicate находятся после wrapper preflight. Valid proof пропускает оба адреса в native signup, duplicate не даёт committed-creation evidence и не отправляет второе письмо. Raw proof удаляется из передаваемого native body. Denial использует private/no-store/referrer-policy, safe code/message, без user/token DTO или session.
2. SET-02 предварительно читается без identity selector, через существующий lifecycle.runAdapterOperation, после budgets и до verifier; storage outage переводится canonical command в safe 503. Native actual-create gate повторно читает current flags и receipt, закрытие во время proof сохраняет method-specific closure, reopening не даёт proofless new-account admission. Deliberate closure duplicate contract сохранён. Это не гарантия constant-time signup и не новая policy для смены SET-02 посреди запроса.
3. Differential PG tests сравнивают existing/fresh HTTP/direct missing/rejected/unavailable/unconfigured, status/body/private headers/no session, mail/verification/identity counts, budget and observer outcomes; отдельные valid duplicate, policy storage outage и actual-create recheck. Worker/Chromium tests проверяют три differential denial classes с отдельными equivalent one-use proofs. Проверена логика тестов, не заявлен результат исполнения.

### Остальные bounded acceptance boundaries — содержательный проход

- Budgets (acceptance 1–6, 10–12): прежний HMAC-domain separation, trusted ingress/unknown, native isolation, fixed DB-clock window, bounded cleanup и nested receipt остаются прежними; проверены call sites signup/mail/terminal/own и own password-create admission, relevant separate-client/rotation/cleanup/alias/failure tests. Native rate_limit не изменялся. 429 headers передаются через canonical and Settings action/document boundary; explicit retry, без automatic replay (acceptance 14).
- Challenge (7–9): проверены required/disabled/unknown config, bounded input/timeout, late result, returned binding, server-owned receipt, actual create gate. Pinned Better Auth v1.7.7 sign-up.ts, sign-in.ts, callback.ts, oauth2/link-account.ts и oauth2/state.ts подтверждают reused public native seams: serverContext overrides client additionalData, parsed state, native fresh-create transaction only. Google login/link/recovery не требуют успешного fresh-create challenge; external replay/TTL adapter contract не выдаётся за реализованный provider.
- Schema/privileges (13): forward migration 0078 добавляет только closed registration-challenge operation в existing CHECK; structural JSON comparison 0077→0078 показывает только id, prevId и значение этого CHECK. Journal/schema/manifest target согласованы на уровне исходников; manifest hash/runtime PG parity отдельно проверяются автоматизированно. Нет new tables, privileges, dependency or native rate-limit change.
- Observability and external boundary (15, 17): closed deny/unavailable producer, dedup HTTP/direct и null ambient actor; EN/RU/HE label, existing scoped/global History and coverage; no new provider/SDK/resource, production default не получает test verifier, fake изолирован отдельным disposable CI entrypoint. Monitoring не вызывает verifier. Однако проверка фактического History consumer выявила F02 ниже. Остальные проверенные source-level границы не выявили нового подтверждённого blocker; это не independent whole-feature review и не claim runtime PASS (acceptance 16 — отдельные automated results).

### F02 — несогласованность privacy clause AUTH-05 и Owner-only History

**Установленный факт:** `stages/AUTH-05/PLAN.md` §3.2 явно говорит «Challenge response, raw IP, target, token и provider-private errors не попадают в responses/logs/History/DTO». При этом новый registration-challenge producer (`app/observability/attempt-collector.server.ts:32–59`) обнуляет actorUserId, но копирует canonical ingress networkIp. `db/owner-attempt-telemetry.ts:74–102,224–255` сохраняет его в owner_attempt_patterns.network_ip для qualified/trusted anonymous network. `db/owner-sa02-history.ts:335–348` включает registration-challenge в accounts.registration/security.auth/integrations.authentication и без operation-specific redaction возвращает `host(p.network_ip)` как networkIp. `app/super-admin/history-entry.tsx:163–184,220–225` отображает его строкой без маскирования. Это полный нормализованный IP, не только source quality; для unknown источника адрес отсутствует. Доступ остаётся exact-Owner-only; публичная или foreign-account утечка не установлена.

**Граница решения:** постоянный `main/docs/SUPER_ADMIN.md:151–168` разрешает сохранять canonical network IP с quality в exact-Owner-only telemetry и выводить network data там, где доступно. Stage privacy clause может вводить более узкое ограничение для challenge либо употреблять raw IP только в смысле непроверенного исходного header. Нельзя молча объявить оба текста согласованными, изменить permanent contract или расширить поручение «только F01». Если запрет относится к полному IP нового operation, минимальный вариант — ограничить History/DTO projection именно registration-challenge (не ломая существующие coalescing/network enforcement и остальные типы History), с explicit qualified-network privacy regression; если допускается canonical Owner-only IP, уточнить stage contract. Ни один вариант не принят самовольно. Требуется разрешение границы F02 и при необходимости назначение corrective pass.

**Итог авторской проверки: AUTHOR HOLD по F02, F01 source-level correction подтверждён.** CI/acceptance не определяют этот вывод и в данном review не опрашивались. Реализация в #394 не изменялась. Handoff на coordinator checkpoint, AUTH-06 sync, AUTH-07 и external actions пока не разрешены.
