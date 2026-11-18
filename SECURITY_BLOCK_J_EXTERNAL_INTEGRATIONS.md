# Block J — External integrations security audit

## Статус

1. Scope создан 2026-11-18; current J3 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Blocks A–I уже закрыты как audit blocks; их findings в J не дублируются.
3. **J1 — Current integration inventory & activation boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. **J2 — Google OAuth external-provider boundary завершён: 0 новых current-scope findings + 1 deferred Stage-6 blocker — `GOOGLE-OAUTH-SCOPE-01 Low/P3`.** Exact provider identity/state/PKCE/callback/origin/account-selection paths PASS apart from already-owned Block-B findings; prepared direct OAuth surface accepts caller-selected additional Google scopes beyond Vico's authentication-only product need.
5. **J3 — Email provider boundary завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** Sender/verification/recovery implementation отсутствует; Better Auth 1.7.7 send/reset endpoints fail closed when sender callbacks are not configured.
6. Current repository имеет Google OAuth foundation и translation provider/Queue abstractions, но source-of-truth и runtime wiring подтверждают отсутствие live Google OAuth acceptance и отсутствие active translation provider/Queue execution.
7. Resend/Brevo/email-delivery integration в current `main` отсутствует; email verification/password recovery намеренно не реализованы.
8. Следующий bounded slice после продолжения владельца — **J4: Translation provider data egress**.
9. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
10. Production/provider/Cloudflare/GitHub settings mutation, OAuth client creation, email account/provider activation, Queue/provider activation и external calls не разрешены и не выполнялись.

## J1 — результат

1. Verdict: **PASS — 0 current-scope findings, 0 deferred blockers.**
2. J1 устанавливает фактическую external-integration surface до provider-specific review и не объявляет future abstraction текущей уязвимостью.
3. **Google OAuth foundation присутствует.** Canonical Better Auth `1.7.7` config получает server-side `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` и объявляет provider `google`; repository/local-CI покрывает registration/linking через synthetic provider boundaries.
4. Current source-of-truth фиксирует: **real Google OAuth configuration и interactive smoke не завершены**, Stage 6 external integration paused, production Worker rollout с real auth configuration не выполнен. Live Google callback/token exchange поэтому не является current deployed attack surface.
5. `googleParametersPresent()` в Monitoring проверяет только наличие двух строк и прямо не является credential validation/provider-health probe; Monitoring не активирует OAuth и не делает внешний call.
6. **Email provider integration отсутствует.** Search current `main` не нашёл Resend, Brevo, `sendEmail`, `forgotPassword` или `resetPassword` implementation. Better Auth email/password включён, но `requireEmailVerification:false`; Settings contract исключает password reset/recovery.
7. **Translation provider foundation присутствует, live execution — нет.** `TranslationProviderRouter` и `CloudflareM2m100TranslationProvider` реализуют adapter/capability/data-policy boundary. M2M100 adapter прямо документирован как local/CI provider adapter; binding provisioning/live Workers AI acceptance остаются Stage 6.
8. Current Worker wiring fail-closed: `contentGenerationActionContext` получает `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`; integration facts фиксируют `providerWired:false`, `enqueuerWired:false`, `consumerWired:false`. `wrangler.jsonc` не содержит Workers AI или Queue binding.
9. **Cloudflare Queue transport не активен.** Durable translation task/domain abstractions существуют в PostgreSQL, но current runtime не содержит Queue producer/consumer binding. Source-of-truth отдельно оставляет real Cloudflare Queues, production provider credentials/calls и provider/Queue acceptance Stage 6.
10. Attachment R2 и Hyperdrive не переносятся в J: attachment storage уже принадлежит Blocks F/H, DB/Hyperdrive — G/H. Current `wrangler.jsonc` также не содержит R2 binding; optional `ATTACHMENT_R2` wiring не образует новый J root cause.
11. AdministrativeRouting foundation допускает trusted future producer с иными bases/origins, но default same-origin, а Worker не устанавливает external routing producer. Review #317 уже классифицировал cross-origin activation как future Stage-6 design/acceptance, не current defect.
12. Repository search не нашёл current webhook receiver/third-party callback integration кроме Better Auth OAuth route family. Provider callback/redirect/token semantics будут проверяться в J2.
13. Отсутствие live external integration само по себе не finding. Concrete repository foundation defect считается current только если уже влияет на current Stage; prepared Stage-6 defect — deferred blocker только при доказанной causal path.
14. #315 aggregate остаётся **28 current findings + 3 deferred Stage-6 blockers**.
15. Следующий bounded slice: **J2 — Google OAuth external-provider boundary**. Не дублировать Block B internal authentication/session findings и Block I secret custody; J2 проверяет provider trust/callback/configuration/data-exchange boundary.

