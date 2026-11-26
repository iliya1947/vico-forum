# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Активное назначение

По прямой команде владельца Лене передана полная bounded-проверка **AUTH-04** вместо checkpoint Миры.

Проверяемый implementation PR: **#393 — AUTH-04: two-phase email change and own Google unlink**.

Stable exact head: `c9035dce425333d14fdf12d2418f4a8a009edabf`.

Base: accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`.

## Маршрут

1. После актуальных `AGENTS.md` и `RULES.md` прочитать `TASK.md`, `WORKFLOW.md`, этот файл, затем `stages/AUTH-04/PLAN.md` и `stages/AUTH-04/RESULT.md`; root `PLAN.md` и source-of-truth читать по необходимости проверки.
2. Проверить весь bounded diff #393 на указанном exact head, а не только author report или green CI.
3. Проверить соответствие AUTH-04 contract: двухфазная смена email, state/session/uniqueness atomicity, invalidation, Google unlink и last-usable-method invariant во всех callable entrypoints, observability и Settings integration.
4. Проверять не только happy path: races, replay/stale/freshness/account-switch, rollback/fault boundaries, HTTP/direct/persistence parity и регрессии принятого AUTH-03/SET-05.
5. Каждый возможный finding сначала установить как реальный дефект текущего AUTH-04 scope. Будущая работа сама по себе не blocker.
6. Во время проверки implementation не исправлять и AUTH-05 не начинать.
7. CI/acceptance использовать как supporting evidence, а не как замену code/contract review.
8. Если implementation head изменится, результат относится только к фактически проверенному exact head.

## Результат

Записать в служебный PR краткий проверяемый итог **PASS** или **HOLD**. При HOLD перечислить подтверждённые current-scope defects с основанием; при PASS явно зафиксировать checked exact head и отсутствие подтверждённых blocking defects. После результата остановиться.

## Review checkpoint R1 — scope, email server chain and CI status

Exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`, base `39c07e539a47b8a317b3a274132337a6dc61cfdf`, 43 changed files / 9 commits; main identical to root PLAN baseline `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. Root PLAN read 1–282 to end, bounded PLAN and author RESULT read. Rechecked GitHub CI #45744054677 (both jobs and all required executed steps success) and 16 successful applicable acceptance runs on exact head. No new tests executed by reviewer. Main SET-05 section read for established compatibility contract.

Review decomposition: R1 scope/CI and email server path; R2 Google unlink and cross-flow concurrency/native adapter; R3 UI/DTO, mail landing and observability/schema projections; R4 remaining negative/regression/evidence matrix and full-scope conclusion. Do not conclude on first finding.

Reviewed actual new endpoints/service, lifecycle plugin, state and budget, transaction owner, AccountState guard, auth.server configuration/hook/runtime paths, Settings route/view/proof client and mail URL/delivery portions, AUTH-04 PG cases. For normal email path the old proof is consumed only in transaction advancing generation/phase, new proof is bound to exact initiating session, final consume+email update+invalidation+other-session revocation are in one owned transaction, row count/uniqueness checked, mail outside transaction. Source shows correct principal/generation/phase matching; tests include restart/replay, wrong session, uniqueness race, revoke-failure rollback. This is a partial review, not a PASS. Need finish cross-flow races, UI/DTO freshness and observable outcomes, actual browser evidence, and required failure matrix.

Finding F01 (source-confirmed classification defect, runtime fault injection not executed by reviewer): new `account-security-endpoints.server.ts` actor() calls BA getSessionFromCtx with cache/refresh disabled and session cleared; if null it throws 401. Official Better Auth v1.7.7 `packages/better-auth/src/api/routes/session.ts` getSession catches adapter errors into FAILED_TO_GET_SESSION 500, getSessionFromCtx catches that and returns null. Current `auth.server.ts` handle() invokes useAuth with preserveDatabaseError=false, so onDatabaseError is not retained for HTTP; read calls in session-write-guard.ts use lifecycle.runAdapterOperation without onAccountStateError classification. For a persistent classified read failure during session lookup of otherwise valid signed cookie, both preliminary protected hook and actor read cannot distinguish storage outage from absent session; confirm-email-change lacks preliminary actor hook but uses same actor. 401 instead of controlled unavailable, and invalid-attempt instead of unavailable classification. This is a new AUTH-04 endpoint behavior, not a future-stage risk. Relevant root PLAN §2.1/2.2 and SET-05 storage classification; fail-closed is preserved, no claim of unauthorized mutation. Verify concrete test evidence and exact error propagation at R4. Official source tagged origin-check.ts also read: authenticated cookie HTTP origin/CSRF is enforced; direct server dispatch intentionally skips browser origin checks, uses expectation/session proof.

Open questions (not findings): final email commit returns JSON without explicit session cookie; root PLAN §6 says cookie after commit, check actual default cookie-cache/session behavior and whether contract mismatch has observable consequence before classification. Strict Zod body validates parsed object; verify duplicate field rejection required by root PLAN on HTTP parse boundary, don't assume. Check pending DTO only exposes phase/expiry, not token; review stale session/identity and account switch, UI confirmation/revalidation. Continue R2 then R3/R4; implementation unchanged. No PASS/HOLD conclusion until scope complete.

## Review checkpoint R2 — unlink and cross-flow write ordering

Checked #393 exact head unchanged. WORKFLOW now also records Mira's parallel PASS; this does not replace Lena's independent bounded review.

1. Canonical endpoint plugin replaces native unlink key for both HTTP and direct. Native 1.7.7 account.ts confirms accountId is local account row ID. New service resolves same-user Google row only after shared user lock, checks authoritative fresh exact session and remaining usable set, deletes that exact row with RETURNING count. No session deletion. Native guarded adapter delete/deleteMany uses existing transaction owner, validates selectors, resolves persisted owner, takes same AccountState lock, rereads deletion IDs, checks remaining set before deletion. Owner-wide deleteMany excludes all current rows and rejects; hashless/null password, unverified email, non-credential key, unknown providers and absent Google configuration cannot satisfy remaining-method check. Native internalAdapter deleteAccount/deleteAccounts call these exact guarded shapes. No alternate native user deletion capability enabled.
2. Read full credential-lifecycle.server.ts and credential-auth-endpoints.server.ts: creation/reset share subject lock, reread current credential/email/proof and session as applicable, native password changes recheck original hash + session under lock, credential sign-in rechecks password hash and login email under lock before session creation. Email change invalidates password-reset native/Vico state and password-create state; credential creation/reset invalidate pending email-change. Native change-password preserves accepted SET-05 invalidation contract. If unlink wins first, creation with no Google cannot proceed; if password creation wins first, usable verified password admits Google deletion; reset/change preserve a nonempty password under same lock. Native delete competing against a service operation is serialized by the same lock. No confirmed invariant violation in these actual callable paths. Arbitrary trusted server mutation of DB fields is not a public bypass.
3. Read native tagged Better Auth OAuth link-account.ts, callback.ts and relevant account/update-user/internal-adapter paths. Existing Google login recognizes immutable provider account key rather than changed local email; default app config disables implicit linking and does not enable provider profile override. Explicit link initiation continues the accepted stale-user guard. Accepted auth-link-identity.test.ts deliberately permits callback after ambient session switches, bound to original signed link user; do not misclassify that accepted behavior as new AUTH-04 defect. In-flight Google sign-in may overlap unlink; unlink does not force global session revocation; no current-scope defect established from overlap alone.
4. Checked actual PG cases in auth-lifecycle-state.test.ts and sa04-session-atomic.test.ts 540–757: Google-only/hashless rejection then verified-password unlink, actual HTTP and direct success, direct last-method rejection, two concurrent native deletes one success/one conflict, active owner-wide deleteMany veto and deactivation-first delete denial, actual delete holds lock through commit. AUTH-03 credential race and AccountState paths already share same lock. Need R4 explicitly map whether mandatory new concurrent HTTP/direct/persistence unlink × credential operations and email-change/deactivation/fault cases have executable evidence; source reasoning does not substitute for required acceptance. No new runtime test executed by Lena.

No additional confirmed current-scope implementation defect in R2. F01 remains open, and R3/R4 remain incomplete. No whole-stage PASS, no implementation edit. Next R3: safe DTO/UI and account switch, guest landing/session behavior, proof privacy, observability original source IDs/closed catalogs/projections, migration/snapshot/manifest and all changed presentation paths. Then R4 test matrix and consolidated findings.

