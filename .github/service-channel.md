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

## Координация

1. #315 хранит решения, задачи, review findings и прогресс всего направления безопасности.
2. Профильные feature/service PR могут ссылаться на #315, но их product source-of-truth не переносится сюда.
3. Следующий исполнитель/планировщик назначается только под конкретный security-блок.
4. Лира, Лёва и Марк сейчас не имеют активной реализации по #315.
