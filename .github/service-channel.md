# Authentication lifecycle — communication

Служебный PR этой задачи: **#320**, ветка `service/authentication-lifecycle`.

## Назначение

1. Этот канал относится только к развитию пользовательской authentication/session системы.
2. Общий security PR #315 — источник security findings/requirements, но не канал этой задачи.
3. Implementation выполняется отдельными bounded PR.
4. External integrations до Stage 6 не активируются.

## Owner decisions

1. Mandatory email verification.
2. Google OAuth остаётся дополнительным login method.
3. Implicit/automatic same-email linking запрещён; linking только explicit из own authenticated account.
4. Full Account & security lifecycle: email/password/Google/sessions.
5. Deletion/anonymization позже.
6. 2FA/passkeys позже.
7. Resend + Brevo поддерживаются через один boundary; один provider активен конфигурацией.
8. Resend/Brevo/Turnstile/production Google OAuth/edge rules подключаются только Stage 6.

## Current facts

1. Main baseline: `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Better Auth `1.7.7`.
3. Email/password и Google foundation уже реализованы.
4. `disableImplicitLinking: true` и explicit `linkSocial` уже есть.
5. SET-05 уже реализует existing-password change и own-session management.
6. Password recovery, mandatory verification, email change, Google unlink, transactional mail sender и Turnstile отсутствуют.
7. Repository docs пока отражают старое owner decision, что verification/recovery отложены. Текущее решение владельца supersedes его для этой задачи; постоянные source-of-truth обновляются только в docs closeout после реализации.

## Current state

1. Product plan AUTH-01–AUTH-07 утверждён владельцем.
2. Технический план AUTH-01 подготовлен Лёвой против main `e279cb6c032a489a9044ca1191407df887c364b4`.
3. Мира проверила план против bounded scope и актуального runtime: **PASS, 0 подтверждённых current-scope проблем**.
4. `workers/app.ts` уже имеет `ExecutionContext/waitUntil`; отдельная AUTH-01 runtime-переделка для этого не требуется.
5. AUTH-01 передан Лире на отдельный implementation PR.
6. Production Better Auth callbacks/provider wiring остаются выключенными в AUTH-01; callbacks используются только в test-local fixture.
7. Schema/dependency/public AuthRuntime changes не планируются.
8. Реальные внешние сервисы и provider credentials запрещены до Stage 6.
9. Implementation PR/head пока отсутствует.
