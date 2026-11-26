# stages/AUTH-05/PLAN.md — anti-abuse completion

## Цель

Завершить bounded anti-abuse foundation для уже реализованных authentication flows: привести к полному контракту server-owned budgets, provider-neutral registration challenge, configuration/failure semantics и adversarial coverage без выбора или активации внешнего anti-bot provider.

## Основание stack

1. AUTH-01: PR #388 — coordinator PASS.
2. AUTH-02a: PR #389 — coordinator PASS.
3. AUTH-02b: PR #391 — coordinator PASS.
4. AUTH-03: PR #392 — coordinator PASS.
5. AUTH-04: PR #393, accepted exact head `e9f8bad85694321f3279a72b604546a813a856b8` — AUTHOR PASS + COORDINATOR PASS.
6. Новый AUTH-05 implementation PR создаётся с base `feat/auth-04-account-security` и показывает только bounded diff AUTH-05.
7. Полный технический контракт остаётся в root `PLAN.md`; этот stage-файл ограничивает активную реализацию.

## Scope

### 1. Anti-abuse budgets и parity

1. Сохранить native Better Auth 1.7.7 `rate_limit`, trusted `cf-connecting-ip` и штатные native buckets; не переписывать их cleanup/storage semantics.
2. Завершить использование AUTH-02a `auth_lifecycle_budget` для предусмотренных root PLAN server-owned limits signup/mail/terminal/own operations.
3. HTTP, Settings и direct paths должны использовать один enforcement contract без client-selected bypass и без double counting nested calls.
4. Target/user/network keys остаются domain-separated HMAC; plaintext email/token/IP в budget storage не сохраняется.
5. `X-Forwarded-For` и `X-Real-IP` не являются authority. Unknown trusted network идёт в bounded shared policy, а не получает unlimited path.
6. Storage/config failure fail closed; mutation/mail issuance не продолжается через memory fallback.
7. Fixed-window expiry, bounded cleanup и native/Vico storage isolation должны сохранять live counters друг друга.
8. Safe 429 и `Retry-After`/`X-Retry-After` проходят canonical/document paths; automatic retry не добавляется.

### 2. Provider-neutral registration challenge

1. Завершить server-owned `verifyRegistrationChallenge` boundary с результатами passed/rejected/unavailable.
2. Challenge policy применяется только к **fresh account creation** отдельно для email/password и Google; existing login/link/recovery не блокируется.
3. Для Google fresh-create доказательство связывается с trusted OAuth state/purpose/expiry и фактической create policy, а не с client boolean/cookie.
4. Required mode без verifier fail closed.
5. Repository/local-CI использует только explicit fake verifier fixtures для passed/rejected/unavailable/timeout/uncertain/replay/binding cases.
6. Конкретный provider, SDK/HTTP adapter, widget/sitekey/secrets/hostname/action values и external resource сейчас не выбираются и не реализуются.
7. SET-02 registration flags остаются независимой policy и не заменяются challenge.

### 3. Observability / config / privacy

1. Closed attempt/fact values расширять только вместе с реальным AUTH-05 producer; не создавать success fact из denial/rollback/uncertain outcome.
2. Challenge response, raw IP, target, token и provider-private errors не попадают в responses/logs/History/DTO.
3. Passive SA02 telemetry не считается enforcement.
4. Monitoring GET не выполняет outbound challenge/provider probes.

## Не входит

1. Выбор Turnstile или другого anti-bot provider.
2. External anti-bot credentials/resources, widget/sitekey, hostname/action production policy.
3. Edge/WAF rate-limit rules.
4. Реальные Resend/Brevo или Google OAuth activation.
5. AUTH-06 whole-lifecycle acceptance matrix.
6. AUTH-07 final security gate.
7. Stage-6 deployment/runtime rollout.

## Acceptance

1. HTTP/Settings/direct parity и отсутствие double count для одних и тех же server-owned attempts.
2. Multi-client burst ограничивается атомарно; read-then-write local counter не появляется.
3. Canonical target variants нормализуются одинаково; spoofed `X-Forwarded-For`/`X-Real-IP` не меняют authoritative network key.
4. Unknown trusted network остаётся bounded.
5. Budget/config/storage failure fail closed без user/session/mail/domain effects.
6. HMAC key rotation/changed secret не раскрывает или не переиспользует plaintext identity material и имеет контролируемое поведение.
7. Challenge passed/rejected/unavailable/invalid-binding/expired/replayed/timeout/uncertain имеют правильные fresh-create semantics без лишних user/session/mail effects.
8. Existing login/link/recovery продолжают работать независимо от fresh-create challenge policy.
9. Provider-required mode без verifier не использует fake fallback.
10. Real native short-window sweep не удаляет live Vico 600 s counter; Vico cleanup не затрагивает native/live/locked/renewed rows.
11. DB-clock expiry и fixed-window denial semantics соответствуют root PLAN.
12. Native Better Auth limits остаются неизменными.
13. Schema/manifest/runtime capability probes для `auth_lifecycle_budget` остаются согласованными.
14. UI/route 429 presentation поддерживает явный retry и не раскрывает existence.
15. No secrets/private challenge material в responses/logs/History.
16. Applicable PostgreSQL 17, Worker/HTTP, connected acceptance и regression suites PASS на stable exact head.
17. External egress/provider activation отсутствуют.

## Done

1. Отдельный stacked implementation PR с base `feat/auth-04-account-security`.
2. Diff ограничен AUTH-05 и необходимыми regressions/config/projections.
3. Лёва выполняет author self-check всего bounded AUTH-05 и применимые CI/acceptance.
4. Stable exact head и evidence записываются в `stages/AUTH-05/RESULT.md`.
5. После AUTHOR PASS Лёва останавливается для coordinator checkpoint Миры.
6. AUTH-06 самостоятельно не начинать.
