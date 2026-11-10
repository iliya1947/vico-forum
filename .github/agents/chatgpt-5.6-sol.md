# Мира — безопасность Vico Forum

## 2026-11-10 — Block C / C1 Owner-binding audit

1. Target: main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Verdict: **PASS — 0 current-scope defects**.
3. Owner binding has one production producer: server env → `validOwnerUserId` → request-local context. Request-controlled identity metadata cannot set it.
4. Exact authenticated Better Auth `user.id` is the only principal compared with the binding; malformed/missing/nonexistent binding grants nothing.
5. Every request receives a fresh RouterContext and authoritative session resolution, so account switch cannot inherit Owner projection from a stale page/request.
6. Non-Owner broad RBAC/manager access cannot satisfy Owner-only mutation policy.
7. Owner projection is catalog-bounded; unknown keys are not granted.
8. Public signup/provider inputs cannot select the internal Better Auth user ID. Vico's only additional user field is server-owned locale with input disabled.
9. Stage-6 real Owner binding remains external acceptance, not a repository defect.

## 2026-11-10 — Block C authorization audit matrix

1. Current main remains `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Fully re-read current AGENTS/PROJECT/PROJECT_STATE and authorization source-of-truth before defining the next audit area.
3. C1–C9 cover Owner binding, permission resolution, management direct writes, elevated authority, authorization-read privacy, generic ownership/resource guards, concurrency/freshness, failure/cache semantics and catalog/persistence integrity.
4. Ordinary Admin/moderation domain behavior stays outside Block C except where needed to prove the generic authorization seam.
5. No remediation handoff exists. Next audit-only subtask is C1.

## 2026-11-10 — Block B / B11 dependency-security-version audit

1. Target: main `e279cb6c032a489a9044ca1191407df887c364b4`; direct deps `better-auth@1.7.7` and `@better-auth/drizzle-adapter@1.7.7`.
2. Official Nov-3 security release fixes 12 advisories in `1.7.16`; Better Auth instructs coordinated same-version package upgrades. Current official stable 1.7 line is `1.7.19` on 2026-11-10 and the security policy supports only latest.
3. No duplicate dependency vulnerability ID: upgrade is mandatory remediation for AUTH-LINK-01 and should target both direct Better Auth packages at 1.7.19 unless planning proves a concrete blocker.
4. Current configuration is not affected by the Nov-3 email-change advisory (feature disabled), revoked-session secondary/cookie-cache advisory (neither configured), or published OAuth unverified-email affected conditions (generic OAuth/string-claim providers/Zoom; Vico uses built-in Google).
5. Expo/Electron/phone/email-OTP/admin-plugin/organization/Stripe/passkey surfaces are absent. The MySQL serial-ID adapter issue is not Vico's PostgreSQL configuration.
6. Installed 1.7.7 already exactly fixes GHSA-44jh-23m7-hpcf PostgreSQL DB rate-limit concurrency.
7. Future Passkey activation must use a fixed supported line (>=1.7.16; align with the then-current Better Auth packages) and re-test origin/user verification.
8. Upgrade regression focus: 1.7.12 adds DB error cause preservation overlapping Vico's 1.7.7 workaround; intervening patches alter cookie/session/password/rate-limit behaviors. Preserve current fail-closed semantics with targeted integration tests rather than carrying version-specific workarounds blindly.
9. Live Google/deployed compatibility remains Stage-6 external acceptance: Информация не проверена.
10. Block B audit is complete. Remediation is not assigned; findings remain recorded for later. Next work, when the owner continues the audit, is the next security area: Authorization & privilege escalation.

## 2026-11-10 — Block B / B10 failure/privacy/leakage audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-CACHE-01 Low/P3:** authenticated `list-sessions` and `list-accounts` GET responses do not set explicit no-store/private cache headers; Vico auth-api passes them through. Better Auth get-session and Vico protected Settings do set no-store.
3. No cross-user cached replay was demonstrated; classify as current privacy/cache hardening, not auth bypass. Better Auth 1.7.16 retains the same list headers.
4. `list-accounts` strips OAuth access/refresh/ID tokens, expiry fields and password before response.
5. Settings errors do not reflect submitted secrets; Retry-After is strictly bounded numeric; User-Agent label removes control chars and is length-bounded.
6. Worker failure telemetry records only status+latency. PostgreSQL cleanup is best-effort and cannot replace the original result.
7. Better Auth default logger threshold is warn, so its existing-email info diagnostic is not emitted under Vico's current default logger. No Vico password/session-cookie logging found.
8. B10 also corrected AUTH-SESSION-02 from High/P1 to Low/P3 because raw session token is not a bearer credential without the absent Bearer plugin.

## 2026-11-10 — Block B / B9 registration-race audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-REG-01 Moderate/P2:** registration admission uses a fresh but unlocked SELECT of the singleton. Owner update locks/updates the row, but PostgreSQL ordinary reads do not conflict with that row lock under READ COMMITTED.
3. Causal outcome: create-user can read open, Owner closure can then commit closed, and the already-admitted registration transaction can commit afterwards. Closure is therefore not a linearizable cutoff for in-flight create-user work.
4. Requests admitted after closure commit see closed and fail; browser form start and OAuth redirect initiation do not freeze policy. OAuth callback already rechecks at create-user.
5. Existing email/Google sign-in and explicit Google link remain permitted when registration is closed by design.
6. Missing/invalid singleton, DB availability failure and unknown provisioning methods fail closed.
7. Better Auth validates before persistence; denied email/OAuth registration leaves no partial user/account/session rows.
8. No second B9 finding confirmed.

## 2026-11-10 — Block B / B8 session freshness audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Verdict: **PASS — 0 new current-scope defects**.
3. Better Auth default freshAge is 24h; freshness uses server session `createdAt`.
4. Sliding session refresh updates expiry/updatedAt, not createdAt, so ordinary traffic cannot refresh the freshness clock.
5. Vico has no cookie session cache; freshness-sensitive list-sessions is DB-backed.
6. Settings action re-runs the server freshness boundary, so loader-time freshness cannot authorize a later stale mutation.
7. Storage failures on Vico Account-security path remain failures/unavailable rather than successful freshness-sensitive writes.
8. Reauthentication creates a distinct new session and therefore a new freshness clock; freshness is not transferred between sessions/accounts.
9. AUTH-SESSION-03 remains the already-recorded direct Better Auth endpoint bypass and is not duplicated here.
10. Better Auth 1.7.16 preserves the same freshness basis/default.

## 2026-11-10 — Block B / B6 password-change audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Verdict: **PASS — 0 confirmed current-scope defects**.
3. Settings binds the mutation to authoritative current session identity; submitted identity fields are stale expectations only.
4. Existing credential password is checked before the canonical Better Auth change-password call; Google-only accounts cannot set a password through this product path.
5. Better Auth requires live authoritative session + existing credential + correct current password. Server-only `setPassword` is not a Vico HTTP endpoint.
6. New-password limits match at 8–128; Settings shares the canonical DB-backed rate-limit bucket.
7. Change-password uses sensitive rather than fresh-session middleware. Current password is the intended reauthentication factor here, and SET-05 does not require separate session freshness for password change.
8. Other sessions intentionally remain valid because Vico sends `revokeOtherSessions:false`; this is product contract, not a security finding.
9. 1.7.7 optional `revokeOtherSessions:true` is non-transactional and 1.7.16 hardens it transactionally, but Vico does not use or promise that mode; recorded as dependency hardening only.
10. No application logging/reflection of submitted password values found.

## 2026-11-10 — Block B / B2 OAuth callback integrity audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. State integrity PASS: stateful configuration selects DB-backed verification plus signed state cookie; parse checks cookie/state, deletes verification before token exchange and rejects expired/missing/replayed state.
3. Google redirect flow uses PKCE; callback destinations are trusted-origin validated before being embedded into protected state. Vico supplies locale-local return paths.
4. Registration-race PASS: existing integration checks policy again at actual callback/create-user seam and leaves no user/account/session rows when registration closes during redirect.
5. Vico renders only generic/allowlisted callback errors and ignores provider diagnostics in loader data.
6. **AUTH-OAUTH-01 Low/P3:** Better Auth still appends provider `error_description` to the error callback URL. Vico does not remove it from the browser URL and no global Referrer-Policy/url canonicalization was found. This is URL privacy/log hygiene, not an auth bypass; no actual token leakage was proven.
7. Better Auth `1.7.16` retains this behavior.
8. No open redirect, successful state replay, callback-policy bypass or second current-scope B2 defect confirmed.
9. Real Google error payload behavior remains Stage-6 external acceptance.

## 2026-11-10 — Block B / B1 enumeration and rate-limit audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **AUTH-ENUM-01 Moderate/P2:** Vico email sign-up exposes account existence because `requireEmailVerification=false` and default auto-sign-in keep Better Auth's generic duplicate-signup response disabled.
3. Open registration: existing email follows explicit duplicate response while new email succeeds. Closed email registration: existing email still hits duplicate detection before Vico's create-user policy, while a new email reaches the registration-closed denial. The distinction is therefore source-proven in both policy states.
4. Better Auth `1.7.16` keeps the same condition; upgrade alone does not fix the enumeration.
5. Email sign-in does not expose the same distinction: unknown/no-credential/wrong-password paths use the same invalid-email-or-password error and dummy hashing for missing credentials.
6. No rate-limit bypass confirmed. Sign-in/sign-up/change-password use the database-backed 3/10s per trusted client IP/path rule; missing trusted IP falls back to a shared limited bucket instead of disabling throttling.
7. Rate-limit DB concurrency is guarded by unique key + atomic conditional increments; storage failure does not fail open.
8. Distributed multi-IP abuse is a Stage-6/release hardening concern, not promoted to a current defect without deployed traffic/risk design.

## 2026-11-10 — Block B / B5 CSRF-Origin audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. **PASS — 0 confirmed current-scope CSRF/Origin defects.**
3. Better Auth applies global origin middleware to all auth routes; authenticated state-changing requests require trusted origin evidence. Vico does not disable those checks.
4. Email sign-in/sign-up additionally use Better Auth form-CSRF protection for browser first-login flows.
5. Settings Account writes independently enforce exact same-origin before credential/session changes.
6. Explicit Google linking retains global origin validation plus Vico authoritative-session/stale-user admission.
7. Static BETTER_AUTH_URL is the only repository-configured trust root; no widened trusted-origins or disabled-CSRF configuration found.
8. Cross-origin social sign-in was reviewed as JSON-only auth transport; no simple browser CSRF path established.
9. 1.7.7 vs 1.7.16 origin middleware comparison does not change this verdict.
10. Stage-6 multi-origin routing remains future-only: any trusted-origin expansion must be explicit/minimal and separately accepted.

## 2026-11-10 — Block B / B7 session management audit — corrected after B10

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Wrapper ownership/IDOR checks PASS; no cross-user revoke path confirmed.
3. **AUTH-SESSION-02 reclassified Low/P3.** `list-sessions` returns raw DB `session.token`, but B10 established that current Vico does not accept that raw value as an authentication credential: session auth requires Better Auth's signed cookie and Vico has no Bearer plugin. Previous High/P1 takeover statement was wrong and is withdrawn.
4. The raw token remains unnecessary browser exposure/internal-handle leakage relative to Vico's ID-only Settings DTO; 1.7.16 retains it. Re-review if Bearer plugin is ever introduced.
5. **AUTH-SESSION-03 Moderate/P2** remains valid: direct `revoke-other-sessions` lacks the fresh-session gate required by Vico's SET-05 contract.
6. No cross-user revoke, forged target authority, current-session wrapper revoke or race-based ownership bypass confirmed.

## 2026-11-10 — Block B / B4 session lifecycle audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Session fixation not confirmed: new sign-ins create fresh 32-character alphanumeric server tokens; Vico DB enforces unique `session.token`; stale pre-routing cookie cleanup is ordered before endpoint cookies.
3. Vico does not enable Better Auth cookie session cache, so PostgreSQL remains authoritative for ordinary session liveness.
4. Pinned cookie defaults are `__Secure-` + Secure + HttpOnly + SameSite=Lax + Path=/ when baseURL is HTTPS; Vico does not enable cross-subdomain Domain cookies. Actual Stage-6 deployed flags remain externally unverified.
5. **AUTH-SESSION-01 confirmed current-scope Moderate/P2:** Better Auth `/sign-out` swallows `deleteSession` database failure, clears cookies and returns success. Vico passes this behavior through. A copied token can remain server-valid after the user believes logout succeeded.
6. Total DB outage before routing is already fail-closed by Vico's pre-routing 503, so the defect is specifically the successful lookup → later delete-failure window.
7. Better Auth `1.7.16` and current upstream retain this sign-out behavior; upgrading for AUTH-LINK-01 alone does not resolve it.
8. Other revoke endpoints surface delete failures; no second B4 current-scope defect confirmed.

## 2026-11-10 — Block B / B3 account-linking audit

1. Current main `e279cb6c032a489a9044ca1191407df887c364b4`; pinned Better Auth `1.7.7`.
2. **AUTH-LINK-01 confirmed, current-scope Moderate/P2:** OAuth explicit linking persists link userId/email in state but 1.7.7 callback does not re-check that the initiating session remains live before creating/updating the provider account.
3. Vico's custom `/link-social` before-hook protects initiation only; it cannot protect the later callback after logout/revoke.
4. Exact upstream hardening commit `f25081ac0476a9a4295f7a9736ae7239974c7b1e` adds the revoked-during-redirect regression. Better Auth `1.7.16` stores encrypted initiating session token in state and checks the durable session during callback.
5. Impact is constrained: Vico keeps `allowDifferentEmails` false, implicit linking disabled and rejects provider ownership conflicts. No arbitrary-account takeover was proven.
6. Guest initiation, forged stale-user identity, implicit matching-email sign-in linking, provider ownership collision, state replay and external callback/error callback redirect were checked and did not produce another confirmed finding.
7. Parallel duplicate account-row race was examined but not classified as a security defect without a demonstrated cross-user exploit path.
8. External real-Google reproduction remains Stage 6; source-level causal evidence is sufficient for the missing revocation boundary.

## 2026-11-10 — PR #317 security review

1. Target: PR #317 exact stable head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`, base/main `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
2. Reviewed full changed-file security surface with emphasis on outgoing routing injection, absolute origins, redirects/forms, Admin/Super-admin links, request-scoped routing, guards and privilege boundaries.
3. Verdict: **PASS — 0 confirmed current-scope security defects**.
4. No changed file weakens `requireSuperAdmin`, Admin admission/mutation authz, session/auth runtime, Worker bindings, DB grants/schema or secrets.
5. AdministrativeRouting is not currently attacker-controlled: production LocaleBoundary injects no custom routing and server request context has no runtime setter in #317; defaults remain current same-origin routes.
6. IDs/cursors/query components remain encoded. Current Admin mutation form substitution is tested only same-origin; no cross-origin mutation transport is introduced.
7. Exact-head CI #42794915937, SA-01 Chromium #42794915727 and AP-10 Chromium #42794915509 verified SUCCESS.
8. Future-only security requirement: Stage-6 producer of absolute addresses must use strict trusted HTTPS origin validation/allowlist and separately design/accept cross-origin mutations. The present generic string AddressBase is safe only because no untrusted/runtime producer exists yet; this is not a current-stage defect.
9. This security review does not constitute the standard coordinator whole-PR PASS for #317 under #251.

## 2026-11-10 — scope correction

1. #315 является общим служебным каналом безопасности форума.
2. Предыдущее сужение канала до Super-admin было ошибкой координатора.
3. Основной рабочий план переименован в SECURITY_IMPLEMENTATION_PLAN.md и содержит общую security/pentesting карту.
4. Super-admin security сохранён как блок A, первый детально проработанный раздел, а не весь scope PR.
5. Общая карта включает auth/session, authorization, Admin/moderation, public application, attachments, DB/migrations, Workers/Cloudflare, secrets/supply-chain, integrations, abuse/availability, monitoring/incident response и release pentesting.
6. Карта покрытия не является автоматическим implementation scope; каждая проблема сначала классифицируется по фактической реализации и текущему Stage.
7. Implementation и external work сейчас не назначены.
