# AUTH-02b — реализация и проверяемые результаты

## Первый bounded checkpoint: signed proof и read-only state inspection

AUTH-02a coordinator PASS, stable base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Main unchanged from approved baseline. По прямому назначению владельца AUTH-02b реализует Лена.

Implementation branch `feat/auth-02b-email-verification`, head `d517b1ec8ae1df18d902d13021b36be70cd45368`. Отдельный implementation PR ещё не создан; branch contains three changed files, no lower-stage edit.

1. `email-verification-proof.server.ts`: public pinned Better Auth 1.7.7 `better-auth/crypto` signJWT/verifyJWT, type marker, immutable userId/purpose/pending phase/generation; no email, bearer or raw token in state. TTL shares AUTH-02a constant. Native email-only verification JWT, wrong signature/type/expired malformed token rejected.
2. `lifecycle-state.server.ts`: extract shared matching routine for persisted current operation and new locked non-consuming inspection. GET will not consume token or change identity; terminal consumes with same validation and existing authoritative DB-clock CAS. No second state store.
3. Native PG regression added for actual signed proof, repeated read-only validation, stale generation, legacy native token, expired/wrong signature/tamper, then consume/replay. Not executed yet.

## Verified integration constraints for next step

Pinned Better Auth 1.7.7 source sign-up.ts: native signup executes in runWithTransaction, invokes validateUserInfo only for actual provisioning; catches create-user 403 into synthetic response under mandatory verification; calls sendVerificationEmail inside transaction. Do not send mail from that callback or treat returned user DTO as persisted proof. Use canonical public extension/hook and actual admission/creation evidence, preserve native signup hashing/credential/CSRF, arrange issuance and mail after proven commit, and common budget before domain transaction. No copying native signup implementation, private imports or native limiter replacement. Exact public API/crypto exports and dispatch pipeline verified; specific signup orchestration still to be implemented/verified. Native GET verifyEmail must be replaced by POST terminal (same key), landing read-only; no ambient-session creation/refresh/switch. AUTH-01 mail URL contract must be adjusted coherently for new landing; keep safe locale and return path. Worker already constructs mail capability; inject same existing capability into canonical runtime.

Next: coherent signup/verification/resend server integration, then UI/locale and observability/fixtures, native and connected acceptance. No configuration switch yet, no public flow, no CI requested on partial branch, no real egress. AUTH-03 excluded. No author PASS.
