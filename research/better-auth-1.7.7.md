# research/better-auth-1.7.7.md — проверенные source semantics и следствия для полного auth-плана

## Границы исследования

2026-11-25. Project baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; входной service head `ad08cca57be5cded2d1ef1e83977ef9deeac08c0`. Исследование статическое: прочитаны repository seams и установленный package `better-auth@1.7.7` / `@better-auth/drizzle-adapter@1.7.7`, релевантные tagged official sources загружены через GitHub. Это не выполненные native/browser/CI tests и не приёмка реализации.

Прочитаны PROJECT.md, PROJECT_STATE.md, SETTINGS, AUTHORIZATION, SUPER_ADMIN; применимые Stage-6/migration/locale/resource contracts, служебные RULES/TASK/WORKFLOW/DECISIONS/COMMUNICATION/agents/leva. Полный аудит всей документации не выполнялся.

## 1. Signup и verification

Sources:

- [Tagged signup source](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/sign-up.ts)
- [Tagged verification source](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/email-verification.ts)
- [Tagged sign-in source](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/sign-in.ts)

Установленный dist `api/routes/sign-up.mjs`: `requireEmailVerification || autoSignIn===false` включает generic duplicate response и skip-auto-session; catch вокруг createUser также превращает APIError 403 в synthetic response. Native credential sign-in запрещает unverified при requireEmailVerification; sendOnSignIn управляется отдельно.

Это новый integration риск для SET-02: current `registration-admission.ts` возвращает safe closure, `createAuth` сохраняет thrown policy-read error request-local, `handle` восстанавливает ошибку, но выбранная verification конфигурация меняет native response. Новый handler обязан сохранять distinction closure/unavailable/unexpected и duplicate privacy на HTTP/direct, а tests должны это доказать.

`createEmailVerificationToken` подписывает email/updateTo и optional extraPayload, default TTL 3600 s. Verification endpoint проверяет HS256/expiry, ищет user по email, обновляет emailVerified; native single-use ledger для обычного verification нет. Повтор уже verified возвращает status=true. Поэтому native replay не следует называть one-time consumption. Для immutable subject/latest-generation/single-use нужны nonce + persisted state и canonical terminal policy.

Email-change verification branch при отсутствующей session создаёт новую; autoSignInAfterVerification=false относится к обычной verification branch и **не** отменяет этот отдельный email-change behavior. План закрывает auto-session в email-change специально.

## 2. Recovery и setPassword

Sources:

- [Tagged password source — получен и прочитан](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/password.ts)
- [Tagged internal adapter](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/db/internal-adapter.ts)
- [Tagged update-user source — получен и сверены relevant sections](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/update-user.ts)

Request reset создаёт verification `reset-password:<random token>` со value=user.id, default TTL 3600 s; unknown email получает generic acknowledgement. Callback GET только проверяет token/expiry и redirects с token. POST reset вызывает consumeVerificationValue, затем hash, createAccount при отсутствии credential либо updatePassword, callback onPasswordReset, затем deleteUserSessions если option включена. Google-only также может получить credential штатным anonymous reset; это нужно ограничить до explicit own creation по задаче.

`consumeVerificationValue` в installed dist атомарно claims row через adapter.consumeOne; expired consumed row возвращает null. Это предотвращает успешное конкурентное повторное consume одного row, **но не** делает password/session effects частью той же transaction. План использует общий transaction envelope.

`setPassword` — `createAuthEndpoint.serverOnly`, pathless operation; sensitiveSession middleware. Создаёт credential или заполняет hashless row, отказывает PASSWORD_ALREADY_SET. Native email proof отсутствует. Existing hook уже защищает operationId=setPassword по AccountState; это не acceptance verified Google-only creation.

`verification-token-storage.mjs` поддерживает `hashed` и `{default, overrides}` с prefix matching. План: hash reset-password identifiers отдельно, не глобально менять OAuth storage. Это не требует новой dependency или auth table.

## 3. Email change / unlink

Sources:

- [Tagged update-user](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/update-user.ts)
- [Tagged account source](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/account.ts)

