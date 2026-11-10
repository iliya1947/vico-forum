# Безопасность Vico Forum — implementation plan

## Назначение

1. Этот файл — рабочий план общего служебного канала безопасности Vico Forum.
2. Канал охватывает безопасность форума в целом: application security, authentication/session, authorization, Admin/Super-admin, данные и БД, загрузки, abuse/rate limits, Cloudflare/Workers, внешние интеграции, secrets, deployment/preview isolation, observability и pentesting.
3. Отдельные направления внутри этого плана не считаются автоматически утверждёнными implementation package. Перед работой каждый блок ограничивается текущим Stage и реальной задачей.
4. Уже проработанный блок Super-admin security/pentesting является первой частью этого общего направления, а не назначением всего PR.
5. Реализация выполняется отдельными bounded PR. Этот служебный PR хранит план, текущее состояние, решения и handoff между агентами; сам в main не мержится.
6. Постоянные source-of-truth остаются в профильных документах проекта. PROJECT_STATE.md отражает только фактически реализованное состояние.
7. Stage 6 остаётся paused: foundation, который существенно упрощает будущую защиту, можно готовить в repository/local-CI; реальное production provisioning и activation выполняются только по отдельному решению владельца.

## Цель

Максимально уменьшить вероятность компрометации форума и цену успешной атаки, не превращая pre-release разработку в тяжёлую security-инфраструктуру раньше времени.

Принцип работы:

1. Сначала установить реальную поверхность атаки и текущую реализацию.
2. Отличать подтверждённую проблему текущего Stage от будущего hardening.
3. Устранять прежде всего архитектурные single points of compromise и обходы server-side boundaries.
4. Использовать defense in depth, least privilege, fail closed и минимизацию доступных секретов/данных.
5. Не считать скрытый URL, UI, название роли или публично неизвестную реализацию security boundary.
6. Не расширять scope только потому, что потенциальную защиту технически можно добавить.

## Карта направления безопасности

Следующие области образуют общий security/pentesting scope. Это карта покрытия, а не автоматический список задач реализации.

1. Super-admin / Owner control plane — изоляция Owner surface, privileged authentication, step-up, DB/runtime/deploy boundaries.
2. Authentication & sessions — Google OAuth, email/password, linking, session fixation/theft/revocation/freshness, recovery, CSRF/origin, rate limits.
3. Authorization & privilege escalation — dynamic permissions, Owner binding, role/override mutations, IDOR/BOLA, direct service/HTTP bypasses, stale authorization.
4. Ordinary Admin & moderation — protected reads/writes, measures, complaints, Signals/Attention, privacy of administrative data and actor identity.
5. Public forum/application — XSS, injection, request validation, state changes, business-logic abuse, race/replay/idempotency, cache/privacy boundaries.
6. Files & attachments — upload/download admission, content type/size, path/object access, private evidence, malicious payload handling and storage isolation.
7. Database & migrations — least-privilege runtime roles, migration separation, transaction/locking safety, privilege drift and backup/restore boundaries.
8. Cloudflare/Workers/runtime — bindings, Access, routes/domains, workers.dev/version/preview exposure, service bindings, observability and failure behavior.
9. Secrets & supply chain — secret placement/rotation/exposure, GitHub Actions environments, dependency security, package/update provenance.
10. External integrations — Google, email providers, translation providers/Queues and future third-party credentials/callbacks.
11. Abuse & availability — brute force, spam, rate-limit bypass/concurrency, expensive endpoints, resource exhaustion and denial-of-service boundaries.
12. Security monitoring & incident response — useful source attribution, retained/coalesced events, alertability, audit/history, revocation and recovery procedures.
13. Release pentesting — systematic negative testing and final security review before public release.

При появлении новой security-задачи она привязывается к одной из областей выше и получает отдельный bounded package/plan.

---

# Блок A — Super-admin security / pentesting

## Статус

1. Это первый подробно проработанный security-блок в данном общем канале.
2. Текущий SA-01 уже реализован в repository/local-CI, но находится в одном Worker и одном React Router application с публичным форумом.
3. Реальная Stage-6 Owner binding/deployed acceptance ещё не выполнена.
4. Ниже зафиксирована целевая защита и разделение на foundation сейчас и activation позже.

