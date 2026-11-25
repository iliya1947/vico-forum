# stages/AUTH-02a/PLAN.md — bounded foundation для mandatory verification lifecycle до открытия пользовательских endpoints

## Цель

Подготовить единое транзакционное, state/constraint и anti-abuse основание для AUTH-02b/03/04, не включая обязательную verification в продуктовый flow и не меняя текущий signup/session UX на этой ступени.

## Основание

1. Нижняя stacked-ступень AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`, coordinator checkpoint PASS.
2. AUTH-02a создаётся отдельным implementation PR с base на branch `feat/auth-01-mail-foundation` и показывает только bounded diff этой ступени.
3. Полная архитектура и invariants находятся в `PLAN.md`; этот файл только ограничивает активную реализацию.

## Scope

1. **Transaction ownership/composition**
   - request-local `withAuthLifecycleTransaction`/equivalent на том же PostgreSQL client, который использует Better Auth/Drizzle;
   - existing AccountState/session-write guards внутри owned transaction не открывают независимый BEGIN/COMMIT, а вне lifecycle scope сохраняют текущее поведение;
   - nested lifecycle scope присоединяется к текущему owner; global mutable state и SQL-text inference запрещены;
   - rollback/commit/uncertain outcome semantics не должны публиковать success facts/cookies до доказанного commit.

2. **Canonical lifecycle extension seam**
   - один Better Auth plugin/service boundary для будущих verify/reset/unlink flows;
   - на этой ступени не открывать пользовательские verification/recovery endpoints и не включать `requireEmailVerification`;
   - HTTP/direct paths будущих lifecycle operations должны иметь единое admission/state/budget основание без второго auth backend;
   - использовать только поддерживаемые/public Better Auth 1.7.7 exports; необходимость private imports/dependency upgrade останавливает этап для пересмотра плана.

3. **Lifecycle state foundation**
   - versioned Vico namespace поверх existing `verification` storage для purpose/user/current-generation/phase metadata, token digest и immutable subject/email snapshot;
   - deterministic current-operation identity на purpose+user и bounded expiry/state operations;
   - raw token/password/session bearer/provider payload не сохраняются в metadata;
   - stage предоставляет storage/service primitives и tests, но не выпускает реальные verification/reset tokens пользователям.

4. **Database constraints**
   - forward-only migration от актуальной history для доказанно необходимых concurrency invariants из полного плана;
   - unique provider/account identity и один credential account на user, если preflight подтверждает совместимость текущих fixtures;
   - accepted migrations не переписывать; duplicate preflight должен останавливать migration, а не автоматически merge/delete identities;
   - schema metadata/parity/history probes обновлять только по фактическим изменениям.

5. **Shared anti-abuse primitives**
   - server-owned DB-backed budgets, пригодные для HTTP и direct/server lifecycle paths без double count;
   - domain-separated HMAC target keys без plaintext email/token;
   - atomic consume/CAS, bounded TTL/window semantics, trusted `cf-connecting-ip` boundary и bounded unknown-network behavior;
   - storage failure для защищаемых lifecycle mutations fail closed;
   - provider-neutral challenge contract/injection допускается только как foundation; конкретный anti-bot provider/adapter/widget не реализуется.

6. **Observability compatibility**
   - transaction staging existing auth facts/session-deletion evidence так, чтобы rollback/zero-row/uncertain commit не создавали ложный success evidence;
   - новые AUTH-02b/03/04 fact/attempt kinds не добавлять заранее, если текущая foundation их ещё фактически не производит;
   - existing Owner Monitoring/History behavior не должен регрессировать.

## Не входит

1. Включение `requireEmailVerification:true`, изменение signup response/session behavior или UI.
2. Verification/resend routes, email sending callbacks, GET/POST confirmation flow.
3. Forgot/reset password UX или Google-only password creation.
4. Email change/unlink UI и terminal lifecycle mutations.
5. Конкретный anti-bot provider, Turnstile adapter, widget/sitekey/secrets.
6. Реальные Resend/Brevo calls, DNS, production Google OAuth или другие Stage-6 resources.
7. Расширение Owner facts/attempt enums под будущие transitions без фактического producer на этой ступени.

## Acceptance

1. Native PostgreSQL tests подтверждают transaction ownership, rollback, nested composition, AccountState/deactivation ordering и multi-client race invariants.
2. Better Auth/Worker regression доказывает, что текущие signup/signin/session/linking flows после foundation ведут себя как на AUTH-01.
3. Lifecycle-state tests покрывают purpose isolation, latest generation, expiry, wrong-purpose/tamper/missing state и отсутствие raw secrets.
4. Budget tests покрывают HTTP/direct shared admission, no double count, concurrent consume, spoofed/unknown ingress и storage failure.
5. Migration tests: clean PostgreSQL 17, pre-existing fixtures, duplicate preflight, schema/manifest parity по применимому contract.
6. No real egress; production mail/challenge остаются dormant.
7. Stable exact head + фактические checks записаны в `stages/AUTH-02a/RESULT.md`; исполнитель останавливается для coordinator checkpoint Миры.

## Done

1. Отдельный второй stacked implementation PR с base = `feat/auth-01-mail-foundation`.
2. Diff содержит только AUTH-02a foundation.
3. Existing user-visible auth contract не изменён.
4. Author self-check и применимые CI/checks PASS на stable exact head.
5. Следующая ступень AUTH-02b не начинается до coordinator checkpoint PASS.
