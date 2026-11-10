# Authentication lifecycle — implementation plan

## Назначение

1. Этот файл — рабочий план отдельной задачи развития пользовательской authentication/session системы Vico Forum.
2. Служебный канал этой задачи отдельный от общего security PR #315. #315 используется как источник security-аудита/требований, но не как канал реализации auth lifecycle.
3. Реализация выполняется отдельными bounded implementation PR. Этот служебный PR не merge в `main`.
4. До Stage 6 разрешена только repository/local-CI foundation-работа. Реальные внешние аккаунты, credentials, DNS, provider calls и Cloudflare activation не выполняются.

## Зафиксированные решения владельца

1. Email/password регистрация требует обязательного подтверждения email до полноценного использования credential-account.
2. Google OAuth остаётся дополнительным способом входа.
3. Automatic/implicit linking Google ↔ email/password запрещён даже при одинаковом email; linking только явно самим уже authenticated пользователем.
4. Account & security должен полноценно покрывать email, password, Google и собственные sessions.
5. Account deletion/anonymization — отдельная будущая задача.
6. 2FA/passkeys — отдельная будущая задача.
7. Поддерживаются Resend + Brevo через единый Vico mail boundary; один provider активен конфигурацией, без automatic failover на первом этапе.
8. До Stage 6 Resend/Brevo/Turnstile/production Google OAuth/edge rate-limit rules не подключаются. До Stage 6 готовятся только contracts, adapters, fake/test implementations, UI/runtime boundaries и проверки.

## Текущий baseline main

Проверено на `main` `e279cb6c032a489a9044ca1191407df887c364b4`.

1. Better Auth `1.7.7` + Drizzle/PostgreSQL.
2. Email/password registration/sign-in уже реализованы; сейчас `requireEmailVerification: false`.
3. Google OAuth boundary уже есть.
4. `account.accountLinking.disableImplicitLinking: true` уже включён.
5. Явный Google linking через `linkSocial` уже реализован с server-authoritative session и stale-user expectation.
6. `/:locale/settings/account` уже реализует linked-method view, смену существующего credential password, список собственных sessions, revoke одной другой session и revoke всех остальных.
7. Новые Google/email registrations независимо управляются Owner-настройками; закрытие регистрации не отключает sign-in или explicit linking существующего пользователя.
8. Database-backed Better Auth rate limiting и trusted `cf-connecting-ip` boundary уже существуют.
9. Password reset/recovery, Google-only set-password, email change, provider unlink, transactional mail sender и Turnstile отсутствуют.
10. Existing authorization/RBAC не меняется: Better Auth остаётся identity/session provider, application permissions продолжают разрешаться отдельно server-side.

## AUTH-01 — Mail foundation

### Результат

Provider-neutral transactional mail boundary для auth lifecycle без реальных внешних вызовов.

### Scope

1. Два auth message families: email verification и password recovery/set-password.
2. Provider adapters под Resend и Brevo за единым Vico boundary.
3. Один provider выбирается конфигурацией; automatic fallback отсутствует.
4. Local/CI используют fake/test transport.
5. Runtime/config contract заранее допускает Stage-6 activation без переписывания Better Auth/UI.
6. Не подключать реальные API keys, DNS, provider accounts или outbound provider calls.

### Security

1. Verification/reset secrets не логируются и не попадают в client DTO, History или analytics.
2. Provider-specific credentials остаются server-only.
3. Fake transport не должен быть допустимым production provider.
4. Не делать слепой fallback при ambiguous delivery result.

### Готовность

Local/CI могут полностью сформировать и проверить оба auth email flow через fake transport; переключение Resend/Brevo локально ограничено provider boundary.

## AUTH-02 — Mandatory email verification

### Результат

Email/password account не получает полноценный credential access до подтверждения адреса.

### Scope

1. Включить обязательную verification-модель.
2. Реализовать sent/pending/success/expired-invalid/resend UX.
3. Существующий registration on/off gate контролирует только создание новых account и не ломает verification уже созданного.
4. Google OAuth остаётся независимым методом.

### Security

1. Token одноразовый и bounded lifetime.
2. Resend verification rate-limited.
3. Replay отклоняется.
4. Submitted user/email не выбирает authoritative subject.
5. Same-email Google никогда не вызывает implicit linking.
6. Storage/unavailable failure fail closed.

### Готовность

`sign-up → fake email → verification → authenticated credential account` проходит positive и negative/replay integration tests.

## AUTH-03 — Password recovery и Google-only set-password

### Результат

Единый verified recovery flow для восстановления password и создания credential method у Google-only account.

### Scope

1. Forgot-password entry на sign-in.
2. Generic request response без account enumeration.
3. Reset email через AUTH-01.
4. Set new password по valid proof.
5. После successful reset старые sessions отзываются по утверждённой recovery policy.
6. Google-only user создаёт password через этот же verified flow, без отдельного небезопасного authenticated set-password shortcut.

