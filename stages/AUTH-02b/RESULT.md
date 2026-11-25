# AUTH-02b — реализация и проверяемые результаты

## Первый bounded checkpoint: signed proof и read-only state inspection

AUTH-02a coordinator PASS, stable base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Main unchanged from approved baseline. По прямому назначению владельца AUTH-02b реализует Лена.

Implementation branch `feat/auth-02b-email-verification`, head `d517b1ec8ae1df18d902d13021b36be70cd45368`. Отдельный implementation PR ещё не создан; branch contains three changed files, no lower-stage edit.

1. `email-verification-proof.server.ts`: public pinned Better Auth 1.7.7 `better-auth/crypto` signJWT/verifyJWT, type marker, immutable userId/purpose/pending phase/generation; no email, bearer or raw token in state. TTL shares AUTH-02a constant. Native email-only verification JWT, wrong signature/type/expired malformed token rejected.
2. `lifecycle-state.server.ts`: extract shared matching routine for persisted current operation and new locked non-consuming inspection. GET will not consume token or change identity; terminal consumes with same validation and existing authoritative DB-clock CAS. No second state store.
3. Native PG regression added for actual signed proof, repeated read-only validation, stale generation, legacy native token, expired/wrong signature/tamper, then consume/replay. Not executed yet.

## Verified integration constraints for next step

Pinned Better Auth 1.7.7 source sign-up.ts: native signup executes in runWithTransaction, invokes validateUserInfo only for actual provisioning; catches create-user 403 into synthetic response under mandatory verification; calls sendVerificationEmail inside transaction. Do not send mail from that callback or treat returned user DTO as persisted proof. Use canonical public extension/hook and actual admission/creation evidence, preserve native signup hashing/credential/CSRF, arrange issuance and mail after proven commit, and common budget before domain transaction. No copying native signup implementation, private imports or native limiter replacement. Exact public API/crypto exports and dispatch pipeline verified; specific signup orchestration still to be implemented/verified. Native GET verifyEmail must be replaced by POST terminal (same key), landing read-only; no ambient-session creation/refresh/switch. AUTH-01 mail URL contract must be adjusted coherently for new landing; keep safe locale and return path. Worker already constructs mail capability; inject same existing capability into canonical runtime.

Next after first checkpoint: domain verification orchestration and canonical signup/verify/resend integration. No configuration switch yet, no public flow, no CI requested, no real egress. AUTH-03 excluded. No author PASS.


## Второй bounded checkpoint: verification domain service и mail landing contract

Implementation branch `feat/auth-02b-email-verification`, exact head `933f1e7835293fcf9827b2248d09ef5a60f885bf`. Commit содержит ровно пять файлов, GitHub compare и ref проверены. AUTH-02a base unchanged. Это сохранённый код, не execution evidence.

1. `app/auth/email-verification.server.ts`: request-local AuthEmailVerification использует общие state/budget/transaction и immutable signed proof. Locked eligibility проверяет active user/current email/unverified/password method. Issue/resend сохраняют generation под lock; mail build/send после proven COMMIT, без автоматического retry. Terminal confirm принимает native updateUser callback на той же connection и проверяет actual post-update row; consume + identity update атомарны. Inspect не consume, не меняет identity, не обращается к ambient session. Service outcomes internal-only; public endpoint ещё не подключён.
2. `app/auth/lifecycle-plugin.server.ts`: экземпляр verification service в существующем plugin context, optional mail capability; никаких новых endpoints/config switch пока нет.
3. `app/auth/auth-mail-urls.server.ts`: verification-specific URL `/:locale/verify-email?token=...&returnTo=...`; строгая exact canonical revalidation, другие purposes unchanged. Landing route ещё предстоит реализовать.
4. `app/auth/auth-mail.test.ts` + `tests/database/auth-lifecycle-state.test.ts`: добавлены URL negative cases и native domain regression для issue after commit, repeated inspect, native update, replay, rollback, resend, eligibility/budget, uncertain mail, concurrent consume, deactivation. Tests written but not executed. Native Better Auth 1.7.7 signup/verification/dispatch/origin middleware source and internalAdapter.updateUser verified via GitHub exact tag. Current environment cannot resolve github.com for git clone, has Node 22 rather than required 24.21; no dependency/runtime harness available locally. GitHub read/write connector works; no CI requested on this partial checkpoint.

Next: implement canonical plugin endpoint orchestration, preserving native signup password hashing, body validation, CSRF and provisioning gate; budget before domain transaction, native send callback must not send, capture actual creation/closure/unavailable outcome independent of optional telemetry; after commit issue via service. Replace verifyEmail key with POST; direct/HTTP both run same service. Resolve public endpoint validation using supported exact-version exports (repo has no direct zod dependency); keep safe errors, no-store, neutral resend timing/outcomes, no ambient session refresh; inject existing Worker mail capability. Then landing/UI and observability/fixtures. No mandatory config switch, no implementation PR/CI, no production resources, no author PASS.
