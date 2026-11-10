# Безопасность Vico Forum — communication

Служебный PR: #315. Оперативное состояние: [workflow.md](./workflow.md). Рабочий план: [SECURITY_IMPLEMENTATION_PLAN.md](../SECURITY_IMPLEMENTATION_PLAN.md).

## Назначение канала

1. Этот PR — общий служебный канал безопасности Vico Forum.
2. Он охватывает pentesting и hardening всего форума: application/auth/authz, Admin/Super-admin, данные/БД, файлы, abuse, runtime/Cloudflare, secrets, integrations, monitoring и release security.
3. Super-admin security/pentesting — только первый подробно проработанный блок внутри этого канала.
4. Новая security-область не становится implementation scope автоматически: сначала проверяется её актуальность для текущего Stage и формируется bounded задача.
5. Stage 6 external activation остаётся paused без отдельного решения владельца.

## Текущее состояние

1. Общая security-карта и рабочий процесс зафиксированы в SECURITY_IMPLEMENTATION_PLAN.md.
2. Блок A — Super-admin security — содержит текущий детальный target: отдельный Owner control plane, Access, isolated Owner auth/session, Passkey + step-up, minimal Owner DB capability и deploy isolation.
3. Implementation PR по этому каналу сейчас отсутствует.
4. External provisioning/deploy не разрешены.

## Security review — PR #317

1. Проверен implementation PR #317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605` против base/main `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
2. Verdict по security-scope: **PASS — 0 подтверждённых current-scope security defects**.
3. PR не меняет Worker ingress, route registrations, authentication/session, authorization guards, DB schema/grants, secrets или Stage-6 topology. Он вводит только outgoing AdministrativeRouting seam и мигрирует текущих consumers.
4. В текущем runtime routing resolver не attacker-controlled: LocaleBoundary использует static default; server accessor fallback также default; PR не добавляет runtime producer из URL/header/cookie/DB/env.
5. Existing exact-Owner/Admin guards остаются на целевых routes и mutations; изменение destination generation не является authorization boundary.
6. Current exact-head CI #42794915937, SA-01 Chromium #42794915727 и AP-10 Chromium #42794915509 подтверждены SUCCESS.
7. Future activation note, **не current defect**: когда Stage 6 добавит реальный producer абсолютных origins, он должен валидировать/allowlist HTTPS origins/schemes. Cross-origin mutation/form transport нельзя считать автоматически безопасным только из-за этого routing seam; он требует отдельного Stage-6 security design/acceptance.

## Block B — Authentication & sessions audit prepared

