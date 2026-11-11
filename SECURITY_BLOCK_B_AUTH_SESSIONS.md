# Блок B — Authentication & sessions security audit

## Проверенный baseline на 2026-11-10

1. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Better Auth в repository baseline: `1.7.7`; email/password enabled, email verification intentionally not required.
3. Google OAuth и email/password используют один Better Auth runtime; authentication/session state хранится в PostgreSQL через web runtime.
4. `disableImplicitLinking: true` включён. Google linking идёт через explicit authenticated `link-social`; server hook повторно получает authoritative session и сверяет `x-vico-link-user` как stale-identity expectation.
5. Registration admission выполняется server-side в `validateUserInfo` на фактическом `create-user` и читает свежую registration policy из PostgreSQL.
6. Better Auth rate limiting включён и хранится в DB; trusted client IP берётся только из Cloudflare `cf-connecting-ip`.
7. Credential `returnTo` ограничен локальным путём текущего locale и отвергает external/protocol-relative destinations.
8. Account & security повторно проверяет текущую session/user/session-id, same-origin и exact allowlisted form fields.
9. Change-password проходит через Better Auth HTTP handler, чтобы не обходить canonical rate-limit; управление другими sessions сохраняет Better Auth fresh-session gate.
10. Session tokens, OAuth tokens, password hashes и provider credentials не сериализуются в Account & security DTO.

Эти свойства считаются существующими защитами, но аудит обязан проверить их прямые и обходные пути, а не принимать комментарии/тесты за доказательство.

## Цель аудита

Проверить, может ли внешний или уже аутентифицированный атакующий:

1. получить чужую session или привязать чужой provider;
2. создать/сохранить session вопреки registration/auth policy;
3. перенаправить OAuth/auth flow на внешний origin;
4. обойти rate limit, freshness, Origin/CSRF или stale-identity checks;
5. управлять чужими sessions/credentials;
6. сохранить доступ после logout/revoke/password/security-state change;
7. извлечь credentials/tokens/private auth data из response, HTML, logs или error paths.

## B1 — Login / registration enumeration and brute force

Проверить:

1. Прямые Better Auth email sign-in/sign-up endpoints, а не только UI.
2. Различаются ли status/body/timing для существующего email, неизвестного email, неверного пароля, Google-only account и закрытой регистрации.
3. Можно ли practically использовать различия для account enumeration.
4. Rate-limit coverage для sign-in, sign-up, change-password и OAuth/link endpoints.
5. Обход rate limit через parallel requests, IPv4/IPv6 spelling, forwarded headers, отсутствие/подмену `cf-connecting-ip`, разные auth endpoints и direct/internal API calls.
6. Поведение при DB rate-limit storage outage: fail-open или fail-closed там, где это security-sensitive.
7. Отсутствие account/session creation после denied/failed registration admission.

## B2 — OAuth login and callback integrity

Проверить:

1. OAuth state/PKCE/nonce behavior фактической установленной Better Auth версии на реальном handler path.
2. Callback/error callback не принимают attacker-controlled external return destination.
3. `returnTo`, locale switching и auth error flows не дают open redirect через encoded, double-encoded, backslash, control-char, scheme-relative или malformed URL.
4. Начатый Google flow при смене registration policy проверяется на callback/create-user, а не доверяет старому UI state.
5. OAuth callback для existing user не ошибочно проходит new-registration path и наоборот.
6. Callback/redirect не отражает provider error/token/private state в URL/HTML/logs сверх safe code.
7. Replay callback/state после успешного завершения не создаёт вторую session/account link.

## B3 — Account linking / account takeover

Это один из самых критичных блоков из-за отсутствия обязательной email verification у local accounts.

Проверить:

1. Matching unverified local email + Google OAuth не вызывает implicit link.
2. Guest не может вызвать `link-social` так, чтобы provider привязался к существующему local account.
3. Session пользователя A + подставленный `x-vico-link-user=B` всегда fail closed до OAuth state/link.
4. Stale tab: начать linking как A, сменить browser session на B, завершить callback — link не должен попасть к A или B ошибочно.
5. Parallel linking двух Google identities к одному local account.
6. Повторное linking уже связанного provider и provider/account collision.
7. CallbackURL/errorCallbackURL не могут превратить linking в open redirect.
8. Закрытие новой Google registration не блокирует legitimate explicit link существующего account, но и не открывает путь создания нового account через link flow.
9. Provider email/verification claims не используются как замена authoritative local session.

## B4 — Session fixation / rotation / cookie behavior

Проверить фактическими HTTP flows:

1. Session до login и session после login: старый attacker-known token не должен стать authenticated token.
2. Повторный login/logout/login и account switching не должны восстанавливать stale authenticated cookie.
3. Pre-routing expired-session cleanup не должен перезаписывать свежий login/logout Set-Cookie.
4. Cookie flags и scope для current forum auth: Secure/HttpOnly/SameSite/Path/Domain по фактическому response.
5. Нельзя ли послать два session cookies с одинаковым/похожим name/path и заставить разные слои выбрать разные значения.
6. Expired/revoked token всегда unauthorized на следующем protected request.
7. Session database failure не превращается в guest/permission=false там, где protected path должен fail closed.
8. Session IDs/tokens не появляются в HTML, React data, client logs или URL.