### Security

1. Reset token одноразовый и bounded lifetime.
2. Recovery request rate-limited.
3. Replay/expired proof отклоняется.
4. Response не подтверждает существование email.
5. Нельзя захватить другой user через same-email/provider collision.
6. После reset старые sessions не сохраняют доступ согласно policy.

### Готовность

Работают `password user → forgot → reset → login` и `Google-only → verified recovery → password method`.

## AUTH-04 — Complete Account & security lifecycle

### Результат

Достроить только отсутствующие own-account controls поверх SET-05.

### Scope

1. Показ current email + verification state.
2. Safe email change.
3. Google-only password creation ведёт через AUTH-03.
4. Provider unlink для Google.
5. Нельзя удалить последний рабочий login method.
6. Existing Google link/password change/session controls сохраняются без ненужной переработки.

### Security

1. Sensitive mutations требуют fresh/re-authenticated security context согласно Better Auth capabilities.
2. New email подтверждается до switch.
3. Client user/session IDs — только stale expectations, не authority.
4. Server re-resolves current authoritative identity.
5. Same-origin/CSRF boundary независимо проверяется server-side.
6. Stale-tab/account-switch не может link/unlink provider другой identity.

### Готовность

Пользователь может безопасно управлять email/password/Google/sessions и не может оставить account без способа входа.

## AUTH-05 — Anti-abuse foundation

### Результат

Подготовить boundary для Stage-6 Turnstile и усилить auth abuse controls без внешней активации.

### Scope

1. Registration challenge interface + fake verifier local/CI.
2. Stage-6 adapter point для Cloudflare Turnstile.
3. Сохранить существующий DB-backed Better Auth rate limiting.
4. Явно проверить/задать применимые limits для signup, verification resend, recovery request и sensitive password operations.
5. Login существующих users не зависит от Turnstile.

### Security

1. Challenge проверяется server-side.
2. Challenge infrastructure failure fail closed для новой регистрации.
3. Без permanent lockout, VPN/Tor blanket block, disposable-email blacklist и custom risk engine.

### Готовность

Registration использует abstract challenge admission в local/CI, но не требует Cloudflare resource.

## AUTH-06 — Security + lifecycle acceptance

### Результат

Единая проверка всей auth системы как lifecycle и attack surface.

### Обязательные positive flows

1. Email registration + verification + login.
2. Forgot/reset.
3. Google-only → password.
4. Credential → explicit Google linking.
5. Email change.
6. Google unlink при наличии другого method.
7. Password change.
8. Session list/revoke.
9. Registration flags.
10. EN/RU/HE, LTR/RTL, responsive Settings/auth UI.

### Обязательные negative/adversarial checks

1. Verification/reset replay и expiry.
2. Account enumeration.
3. Rate-limit behavior.
4. Cross-origin state change.
5. Stale account/session/tab.
6. Cross-user linking/unlinking.
7. Same-email implicit-link attempts.
8. Duplicate/conflicting provider linking.
9. OAuth callback/link target integrity.
10. Foreign/current/revoked session misuse.
11. Malformed/duplicate form input.
12. Database/mail/challenge unavailable failures.
13. Unexpected schema/config/programming errors не маскируются как ordinary denial/success.

## AUTH-07 — pre-Stage-6 security gate

До external activation должны быть подтверждены:

1. Identity isolation.
2. Verification lifecycle.
3. Recovery lifecycle.
4. Explicit account linking.
5. Session revocation.
6. Sensitive-action freshness/re-auth boundary.
7. Rate limiting/anti-abuse.
8. Fail-closed semantics.
9. No account enumeration.
10. No removal of last login method.

Только после PASS этого gate auth external activation допускается к Stage 6.

## Docs closeout

После завершения implementation — отдельный docs PR:

1. Обновить `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/SETTINGS.md` и профильный auth contract по фактически реализованному состоянию.
2. Старое решение «email verification/password recovery отложены» заменяется только после реализации, не заранее.
3. Implementation/CI/review snapshots сохраняются в `docs/PROJECT_HISTORY/`.

## Stage 6 — external activation

Только Stage 6:

1. Реальные Resend и Brevo accounts/config/secrets.
2. DNS/SPF/DKIM/DMARC.
3. Реальные verification/reset delivery smoke.
4. Реальный Cloudflare Turnstile.
5. Cloudflare edge rate limiting.
6. Production Google OAuth credentials/redirects.
7. Deployed auth lifecycle/failure-path smoke.
8. Owner binding acceptance после real Google login.

## Не входят

1. Account deletion/anonymization.
2. 2FA/passkeys.
3. Automatic Resend→Brevo failover.
4. Дополнительные OAuth providers.
5. Device/IP fingerprint risk engine.
6. Permanent account lockout.

## Последовательность

`AUTH-01 → AUTH-02 → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06 → AUTH-07 → docs closeout → Stage 6 external activation`.
