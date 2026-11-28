# PLAN.md — полный технический план authentication lifecycle, зависимости и критерии готовности

## 1. Статус и основания

**FULL TECHNICAL PLAN — COORDINATOR PASS. Delivery mode: stacked AUTH-01→AUTH-06; AUTH-07 final gate.**

Baseline: `main 9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; входной service head: `ad08cca57be5cded2d1ef1e83977ef9deeac08c0`. Оба сверены с GitHub при планировании 2026-11-25. Better Auth и Drizzle adapter остаются **1.7.7**. Это план, не результат implementation/security acceptance. Implementation, CI, provider calls, provisioning и deployment на этом назначении не выполнялись.

Решения владельца: [DECISIONS.md](DECISIONS.md); scope: [TASK.md](TASK.md). Критические основания revalidation перепроверены по коду и exact-version source, а не приняты автоматически. Источники и существенные выводы: [research/better-auth-1.7.7.md](research/better-auth-1.7.7.md). Старый AUTH-01 plan superseded.

Correction pass выполнен по назначению Миры: единый mandatory-verification target contract, без grandfathering/legacy policy и связанного owner blocker; AUTH-05 — provider-neutral. Остальная архитектура сохранена.

**AUTH-02a storage correction, 2026-11-25:** дополнительные Vico lifecycle-бюджеты перенесены в техническом плане из native `rate_limit` в отдельную `auth_lifecycle_budget` с явным `expires_at`. Проверка Better Auth 1.7.7 установила несовместимость общей native очистки с независимыми 600 s окнами. Native HTTP limiter сохраняется. Причина, минимальная schema/cleanup/capability и acceptance — [stages/AUTH-02a/STORAGE-DECISION.md](stages/AUTH-02a/STORAGE-DECISION.md). Это решение для исправления #389, не PASS реализации; product scope и численные лимиты прежние.

## 2. Целевая модель и существующие seams

Better Auth сохраняет владение user/account/session, password hashing, session cookies и Google OAuth/state. Нет второго identity store, session protocol, RBAC/Admin plugin, ownership recovery или нового OAuth provider. Связи и exact Owner binding остаются на неизменном `user.id`, независимо от email и способов входа.

| Существующее основание | Изменение задачи |
| --- | --- |
| `app/auth/auth.server.ts`: request-local runtime, canonical handler, explicit linking, DB limits | Mail/lifecycle capabilities; canonical HTTP и direct API enforcement; сохранить storage error classification |
| `session-write-guard.ts`, `db/account-state.ts` | Сохранить active-user lock; adapter guard участвует в общей lifecycle transaction без nested BEGIN/COMMIT |
| `registration-admission.ts`, SET-02 | Fresh create-user-only policy; verification/recovery existing account не являются новой регистрацией |
| `settings-account.tsx`, `request-context.ts`, SET-05 | Дополнить safe DTO email/status/pending и own actions; сохранить password change и session controls |
| `auth-client.ts`, `credential-view.tsx`, credential routes | Signup становится «проверьте почту»; verification/resend/forgot/reset, без предположения session по HTTP 200 |
| Existing `verification`, native `rate_limit` | Lifecycle state в verification, прежние native HTTP limits; дополнительные HTTP/direct budgets в `auth_lifecycle_budget` с независимым expiry |
| SA02 facts/attempt collectors, Owner History/Integrations | Расширить closed values и projections только по доказанным новым transitions; без второго журнала/probes |
| `workers/app.ts`, split DB capabilities | Request-scoped mail/challenge injection; auth использует web DB, localization-read — только готовые ресурсы |

Новые server modules внутри `app/auth/`: mail boundary/adapters/templates, lifecycle plugin/service, transaction scope, verification-state и abuse policy. Routes остаются thin parsing/origin/stale-expectation facades одного writer, не второй backend в Settings.

### 2.1. Canonical Better Auth extension

Одних configuration callbacks недостаточно:

- Verification JWT 1.7.7 привязан к email и expiry, без native single-use/user-ID ledger.
- Native reset потребляет DB token, затем отдельно меняет credential и опционально удаляет сессии; он также создаёт credential Google-only account. Atomic consume не доказывает atomicity целой операции.
- Native unlink считает account rows до удаления; hashless credential не является usable method, concurrent deletes могут пройти предварительную проверку.
- Drizzle transaction по умолчанию выключена; существующий guard коммитит отдельные защищённые adapter writes.

Использовать **один Vico Better Auth plugin** и existing guarded adapter. Source 1.7.7 подтверждает: plugin endpoint map перекрывает core по тому же endpoint key. Узкие lifecycle handlers для `verifyEmail`, `resetPassword`, `unlinkAccount` сохраняют canonical paths и operation IDs. Issuance (`sendVerificationEmail`, `requestPasswordReset`, `changeEmail`) и server-only `setPassword` проходят тот же state/policy boundary. Native middleware, internalAdapter, session и crypto переиспользуются; весь router/OAuth не копируется.

Замены сохраняют Origin/CSRF, body/query validation, fresh/sensitive-session checks, safe errors, private/no-store и cookie handling. Старый key не остаётся альтернативным callable маршрутом. Direct `auth.api.*` использует те же handlers. `setPassword` остаётся server-only, без HTTP alias и без возможности создать пароль без предусмотренного email proof.

HTTP Better Auth rate limiter не исполняется direct dispatcher. Обязательные общие budgets находятся в service/endpoint boundary для обоих путей; HTTP IP limits дополнительно сохраняются. Internal calls не могут обходить budget или дважды списывать один логический budget.

### 2.2. Transaction и порядок эффектов

Для terminal verify/reset/set-password/email-change/unlink — `withAuthLifecycleTransaction` на **том же request-local PG client**, которым пользуются Better Auth/Drizzle:

1. Parse, origin, budget и предварительная session/expectation проверка; дорогой password hash подготовить до длительного row lock, но это ещё не admission.
2. BEGIN + bounded transaction/statement/lock deadlines. Target определить из подписанного token + persisted state или authoritative session, не submitted email/user. Existing `assertActiveAccountForMutation` блокирует user row (`FOR NO KEY UPDATE`).
3. После lock отдельными statements перечитать AccountState, email, methods, session/freshness и operation state; stale preflight не является доказательством.
4. Conditional consume/CAS purpose/generation/phase → native identity/credential mutation → invalidation конфликтующих pending tokens → необходимое session revocation в одной transaction.
5. Проверить affected rows/invariants, COMMIT; только затем success, cookies/redirect и подтверждённые facts. Error → ROLLBACK и discard staged cookies/facts.

Transaction context явный и request-local: без global mutable state или распознавания SQL text. Внутри owned scope guard сохраняет selector/target checks, но не открывает и не коммитит отдельную transaction; вне scope действует прежняя standalone защита. Adapter `transaction` сохраняет wrappers через `runWithTransaction`/AsyncLocalStorage. Nested scope присоединяется к owner. Existing deletion tail сериализует concurrent session deletes на одном client, без interleaved transaction control. Provider send под user lock запрещён.

Signup user+credential также получают настоящую transaction; включить `transaction:true` без композиции guard недостаточно. OAuth/session regression должна доказать сохранение native rollback/proof semantics. Narrow plugin использует публичные exports; не импортировать неэкспортируемые internals и не менять dependency ради обхода без пересмотра плана.

Потеря COMMIT acknowledgement — uncertain outcome, без blind retry mutation/send. Следующее явное действие перечитывает актуальное состояние. После uncertain reset — обычный вход новым паролем либо новый recovery request; старый POST не replay автоматически. Нельзя объявлять success или rollback без доказательства.

### 2.3. Token state, replay и invalidation

Existing private `verification` хранит versioned lifecycle metadata в отдельном Vico namespace: purpose, immutable userId, normalized email snapshot, token digest, cryptographic generation/nonce, phase; для email change — newEmail, для authenticated proof — initiating session expectation. Expiry — existing `expires_at`. Password, session bearer, provider payload и raw token в Vico metadata не сохраняются.

Детерминированный **primary key purpose+userId** обеспечивает одну текущую операцию данного назначения; новый resend заменяет generation под user lock. Не полагаться на неуникальный `verification.identifier`. Token lookup использует digest, subject — signed claim/native opaque-token record; target из form/query запрещён. Native reset secret хранить с supported exact-version hashed identifier storage; настройку изолировать от OAuth и проверить fixtures.

Verification/email-change сохраняют Better Auth signing/crypto, но выдача plugin добавляет nonce и immutable subject/purpose. Persist digest/state **до** передачи письма. Terminal принимает только выданный current token с совпадающими subject/email snapshot/purpose/phase/expiry. Native email-only JWT без этой записи обхода не даёт. Это защищает и от переноса старого proof на другой user после повторного использования email.

Reset переиспользует native random token/verification store; Vico state связывает его с purpose/email generation. Conditional consume и credential/session effects находятся в одной transaction. Native consume отдельно от password write недостаточен.

После reset/set-password/credential change инвалидировать старые recovery/password-create operations. После email commit — также старые verification/email-change generations. Новый request заменяет старое поколение своего purpose. Начало email change не меняет рабочий login email. Конкурирующие terminal operations сериализуются; второй caller перечитывает актуальное основание первого commit.

Expired/replayed/tampered/wrong-purpose/missing tokens дают безопасную invalid/expired presentation, без private target. **GET landing не меняет credential/email и не погашает token**: явный POST confirmation защищает от mail scanners. Native state-changing verification GET закрывается/заменяется в canonical plugin, не только UI. Reset GET доставляет форму; password только POST body.

TTL: verification/email-change 3600 s; reset/password-create 1800 s. Проверять authoritative time при consume, не только landing. Старые Vico records заменяются при issuance; новая background cleanup подсистема и purge retained data не нужны.

## 3. AUTH-01 — mail foundation

**Scope:** один server-only provider-neutral boundary, Resend/Brevo adapters, безопасные templates/URLs, fake transport/config readiness. Без keys/DNS/реальных отправок.

Contract `sendAuthMail({purpose, recipient, locale, actionURL, operationId})` → `accepted | rejected | unavailable | uncertain | disabled`. Accepted означает transport acceptance, не inbox delivery. Recipient/body/URL/provider response не возвращаются в public outcome. Одновременно выбран один provider; explicit fake только local/test, не fallback при missing config.

- Resend: fixed documented HTTP email endpoint, Bearer, from/to/subject/html/text; opaque operation ID как idempotency key, без email/token. Brevo: transactional endpoint, `api-key`, sender/to/subject/htmlContent/textContent. Existing fetch/Web Crypto достаточны; SDK/dependency не добавлять. Host/headers не выбираются пользователем.
- Resend idempotency документирована на 24 h; Brevo equivalent не предполагается. Timeout/connection loss после отправки — uncertain, без automatic failover/retry. Различать configuration/rejection, 429 и transient error внутренне; наружу только safe outcome. Bounded timeout/response size/parser. Exactly-once delivery не обещать.
- Первая версия без queue/outbox/automatic retries: issuance commit → mail вне transaction → neutral response. Mail failure не создаёт session и допускает явный rate-limited resend. При uncertain resend новый generation делает старый link stale. DB и mail outcomes не смешиваются.
- HTML+text templates, escaped text/name, CRLF injection protection, fixed sender policy, bidi isolation URL/identifiers. Canonical English catalog, registry direction, existing request-scoped resource loader/fallback; EN/RU/HE coverage без фиксированного locale universe. Без machine translation calls в send path. Guest locale проверяется из действия; existing user — saved locale/fallback. Validated callback locale/return destination сохраняются до открытия письма в другом браузере.
- Trusted configured `BETTER_AUTH_URL`, server-built allowlisted auth paths и усиленный `credentialReturnPath`. Reject foreign/protocol-relative/backslash/encoded traversal/control characters/credentials/port tricks, вложенные callback/returnTo и token-bearing return URL. Host/forwarded headers не задают origin.
- Worker env: explicit mail mode/provider, sender, server-only key, bounded timeout и отдельный activation guard. Credentials не коммитятся и не сериализуются. Runtime injection позволяет fake/spy в connected harness; real adapter до Stage 6 не выбирается даже при случайном наличии key.

**Acceptance:** injected fetch contracts обоих adapters без сети; accepted/4xx/429/timeout/uncertain/no retry; fail-closed config/fake isolation; URL abuse/escaping/Unicode/RTL/fallback; secrets отсутствуют в errors/logs/client bundle. AUTH-01 не меняет signup/session behavior, поэтому возможен independent PR с полным review cycle.

## 4. AUTH-02 — mandatory verification

Зависимости: AUTH-01; §2 transaction/plugin/state и AUTH-05 abuse primitives внедряются **до** открытия endpoints. При необходимости bounded AUTH-02a = foundation/constraints/budgets, AUTH-02b = verification/UI.

Config: `requireEmailVerification:true`, explicit `autoSignIn:false`, `sendOnSignUp:true`, `sendOnSignIn:false`, `autoSignInAfterVerification:false`. Signup не выдаёт полноценную session; после verify нужен явный sign-in. Guest verify не переключает другой вошедший аккаунт. Google OAuth/admission/explicit linking сохраняются независимо.

Flow: signup → user+credential commit без session → verification state commit → fake mail → neutral pending UI → GET landing → явный POST consume + `emailVerified=true` → sign-in → safe return. Повторный signup existing email не создаёт identity/session и не overwrites password. Synthetic duplicate DTO не считается созданным account. Resend — отдельный neutral guest flow с одинаковым acknowledgement для missing/already-verified/inactive users, eligible active unverified получает новый generation.

Exact-version особенность: с mandatory verification signup catch превращает `createUser` 403 в synthetic success, затрагивая SET-02 closure и wrapped policy-read errors. Canonical boundary сохраняет исходный request-local admission outcome и восстанавливает controlled closure/503/unexpected error; не выводить успех из HTTP 200. Existing-user duplicate privacy и fresh-create gate различимы внутренне. Проверить HTTP и direct без зависимости от optional telemetry.

### Единый target contract и local/CI fixtures

D-01 применяется ко всей целевой email/password системе: до подтверждения email полноценный credential access недоступен. Проект pre-release; отдельной legacy-policy, grandfathering marker, исключения signInEmail и migration массового завершения прежних сессий в scope нет. Existing local/CI fixtures приводятся к новому контракту: pending verification проверяется настоящим flow, остальные сценарии получают verified fixture через test helper. Это не основание заранее проектировать rollout неустановленных реальных данных.

Возможный external data/cutover case проверяется по фактическому состоянию только перед отдельно разрешённым Stage 6; текущий план не требует нового продуктового решения или совместимости с гипотетическими пользователями.

**Acceptance:** signup без session/cookie; login до verify denied и после verify successful; duplicate не меняет password; expiry/replay/tamper/concurrent consume, resend latest-generation, mail failures, deactivation-first без durable effects. Закрытие registration flags не блокирует existing verify/login/recovery/linking. Google same-email не объединяет identities. Изменить устаревший auto-session контракт `forum-email-registration`; unrelated authz/forum tests получают verified fixtures через test helper, без production bypass.

## 5. AUTH-03 — recovery и password creation

Зависимости: AUTH-01/02 и общие abuse/state/transaction boundaries.

### Forgot/reset existing credential

`/:locale/forgot-password` принимает email и даёт одинаковый neutral acknowledgement для missing/inactive/ineligible/eligible. Mail outcome не различает existence через status/body; bounded response-time policy проверяется с одинаковыми failure classes, без обещания constant-time внешней сети. Limits до lookup.

Target eligible: active identity с существующим password method и требуемым verification status по AUTH-02. Unverified сначала проходит verification; reset не выставляет verified=true и не обходит D-01. Token bound к userId/current-email/purpose/generation, не ambient session. Registration closure не блокирует recovery.

POST reset: validate token и password 8–128 → native hash → lock/consume/update/invalidate pending/**revoke all target sessions** в одной transaction. `revokeSessionsOnPasswordReset:true` соответствует контракту, но сама настройка не доказывает atomicity. Нет automatic session; sign-in отдельный. При вошедшем другом account reset не переключает его, не отзывает его session и не раскрывает target; UI предлагает явный переход к sign-in.

### Google-only password creation

Только из own Account & security: active **fresh** session + expected user/session → mail proof current address → явный password submit. Purpose `password-create`, не anonymous reset. Google-only guest получает neutral forgot response; добавление начинается после Google sign-in. Это explicit addition к тому же user.id.

Один shared credential service с reset. Под lock creation требует отсутствия usable password, current subject/session/email proof; создаёт/заполняет native credential. Concurrent already-set password → conflict, не overwrite. Direct server-only `auth.api.setPassword` также требует proof, fresh session недостаточно. После создания сохранить initiating session, отозвать остальные own sessions в общей transaction. Google method сохраняется.

**Acceptance:** reset invalidates old password и все target sessions; new sign-in обязателен; SET-05 existing change сохраняет `revokeOtherSessions:false`. Один commit при double consume; разные reset tokens/password-change vs reset сериализуются и stale operations denied. AccountState-first и faults в consume/update/revoke/COMMIT не оставляют partial state. Google-only anonymous reset не создаёт credential; own proof creation создаёт ровно один; foreign/stale/not-fresh/no-proof denied. No enumeration/secrets; recovery не реактивация и не изменение Owner binding.

## 6. AUTH-04 — own Account & security completion

Зависимости: shared AUTH-03 credential service и AUTH-02 verification. Existing SET-05 password change, Google linking и own list/revoke-one/revoke-others не переписываются.

### Email/status/change

Safe DTO: current email/verified status, bounded pending kind/phase/expiry без token. Actions: same-origin, exact allowlisted intent/fields, duplicate rejection, expected user/session; stale → 409 без replay. UI не показывает saved до server revalidation; account switch очищает private state.

Change email требует fresh session и verified current address. Unverified сначала подтверждает старый адрес. **Предлагаемая техническая политика:** old-address confirmation → new-address verification → atomic email commit; старый email работает до final commit. Native `sendChangeEmailConfirmation`/`sendVerificationEmail` seams, `updateEmailWithoutVerification:false`; native legacy/immediate/new-email-only bypass закрыт canonical plugin. Потеря старого mailbox не открывает незаказанный support/Owner recovery.

Фазы связаны userId/current-email/new-email/generation. Old confirmation не меняет email/session; выдаёт новую phase/nonce для нового адреса. Повтор old phase не отправляет письмо повторно. Send failure оставляет безопасное pending state; явный rate-limited restart начинает новый generation. Final POST требует совпадающую fresh own session; guest возвращается к sign-in действующим методом, без native auto-session из link. Stale email/account/session/phase → conflict/invalid без mutation.

Final transaction: active user, current snapshot, token state и uniqueness normalized new email → email+verified update → invalidate старые recovery/verification/change → revoke other sessions, current сохранить и выставить cookie после commit. Два users за адрес: DB unique authority, один success, другой safe conflict без partial effects. Google provider/accountId не переписываются; прежний Google login остаётся той же identity. Owner binding/RBAC неизменны. Occupied email не раскрывает владельца.

### Google unlink / last usable method

Own UI выбирает native account row ID, freshly resolved server-side; active fresh session, expected user/session, explicit action. UI предлагает Google disconnect; direct canonical `/unlink-account` для любого разрешённого account подчиняется тому же invariant.

Usable password = собственный credential с непустым hash **и разрешённым credential access по mandatory-verification policy**. Usable Google = linked Google identity, допускаемая текущей login configuration; закрытие новой регистрации existing login не отключает. Hashless/unknown-provider rows не считаются usable. Временная внешняя доступность не измеряется live probe.

После user lock заново читать methods, проверять remaining usable set, удалять только freshly resolved own row. Enforcement также в guarded adapter delete/deleteMany callable auth paths, не только перед UI. Physical deletion/bulk removal остаются disabled. Concurrent Google/credential unlink, password creation/change/reset не могут оставить ноль методов. Unlink сам по себе не вводит forced global logout; existing sessions сохраняют native lifecycle.

**Acceptance:** email/status safe DTO; two-phase/interrupt/restart, GET без mutation, occupied-address race, replay/previous-email reuse, stale/freshness/account switch. Google-only нельзя unlink до verified password creation; password+Google можно; empty hash не обманывает. Concurrent HTTP/direct/persistence deletes сохраняют usable method. Deactivation commit ordering; regression sessions/password-change/stale Google link/exact Owner/unrelated identities.

## 7. AUTH-05 — anti-abuse foundation

Enforcement primitives входят в AUTH-02a и каждый flow с момента появления. AUTH-05 завершает matrix/challenge/config/adversarial coverage; безопасность resend/recovery не откладывается до этого этапа.

Сохранить DB `rate_limit`, trusted `cf-connecting-ip` и native buckets 1.7.7: sign-in/up/change-password/change-email 3/10 s; verification/reset mail requests 3/60 s. Native configuration/storage implementation и обычный last-request timestamp сохраняются. Settings и canonical shares native bucket; direct проходит common budget. X-Forwarded-For/X-Real-IP не принимаются как authority.

Дополнительный server-owned bounded policy:

| Операция | Enforced budget |
| --- | --- |
| Signup | 5/min trusted network + challenge; более строгий native краткий limit сохраняется |
| Mail verification/reset/create/email-change | 3/10 min HMAC(normalized target + purpose), 10/10 min network; own issuance дополнительно 5/10 min user |
| Terminal verify/reset | 10/10 min network; limiter storage failure не разрешает mutation |
| Own email-change/unlink/password-create | 5/min user + fresh checks/native HTTP limits |

Дополнительные counters независимы от existence, без plaintext email/token/IP; domain-separated HMAC server key, bounded input. Storage `auth_lifecycle_budget`: единственный PK key, positive integer count, finite `expires_at timestamptz`, cleanup index `(expires_at,key)`. Fixed window начинается при первом разрешённом consume на authoritative DB clock; expiry сохраняется внутри окна и обновляется только при истечении, denial не увеличивает count/expiry. Atomic upsert/CAS и bounded locked cleanup ≤64 expired rows только этой таблицы. Native sweep не владеет Vico counters; common budget больше не пишет в `rate_limit`. Полный contract — [STORAGE-DECISION.md](stages/AUTH-02a/STORAGE-DECISION.md).

Admission коммитится до domain transaction, включая уже списанные ранние buckets при последующем denial; failed domain work не возвращает attempts. HTTP/direct/nested используют существующий service/server-owned receipt. Future timestamp в native last_request, dummy native rule, private API или переписывание native cleanup не используются. Recipient budget ограничивает отправки, не account login/valid-token redemption. Unknown trusted IP → bounded shared unknown-network budget + target/user, не unlimited. DB outage → fail-closed 503, не memory fallback.

Atomic upsert/CAS unique key, multi-client native PG races; без read-then-write local counters. Path normalization защищает от aliases/trailing slash. Server-owned admission receipt исключает double counting nested call, клиент не присылает bypass. Safe 429 `Retry-After`/`X-Retry-After` проходят route/document; automatic retries запрещены.

Challenge interface `verifyRegistrationChallenge` → passed/rejected/unavailable; independent Google/email **fresh create** policy. Не заменяет SET-02 flag и не блокирует existing login/link/recovery. Google successful challenge связан с signed OAuth state; callback проверяет purpose/expiry/actual fresh-create policy. Client boolean/cookie недостаточен. Existing Google login не требует new-account challenge.

В repository/local-CI реализовать provider-neutral verifier contract, request-scoped injection и explicit fake fixtures, покрывающие passed/rejected/unavailable, invalid binding, expired/replayed proof и timeout/uncertain. Provider-required mode без verifier fail closed, а не включает fake fallback. Format/token limits, TTL, replay guarantees и hostname/action binding принадлежат будущему выбранному adapter; numeric Turnstile-specific values не являются общим контрактом. Конкретный anti-bot provider, SDK/HTTP adapter, widget/sitekey/secrets и real resources сейчас не выбираются и не реализуются. Turnstile остаётся лишь исследованным candidate, не implementation dependency. Existing database-backed rate limits обязательны независимо от будущего provider; его выбор/активация — отдельная Stage-6 работа.

**Acceptance:** HTTP/Settings/direct parity и no double count, multi-client burst, canonical target variants, spoofed/unknown network, config/storage failures, HMAC key rotation, challenge negatives без user/session/mail effects. Real native HTTP sweep при short-window reset сохраняет live Vico 600 s counter; Vico cleanup не затрагивает native/live/locked/renewed rows. DB-clock expiry, unchanged native limits, new schema/manifest/runtime capability probes обязательны. UI 429/explicit retry/no enumeration. Passive SA02 telemetry не считается enforcement.

## 8. Наблюдаемость и изменения contracts/schema

### Facts/attempts — часть каждого этапа

Расширить `owner-auth-facts.ts`, `owner-sa02-catalog.ts`, proof collectors и safe projections согласованно. New exact kinds: `auth.emailVerified`, `auth.emailChanged`, `auth.methodUnlinked`. Password creation — existing `auth.methodLinked` с closed context `password-create`; reset — `auth.passwordChanged` с context `reset`, existing change — `change`. Session deletions: причины password-reset/password-create/email-change с actual affected-row proof и bounded gaps. Anonymous reset не выдумывает authenticated actor.

Буферизовать facts до outer commit; rollback/zero-row/uncertain commit не дают success fact. Existing creation/deletion evidence не превращать в pre-commit emitter после включения настоящих transaction. Mail outcome — bounded operational observation/attempt по purpose/provider/outcome, не identity transition/delivery proof. Recording best-effort, не меняет auth result; сохранить quotas/gaps/source IDs/retention.

New attempt operations: email-verification, verification-send, password-reset-request, password-reset, password-create, email-change, unlink-account, registration-challenge. В одном bounded diff расширить enum, `db/schema.ts` CHECK, **forward migration** DB CHECK из 0063, writer/collector/http mapping, safe labels, global/scoped/target filters/paging. Accepted 0063 не менять; direct+nested HTTP не дублируются.

Email facts → accounts.users/security.auth; methods/password → accounts.methods/security.auth; sessions → accounts.sessions/security.auth. Один source identity, без копий журнала. `owner-user-history`, `owner-account-history`, SA02/SA08 и Integrations должны понимать новые closed values. Integrations показывает configuration presence и retained observed outcomes с qualifier, не health по наличию key; никаких outbound probes на Monitoring GET и новой Monitoring area.

No password/hash/cookie/token/raw email/URL/query/provider errors/challenge response в facts/attempt/logs/DTO. Own email только private Account DTO/mail. New responses private/no-store; token pages `Referrer-Policy:no-referrer`, без analytics/third-party resources. После безопасного in-memory получения token удалить его из address bar; не storage. Native logger на новых путях не печатает email/body/token.

### Необходимость schema/dependencies/runtime

| Область | План |
| --- | --- |
| Native auth schema | Existing fields достаточны; legacy marker, нового identity/session store и migration массового завершения прежних sessions нет |
| Account uniqueness | Forward unique `(provider_id, account_id)` и partial unique credential owner (`user_id` WHERE provider=credential) для concurrent identity linking/creation. Сейчас только userId index. Duplicate preflight останавливает migration, не merge/delete identities автоматически |
| Verification | Existing columns + purpose/user PK/versioned metadata, без blanket unique(identifier), меняющего native semantics |
| Lifecycle budgets | Forward `auth_lifecycle_budget`: HMAC key PK, count, finite expires_at + cleanup index; независимость от native rate_limit cleanup. Web-only CRUD capability/provisioning/parity probes; localization-read без доступа. Без external provisioning |
| Attempt CHECK | Forward SQL/schema/metadata с existing-row compatibility по мере добавления operations |
| Auth facts | Existing generic `owner_events`; проверить closed constraints/catalog/projections, новые таблицы/ACL не нужны |
| Dependencies | Pinned Better Auth/adapter без upgrade, no provider SDK; existing fetch/Web Crypto/public exports. Если export не покрывает extension — остановить affected slice для пересмотра, без private imports |
| Runtime | Explicit mail/challenge modes, request capabilities, server-only placeholders; existing cookie/DB split |
| Public contracts | Signup без session, новые locale routes/explicit POST confirm, safe AccountSecurity DTO/actions/errors/429; более строгие native API proof restrictions |

Migrations нумеровать от актуальной implementation history; accepted `0000–0072`/snapshots не переписывать. Budget migration следует за `0073` account uniqueness (при текущем основании — `0074`). Проверять clean DB и pre-existing fixtures. Structural manifest/relation/privilege probes обновлять по фактическому contract; новая budget table получает exact repository web CRUD contract, без расширения localization/default ACL или external provisioning. External migration evidence не менять local разработкой.

## 9. AUTH-06 — whole-lifecycle/security acceptance

Каждый этап доставляет свои tests; AUTH-06 собирает полную feature на stable head, не откладывает безопасность ранних flows.

| Уровень | Доказательство |
| --- | --- |
| Unit/route | URLs/templates/config/adapters/locale, DTO/forms/origin/stale/fresh/no-store/typed errors, no leakage |
| Native PostgreSQL 17 + Better Auth | Real issuance/consume/hash/sign-in/cookies, constraints/transactions, multi-client races/fault injection |
| Built Worker HTTP | Pre-routing session/cookie order, canonical+Settings, classified 503/429/trusted ingress, injection/no outbound |
| Connected Chromium | Signup→fake inbox→verify→login→email/password change→Google-only password creation→unlink→sessions→recovery→re-login; account switch/back/refresh, keyboard/responsive/LTR/RTL |
| Schema/runtime | Clean migrations/parity/history guard, applicable structural/privilege probes, builds/client secret scan |

Regression foundation: database auth-runtime/account-security/auth-link-identity/auth-rate-limit-concurrency/registration-auth-admission/forum-email-registration/sa04-session-atomic/sa02-auth-creations/password-change/session-deletion/oauth-rollback, facts/attempt/History; browser Settings/SA04/SA08. Не удалять unrelated негативные контракты ради новых fixtures. New lifecycle suites/connected script включить в применимые `run:acceptance` filters: один label без исполненного workflow не проверка.

Обязательная matrix:

1. New credential pending/verified/login, independent Google, explicit linking/no same-email claim, duplicates, return injection.
2. Missing/inactive/unverified/verified accounts, pending signup без session, registration flags во всех комбинациях, closure vs unavailable.
3. Expiry/replay/wrong-purpose/phase/tamper, resend latest-generation, старые tokens после email/password changes, email reused другим user.
4. Reset/create/change proof, SET-05 current-password и session policy; foreign ambient session, stale/freshness, own/other/all revocation.
5. Two-phase email change/occupied race/mail failure/restart, account switch, Google identity неизменна.
6. Last usable method, empty hash, concurrent unlink разных methods/set/reset/change на HTTP/direct/persistence.
7. Deactivation vs issuance/consume/verify/reset/link/unlink/email commit — оба порядка, separate clients/barriers. State-first без новых durable auth effects; write-first сохраняет commit. Inactive own signed sign-out доступен, recovery не reactivation.
8. Fault после каждого critical statement/consume/update/revoke/commit, lock/statement timeout/connection loss/mail uncertain/observation failure; без partial state/false fact/automatic retry.
9. Anti-abuse HTTP/direct/Settings parity, burst/spoofed/unknown IP/challenge failures; no secrets в responses/logs/History.
10. Exact Owner/RBAC, SET-02/05, retained AccountState/public neutral identity, scoped/global/target History original IDs/paging и inert Integrations GET.

Fake inbox только private disposable harness, не debug route в application/production. Google local transport не считается real OAuth. Egress spy должен fail при попытке real mail/challenge/provider request.

Applicable implementation CI — одноразовый `run:ci`, browser/connected — `run:acceptance`, с проверкой реально исполненных suites и exact SHA. Local checks при необходимости: lint/typecheck/unit, db:check, db:test только `_test` DB, build/Worker smoke. Planning service PR не запускает CI и эти labels.

**Done:** evidence matrix exact head/suites/actual results/limitations; нет current-scope blockers, critical negative/race/failure invariants связаны с исполняемым evidence. Green existing CI без новых flows не PASS.

## 10. AUTH-07 — pre-Stage-6 security gate

Отдельная проверка final assembled feature после AUTH-06; не implementation пакет и не замена review cycle. Author self-check/applicable checks → whole-feature coordinator review Миры → независимая техническая проверка назначенного reviewer на **том же stable exact head**. Исполнитель независимо собственную реализацию не проверяет; Марк по отдельному назначению; reviewer не получает merge/activation authority.

Gate связывает D-01–D-10 с AUTH-06 evidence: identity isolation/explicit linking, immutable subject/purpose/current generation, recovery+session revocation, usable-method под lock, AccountState/retention, direct/HTTP/origin/freshness, multi-write atomicity/uncertainty, rate/challenge, privacy/History proof, no hidden activation.

PASS только без подтверждённых current-scope defects и непроверенных critical invariants. Findings одним пакетом реализатору; исправления → соответствующий цикл на новом head. Дефект архитектуры сначала исправляет PLAN. Stage REVIEW/RESULT создаются при реальном gate с evidence, не заранее. Repository PASS не deployed security acceptance.

## 11. Зависимости и поставка — решение Миры

| Slice | Основание | Самостоятельность |
| --- | --- | --- |
| AUTH-01 | main | Independent возможен при disabled send и прежнем auth behavior |
| AUTH-02a transaction/plugin/state/limits/constraints | AUTH-01 | Foundation вертикали; intermediate merge нежелателен без доказательства совместимости old flows |
| AUTH-02b verification/UI | AUTH-02a | Новый signup/session contract; mail/resend/abuse и согласованные local/CI fixtures обязательны |
| AUTH-03 recovery/create | AUTH-02 | Shared credential/state/session boundaries |
| AUTH-04 email/unlink | AUTH-03 | Shared invalidation и новая usable-method policy |
| AUTH-05 completion | Primitives 02a, flows 02–04 | Завершение challenge/budget/config, baseline enforcement уже доставлена |
| AUTH-06 | AUTH-01–05 | Whole vertical evidence |
| AUTH-07 | Final AUTH-06 head | Review/gate, затем merge владельцем |

Coordinator decision: **AUTH-01→AUTH-06 выполняются одним stacked delivery**, потому что это одна зависимая authentication vertical и промежуточный merge foundation-кода в `main` не нужен. AUTH-07 выполняется как финальный gate на собранном stable exact head. Первый implementation PR AUTH-01 создаётся от текущего `main`; каждая следующая ступень имеет base на предыдущую.

Stack: первый PR от current main, следующий с base на head предыдущего и bounded diff; author self-check/checks → coordinator checkpoint PASS → следующая ступень, без independent review/intermediate merge. Изменение нижней ступени синхронизирует верхние. Final head перенести в первый PR, промежуточные закрыть superseded; final author/whole-feature coordinator/independent review/gate на одном head. Service files #320 в implementation ветки не переносить. При изменившемся main пересмотреть affected plan/evidence, не механически наследовать baseline.

## 12. Docs closeout и Stage 6

Отдельный docs PR после implementation/review/merge: PROJECT/PROJECT_STATE/ROADMAP, SETTINGS, AUTHORIZATION, SUPER_ADMIN, при необходимости профильный auth lifecycle contract. Только фактически доставленное поведение; exact review/check evidence в `docs/PROJECT_HISTORY/` + index. Сейчас main «verification/recovery отложены» остаётся правдой.

Stage 6 **BLOCKED — explicit owner resume required**. Затем новый operational plan against current external state: pending schema-first migrations/evidence/least-privilege runtime, фактический recheck external accounts/data перед rollout, preview/private-data isolation, provider accounts/domains/DNS/SPF/DKIM/DMARC/from/keys, real Resend и Brevo send/delivery/failure acceptance (один выбранный одновременно), production Google OAuth/exact Owner binding, выбор и acceptance anti-bot provider при необходимости, hostname/action/resource policy и edge limits, deployed browser/lifecycle/backup/rollback acceptance. Это prerequisites, не разрешение выполнять их сейчас.

Repository PASS не подтверждает mailbox delivery/reputation, provider health/DNS, real challenge/edge или production rollout. Merge, Monitoring GET и наличие env variable не активируют внешние ресурсы.

## 13. Передача

Correction review Миры: **PASS**. Delivery mode зафиксирован: stacked AUTH-01→AUTH-06, затем AUTH-07 final gate. Первый implementation stage — AUTH-01, исполнитель Лёва по прямому назначению владельца. Поскольку Лёва участвует в implementation, независимый final technical reviewer определяется отдельно. Оперативный переход — [WORKFLOW.md](WORKFLOW.md).