## B5 — CSRF / Origin / cross-site auth actions

Проверить отдельно:

1. Email/password sign-in/sign-up.
2. Sign-out.
3. Change-password.
4. Revoke one / revoke all other sessions.
5. Explicit Google linking.
6. Current/future auth callback endpoints.

Атаки:

1. Missing Origin.
2. `Origin: null`.
3. Foreign HTTP/HTTPS origin.
4. Same-site different-origin/subdomain.
5. Malformed Origin and multiple/proxy-related headers.
6. Browser form POST vs fetch/XHR semantics.

Для state-changing account/security operations подтвердить, что cross-site request не может silently изменить credentials/link/session state. Не считать SameSite cookie единственной CSRF boundary.

## B6 — Password change boundary

Проверить:

1. Current password действительно требуется и wrong-password path не меняет credential.
2. Google-only account не может через crafted request получить новый credential password.
3. New password bounds одинаковы в Settings и direct Better Auth path.
4. Direct Better Auth endpoint и Settings route используют один rate-limit bucket/semantics там, где это заявлено.
5. Parallel wrong-password attempts не обходят лимит.
6. Stale session/user expectation в Settings не выбирает subject.
7. Password change не меняет другой account даже при forged form/user/session IDs.
8. После change проверить policy текущей версии Better Auth: какие sessions остаются валидными, и соответствует ли это текущему product contract.
9. Password value не отражается в errors/logs/telemetry.

## B7 — Session management / IDOR

Проверить:

1. `revoke-one` с session ID другого пользователя.
2. Случайный/nonexistent/expired ID.
3. Current session ID.
4. Duplicate sessionId fields / extra fields / oversized ID.
5. Stale expectedUserId/expectedSessionId.
6. Session A открыла страницу, затем account switch → старая форма не должна управлять B.
7. Freshness expiry между loader и action.
8. Race: list sessions → target revoked/replaced → revoke action.
9. Parallel revoke-one/revoke-all.
10. Revoke реально делает token unusable на следующем protected request.
11. UI не получает bearer token: только opaque session ID и safe metadata.

## B8 — Session freshness / reauthentication

Проверить:

1. Точный Better Auth fresh-session interval/semantics установленной версии.
2. Freshness вычисляется server-side, не по client timestamp.
3. Session list/revoke-one/revoke-all действительно одинаково требуют fresh session.
4. Старую session нельзя «освежить» только reload/revalidation/forged timestamp.
5. Если auth storage недоступен, freshness-sensitive operation не выполняется.
6. Account switching и OAuth callbacks не позволяют наследовать freshness другой session.

## B9 — Registration policy races

Проверить:

1. Open → start email signup → Owner closes registration → submit.
2. Open → start Google OAuth → Owner closes → callback.
3. Closed → existing user email login.
4. Closed → existing Google login.
5. Closed → explicit Google link existing user.
6. Concurrent policy update + create-user.
7. Missing/invalid singleton и PostgreSQL timeout.
8. Unknown future auth method: fail closed.
9. Denied registration не оставляет partial user/account/session rows.

## B10 — Failure, privacy and leakage

Проверить:

1. 400/401/403/409/429/503 responses не раскрывают email existence, hashes, tokens, provider payloads, SQL/connection strings или internal stack.
2. Protected auth/settings responses имеют intended private/no-store semantics.
3. `Retry-After` принимает только bounded numeric server value.
4. User-Agent/device label sanitization не позволяет control-character/header/HTML injection.
5. Worker 5xx telemetry не пишет URL/body/cookie/password/token.
6. Unexpected errors не превращаются в security success или misleading ordinary denial.
7. Cleanup/discard failure не заменяет исходный auth result.

## B11 — Dependency/security-version check

Перед фактическим audit execution отдельно проверить актуальные official Better Auth security advisories/release notes относительно установленной `1.7.7`.

Если установленная версия содержит исправленную уязвимость, применимую к реально используемому Vico feature/path, классифицировать отдельно:
1. current-stage defect, если exploitable path уже существует;
2. обязательный pre-Stage-6/pre-release upgrade gate, если риск проявляется только при будущей функции.

Не смешивать upgrade ради latest с подтверждённым finding.

## Порядок фактической проверки блока B

1. B3 Account linking / takeover.
2. B4 Session fixation/cookie lifecycle.
3. B7 Session IDOR/revoke.
4. B5 CSRF/Origin.
5. B1 Brute-force/rate limits.
6. B2 OAuth redirect/callback integrity.
7. B6 Password change.
8. B8 Freshness.
9. B9 Registration races.
10. B10 Leakage/failure semantics.
11. B11 Dependency-version exposure.

Первые четыре имеют приоритет, потому что успешный bypass непосредственно даёт takeover или protected state change.

## Критерий завершения блока B

1. Все перечисленные direct HTTP/runtime paths проверены на current main/stable audit target, а не только unit/UI tests.
2. Каждый finding воспроизводим, имеет доказанную causal path и классифицирован по текущему Stage.
3. Current-scope defects передаются одним bounded correction package; future hardening остаётся в #315 без немедленной реализации.
4. После corrections соответствующие attack cases повторяются.
5. Production Google/OAuth-specific acceptance, которое невозможно доказать без real provider, остаётся Stage 6 и маркируется как непроверенное external boundary.

---
