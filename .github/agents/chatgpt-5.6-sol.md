# Мира — безопасность Vico Forum

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

## 2026-11-10 — Block B / B7 session management audit

1. Target: current main `e279cb6c032a489a9044ca1191407df887c364b4`, Better Auth `1.7.7`.
2. Vico Settings wrapper passes ownership/IDOR review: authoritative request identity selects subject; session IDs resolve only inside current user's active sessions; current session and stale form identity are rejected.
3. **AUTH-SESSION-02 High/P1:** direct public Better Auth `/api/auth/list-sessions` returns active session bearer tokens. Core session schema does not mark token `returned:false`; the route serializes `parseSessionOutput`. This bypasses Vico's safe ID-only DTO and materially amplifies a compromised fresh session by exposing additional active credentials.
4. Better Auth `1.7.16` retains the same list output, so planned upgrade does not remove this exposure.
5. **AUTH-SESSION-03 Moderate/P2:** direct `/api/auth/revoke-other-sessions` requires an authoritative valid session but not a fresh session. This bypasses the SET-05 contract and wrapper, which explicitly gates session management through `listSessions` freshness.
6. Direct single revoke has the same freshness weakness but additionally needs the target token; grouped under AUTH-SESSION-03.
7. No cross-user revoke, forged session-ID authority, current-session wrapper revoke, or race-based ownership bypass was confirmed.
8. Partial revoke/delete errors surface as failures; no false-success equivalent to AUTH-SESSION-01 was found in these revoke endpoints.

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