1. Current main inspected for this plan: `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Existing protections confirmed in code: explicit-only account linking, fresh DB-backed registration admission, DB rate limiting with trusted Cloudflare client-IP header, local-only credential return path, same-origin Account & security mutations, stale user/session expectations and fresh-session gating for session management.
3. These are baseline claims to attack, not a PASS verdict.
4. Block B audit matrix is recorded in `SECURITY_IMPLEMENTATION_PLAN.md`; highest-priority execution starts with account linking/takeover, then session fixation/cookies, session IDOR/revoke and CSRF/Origin.
5. No vulnerability or correction task is asserted yet.

## Block B / B3 — Account linking / takeover audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-LINK-01 — CONFIRMED current-scope, Moderate / P2.** Explicit Google linking can complete after the session that initiated the OAuth redirect has been revoked/ended.
3. Causal path is source-proven: Vico authorizes `/link-social` with the current authoritative session and stale-user header; Better Auth 1.7.7 then stores only that user's id/email in OAuth state. On `/callback/google`, 1.7.7 consumes the valid one-time state and calls `linkOAuthAccount` without re-checking whether the initiating session still exists. A provider account can therefore be persisted after that session was revoked.
4. This is not an arbitrary-account takeover claim. Vico does not enable `allowDifferentEmails`; Better Auth requires the provider email to match the initiating account email and rejects a provider identity already owned by another user. Exploitation therefore has substantial additional preconditions.
5. Upstream confirmation is exact: Better Auth security hardening commit `f25081ac0476a9a4295f7a9736ae7239974c7b1e` added a regression named “does not link a provider when the initiating session was revoked during the redirect”. Patched `1.7.16` encrypts the source session token into link state and verifies that session in durable storage on callback before linking.
6. Other B3 boundaries checked PASS: guest link initiation is denied; forged `x-vico-link-user` for another user is denied before state creation; implicit same-email linking remains disabled; provider identity already linked to a different user is rejected; database-backed OAuth state is one-time; external `callbackURL`/`errorCallbackURL` are rejected by Better Auth origin/trusted-origin middleware.
7. No second current-scope B3 defect is confirmed. The account table has no provider/account composite unique constraint, so a parallel duplicate-row race was examined, but no practical cross-user attack path was established under Vico's email-binding rules; it is not promoted to a finding.
8. Live Google-provider reproduction was not run because Stage 6 external credentials are paused. The missing callback session check and the exact upstream regression/fix are nevertheless established directly from pinned source; production-provider acceptance remains Stage 6.

## Block B / B4 — Session fixation / rotation / cookie lifecycle audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Session fixation was not confirmed. Email/password and OAuth sign-in create a new server-side session token; Better Auth's internal adapter generates a fresh 32-character alphanumeric token for each new session and Vico's `session.token` column is unique. Existing pre-routing expired-cookie cleanup is ordered before endpoint Set-Cookie, so a fresh login/logout response wins.
3. Vico does not enable Better Auth cookie session cache. Normal session resolution therefore re-reads PostgreSQL, and expired/deleted server sessions do not remain authorized through a long-lived cached session.
4. Default cookie contract from pinned Better Auth source: when `BETTER_AUTH_URL` is HTTPS, auth cookies use the `__Secure-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` and no Domain unless cross-subdomain cookies are explicitly enabled. Vico does not enable cross-subdomain cookies. Stage-6 configuration must keep an HTTPS base URL; this is a deployment gate, not a current repository defect.
5. **AUTH-SESSION-01 — CONFIRMED current-scope, Moderate / P2.** Better Auth `1.7.7` `POST /sign-out` catches and logs a database error from `deleteSession(sessionCookieToken)`, still clears browser auth cookies and still returns `{ success: true }`. Vico passes this endpoint through `auth.handler` and does not override that success.
6. Causal impact: if the pre-routing session read succeeds but the later delete fails (transient/selective DB failure), the user loses the local cookie and is told logout succeeded while the persisted session row can remain live. A previously copied/stolen session token can therefore continue authenticating until the row expires or is revoked by another mechanism. Because the browser cookie has already been deleted, a normal repeated logout cannot identify that token again.
7. This finding does not require a persistent DB outage: a failure between the successful pre-routing lookup and the later delete is sufficient. Full auth-storage outage before routing already fails closed with Vico's 503 boundary, so that case is not the defect.
8. Better Auth `1.7.16` and current upstream still retain the same sign-out swallow-and-success behavior; this is not fixed by the upgrade that resolves AUTH-LINK-01.
9. Revocation endpoints differ: `revoke-session` and `revoke-sessions` surface delete failures as 500; Vico Account & security uses server-resolved same-user tokens for single-session revoke and a fresh-session gate. No equivalent fail-open was confirmed there in B4.
10. Duplicate-cookie/path shadowing, stale-cookie cleanup and sliding refresh were inspected. No additional practical current-scope takeover path was established.
11. No live production cookie inspection was performed because Stage 6 external deployment is paused. Actual deployed cookie attributes remain a Stage-6 acceptance item.

## Block B / B7 — Session management / IDOR / revoke audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Vico Settings wrapper itself passes the ownership/IDOR checks: action subject is derived from the authoritative request session; stale user/session expectations do not select authority; submitted `sessionId` is resolved only against freshly listed active sessions belonging to the current user; current-session revoke is rejected; unexpected/duplicate fields are rejected.
3. Better Auth direct `/revoke-session` also checks that the supplied token belongs to the authenticated user before deleting it. No cross-user session revoke IDOR was confirmed.
4. **AUTH-SESSION-02 — CORRECTED current-scope classification: Low / P3, not High / P1.** Direct `/api/auth/list-sessions` returns the raw server-side `session.token` field, bypassing Vico's ID-only Settings projection. However B10 follow-up proved that this raw DB token is **not** an authentication credential in current Vico: Better Auth authenticates with a signed session cookie, Vico does not install the Bearer plugin, and the raw token cannot be converted into a valid signed cookie without `BETTER_AUTH_SECRET`.
5. Therefore the earlier claim that one compromised session could use these values as additional bearer credentials was incorrect and is withdrawn. Current impact is limited to unnecessary exposure of an internal session handle / contract-hardening concern; it does not establish persistence after revocation or session takeover.
6. Better Auth `1.7.16` retains the same list output. If Vico ever enables Better Auth's Bearer plugin, this field would become materially more sensitive and must be re-reviewed before activation.
7. **AUTH-SESSION-03 — CONFIRMED current-scope, Moderate / P2.** Vico's Settings contract requires both single-session and all-other-session revocation to pass the fresh-session boundary, but the public direct Better Auth `/revoke-other-sessions` endpoint uses only `sensitiveSessionMiddleware`, not `freshSessionMiddleware`. A still-valid but no-longer-fresh session can therefore invoke the canonical endpoint directly and revoke the account's other active sessions, bypassing the stricter Settings route.
8. Direct `/revoke-session` has the same weaker freshness middleware; targeting another own session requires its raw token. The no-target `/revoke-other-sessions` path is sufficient to prove the freshness bypass, so both remain grouped under AUTH-SESSION-03.
9. Better Auth `1.7.16` retains these endpoint semantics; fixing AUTH-SESSION-03 requires an application admission/endpoint policy, not only the planned dependency upgrade.
10. Race review: Vico resolves session ID to same-user token immediately before revoke; deleting/replacing the target concurrently does not create a cross-user authority path. Partial revoke failure reports failure rather than false success. No additional B7 current-scope defect confirmed.

## Block B / B5 — CSRF / Origin audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Verdict: **PASS — 0 confirmed current-scope CSRF/Origin defects**.
3. Better Auth installs `originCheckMiddleware` globally on `/api/auth/**`. For state-changing requests carrying cookies it requires a non-null trusted Origin/Referer; foreign origins are rejected. Vico does not enable `disableOriginCheck` or `disableCSRFCheck`.
4. Email/password sign-in and sign-up additionally use Better Auth `formCsrfMiddleware`, which blocks browser cross-site navigation login/signup attempts and validates Origin/Referer/Fetch Metadata when browser evidence is present.
5. Vico Account & security mutations add an independent strict `requireSameOrigin(request)` gate before password/session writes, so their protection does not rely only on cookie SameSite behavior.
6. Explicit Google linking is protected by both the global Better Auth origin middleware and Vico's authenticated stale-user check. Callback/error destinations remain restricted to trusted origins.
7. Vico uses a static `BETTER_AUTH_URL`; pinned Better Auth derives the default trusted origin from that base URL. Repository search found no `BETTER_AUTH_TRUSTED_ORIGINS`, `trustedOrigins`, `disableOriginCheck` or `disableCSRFCheck` configuration that widens or disables this boundary.
8. Social sign-in does not carry the form-CSRF middleware, but its endpoint accepts JSON through the auth router rather than a simple cross-site form encoding; no browser cross-site state-changing path was established from the current configuration.
9. Same-site/different-origin requests remain rejected when authenticated because trusted-origin validation is exact against the configured origin; Vico does not enable cross-subdomain auth cookies.
10. Pinned `1.7.7` and `1.7.16` origin-check middleware were compared for the audited behaviors and are materially identical here; the planned dependency upgrade does not change the B5 verdict.
11. Future Stage-6 note, not a current defect: if Admin/Owner surfaces move to separate origins, trusted-origin expansion must be explicit and minimal. Adding broad wildcard origins would change this security boundary and requires separate acceptance.

## Block B / B1 — Login/registration enumeration and brute-force audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-ENUM-01 — CONFIRMED current-scope, Moderate / P2.** Direct email sign-up reveals whether an email already exists.
3. Causal path: Vico config has `requireEmailVerification: false` and leaves Better Auth `autoSignIn` at its default. In 1.7.7, generic duplicate-signup responses are enabled only when email verification is required or `autoSignIn === false`. With Vico's current configuration an existing email returns the explicit duplicate-account error while a new allowed email creates an account; when email registration is closed, an existing email still follows the duplicate branch while a new email reaches Vico's registration-policy denial. The observable result therefore remains account-existence dependent.
4. Better Auth `1.7.16` retains the same generic-duplicate activation rule, so the planned dependency upgrade does not fix AUTH-ENUM-01 by itself.
5. Email sign-in enumeration was not confirmed: unknown email, Google-only/no-credential email and wrong password converge on the same invalid-email-or-password error, and the missing-credential paths deliberately hash the supplied password to reduce timing distinction.
6. Credential rate-limit bypass was not confirmed. Pinned Better Auth uses a database-backed per-trusted-client-IP/per-path bucket; sign-in, sign-up and change-password have the special 3 requests / 10 seconds rule. Vico restricts IP extraction to `cf-connecting-ip`; malformed/missing trusted IP does not disable the limiter and falls into Better Auth's shared fallback bucket.
7. The database rate-limit implementation uses a unique key plus guarded atomic increments, including concurrent first-use/window-reset handling. A rate-limit storage failure propagates as an error rather than allowing the auth request.
8. Vico's existing SET-05 integration proves the canonical change-password route and Settings wrapper share the same DB bucket. No separate repository evidence contradicted the upstream sign-in/sign-up limiter semantics.
9. Future Stage-6/release hardening, not a current defect: the current limiter is fundamentally per-IP. Distributed credential attacks require an edge/account-risk strategy appropriate to deployed traffic; do not add a pre-release account lockout mechanism without a product/security design because it can itself become a denial-of-service vector.
10. No second current-scope B1 defect confirmed.

## Block B / B2 — OAuth login / callback integrity audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Core OAuth integrity properties PASS: Vico's stateful Better Auth configuration uses database-backed OAuth state plus a signed state cookie; state is random, expires, is bound to the cookie, and its verification record is deleted on successful parse before code exchange, preventing successful replay.
3. Google authorization-code flow uses a generated PKCE verifier carried in protected state and supplied to Google's token exchange. Better Auth validates the configured provider/redirect URI; current Google provider verifies issuer/audience/signature/expiry for ID-token material.
4. Callback and error destinations are captured into protected state only after Better Auth's trusted-origin validation at initiation. Vico's client additionally supplies only locale-local `returnTo` destinations. No external open redirect was confirmed.
5. Vico's existing PostgreSQL integration proves fresh registration admission at callback: closing Google registration after OAuth initiation but before callback prevents new user/account/session creation while existing Google sign-in remains allowed.
6. Existing callback presentation does not deserialize arbitrary provider diagnostics into the rendered page/loader data: sign-in maps any error to generic feedback; sign-up only recognizes the two Vico registration codes. External `returnTo` is normalized to the locale root.
7. **AUTH-OAUTH-01 — CONFIRMED current-scope, Low / P3.** Better Auth callback error handling appends the provider-supplied `error_description` to the configured error callback URL. Vico's loaders intentionally ignore that value but do not canonicalize/replace the browser URL, and no repository-wide Referrer-Policy or URL sanitization was found. Provider diagnostic text therefore remains in address bar/history and may participate in ordinary same-origin referrer propagation even though it is not rendered.
8. No token/credential disclosure through this path was proven; severity remains Low/P3. The finding is privacy/log-hygiene hardening against carrying raw provider diagnostics in URLs, not an OAuth authentication bypass.
9. Better Auth `1.7.16` retains the same callback behavior, so upgrading for AUTH-LINK-01 does not remove AUTH-OAUTH-01.
10. Live Google behavior remains Stage-6 acceptance; repository/synthetic-provider evidence establishes Vico/Better Auth callback mechanics but does not claim what text Google will emit in production errors.
11. No second current-scope B2 defect confirmed.

## Block B / B6 — Password change boundary audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Verdict: **PASS — 0 confirmed current-scope password-change defects**.
3. Vico Settings action derives the subject from the authoritative request session, validates same-origin and exact allowlisted fields, and treats submitted user/session IDs only as stale-form expectations. No caller-selected account target exists.
4. Vico checks that the current user already has a credential account with a real password before invoking Better Auth. Google-only accounts therefore cannot gain a password through the Settings flow.
5. Better Auth's public `/change-password` endpoint independently requires a valid authoritative session, an existing credential password and successful verification of `currentPassword`. Its separate `setPassword` capability is server-only and is not exposed as an HTTP endpoint by Vico.
6. Password bounds match across Vico and Better Auth: 8–128 characters for the new password. Vico routes through the canonical HTTP handler, so Settings and direct canonical password change share the same database-backed 3 requests / 10 seconds rate-limit boundary established in B1.
7. `sensitiveSessionMiddleware` requires a live authoritative session but not Better Auth's freshness age. This is not a current defect for password change because the current password itself is required as reauthentication; Vico's SET-05 contract does not require a separate fresh-session gate for this operation.
8. Vico intentionally sends `revokeOtherSessions:false`; existing sessions remain valid after a successful password change by product contract. The existing PostgreSQL integration verifies this behavior. It must not be reclassified as a defect during security hardening without a separate product decision.
9. Better Auth 1.7.7's optional direct `revokeOtherSessions:true` branch is not transactional, while 1.7.16 makes revoke+password update+new-session creation transactional. Vico does not use that mode and does not promise it as its password-change product path, so this difference is recorded as dependency hardening evidence, **not a current Vico finding**.
10. No password values are reflected by Vico in action responses/URLs/browser state, and repository search found no application logging of `currentPassword`/`newPassword`.
11. No second B6 defect confirmed.

## Block B / B8 — Session freshness / reauthentication audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Verdict: **PASS — 0 new current-scope freshness defects**.
3. Vico does not override Better Auth session freshness; pinned default `freshAge` is 24 hours. Freshness is calculated server-side from durable `session.createdAt`, not from a client timestamp.
4. Ordinary session refresh does not refresh freshness: Better Auth's sliding refresh updates only `expiresAt` and `updatedAt`; `createdAt` remains unchanged. Reload/revalidation/activity therefore cannot make a stale session fresh.
5. Vico does not enable cookie session cache. Freshness-sensitive `listSessions` therefore resolves against the server-side session store rather than a long-lived browser session cache.
6. Settings Account re-checks freshness inside the server operation, not only in the loader/UI. Freshness can expire between page load and POST and the subsequent session-management action is then rejected as not fresh.
7. Storage failure on Vico's Account-security path does not permit a freshness-sensitive write. The request-local database proxy preserves the underlying PostgreSQL failure through Better Auth's session error wrapping and Vico classifies it as unavailable/failure.
8. New email/password or successful Google authentication creates a new session with a new `createdAt`; freshness is not inherited from another browser session or account.
9. **AUTH-SESSION-03 from B7 remains the confirmed cross-cutting exception:** direct public Better Auth revoke endpoints use `sensitiveSessionMiddleware`, not `freshSessionMiddleware`, and can bypass Vico's intended fresh-session requirement. That issue is already recorded and is not duplicated as a B8 finding.
10. Better Auth `1.7.16` retains the audited 24-hour default and createdAt-based freshness semantics; upgrade does not alter this B8 verdict.
11. No separate current-scope B8 defect confirmed.

## Block B / B9 — Registration policy race audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`, PostgreSQL 17 semantics.
2. **AUTH-REG-01 — CONFIRMED current-scope, Moderate / P2.** The registration admission policy has a TOCTOU window between reading the singleton policy and committing the new user transaction.
3. Vico's `createRegistrationAdmission` performs a fresh ordinary `SELECT` of `forum_registration_settings` immediately before Better Auth persists a new user, but it does not lock the policy row. The Owner update path uses `SELECT ... FOR UPDATE` and then updates/commits the singleton.
4. PostgreSQL READ COMMITTED semantics do not make an ordinary SELECT conflict with a concurrent row update/row lock. Therefore an already-running create-user transaction can read `open`, then a concurrent Owner-close transaction can update and commit `closed`, and the admitted create-user transaction can still persist/commit afterwards. After the Owner receives successful closure, that in-flight registration can consequently appear.
5. This is not a general bypass of a registration state that was already closed before admission: a request whose admission SELECT starts after closure commits observes `closed` and is rejected.
6. Email sign-up started only in the browser before closure but submitted afterwards is rejected because no server-side admission decision exists until create-user. Google OAuth initiation does not freeze the policy either; existing integration proves policy is re-read at callback/create-user and rejects when closure happened before that admission read.
7. Closed registration correctly preserves existing email login, existing Google login and explicit authenticated Google linking; these paths do not call create-user admission.
8. Missing/invalid policy singleton and classified PostgreSQL admission failures fail closed. Unknown future provisioning methods return `vico_registration_method_unsupported` rather than default-open.
9. Denial at validateUserInfo occurs before user persistence. Email sign-up is inside Better Auth's transaction; OAuth new-user validation occurs inside the user/account creation transaction. Existing tests confirm denied registration leaves no user/account/session rows.
10. Severity is Moderate/P2: impact is a bounded business-policy bypass for an already in-flight new registration around the closure boundary, not authentication/privilege escalation.
11. No second B9 current-scope defect confirmed.

## Block B / B10 — Failure / privacy / leakage semantics audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-CACHE-01 — CONFIRMED current-scope, Low / P3.** Public authenticated GET endpoints `/api/auth/list-sessions` and `/api/auth/list-accounts` do not set `Cache-Control: private, no-store` (or equivalent). Vico's `auth-api.ts` passes Better Auth responses through unchanged. By contrast, Better Auth's `/get-session` explicitly sends `cache-control: no-store`, and Vico Settings routes explicitly send `private, no-store`.
3. The list endpoints expose private account/session metadata; `list-sessions` also exposes the raw internal session token discussed in corrected AUTH-SESSION-02. No cross-user cache replay was demonstrated, so severity remains Low/P3 privacy/cache hardening rather than an auth bypass.
4. Better Auth `1.7.16` retains the same list endpoint response headers, so dependency upgrade alone does not close AUTH-CACHE-01.
5. Account projection PASS: Better Auth `parseAccountOutput` removes OAuth access token, refresh token, ID token, token expiry fields and password before `list-accounts` is serialized. No provider credential disclosure was confirmed there.
6. Settings response hygiene PASS: protected Settings responses use `private, no-store`; controlled 401/403/409/429/503 paths do not reflect submitted password/session secrets.
7. `Retry-After` PASS: Vico accepts only a 1–4 digit Better Auth value before propagating it, bounding the value to a numeric 0–9999 representation and avoiding header injection.
8. Device label PASS: Vico replaces C0/DEL control characters, trims and bounds User-Agent-derived labels to 160 characters; React rendering supplies HTML escaping.
9. Worker 5xx telemetry PASS: only response status and elapsed time are recorded. Request URL, body, cookies, password and token are not passed to monitoring.
10. Cleanup semantics PASS: PostgreSQL client discard is best-effort and explicitly cannot replace the original classified auth/database result.
11. Better Auth default logger level is `warn`; its info-level existing-email sign-up diagnostic is therefore not emitted by Vico's current default configuration. No Vico application logging of submitted passwords or session-cookie values was found.
12. Previously recorded AUTH-ENUM-01 and AUTH-OAUTH-01 remain the relevant enumeration/URL-diagnostic findings; B10 does not duplicate them.
13. No additional B10 current-scope defect confirmed.

## Block B / B11 — Dependency / security-version exposure

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`; repository pins `better-auth@1.7.7` and `@better-auth/drizzle-adapter@1.7.7`.
2. Official Better Auth security release of 2026-11-03 states that `1.7.16` is the fixed `1.7.x` line for 12 disclosed security issues and requires Better Auth packages to be upgraded together. Better Auth's current security policy supports only the latest release.
3. As of 2026-11-10 the official stable `1.7.x` changelog reports **`1.7.19` as latest**. Therefore the bounded correction package should target `better-auth@1.7.19` and `@better-auth/drizzle-adapter@1.7.19` together, not stop at the minimum `1.7.16`, unless technical planning establishes a concrete compatibility blocker.
4. **No new vulnerability ID is created solely for being behind latest.** The dependency upgrade is a required remediation component of already-confirmed **AUTH-LINK-01**: `1.7.16+` revalidates the initiating stored session before completing social account linking.
5. The 2026-11-03 core advisories were mapped to Vico's actual configuration. Email-change takeover is not currently reachable because Vico does not enable `user.changeEmail` or email-change verification flow. The OAuth unverified-email advisory's published affected conditions are generic OAuth/string-claim providers/Zoom; Vico currently uses the built-in Google provider only. The revoked-session advisory requires `secondaryStorage` or `session.cookieCache`; Vico configures neither.
6. Plugin-specific advisories in that release (Expo, Electron, phone number, email OTP, Better Auth admin plugin, organization, Stripe, passkey) are not current Vico surfaces: repository search found no corresponding Better Auth plugin/configuration. Vico's own Admin/Super-admin implementation is not the Better Auth admin plugin.
7. The MySQL serial-ID advisory affecting Kysely/Drizzle adapters is not applicable to Vico's PostgreSQL runtime and Vico does not configure `generateId: "serial"`.
8. The earlier PostgreSQL database-rate-limit concurrency advisory **is already fixed by the installed `1.7.7` pair**; that advisory's patched version is exactly `1.7.7`. B1 independently confirmed the guarded atomic rate-limit semantics in the pinned source.
9. Future Block-A Passkey activation has a mandatory dependency gate: the Nov-3 passkey advisory is fixed in `@better-auth/passkey@1.7.16+`; no passkey package is currently installed, so this is Stage-6/future activation, not a current defect. If Block B first upgrades the Better Auth line to `1.7.19`, any later passkey package must be added at the same supported line and its origin/user-verification acceptance must still be tested.
10. Upgrade regression surface that technical planning must preserve: `1.7.12+` keeps the original DB session lookup failure as `error.cause`, overlapping Vico's current 1.7.7-specific database-error preservation workaround; `1.7.8+` changes cookie/security and password/session failure behavior; `1.7.11+` changes DB rate-limit retry header behavior. These are reasons for focused regression tests, not reasons to remain on 1.7.7.
11. Current public Google credentials/provider behavior remains externally unverified because Stage 6 is paused. **Информация не проверена** for live-provider/deployed compatibility; repository and upstream source establish the dependency exposure and correction target.
12. B11 adds no second current takeover finding beyond the already-recorded Block-B defects.


## Block C — Authorization & privilege escalation audit prepared

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Source-of-truth `docs/auth/AUTHORIZATION.md` и current authorization runtime/repository surfaces сверены перед матрицей.
3. Block C ограничен общим authorization engine: Owner binding, effective resolution, management writes, elevated authority propagation, authz-read privacy, generic resource ownership, freshness/concurrency, failure/cache и catalog/persistence integrity.
4. Ordinary Admin/Complaints/Signals/Measures domain workflows не переаудируются целиком; они будут отдельным security area. Здесь они используются только для проверки общей privilege boundary.
5. Матрица C1–C9 и порядок выполнения записаны в `SECURITY_IMPLEMENTATION_PLAN.md`.
6. Никакие исправления/implementation planning не назначены.
7. Следующий audit step: **C1 Owner binding / authority spoofing**.

## Block C / C1 — Owner binding / authority spoofing audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope Owner-binding/spoofing defects**.
3. Production Worker derives Owner binding only from server environment `VICO_OWNER_USER_ID`, normalizes it through `validOwnerUserId`, and stores it in a new request-local `authorizationOwnerContext`. No request header, query, form, cookie field, email, role, grant or provider claim writes that context.
4. Binding is exact and fail-closed: undefined/null/blank/leading-or-trailing-whitespace values do not bind anyone. A binding to a nonexistent user grants nothing because authority still requires a real authenticated session whose `user.id` equals the binding.
5. Owner checks use the authoritative pre-routing Better Auth session user ID. A new RouterContext/session resolution is created for every request; stale Owner UI followed by account switching therefore cannot carry Owner authority into the next mutation.
6. Non-Owner actors retain ordinary RBAC even if their role display name is `Owner`, they hold built-in admin, they have `access.authorization.manage`, or they receive broad catalog grants. Direct authorization writes still independently require exact `canMutateAuthorization(actorId, ownerBinding)` inside the serialized repository mutation.
7. Bound Owner raw role/grants/explicit denies remain stored but do not suppress the catalog-wide Owner projection; this is the documented authority model. Projection grants only current `PERMISSION_CATALOG` keys and never an arbitrary unknown permission.
8. Public email sign-up cannot choose the internal Better Auth user ID: Vico exposes only server-owned `locale` as an additional user field with `input:false`; Better Auth parses only configured input fields before user creation. Google OAuth user provisioning likewise does not accept a client-selected internal local user ID.
9. Knowledge/disclosure of the Owner user ID is therefore not itself an authority credential in the current architecture.
10. Real Stage-6 Google account → deployed `VICO_OWNER_USER_ID` binding remains external acceptance and is not claimed here.
11. No C1 finding confirmed.

## Block C / C3 — Authorization-management direct-write escalation audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope direct-write privilege-escalation defects**.
3. All six production authorization write families — create/rename/delete role, replace grants, assign role and set/remove override — are reached through the canonical authorization action. That route derives `actorId` only from the authoritative Better Auth request session; submitted `actorId`, role/permission claims or other extra fields do not select the actor.
4. Guest action is independently rejected 401; authenticated actor without fresh effective `access.authorization.manage` is rejected 403 before any mutation call. Classified authorization storage failure fails closed; unexpected resolver errors are not silently converted to permission denial/success.
5. A non-Owner who does have `access.authorization.manage` retains read access but every write intent is rejected by exact `canMutateAuthorization(session.user.id, ownerBinding)` before dispatch. Existing route regression covers all six intents and verifies no capability mutation is invoked.
6. The repository is an independent second boundary: every mutation starts a transaction, locks `authz_mutation_lock`, freshly checks effective `access.authorization.manage`, then rechecks current-release exact Owner policy before running operation-specific code, including no-op paths.
7. Existing PostgreSQL and repository regression proves all six direct mutations from a non-Owner manager stop before authz state/History writes. Missing/invalid Owner binding likewise fails closed.
8. Forged target IDs can select only the intended mutation target after actor admission; they cannot replace the actor. Unknown/missing role/user targets become controlled not-found/conflict/validation outcomes rather than authority.
9. Same-origin is checked before form mutation dispatch. A foreign-origin request never reaches the capability writer.
10. Production search found no second HTTP/service write caller that sources authorization mutation `actorId` from request-controlled target/form data. Test fixtures that construct a repository with a synthetic matching Owner binding are test-only and are not runtime entrypoints.
11. The capability method signature itself accepts an `actorId`; a hypothetical trusted server caller could lie and pass the Owner ID. No current attacker-controlled runtime path does so, therefore this is not a current Stage finding. The current invariant remains that production callers must supply session-derived actor identity.
12. Elevated `admin.users.blocks.managePrivileged` propagation is deferred to C4; generic concurrency races beyond the fresh mutation gate are deferred to C7.
13. No C3 finding confirmed.

## Block C / C2 — Effective permission resolution / precedence / freshness audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope permission-resolution/freshness defects**.
3. Non-Owner resolution applies the documented precedence from one DB snapshot: role grants seed the effective set, per-user `allow` adds a key and per-user `deny` removes it. Existing repository regression proves role grant + allow + deny composition and management-state projection.
4. A user without explicit assignment resolves through the built-in `user` role via the DB join; missing user and missing built-in-user state fail as not-found/invariant failure rather than silently granting authority.
5. Full `resolveUser()`, targeted management reads and bulk management reads use `REPEATABLE READ READ ONLY` snapshots, so role/grant/override components are not mixed across committed states inside one composite resolution.
6. Production Hyperdrive authorization is request-local. Its cache is keyed by `userId` and stores one resolution promise per user for the lifetime of the Worker request only. Multiple resolver handles for the same user therefore share one internally consistent snapshot; different user IDs have distinct cache entries.
7. Production `has()` does not perform an independent later permission read: it checks the cached `resolve().effectivePermissions`. Thus `has()` and `resolve()` cannot observe different committed authorization states inside one request.
8. The administrative-restriction wrapper preserves that invariant: it derives restricted `has()` and `resolve()` from the same raw resolver snapshot and uses a separate request-local restriction cache keyed by family + actor + raw authority level.
9. Every Worker request constructs a new RouterContext, new Hyperdrive authorization capability and new restriction wrapper. No long-lived/cross-request permission cache was found.
10. Existing PostgreSQL regressions prove committed role/override changes are visible on subsequent reads/service calls, including allow → deny → inherit transitions and role assignment changes without logout/login.
11. Authorization is never sourced from client/session role claims. The authenticated session supplies only the authoritative `user.id`; role/grant/override state is re-derived from PostgreSQL authorization tables.
12. Bound Owner remains the intentional exception: raw denies/role changes do not suppress code-backed Owner projection. C1 already established this projection is exact-ID and catalog-bounded.
13. A mutation performed during a request does not retroactively rewrite an already-created request-local snapshot. That is consistent with the documented request-snapshot model; next protected request is fresh. No current path relies on a post-mutation permission escalation inside the same request.
14. Generic concurrent mutation serialization is deferred to C7.
15. No C2 finding confirmed.

## Block C / C7 — Freshness / concurrency / mutation serialization audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope authorization concurrency/serialization defects**.
3. Every authorization management mutation opens a PostgreSQL transaction and acquires singleton row `authz_mutation_lock(id=1) FOR UPDATE` before fresh actor admission. Effective `access.authorization.manage`, exact Owner policy and AP-10 administrative suppression are evaluated only after the lock is held.
4. All six authorization write families therefore share one serialization point, including no-op requests. Concurrent role/grant/assignment/override changes cannot both proceed from independent stale pre-lock authority snapshots.
5. AP-10 authoritative create/change/lift/appeal-review operations use the same singleton `authz_mutation_lock` in their surrounding transaction before resolving actor/target authority and issuer-floor decisions.
6. Existing PostgreSQL concurrency regression explicitly holds the singleton lock, queues one authorization writer and one AP-10 measure writer, proves both are real row-lock waiters via `pg_stat_activity`, changes the actor's management authorities while the lock is held, commits that change, and then verifies both queued operations re-evaluate authority and reject. No authorization state, measure or History row is written.
7. PostgreSQL READ COMMITTED statement semantics are sufficient here because the fresh permission/authority SELECT statements run only after the waiting transaction acquires the row lock; they therefore see the committed authority state that released the lock rather than a pre-lock application snapshot.
8. Authorization mutations append History in the same transaction after the domain change. Existing DB regression with a deliberately failing History trigger proves the authorization mutation rolls back with the failed append and the previously authoritative permission remains unchanged.
9. Rejected and no-op authorization mutations do not append History. Successful writes commit domain state and History atomically.
10. Role grant/revoke, role assignment, override and custom-role deletion races are serialized through the same mutex before operation-specific FK/system-role checks. Assigned-role deletion remains protected by FK/conflict handling; elevated-role propagation has additional Owner guards and is reviewed separately in C4.
11. A failed/rolled-back authorization transaction cannot become effective through the request-local permission cache: cache is built from committed PostgreSQL reads and new Worker requests construct a new capability. C2 established next-request freshness.
12. The authorization repository's rollback call itself does not preserve the original error if PostgreSQL rollback also fails. That is an error-classification/cleanup concern, not a proven authority or state-serialization bypass; it is deferred to C8 failure semantics rather than counted as a C7 finding.
13. No C7 finding confirmed.

## Block C / C4 — Elevated authority propagation audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope elevated-authority propagation defects**.
3. `admin.users.blocks.managePrivileged` is a hierarchy capability, not an action grant. AP-10 mutation authority still separately requires bound Owner or raw `admin.users.blocks.manage`; possession of the elevated key alone cannot create/change/lift/review a measure.
4. Neither `admin.users.blocks.manage` nor `admin.users.blocks.managePrivileged` has an initial grant in any built-in role, including admin. Non-Owner possession therefore requires an explicit Owner-controlled dynamic role grant or user override.
5. Role-grant propagation is guarded both ways. `replaceRoleGrants` detects the elevated key in either added or removed sets and requires the exact bound Owner before changing persisted grants.
6. Role assignment is guarded both ways. Switching a user into an elevated role or away from the user's current elevated role requires the bound Owner; implicit built-in `user` role is included when deciding whether the transition grants or strips elevated authority.
7. Per-user override propagation is guarded for `allow`, `deny` and `inherit`/removal. Any actual change of the elevated key requires the bound Owner. An unchanged no-op does not alter authority and creates no History.
8. Deleting an unassigned custom role carrying the elevated key is treated as an elevated revoke and requires the bound Owner. Assigned-role deletion remains blocked by the role-assignment FK/conflict path, so cascade cannot silently strip an assigned user's elevated authority.
9. Existing PostgreSQL regression covers non-Owner attempts to grant/revoke the elevated role permission, assign/unassign an elevated role, and add/remove a personal elevated override; state and History remain unchanged on rejection.
10. AP-10 hierarchy is reconstructed from **raw persisted RBAC** before administrative-sanction filtering. A saved administrative restriction therefore cannot lower a target's hierarchy and make a previously protected target attackable.
11. Authority levels are strict: bound Owner = 3; raw `managePrivileged` = 2; other private administrative capability = 1; ordinary = 0. A measure actor must additionally possess the basic action grant and satisfy `actorLevel > targetLevel`; ordinary `admin.users.blocks.manage` alone cannot act on an equal/higher administrative target.
12. Stored `issuer_authority_floor` prevents a later lower-ranked actor from taking over an existing measure created at a higher authority level.
13. Bound Owner projection is independent of raw denies/grants: Owner remains rank 3 even when stored RBAC denies both block-management keys. This does not elevate other users or modify their persisted elevated state.
14. C7 already proved authorization changes and AP-10 authority decisions share the same `authz_mutation_lock`, so grant/revoke races cannot create a stale elevated-authority window.
15. Direct database writes by a compromised database principal are outside this application-authorization seam and remain for the database/runtime security blocks; no attacker-controlled application path to them was found here.
16. No C4 finding confirmed.

## Block C / C5 — Authorization-state read privacy / IDOR audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope authorization-state read/privacy/IDOR defects**.
3. Canonical Roles/authorization loader independently requires an authenticated session and effective `access.authorization.manage` before reading `readManagementState()`. Guest, ordinary-user and unrelated-permission paths stop before the protected read.
4. The direct Roles/authorization read surface intentionally exposes its existing authorization-user subset, including user identity/email plus raw role/grants/overrides/effective permissions, to holders of `access.authorization.manage`. This is the current source-of-truth contract; it is not implicitly granted by `admin.users.read`, `admin.users.blocks.manage` or general Admin admission.
5. `admin.users.read` independently protects `/admin/users` index/detail before query/target validation and protected reads. A management-only actor does not gain the general Users directory through this permission boundary.
6. The Users index DB query selects only user ID, display name, image and joined timestamp; search uses only name/ID. Email is neither selected nor searchable.
7. Users detail explicitly re-projects only public profile/identity/statistics fields. Existing route regression injects synthetic email/grant/override secrets into the profile fixture and verifies they are not serialized.
8. `admin.users.read` alone never calls `readUserManagementState` and therefore does not serialize role grants, personal overrides, effective permissions or management actor metadata.
9. When the same actor also holds `access.authorization.manage`, Users detail performs exactly one targeted `readUserManagementState(targetId)`. That snapshot contains role choices and only the selected target's authorization state; it contains no other users, no email and no role grant lists for unrelated roles.
10. The target ID comes from the validated route object ID and may identify any user only after the actor has both required read capabilities. This is intended administrative targeting, not an IDOR: the authorization decision is actor-based and independent of target identity.
11. `readUserManagementState` itself has no internal actor parameter and is therefore a trusted server capability, not an HTTP authorization boundary. Production caller search found only already-gated routes for browser exposure; no attacker-controlled path directly invokes the capability.
12. `admin.history.read` remains independent. Neither authorization management state nor Users detail serializes Admin History/events merely because authorization/user-read permission is present.
13. Owner-only mutation flags/forms are presentation data only. Non-Owner holders may see authorized read state, but all writes remain independently denied by C3's route/repository boundaries.
14. All protected Admin/authorization document/data responses use `private, no-store`; legacy Users redirect also rechecks current permissions before choosing Users versus authorization subset.
15. AP-10 `admin.usersAccess` restriction applies to both `admin.users.read` and `access.authorization.manage` through the effective authorization wrapper before these reads, so saved administrative restrictions cannot be bypassed by calling the alternate read surface.
16. No C5 finding confirmed.

## Block C / C6 — Resource-condition enforcement / service-bypass audit

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 confirmed current-scope resource-condition/service-bypass defects**.
3. `forum.post.editOwn` is not only a UI/route gate. The canonical edit route derives `actorId` from the authoritative session, and `DrizzleForumRepository.editPublishedPost()` re-reads the target post under the same write transaction/`FOR UPDATE` and requires persisted `post.authorId === actorId` before revision/attachment mutation.
4. Post-edit draft/upload admission independently reads `readPostLocation(postId)` and rejects a non-author even when that actor holds `forum.post.editOwn`. Final publication repeats the transactional author check, so preflight is not the security boundary.
5. `forum.solution.manageOwn` route admission only chooses `scope=own`; repository `markTopicSolved` and `selectBestAnswer` then lock/read the authoritative topic and require persisted `topic.authorId === actorId`. Submitted author IDs are not used.
6. `forum.solution.manageAny` removes only that ownership condition. Repository still enforces topic existence, current state, confirmed-duplicate prohibition, best-answer post membership/original-post exclusion and AP-10 `admin.forum` admission for the administrative path.
7. `forum.sourceLocale.correctOwn` route admission similarly selects `scope=own`; `ForumService.correctTopicTitleSourceLocale`/`correctPostBodySourceLocale` read the authoritative topic/post and require its persisted author to equal the session-derived actor before correction.
8. `forum.sourceLocale.correctAny` removes only ownership. The service still requires target membership/current revision, canonical non-`und` locale validation and CAS; it constructs the new revision from the existing original content, so the source-locale capability does not become a general text-edit capability.
9. The source-locale own author check occurs before the repository transaction, but topic/post authorship is immutable in the current schema/domain. Revision identity is separately CAS-checked in the transaction; a concurrent revision change rolls back rather than applying against stale content.
10. Untrusted `operationScope` is not authority. Explicit `any` is rejected unless the matching `manageAny/correctAny` permission is currently effective; explicit `own` requires the matching Own permission even if Any is present; malformed/multiple markers are rejected before the writer.
11. Existing connected route/DB regression proves Own revocation after an editor/action was opened takes effect before write, an Own request against a foreign resource is rejected, Any-only actors cannot forge Own, and an opened Own operation remains Own after a later Any grant.
12. Stale account expectations are not actor selectors: `editorActorId` mismatch returns private/no-store `409`, while `runForumMutation` and `runSourceLocaleCorrection` pass only the current Better Auth session user ID to the writer.
13. Production caller search for `markTopicSolved`, `selectBestAnswer`, `correctTopicTitleSourceLocale`, `correctPostBodySourceLocale` and `editPublishedPost` found browser/runtime calls only through the canonical gated actions. Other direct calls are repository/local-CI tests or internal smoke fixtures.
14. The server-side Forum writer/service API accepts trusted `actorId` and `scope`; a hypothetical new server caller could misuse them. No current attacker-controlled runtime path exposes those parameters directly, so this is not a current Stage finding. Future callers must preserve the same permission gate + authoritative resource checks.
15. Bound Owner catalog projection does not bypass `*Own` ownership conditions; Owner may use separately implemented Any capabilities, but ordinary Own paths still require authoritative ownership as specified in the authorization contract.
16. No C6 finding confirmed.

## Координация

1. #315 хранит решения, задачи, review findings и прогресс всего направления безопасности.
2. Профильные feature/service PR могут ссылаться на #315, но их product source-of-truth не переносится сюда.
3. Следующий исполнитель/планировщик назначается только под конкретный security-блок.
4. Лира, Лёва и Марк сейчас не имеют активной реализации по #315.