## J2 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`, installed `better-auth@1.7.7` / `@better-auth/drizzle-adapter@1.7.7`. Exact upstream source was checked at Better Auth tag `v1.7.7` commit `db02f233918ad1233bf0753e437e1c0da353273d`.
2. Verdict: **0 новых current-scope findings + 1 deferred Stage-6 blocker — `GOOGLE-OAUTH-SCOPE-01 Low/P3`.**
3. Product boundary is authentication/linking only. PROJECT/ROADMAP require Google OAuth as a sign-in method; no current Vico feature requires Google Drive/Gmail/Calendar or another Google API capability.
4. Vico config correctly keeps `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` server-side, sets Better Auth `baseURL`, configures one Google provider and leaves origin/CSRF/state checks enabled. No custom authorization/token endpoint override exists.
5. Exact Better Auth redirect flow uses a random state plus PKCE code verifier. With Vico's stateful DB adapter, state is stored in verification storage and correlated with a signed browser cookie; callback consumes/deletes the verification record and rejects missing/mismatched/expired state.
6. Caller-provided `callbackURL`, `errorCallbackURL` and `newUserCallbackURL` are checked by Better Auth against trusted origins before state generation. Vico additionally supplies only forum-local locale-bounded relative destinations from its own client. No external open-redirect path was established.
7. Google's exact built-in provider uses Google's fixed authorization/token endpoints, default `openid email profile` scopes and stable raw Google `sub` as provider account subject. Direct client-supplied Google ID-token sign-in is verified through provider JWKS / issuer / audience / max-token-age before user info is trusted.
8. Explicit linking remains provider-bound: Vico disables implicit linking; Better Auth's `trustedProviders` defaults empty; link requires provider-verified email for an untrusted provider, same email unless explicitly configured otherwise, and refuses a provider account already owned by another user. Vico's request hook additionally checks authoritative current session against `x-vico-link-user` before link state is minted.
9. The known callback-after-session-revocation weakness remains **`AUTH-LINK-01 Moderate/P2` owned by Block B**. J2 does not duplicate it.
10. Better Auth callback forwarding of provider `error_description` to the validated same-origin error URL remains **`AUTH-OAUTH-01 Low/P3` owned by Block B**. Vico's credential loaders render only generic/local allowlisted error states; J2 does not duplicate it.
11. Own-account token selection PASS: exact Better Auth `/get-access-token`, `/refresh-token` and `/account-info` resolve the current session user first and search only that user's account rows. Supplying another `userId` with a session does not select another user. No cross-account provider-token IDOR was established.
12. **Prepared scope boundary is broader than Vico's product contract.** Exact Better Auth `/sign-in/social` and authenticated `/link-social` schemas accept caller-supplied `scopes: string[]`; those scopes are forwarded to Google's authorization URL. Vico exposes the canonical `/api/auth/*` handler wholesale and has no application-level allowlist restricting those request scopes to the identity-only set. Vico's own UI currently sends no extra scopes, but direct HTTP can.
13. Better Auth's Google provider also defaults `include_granted_scopes=true`. Google documents that this enables incremental authorization and can cause newly issued access tokens to cover previously granted scopes in addition to the current request. Google recommends requesting the smallest scopes needed for the specific application task.
14. After explicit Google consent, Better Auth persists the returned provider token/scopes in the account row and provides an authenticated own-account `getAccessToken` API. Current Vico does not enable `account.encryptOAuthTokens`; Better Auth documents its default as false. This storage detail is **not** a separate finding here because no DB-only exploit or cross-user token read is proven, and baseline identity scopes mostly duplicate data Vico already retains.
15. The concrete J2 risk is therefore capability expansion: once real Google OAuth is activated, a user can use Vico's OAuth client to request Google API scopes unrelated to Vico authentication, then let Vico retain/return the resulting own-account bearer capability. That unnecessarily enlarges the authority attached to a Vico integration and the blast radius of a later Vico client/runtime/DB compromise.
16. No silent grant or victim-account takeover is proven: Google consent remains required for additional scopes, current account selection is own-user-only, and no live Google OAuth acceptance exists today. Stage 6 is paused, so this is **deferred Low/P3**, not a current finding.
17. **Correction gate:** before real Google OAuth activation, the effective Vico OAuth surface must be constrained to the provider capabilities actually required by the product. At minimum, the direct request path must not be able to expand Google scopes beyond the approved authentication set merely because Better Auth supports generic incremental authorization. Whether unused token-return endpoints are disabled/filtered and whether `includeGrantedScopes` is kept or disabled is an implementation decision for a later remediation plan, not prescribed by this audit.
18. Production Google client configuration remains **Информация не проверена** because Stage 6 has not configured/accepted it. Before activation, exact `BETTER_AUTH_URL`, Google Web OAuth client type, authorized redirect URI `https://<production-origin>/api/auth/callback/google`, client/secret placement and deployed OAuth/session/logout smoke must be checked. Absence of that future configuration is not itself a finding.
19. Google email authority nuance was reviewed: Google warns that `email_verified` on non-Gmail/non-Workspace addresses does not make Google permanently authoritative for the third-party mailbox. Vico does not use Google email to appoint Owner and disables implicit same-email linking; explicit linking additionally requires the already-authenticated local account. No separate takeover path was established.
20. No OAuth client, credential, provider call, login/callback smoke, production dispatch or setting mutation was performed. J2 was source/configuration analysis only.
21. #315 aggregate becomes **28 current findings + 4 deferred Stage-6 blockers**.
22. Next bounded slice: **J3 — Email provider boundary**.