Native change-email включается user.changeEmail.enabled. С verified current address и configured sendChangeEmailConfirmation возможен old confirmation → new verification. `updateEmailWithoutVerification` открывает immediate update unverified account, без этого callback fallback может отправлять только new-address proof. Native legacy token branch также меняет адрес до последующего verification. План выбирает узкую two-phase policy, а не любой допустимый native fallback.

Native unlink использует `accountId` **native account row ID**, freshSessionMiddleware, findAccounts → accounts.length===1 veto → deleteAccount. Row count вне lock не доказывает usable-method invariant; empty-hash credential и concurrent deletes требуют authoritative guard. Тестировать не только UI.

## 4. Supported extension / transaction seam

Sources:

- [Tagged API index — получен, проверено endpoint merge](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/index.ts)
- [Tagged Drizzle adapter — получен](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/drizzle-adapter/src/drizzle-adapter.ts)

`getEndpoints` строит `{...baseEndpoints,...pluginEndpoints,ok,error}`. Plugin с тем же endpoint key заменяет canonical HTTP и direct API endpoint; public `better-auth/api` экспортирует createAuthEndpoint/middleware, native endpoints и нужные session/origin seams. Возможность подтверждена source, implementation ещё нет. При реализации нужно сохранить validation, operation IDs, required middleware и не оставить старую alternative route.

Installed Drizzle adapter: `transaction: config.transaction ?? false` и callback adapter. Project `session-write-guard.ts` открывает BEGIN/COMMIT на protected create/update/delete, re-wrap transaction adapter, а session deletes сериализуются tail. Простое включение native transaction конфликтует с nested transaction control; требуется explicit shared scope. No SQL-text inference для нового transaction owner.

`auth-creation-evidence.ts` учитывает default transaction:false partial persisted inserts; `session-deletion-evidence.ts` требует affected-row proof и ограничен closed reasons. После outer transaction новые callbacks нельзя публиковать до commit. Оба collectors должны сохранять truthful rollback/uncertain/gap behavior.

Current schema account имеет userId index без unique provider/account identity или unique credential owner; новые uniqueness constraints нужны для racing method creation/link. Verification.identifier не unique, поэтому Vico metadata single-current invariant строится на deterministic primary key, не findMany по identifier.

## 5. Abuse / observability / Worker

Installed `api/rate-limiter/index.mjs`: HTTP onRequest atomic consume; direct API его не вызывает. Native special rules: sign-in/sign-up/change-password/change-email 3/10 s, request-password-reset/send-verification-email 3/60 s. Database wrapper uses unique key + incrementOne/CAS, не простой memory-only counter.

Project auth.server.ts: trusted `cf-connecting-ip`, database rateLimit; SET-05 nested changePassword идёт через HTTP handler ради shared bucket. Existing creation hook/password-change observer не доказывает reset updateMany transition. `owner-auth-facts.ts`, SA02 catalog, session-deletion reasons и attempt operations closed; DB attempt CHECK из migration0063 также closed. Расширение должно затронуть writer/schema/new forward migration/projections вместе.

Worker создаёт request-local auth/collectors, pre-routing authoritative session и затем ordered cookie composition, bounded flush после response. Monitoring Integrations показывает configuration presence и retained evidence, не provider health. План сохраняет эти границы, не активирует probes.

## 6. Provider documentation — только чтение

Прочитаны официальные pages, без вызова send/Siteverify API:

- [Resend send email](https://resend.com/docs/api-reference/emails/send-email): HTTP send, Bearer, Idempotency-Key; documented expiry 24 h/max256 chars. Не обещать inbox delivery/exactly-once по 2xx.
- [Brevo transactional email](https://developers.brevo.com/reference/sendtransacemail): api-key, sender/to/subject/htmlContent/textContent; 201/messageId. Equivalent Resend idempotency не подтверждена и не предполагается.
- [Cloudflare Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): server-side Siteverify, 300 s validity, intended single-use с documented network-convergence/reuse оговоркой. Проверять hostname/action; challenge не заменяет own transactional invariants.

Никаких real provider accounts, credentials, DNS, outbound mail/challenge, deployment/production database calls. Документация mutable: перед разрешённым Stage-6 rollout перепроверить.
