# stages/AUTH-02b/PLAN.md — mandatory email verification и пользовательский verification flow

## Цель

Перевести email/password регистрацию на обязательное подтверждение email, используя принятые AUTH-01 mail boundary и AUTH-02a lifecycle/state/transaction/budget primitives, без расширения в recovery или Account Security.

## Основание

1. AUTH-01: PR #388, coordinator PASS.
2. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, coordinator PASS.
3. Новый implementation PR AUTH-02b создаётся с base `feat/auth-02a-lifecycle-foundation` и показывает только bounded diff этой ступени.
4. Полный технический контракт находится в `PLAN.md`; этот файл ограничивает активную реализацию.

## Scope

1. **Mandatory verification contract**
   - включить обязательную verification для email/password;
   - signup не выдаёт полноценную session/cookie до подтверждения;
   - после успешной verification требуется явный sign-in;
   - Google OAuth, explicit linking и запрет implicit same-email linking сохраняются.

2. **Issuance и signup**
   - fresh email/password signup создаёт user+credential по текущей registration policy, затем current verification generation/state и auth-mail issuance;
   - использовать AUTH-01 mail boundary и AUTH-02a lifecycle state/budgets;
   - mail send выполняется вне identity transaction после доказанного commit;
   - duplicate/existing email не меняет password/identity и сохраняет neutral privacy semantics;
   - SET-02 registration closure относится только к fresh create-user и не блокирует verification существующего account;
   - не принимать Better Auth synthetic HTTP 200 как доказательство успешного создания account: сохранять фактический admission outcome.

3. **Verification terminal flow**
   - GET landing только валидирует/показывает состояние и не меняет email/credential, не погашает token;
   - state-changing confirmation выполняется явным POST через canonical Better Auth/Vico boundary;
   - terminal operation проверяет current purpose/subject/email/generation/expiry и AccountState, затем атомарно consume state + выставляет `emailVerified=true`;
   - replay, stale generation, tamper, wrong-purpose, expiry и concurrent consume не дают повторного success;
   - verification guest flow не переключает ambient session другого account.

4. **Resend**
   - отдельный neutral guest flow;
   - missing, already-verified и inactive account не раскрываются различимым public outcome;
   - eligible active unverified account получает новую current generation; предыдущая становится stale;
   - resend использует общие AUTH-02a budgets и AUTH-01 mail boundary; automatic retry/failover не добавляется.

5. **UI / locale / safe return**
   - signup presentation переходит из ожидания auto-session в neutral «проверьте почту»;
   - verification/resend landing/forms поддерживают generic locale, EN/RU/HE current packs, LTR/RTL и validated safe return path;
   - private/controlled auth responses сохраняют no-store и не отражают token/email/provider details;
   - existing sign-in остаётся отдельным явным шагом после verification.

6. **Observability только фактического flow**
   - добавить только verification-specific exact fact/attempt values, реально производимые AUTH-02b;
   - если closed DB enums/CHECK/projections требуют расширения — только forward migration и связанные writer/read projections;
   - rollback/invalid/replay/mail acceptance не выдаются за успешную identity transition;
   - не логировать raw token/email/password/session bearer.

7. **Local/CI fixtures**
   - существующие сценарии, не тестирующие pending verification, получают verified test fixture/helper;
   - pending verification проверяется настоящим flow;
   - production bypass/grandfathering marker не добавлять.

## Не входит

1. Forgot/reset password.
2. Google-only password creation.
3. Email change.
4. Google unlink/last-usable-method logic.
5. Account deletion/reactivation.
6. Конкретный anti-bot provider/adapter/widget.
7. Реальные Resend/Brevo calls, credentials, DNS, production Google OAuth или иная Stage-6 activation.
8. Legacy/grandfathering policy для гипотетических production users.
9. AUTH-03/04/05 user flows.

## Acceptance

1. Email/password signup: account+credential committed, verification current, **нет session/cookie**.
2. Credential sign-in до verification denied; после POST verification и отдельного sign-in — success.
3. Duplicate signup не меняет существующий password/identity и не раскрывает account existence.
4. SET-02 закрытие fresh email registration не блокирует existing verification/resend/sign-in; policy-read outage/closure/unexpected error остаются различимы внутренне и безопасны публично.
5. Expiry, replay, tamper, wrong-purpose, stale generation, concurrent consume и deactivation-first не оставляют partial durable effects.
6. Resend latest-generation и neutral public outcomes проверены; accepted/rejected/unavailable/uncertain mail outcomes не создают session и не дают ложный verification success.
7. HTTP и direct/canonical paths используют одну state/budget/transaction policy без bypass/double count.
8. Google same-email не объединяет identities автоматически; existing Google login/linking regressions отсутствуют.
9. Verification-specific observability подтверждает только committed facts и сохраняет closed-value/schema/projection consistency.
10. Existing unrelated auth/forum tests переведены на verified fixtures без production-only bypass; применимые PostgreSQL 17, Worker/Chromium и CI checks PASS на stable exact head.
11. No real egress/external activation.

## Done

1. Отдельный stacked implementation PR с base `feat/auth-02a-lifecycle-foundation`.
2. Diff ограничен AUTH-02b.
3. Author self-check проверяет не только green tests, но и соответствие фактического flow этому contract.
4. Stable exact head и evidence записаны в `stages/AUTH-02b/RESULT.md`.
5. После author PASS Лёва останавливается для coordinator checkpoint Миры; AUTH-03 самостоятельно не начинается.