### `GOOGLE-OAUTH-SCOPE-01` — Low/P3 — deferred Stage 6

**Root cause:** Vico exposes Better Auth's generic social OAuth request surface without an application-level Google-scope allowlist, so direct callers can add arbitrary provider scopes even though Vico's approved Google integration is authentication/linking only.

**Prepared Stage-6 impact:** after user consent, Vico can acquire, persist and expose an own-account Google bearer token with authority unrelated to Vico's product needs, increasing provider abuse/reputation surface and blast radius of a later Vico compromise.

**Boundary:** no live Google OAuth acceptance exists, Stage 6 is paused, Google consent is required, and cross-user token selection/takeover was not established. Therefore this is a deferred Low/P3 correction gate, not a current-stage finding.

## J3 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`, installed `better-auth@1.7.7`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Current product/source-of-truth is explicit: email/password sign-up/sign-in are active, but email verification, transactional email sender and password recovery remain intentionally deferred. First production release does not require verification/recovery.
4. Repository search found **no Resend, Brevo, SMTP, Nodemailer, Mailgun, Postmark, SendGrid or generic `sendEmail` integration**, no email-provider SDK dependency, no sender module, no provider API endpoint, no provider webhook/bounce receiver and no corresponding API-key/runtime env field.
5. Current `BetterAuthEnvironment` contains only Better Auth + Google OAuth values. `package.json` has no email-provider dependency and `wrangler.jsonc` has no email-provider binding/configuration.
6. Exact Vico Better Auth config uses `emailAndPassword.enabled=true`, `requireEmailVerification=false`, password length limits only; it does **not** set `emailAndPassword.sendResetPassword` and does **not** configure `emailVerification.sendVerificationEmail`.
7. Exact Better Auth `v1.7.7` source confirms `POST /request-password-reset` checks `sendResetPassword` first and returns `RESET_PASSWORD_DISABLED` before looking up the user, creating a reset verification row or calling any external sender.
8. Exact Better Auth `v1.7.7` source confirms `POST /send-verification-email` checks `emailVerification.sendVerificationEmail` first and returns `VERIFICATION_EMAIL_NOT_ENABLED`; no email is sent without the callback.
9. Current Vico sign-up does not manufacture verification flow: Better Auth computes `shouldSendVerificationEmail` from `sendOnSignUp ?? requireEmailVerification`; with current Vico `requireEmailVerification=false` and no `sendOnSignUp`, the branch is false.
10. Current Vico client/UI exposes only email sign-up, email sign-in and Google auth. There is no password-recovery/forgot-password control, verification-email action or locale route implementing reset UI.
11. Canonical wildcard `/api/auth/*` still exposes Better Auth's built-in reset/verification route family, but without sender callbacks the initiation endpoints are disabled. Random direct `/reset-password` tokens have no creation path from current Vico email flow. No active external-email trust/data-egress boundary is therefore present.
12. There is no provider credential to audit, no bounce/webhook input, no sender-authentication configuration and no provider-side retained payload in current repository/runtime. Those checks become applicable only when an email provider is actually integrated.
13. Enumeration findings from ordinary email sign-up/auth remain owned by **Block B**; J3 does not duplicate `AUTH-ENUM-01`. Provider-specific email enumeration cannot exist without a current sender/provider path.
14. Future nuance, **not a finding now**: Better Auth 1.7.7 reset-password can create a credential account when a valid reset token belongs to a user without one. If Vico later implements recovery, Google-only-account password creation must be checked against the then-approved product contract. J3 plan explicitly says absent sender/recovery is closed as not-active rather than treated as a future defect.
15. Resend/Brevo provider choice, sender-domain authentication, API-key scope, bounce/webhook verification, reset-token delivery, callback presentation and data minimization are **Информация не проверена** because no concrete provider integration exists to inspect. This is not a blocker for current Stage or Stage 6 as presently defined.
16. No email account, API key, sender domain, webhook, external provider call, package install, deployment or setting mutation was created/performed.
17. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
18. Next bounded slice: **J4 — Translation provider data egress**.

