# stages/AUTH-03/PLAN.md — recovery/reset и безопасное password creation для Google-only аккаунта

## Цель

Добавить полный bounded lifecycle восстановления существующего credential-пароля и безопасного создания password method для собственного Google-only аккаунта, используя принятые AUTH-01/AUTH-02 transaction/state/budget/mail boundaries.

## Основание stack

1. AUTH-01: PR #388 — coordinator PASS.
2. AUTH-02a: PR #389 — coordinator PASS.
3. AUTH-02b: PR #391, accepted exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` — AUTHOR PASS + COORDINATOR PASS.
4. Новый AUTH-03 implementation PR создаётся с base `feat/auth-02b-email-verification` и показывает только bounded diff AUTH-03.
5. Полный технический контракт остаётся в root `PLAN.md`; этот stage-файл ограничивает активную реализацию.

## Scope

### 1. Forgot/reset существующего credential

1. `/:locale/forgot-password` принимает email и возвращает одинаковый neutral acknowledgement для missing/inactive/ineligible/eligible.
2. Limits применяются до account lookup; registration closure не блокирует recovery.
3. Eligible target: active identity с существующим usable credential и выполненным mandatory verification.
4. Unverified account сначала проходит verification; reset не выставляет `emailVerified=true`.
5. Recovery token/state bound к immutable userId/current email/purpose/generation, не к ambient session и не к submitted user ID.
6. Mail issuance использует AUTH-01 mail boundary и AUTH-02 lifecycle state/budgets; mail outcome не раскрывает account existence.
7. GET reset page read-only: token в памяти, без mutation и без secret в rendered data/storage; terminal password change — explicit POST.
8. Terminal reset: password 8–128 → supported native hash → AccountState lock/current subject/state reread → conditional consume → credential update → invalidate conflicting pending operations → revoke **all target sessions** в одной lifecycle transaction.
9. Нет auto-session после reset; успешный пользователь входит заново.
10. Foreign ambient session не меняется и не раскрывает target; reset не отзывает сессии другого account.

### 2. Password creation для Google-only

1. Только из собственного `/:locale/settings/account`.
2. Требуется active **fresh** session и exact current user/session expectation.
3. Сначала mail proof текущего verified address с purpose `password-create`; guest forgot flow для Google-only остаётся neutral и не создаёт credential.
4. Явный password submit использует тот же shared credential service, что reset.
5. Под lock заново проверить current subject/session/email/proof и отсутствие usable credential password.
6. Создать/заполнить ровно один native credential method; concurrent already-set password → conflict, не overwrite.
7. Server-only direct `setPassword` не должен обходить mail proof/fresh-session contract.
8. После commit сохранить initiating session и отозвать остальные own sessions в той же transaction; Google method остаётся linked.
9. Existing SET-05 password change для account с credential сохраняет current-password flow и `revokeOtherSessions:false`.

### 3. Общие transaction / abuse / observability boundaries

1. Использовать существующий request-local lifecycle transaction owner; никакого второго transaction/backend.
2. Target terminal mutation определяется только из signed/persisted proof или authoritative own session, не из client-supplied email/user ID.
3. Commit uncertainty — без blind retry и без ложного success.
4. HTTP/direct/nested используют общие server-owned budgets без double count; native Better Auth limiter не заменяется.
5. Для recovery/create применить действующие plan budgets: mail target/network/user и terminal/user limits; plaintext email/token/IP не хранить в Vico budget keys.
6. Добавить только фактически производимые current-stage observability values:
   - reset → existing `auth.passwordChanged` с context `reset`;
   - password creation → existing `auth.methodLinked` с context `password-create`;
   - session deletions → current-stage причины `password-reset` / `password-create`;
   - attempt operations `password-reset-request`, `password-reset`, `password-create`.
7. Closed DB CHECK/catalog/projections расширять одной forward migration по фактическим новым values; accepted migration history не переписывать.
8. Facts публикуются только после proven outer commit; rollback/zero-row/uncertain outcome не дают success fact.
9. Password/hash/session bearer/token/raw email/URL/provider errors не попадают в facts/attempts/logs/DTO.

### 4. UI / locale / privacy

1. Forgot/reset и password-create presentation использует generic locale, current registry/fallback, EN/RU/HE current packs и LTR/RTL.
2. Все sensitive forms задают безопасную native HTML transport semantics и не кладут email/password/token в URL даже до hydration/без JS.
3. Token pages — `private, no-store` + `Referrer-Policy: no-referrer`; после безопасного in-memory capture token удаляется из address bar.
4. Controlled outcomes не различают account existence и не показывают provider/private diagnostics.
5. Automatic retries mutation/mail запрещены.

## Не входит

1. Email change.
2. Google unlink / last-usable-method enforcement.
3. Account deletion/reactivation.
4. 2FA/passkeys.
5. Registration challenge provider или реальный anti-bot adapter/widget.
6. Реальные Resend/Brevo calls, credentials, DNS, production Google OAuth или Stage-6 activation.
7. Изменение password length 8–128.
8. Новая registration/legacy/grandfathering policy.

## Acceptance

1. Forgot flow neutral для missing/inactive/Google-only/unverified/eligible; no enumeration.
2. Verified credential recovery: issuance → read-only landing → explicit POST reset → старый password недействителен → все target sessions revoked → отдельный new sign-in успешен.
3. Expiry/replay/tamper/wrong-purpose/stale generation/double consume/concurrent reset дают один commit без partial effects.
4. AccountState-first и injected faults в consume/update/revoke/COMMIT не оставляют частично изменённый password/session/state.
5. Foreign ambient session сохраняется и не получает target identity.
6. Registration flags не блокируют recovery existing account.
7. Google-only guest forgot не создаёт password; own fresh-session proof flow создаёт ровно один credential.
8. Stale/foreign/not-fresh/no-proof password-create denied; concurrent create не overwrite.
9. Existing SET-05 change-password сохраняет прежнее поведение и session policy.
10. HTTP/direct/Settings parity, common budgets, native limiter independence и no-double-count подтверждены.
11. Observability отражает только committed факты и actual affected session deletions.
12. Sensitive data не появляется в URL/logs/facts/attempts/DTO; no-JS/pre-hydration forms проверены.
13. Applicable PostgreSQL 17, built Worker/Chromium, migration/manifest/privilege, unit/integration и connected acceptance PASS на stable exact head.
14. External egress/production activation отсутствуют.

## Done

1. Отдельный stacked implementation PR с base `feat/auth-02b-email-verification`.
2. Diff ограничен AUTH-03 и необходимыми regressions/projections/migration.
3. Лёва выполняет author self-check всего bounded AUTH-03, не только happy path.
4. Stable exact head и evidence записаны в `stages/AUTH-03/RESULT.md`.
5. После author PASS Лёва останавливается для coordinator checkpoint Миры.
6. AUTH-04 самостоятельно не начинать.