## Цель блока

Изолировать exact-Owner-only Super-admin так, чтобы компрометация публичного форума, ordinary Admin, обычной форумной session, public Worker runtime или его DB-role не давала прямого пути в Owner control plane.

Главный принцип: целевой Super-admin — отдельный Owner control plane, а не просто сильнее защищённый route публичного Worker.

## Текущий baseline

1. SA-01 зарегистрирован по /:locale/super-admin/* в общем app/routes.ts.
2. Admission использует обычную Better Auth session и затем exact VICO_OWNER_USER_ID.
3. VICO_OWNER_USER_ID — единственный authoritative Owner binding; email, provider claim, role и dynamic permission Owner authority не создают.
4. vico_forum_web имеет широкие forum/auth/authorization/moderation privileges и не подходит как DB identity будущего изолированного Owner Worker.
5. owner_events и owner_monitor_observations append-only; текущий web runtime имеет необходимые SELECT/INSERT.
6. Репозиторий публичный; секретность пути или исходного кода не является защитой.
7. Stage 6 paused.

## Целевая архитектура

1. Public plane: Public Forum Worker обслуживает Forum, ordinary Admin, Settings и Needs attention. После activation он не регистрирует Super-admin routes и не имеет privileged API к Owner Worker.
2. Owner plane: отдельный Owner Worker обслуживает Super-admin и будущие genuinely Owner-only operations.
3. Перед Owner Worker — Cloudflare Access deny-by-default; альтернативные public entrypoints не должны обходить Access.
4. Owner Worker использует отдельную privileged auth/session boundary. Обычная forum session не принимается как Owner session даже при ручной передаче cookie.
5. После Owner authentication сервер повторно проверяет exact VICO_OWNER_USER_ID.
6. Owner authentication — Passkey/WebAuthn с mandatory user verification; критические mutations требуют отдельного step-up.
7. Owner Worker использует отдельную минимальную PostgreSQL capability/role и отдельный cache-disabled Hyperdrive.
8. Public Worker не получает privileged Service Binding/RPC к Owner Worker.

## Security invariants

1. Украденная forum session владельца сама по себе не открывает Super-admin.
2. Ordinary Admin/RBAC не создаёт Super-admin authority.
3. Missing/invalid Owner binding fail closed.
4. Owner session имеет отдельный server-only secret и отдельную authoritative persistence boundary.
5. Owner cookie: Secure, HttpOnly, host-only, SameSite=Strict, без parent-domain sharing.
6. Не используется long-lived cookie session cache, сохраняющий revoked Owner session.
7. Critical actions требуют server-side Passkey step-up, а не только session freshness.
8. Step-up привязан минимум к Owner user, Owner session, purpose и bounded lifetime; destructive operations используют одноразовый operation-bound nonce/grant.
9. Passkey bootstrap не создаёт второй Owner или альтернативный authority source.
10. Постоянного fallback-login из ordinary Google/password в Owner plane нет.
11. Owner secrets не попадают в client data, URL/query, обычные Wrangler vars, logs или artifacts.
12. Owner DB role не получает SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, ownership, CREATE, grant option или migration capability.
13. Public runtime не получает Owner-private reads только ради telemetry.
14. workers.dev, preview и version URLs не являются обходом Access.
15. Secret route slug допустим только как шумоподавление, не security boundary.

## Authentication target

1. Отдельный Owner auth secret и отдельная session persistence.
2. После bootstrap вход в Owner plane — Passkey-only.
3. WebAuthn RP/origin ограничены Owner hostname; user verification required.
4. Минимум основной и резервный Passkey; обычный UI не удаляет последний credential.
5. Первый Passkey регистрируется через bounded one-time enrollment, который может разрешить только exact VICO_OWNER_USER_ID.
6. Потеря всех Passkey обрабатывается manually enabled break-glass recovery, который после использования снова отключается.
7. Sensitive/critical mutations требуют нового Passkey challenge.
8. До Passkey implementation Better Auth обновляется с текущего 1.7.7 на актуальную patched release после повторной проверки официальных release notes. На 2026-11-10 минимально проверенная security-fixed версия линии 1.7.x — 1.7.16; связанные Better Auth packages обновляются согласованно.

## Database and telemetry target

1. Отдельный Owner runtime capability contract; production role name environment-specific, условно vico_owner_runtime.
2. Для текущего SA-01 нужны только обоснованные Owner monitoring/history и Owner-auth relations.
3. Existing vico_forum_web не используется как Owner Worker DB identity.
4. После разделения public web role теряет ненужные Owner-history read privileges.
5. Public 5xx telemetry при необходимости получает отдельный узкий append-only producer boundary без Owner journal reads и без client-driven generic event writer.
6. Каждый следующий SA package расширяет capability только под конкретный code-backed use case и negative privilege probes.

## Worker, Access and deployment target

1. Отдельный Owner Worker entrypoint/config, GitHub Environment и rollout workflow.
2. Выделенный Owner hostname/custom domain; Access защищает все реальные entrypoints до application execution.
3. Для Owner Worker явно отключаются workers_dev и preview_urls, если они не защищены эквивалентной Access policy.
4. Owner secrets — secret bindings, не обычные vars.
5. PR/CI не получают production Owner secrets/Hyperdrive/private data.
6. Новый production version проверяется через защищённый hostname без необходимости публичного Version URL; предпочтительный вариант — 0% deployment + Version Override + promotion после smoke.
7. Rollout проверяет exact SHA, migrations/capabilities, built artifact, protected smoke и rollback baseline.
8. Public Worker deployment credentials не дают Owner deployment authority.

## Что подготовить до Stage 6

1. Разделить кодовые зависимости так, чтобы Super-admin можно было собрать отдельным Owner Worker без копирования domain logic и второго RBAC.
2. Зафиксировать Owner-runtime boundary и canonical ownership операций между Super-admin, ordinary Admin, Settings и Attention.
3. Подготовить независимые config/env interfaces для future Owner Worker.
4. Подготовить отдельный DB capability contract и disposable PG positive/negative probes для Owner monitoring и telemetry producer.
5. Подготовить auth/session interfaces, не зависящие неявно от ordinary forum session.
6. Сохранить текущую local/CI функциональность и URL до отдельного activation package, если изменение URL не требуется самому foundation.
7. Не создавать Access application, hostname, Owner Hyperdrive, production credential, Passkey enrollment secret или deployment в этой фазе.

## Что активировать только на Stage 6

1. Повторно проверить и обновить Better Auth security baseline.
2. Создать реальный Owner Worker и перенести Super-admin ingress из Public Worker.
3. Создать Owner hostname и включить Access deny-by-default.
4. Создать отдельные Owner auth/session/passkey persistence и secrets.
5. Выполнить bounded Passkey bootstrap exact Owner и зарегистрировать резервный credential.
6. Provision минимальный Owner DB role и отдельный cache-disabled Hyperdrive.
7. Разделить public telemetry producer и Owner history reader capabilities.
8. Закрыть альтернативные public entrypoints и подтвердить это внешней проверкой.
9. Включить отдельный protected rollout и выполнить smoke/rollback acceptance.
10. Только после acceptance удалить public /:locale/super-admin/* ingress и считать Owner control plane authoritative.

## Step-up classes

1. Privileged read: Access + isolated Owner session + exact Owner binding.
2. Sensitive mutation: дополнительно короткий purpose-bound Passkey step-up.
3. Critical/destructive mutation: operation-specific WebAuthn challenge + одноразовый grant/nonce.
4. К critical по умолчанию относятся управление Owner Passkey/recovery, privileged infra/DB/secret changes, deploy/rollback и необратимые массовые/destructive operations, когда они реально появятся.

## Acceptance criteria блока A

1. Forum session/cookies не дают Owner session.
2. Non-Owner, ordinary admin, arbitrary role/grant/override и forged identity fail closed.
3. Missing/invalid Owner binding fail closed.
4. Revoked Owner session перестаёт работать server-side без долгого cache grace.
5. Passkey использует правильный RP/origin и mandatory user verification.
6. Sensitive/critical writes fail без подходящего fresh purpose-bound step-up.
7. Public Worker после activation не имеет privileged Owner API/RPC path.
8. Owner DB role проходит positive/negative privilege probes.
9. Public telemetry writer не читает Owner journal и не выполняет arbitrary Owner writes.
10. Owner Worker не имеет незащищённого workers.dev/preview/version bypass.
11. Access блокирует неразрешённый request до application execution; application всё равно делает exact Owner admission.
12. Owner secrets отсутствуют в public Worker config, PR preview, logs и artifacts.
13. Новая Owner version проходит protected smoke и rollback path до promotion.
14. Permanent docs фиксируют только фактически реализованное состояние.

---

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

# Блок C — Authorization & privilege escalation audit

## Проверенный baseline

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Better Auth даёт только authoritative authenticated `user.id`; application authorization хранится отдельно в PostgreSQL.
3. Единственный Owner — exact server-bound `VICO_OWNER_USER_ID`; email/role/client input/session role claim Owner authority не создают.
4. Effective permissions: non-Owner использует `deny > allow > role grant > deny`; bound Owner получает projection всего текущего `PERMISSION_CATALOG`.
5. Authorization reads обязаны быть snapshot-consistent и fresh на следующий protected request; long-lived permission cache не разрешён.
6. Все шесть authorization-management write families current-release Owner-only и дополнительно проходят fresh `access.authorization.manage`, same-origin, serialized `authz_mutation_lock`, AP-10 restriction/authority checks и atomic History.
7. `access.authorization.manage` у non-Owner даёт только защищённый read-only management subset, не mutation authority.
8. Unknown permission keys не должны становиться executable authority.

## Граница блока

Block C проверяет общий authorization engine и privilege-escalation paths. Он **не** проводит полный повторный аудит конкретных Ordinary Admin/Complaints/Signals/Measures workflows; их domain-specific reads/writes будут отдельным security-блоком. Здесь они рассматриваются только там, где нужны для доказательства общей authz boundary.

## C1 — Owner binding / authority spoofing

Проверить:

1. Missing/blank/whitespace/malformed `VICO_OWNER_USER_ID` не создаёт Owner authority и не даёт fallback другому actor.
2. Email, display name, role slug, raw `admin` role, grants/overrides и client-supplied IDs не могут подменить exact Owner binding.
3. Non-Owner с полным raw catalog или персональным allow на `access.authorization.manage` не получает Owner-only writes.
4. Owner raw deny/role change не ломает утверждённую server-bound Owner projection, но и не снимает resource/lifecycle/Origin constraints.
5. Account/session switch не позволяет сохранить Owner projection от предыдущего user ID.
6. Unknown permission key не становится разрешённым даже для Owner.

## C2 — Effective permission resolution / precedence / freshness

Проверить:

1. `deny > allow > role grant > deny` для non-Owner на реальном DB path.
2. Пользователь без explicit assignment получает только built-in `user` role.
3. Role/grant/override change действует на следующий protected request без logout/login.
4. Request-local cache не переживает request и не смешивает users.
5. Один `resolve()` возвращает internally consistent snapshot; management reads также не смешивают разные DB snapshots.
6. `has()` и `resolve().effectivePermissions` не расходятся для одного committed state.
7. Client/session-stored role or permission data никогда не выбирают authorization result.

## C3 — Authorization-management write escalation / direct bypass

Проверить все шесть write families через route и direct capability/service boundary:

1. create custom role;
2. rename custom role;
3. delete custom role;
4. replace role grants;
5. assign user role;
6. set/remove user override.

Для каждого проверить guest, ordinary user, manager non-Owner, forged actor/target IDs, no-op, direct service call и stale session. Все non-Owner paths должны fail closed до write/History; exact Owner должен всё равно пройти fresh permission, Owner policy, restriction/authority и validation checks.

## C4 — Elevated authority propagation

Проверить `admin.users.blocks.managePrivileged` как дополнительную elevated capability:

1. Grant/revoke elevated permission через role grants.
2. Role assignment к/от elevated role.
3. Per-user allow/deny/inherit elevated permission.
4. Delete elevated custom role.
5. Попытка получить privileged-target authority только через `admin.users.blocks.manage`.
6. Owner projection не превращает persisted elevated state других users в Owner authority.
7. Смена elevated state и AP-10 authority decision сериализуются общей authz boundary без stale privilege window.

Domain-specific measure behavior здесь не переаудируется; проверяется только propagation/privilege-escalation seam.

## C5 — Authorization-state read privacy / IDOR

Проверить:

1. Guest и ordinary user не читают Roles/authorization users.
2. `access.authorization.manage` non-Owner получает только предусмотренный management subset/read-only state.
3. `admin.users.read` отдельно не раскрывает full authorization-management snapshot.
4. Targeted authorization read не позволяет выбрать чужие private данные сверх предусмотренного authorization state.
5. Email/raw identifiers/history-sensitive данные не появляются на route, где соответствующий read permission отсутствует.
6. Owner-only mutation controls/presentation data не считаются boundary и не выдаются как authority client-side.

## C6 — Resource-condition enforcement / service bypass

Проверить общие capability + resource-condition seams:

1. `forum.post.editOwn` — authoritative author, не submitted authorId.
2. `forum.solution.manageOwn` — authoritative topic author.
3. `forum.sourceLocale.correctOwn` — authoritative content author.
4. Any/manage permissions снимают только заявленное ownership-ограничение, не соседние lifecycle/validation guards.
5. Direct route/service/repository invocation не должен превращать permission check в UI-only gate.
6. Stale mounted UI/account switch и forged visible account IDs не выбирают actor.

Конкретные moderation/business rules вне этих generic ownership seams остаются последующим блокам.

## C7 — Freshness / concurrency / mutation serialization

Проверить:

1. Все authorization writes захватывают singleton `authz_mutation_lock` до fresh actor admission.
2. Concurrent grant/override/role changes не позволяют обеим операциям принять несовместимый stale authority state.
3. AP-10 shared authority decisions, которые используют тот же mutex, не создают gap между authz change и privileged-target check.
4. No-op mutation тоже проходит current Owner/fresh/restriction checks.
5. Failed History append откатывает authorization change; rejected/rolled-back write не создаёт History.
6. Delete/assign/grant races не нарушают role-assignment/FK/system-role invariants.
7. Next protected request видит committed state, а незакоммиченный/rolled-back state не становится authority.

## C8 — Failure semantics / request-local cache

Проверить:

1. Classified PostgreSQL/Hyperdrive availability failures → typed unavailable/fail-closed на protected operations.
2. SQL/schema/config/programming/invariant errors не превращаются в ordinary permission=false или silent UI degradation.
3. Optional public presentation может скрыть controls только для classified availability failure; protected action проверяет permission независимо.
4. Cleanup/discard error не заменяет исходный authz result.
5. Request-local cache не кеширует failure/authority между requests или users.
6. Parallel `has()`/resolve calls не создают inconsistent cross-user cache keys.

### Результат C8 — 2026-11-10

1. **AUTHZ-FAIL-01 — Low/P3, current-scope.** Mutation path в `PostgresAuthorizationRepository.mutate()` выполняет `ROLLBACK` в `catch` без best-effort guard. Если исходная authorization/domain/programming/COMMIT error уже возникла, а сам `ROLLBACK` затем падает, наружу выходит rollback error вместо исходной причины.
2. Через production Hyperdrive wrapper availability-shaped rollback error классифицируется как `AuthorizationUnavailableError`; поэтому исходный forbidden/conflict/programming failure может стать controlled `503`. Privilege escalation, protected mutation success или private-data read из этого не доказаны; impact — loss/misclassification of authoritative failure cause и ухудшение observability/incident diagnosis.
3. Read-snapshot path этой проблеме не подвержен: `withReadSnapshot()` уже best-effort подавляет rollback cleanup failure и сохраняет исходную operation/COMMIT error; regression это проверяет.
4. Hyperdrive cleanup через `bestEffortDiscardClient(pool)` сохраняет успешный result и исходный error при sync/async pool cleanup failures.
5. Availability classifier ограничен известными PostgreSQL connection/availability SQLSTATE, transport codes и точными timeout shapes; schema/programming/configuration errors не переводятся в typed unavailable.
6. Optional public presentation catches только `AuthorizationUnavailableError`; unexpected authorization errors продолжают обычный error path. Protected routes/actions fail closed и independently recheck permission.
7. Production authorization cache остаётся request-local: один resolution promise на exact `userId`; разные users имеют разные keys, новый Worker request создаёт новый cache. Rejected promise не переживает request и не превращается в permission allow.
8. Administrative-restriction cache также создаётся заново на Worker request и key'ится family + actor + raw authority level; current code path не показал cross-user authority reuse.
9. Unguarded `PoolClient.release()` теоретически может заменить результат, если сам локальный release бросит исключение, но реалистичный infrastructure trigger в текущем path не доказан; отдельно current finding не фиксируется.
10. Remediation не назначена; finding только зафиксирован для будущего correction stage по отдельной команде владельца.

## C9 — Permission catalog / persistence integrity

Проверить:

1. DB `authz_permissions` соответствует code-backed `PERMISSION_CATALOG`; arbitrary string через UI/API не становится executable permission.
2. Role grants/overrides принимают только known catalog keys.
3. Built-in role identity/slug invariants нельзя сломать обычной management mutation.
4. Custom role deletion с assignments fail closed; FK/cascade semantics не дают orphaned effective authority.
5. Default built-in `user` role lookup не может silently выбрать другую role при повреждённом/дублированном state.
6. Owner projection даёт только catalog keys, а не DB-injected unknown permissions.
7. Authorization tables остаются application-domain boundary; Better Auth Admin/plugin role model не становится альтернативным source of authority.

## Порядок фактической проверки Block C

1. C1 Owner binding / authority spoofing.
2. C3 Management direct-write escalation.
3. C2 Resolution / precedence / freshness.
4. C7 Concurrency / serialization.
5. C4 Elevated authority propagation.
6. C5 Authorization read privacy / IDOR.
7. C6 Resource-condition/service bypass.
8. C8 Failure/cache semantics.
9. C9 Catalog/persistence integrity.

## Критерий завершения Block C

1. Все generic authorization trust boundaries проверены по actual current-main HTTP/service/DB path.
2. Каждый finding имеет доказанную privilege/authority impact и current-stage classification.
3. Domain-specific Admin/moderation finding не дублируется здесь, если общая authz boundary сама корректна.
4. Findings только фиксируются в #315; remediation/implementation не начинается без отдельной команды владельца.

---

# Общий процесс pentesting/security

## Для каждого блока

1. Определить assets, trust boundaries и доступные attacker entrypoints.
2. Проверить фактический code/runtime path, а не только UI.
3. Составить negative cases: guest, authenticated user, privileged-but-wrong actor, stale session, forged identifiers, direct HTTP/service path, concurrency/replay, dependency failure.
4. Для найденного дефекта доказать impact и текущую exploitable path.
5. Классифицировать: current-stage defect / release blocker / future hardening.
6. Исправлять минимальной bounded задачей с regression coverage.
7. Повторно проверять direct path и соседние boundaries.
8. Фиксировать только полезные security events; не превращать аудит в бесконтрольный сбор персональных данных.
9. Перед production/public release выполнить отдельный whole-product security pass.

## Приоритеты

1. P0 — обход Owner/authentication/authorization, утечка secrets/credentials, remote code/data destructive compromise.
2. P1 — доступ к private/admin data, privilege escalation, auth/session takeover, arbitrary protected mutation.
3. P2 — значимый abuse/DoS, ограниченная утечка или business-logic bypass.
4. P3 — hardening, которое снижает риск, но не закрывает подтверждённую текущую exploit path.

Severity не заменяет Stage-классификацию: будущий P1-сценарий без существующей поверхности атаки не объявляется текущим дефектом.

## Не входит автоматически

1. Security-through-obscurity как основная защита.
2. Private repository как security boundary.
3. Второй Owner/deputy/successor/transfer без отдельного продуктового решения.
4. Универсальный privileged mutation API.
5. Хранение исполняемого кода в PostgreSQL.
6. Production provisioning/deploy без отдельного разрешения.
7. Реализация всех пунктов карты безопасности только потому, что они перечислены в этом плане.

## Проверенные внешние ориентиры на 2026-11-10 для блока A

1. Better Auth security release: https://better-auth.com/blog/security-release-2026-11-03
2. Better Auth Passkey: https://better-auth.com/docs/plugins/passkey
3. Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
4. Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
5. Cloudflare Version Overrides: https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/

Перед каждым implementation package изменяемые API/версии и внешние assumptions проверяются заново.