## Цель

Проверить external provider/integration boundaries Vico Forum так, чтобы:

1. внешний provider не мог подменить application identity/authority вне утверждённого authentication contract;
2. provider callback/redirect/input не создавал open redirect, SSRF, confused-deputy или cross-account path;
3. external credentials/tokens/data не передавались provider'у шире необходимого и не возвращались в client/logs;
4. provider/Queue failure, retry и replay не приводили к duplicate protected mutation, unbounded cost или stale publication;
5. внешний API не превращался в публичный unauthenticated proxy;
6. provider-specific trust/attribution/data-handling policy применялась до data egress;
7. Stage-6 activation была fail-closed и не обходила уже проверенные auth/DB/runtime/supply-chain gates.

## Current scope

1. Google OAuth: provider-specific redirect/callback/state/token/account-link trust boundary, registration/provider admission и deployment configuration handoff.
2. Email providers только если/когда repository содержит sender/verification/recovery integration.
3. Translation providers: provider routing, capability/data-policy admission, raw content egress, response validation, provenance and failure classification.
4. Cloudflare Queues/background provider execution: producer/consumer trust, durable identity, replay/idempotency, retry/DLQ/reconciliation, cost/abuse admission.
5. Future third-party callback/webhook/outgoing seams только когда concrete current/prepared path существует.
6. Integration monitoring только для provider truthfulness/secret-safe status; общий monitoring/incident response остаётся поздним Block L.
7. Stage-6 external activation — deferred blocker только если concrete prepared path уже технически unsafe.

## Anti-duplication

1. **Block B:** internal authentication/session/account-link authorization semantics. J проверяет external provider trust/data exchange.
2. **Block C:** application permissions/Owner authorization.
3. **Block F:** attachment content/storage admission.
4. **Block G:** DB privilege/migration semantics.
5. **Block H:** Worker routing/version/preview/runtime mechanics.
6. **Block I:** secret custody, GitHub Environments, source/dependency provenance.
7. **Block K:** generic abuse/availability; J оставляет provider-specific cost/retry amplification.
8. **Block L:** monitoring/incident response, если root cause не provider integration itself.
9. One root cause → one finding ID.

## План проверки

### J1 — Current integration inventory & activation boundaries
1. Enumerate provider adapters, callbacks, external transport/bindings and deployment state.
2. Separate active runtime from local/CI foundation and paused Stage-6 activation.
3. Identify ownership boundaries with prior Blocks.
4. No finding for absent/unactivated future provider.

### J2 — Google OAuth external-provider boundary
1. Exact Better Auth Google configuration and provider callback/state/redirect contract.
2. Provider identity/email verification and explicit-linking boundary without duplicating Block B.
3. Return/callback URL validation and provider error projection.
4. Token/provider-private data custody at application boundary.
5. Stage-6 Google client/redirect configuration gates.

### J3 — Email provider boundary
1. Re-evaluate only if sender/verification/recovery implementation exists.
2. Sender authentication, verification/reset token lifecycle, enumeration and callback/link safety.
3. Provider credentials, bounce/webhook path and data minimization.
4. If absent, close as not-active without implementation work.

### J4 — Translation provider data egress
1. Provider selection/capability/data-policy before raw content egress.
2. Public/private content classification.
3. Request size/segmentation and provider-specific locale mapping.
4. Response validation/provenance/attribution.
5. No synchronous public-provider proxy.

### J5 — Queue/provider execution lifecycle
1. Durable task before enqueue and message identity.
2. Consumer stale/claim fences.
3. Provider-call crash window and replay/idempotency.
4. Retry/DLQ/reconciliation and bounded provider cost.
5. Queue/provider credentials and untrusted message fields.

### J6 — External callback/webhook/outgoing seams
1. Concrete webhook/callback receivers outside OAuth, if any.
2. Signature/origin/nonce/replay verification where applicable.
3. Outgoing administrative/external routing only if activated.
4. SSRF/open redirect/confused-deputy checks on controlled URLs.

### J7 — Failure/data-retention/cross-provider boundary
1. Provider outage/degraded/fail-closed behavior.
2. Provider response/error/log data minimization.
3. Retained external identifiers/tokens/provenance lifecycle.
4. Cross-provider fallback must not weaken data policy or identity trust.

### J8 — Cross-chain closeout
1. external request/data → provider → callback/response → durable state;
2. dedup B/I/H/K/L;
3. current-vs-Stage-6 severity validation;
4. record provider activation correction gates; remediation remains separate.

## Finding criteria

1. Concrete repository or prepared provider path.
2. External provider/input/callback/transport crosses a trust boundary incorrectly.
3. Observable impact on identity, protected mutation, private data, credential/token exposure, stale publication or provider-specific cost/abuse.
4. Root cause belongs J rather than B/H/I/K/L.
5. Current Stage affected, or concrete prepared Stage-6 path requires a deferred correction gate.

## Ограничения

1. Не создавать OAuth clients, email accounts, provider API keys, Queue bindings или webhooks.
2. Не выполнять live provider calls, login/callback smoke, Queue dispatch или production deployment без explicit owner authorization.
3. Не читать/публиковать secret values.
4. Не менять production/provider/GitHub/Cloudflare settings.
5. Не реализовывать отсутствующие future integrations во время audit.
6. Пока над #315 работает одна Мира, PR comments для внутреннего обсуждения не использовать.

## Следующий шаг

1. После продолжения владельца выполнить **J4 — Translation provider data egress** на current main и остановиться после результата.
2. `AUTH-ENUM-01`, `AUTH-LINK-01`, `AUTH-OAUTH-01` и `GOOGLE-OAUTH-SCOPE-01` не дублировать. Remediation существующих findings/blockers не начинать без отдельного назначения.
