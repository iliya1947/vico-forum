# Block J — External integrations security audit

## Статус

1. Scope создан 2026-11-18; final J8 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Blocks A–I уже закрыты как audit blocks; их findings в J не дублируются.
3. **J1 — Current integration inventory & activation boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. **J2 — Google OAuth external-provider boundary завершён: 0 новых current-scope findings + 1 deferred Stage-6 blocker — `GOOGLE-OAUTH-SCOPE-01 Low/P3`.** Exact provider identity/state/PKCE/callback/origin/account-selection paths PASS apart from already-owned Block-B findings; prepared direct OAuth surface accepts caller-selected additional Google scopes beyond Vico's authentication-only product need.
5. **J3 — Email provider boundary завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** Sender/verification/recovery implementation отсутствует; Better Auth 1.7.7 send/reset endpoints fail closed when sender callbacks are not configured.
6. **J4 — Translation provider data egress завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** Current Worker provider execution выключен; prepared content path выполняет metadata-only selection, explicit data-policy/allowance admission и actual-request support recheck до raw egress; provider output/provenance валидируются до publication.
7. **J5 — Queue/provider execution lifecycle завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** Durable task commit предшествует enqueue; Queue message содержит только durable task id; claim/lease/current-generation/stale fences и max-attempt budget ограничивают duplicate/replay provider work; reconciliation восстанавливает pending/expired work и deferred allowance; terminal failures остаются observable durable state.
8. Current repository имеет Google OAuth foundation и translation provider/Queue abstractions, но source-of-truth и runtime wiring подтверждают отсутствие live Google OAuth acceptance и отсутствие active translation provider/Queue execution.
9. Resend/Brevo/email-delivery integration в current `main` отсутствует; email verification/password recovery намеренно не реализованы.
10. **J6 — External callback/webhook/outgoing seams завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** В current `main` нет webhook receiver вне уже проверенного Better Auth OAuth; server runtime не содержит request-controlled outbound HTTP fetch; AdministrativeRouting остаётся same-origin default и не получает external/request-controlled bases в Worker runtime.
11. **J7 — Failure/data-retention/cross-provider boundary завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.** Provider failures persist only bounded codes/counts; current translation execution does not fall back across providers after an admitted/selected provider fails; stored translation provenance is bounded metadata, while provider-side mutable retention/config remains Stage-6 acceptance.
12. **J8 — Cross-chain closeout завершён: PASS, 0 новых current-scope findings и 0 deferred blockers. Block J завершён.** Final Block J = 0 current findings + 1 deferred Stage-6 blocker `GOOGLE-OAUTH-SCOPE-01 Low/P3`.
13. Overall #315 после Block J остаётся **28 current findings + 4 deferred Stage-6 blockers**.
14. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
15. Production/provider/Cloudflare/GitHub settings mutation, OAuth client creation, email account/provider activation, Queue/provider activation и external calls не разрешены и не выполнялись.

## J1 — результат

1. Verdict: **PASS — 0 current-scope findings, 0 deferred blockers.**
2. J1 устанавливает фактическую external-integration surface до provider-specific review и не объявляет future abstraction текущей уязвимостью.
3. **Google OAuth foundation присутствует.** Canonical Better Auth `1.7.7` config получает server-side `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` и объявляет provider `google`; repository/local-CI покрывает registration/linking через synthetic provider boundaries.
4. Current source-of-truth фиксирует: **real Google OAuth configuration и interactive smoke не завершены**, Stage 6 external integration paused, production Worker rollout с real auth configuration не выполнен. Live Google callback/token exchange поэтому не является current deployed attack surface.
5. `googleParametersPresent()` в Monitoring проверяет только наличие двух строк и прямо не является credential validation/provider-health probe; Monitoring не активирует OAuth и не делает внешний call.
6. **Email provider integration отсутствует.** Search current `main` не нашёл Resend, Brevo, `sendEmail`, `forgotPassword` или `resetPassword` implementation. Better Auth email/password включён, но `requireEmailVerification:false`; Settings contract исключает password reset/recovery.
7. **Translation provider foundation присутствует, live execution — нет.** `TranslationProviderRouter` и `CloudflareM2m100TranslationProvider` реализуют adapter/capability/data-policy boundary. M2M100 adapter прямо документирован как local/CI provider adapter; binding provisioning/live Workers AI acceptance остаются Stage 6.
8. Current Worker wiring fail-closed: `contentGenerationActionContext` получает `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`; integration facts фиксируют `providerWired:false`, `enqueuerWired:false`, `consumerWired:false`. `wrangler.jsonc` не содержит Workers AI или Queue binding.
9. **Cloudflare Queue transport не активен.** Durable translation task/domain abstractions существуют в PostgreSQL, но current runtime не содержит Queue producer/consumer binding. Source-of-truth отдельно оставляет real Cloudflare Queues, production provider credentials/calls и provider/Queue acceptance Stage 6.
10. Attachment R2 и Hyperdrive не переносятся в J: attachment storage уже принадлежит Blocks F/H, DB/Hyperdrive — G/H. Current `wrangler.jsonc` также не содержит R2 binding; optional `ATTACHMENT_R2` wiring не образует новый J root cause.
11. AdministrativeRouting foundation допускает trusted future producer с иными bases/origins, но default same-origin, а Worker не устанавливает external routing producer. Review #317 уже классифицировал cross-origin activation как future Stage-6 design/acceptance, не current defect.
12. Repository search не нашёл current webhook receiver/third-party callback integration кроме Better Auth OAuth route family. Provider callback/redirect/token semantics будут проверяться в J2.
13. Отсутствие live external integration само по себе не finding. Concrete repository foundation defect считается current только если уже влияет на current Stage; prepared Stage-6 defect — deferred blocker только при доказанной causal path.
14. #315 aggregate остаётся **28 current findings + 3 deferred Stage-6 blockers**.
15. Следующий bounded slice: **J2 — Google OAuth external-provider boundary**. Не дублировать Block B internal authentication/session findings и Block I secret custody; J2 проверяет provider trust/callback/configuration/data-exchange boundary.

## J2 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`, installed `better-auth@1.7.7` / `@better-auth/drizzle-adapter@1.7.7`. Exact upstream source was checked at Better Auth tag `v1.7.7` commit `db02f233918ad1233bf0753e437e1c0da353273d`.
2. Verdict: **0 новых current-scope findings + 1 deferred Stage-6 blocker — `GOOGLE-OAUTH-SCOPE-01 Low/P3`.**
3. Product boundary is authentication/linking only. PROJECT/ROADMAP require Google OAuth as a sign-in method; no current Vico feature requires Google Drive/Gmail/Calendar or another Google API capability.
4. Vico config correctly keeps `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` server-side, sets Better Auth `baseURL`, configures one Google provider and leaves origin/CSRF/state checks enabled. No custom authorization/token endpoint override exists.
5. Exact Better Auth redirect flow uses a random state plus PKCE code verifier. With Vico's stateful DB adapter, state is stored in verification storage and correlated with a signed browser cookie; callback consumes/deletes the verification record and rejects missing/mismatched/expired state.
6. Caller-provided `callbackURL`, `errorCallbackURL` and `newUserCallbackURL` are checked by Better Auth against trusted origins before state generation. Vico additionally supplies only forum-local locale-bounded relative destinations from its own client. No external open-redirect path was established.
7. Google's exact built-in provider uses Google's fixed authorization/token endpoints, default `openid email profile` scopes and stable raw Google `sub` as provider account subject. Direct client-supplied Google ID-token sign-in is verified through provider JWKS / issuer / audience / max-token-age before user info is trusted.
8. Explicit linking remains provider-bound: Vico disables implicit linking; Better Auth's `trustedProviders` defaults empty; link requires provider-verified email for an untrusted provider, same email unless explicitly configured otherwise, and refuses a provider account already owned by another user. Vico's request hook additionally checks authoritative current session against `x-vico-link-user` before link state is minted.
9. The known callback-after-session-revocation weakness remains **`AUTH-LINK-01 Moderate/P2` owned by Block B**. J2 does not duplicate it.
10. Better Auth callback forwarding of provider `error_description` to the validated same-origin error URL remains **`AUTH-OAUTH-01 Low/P3` owned by Block B**. Vico's credential loaders render only generic/local allowlisted error states; J2 does not duplicate it.
11. Own-account token selection PASS: exact Better Auth `/get-access-token`, `/refresh-token` and `/account-info` resolve the current session user first and search only that user's account rows. Supplying another `userId` with a session does not select another user. No cross-account provider-token IDOR was established.
12. **Prepared scope boundary is broader than Vico's product contract.** Exact Better Auth `/sign-in/social` and authenticated `/link-social` schemas accept caller-supplied `scopes: string[]`; those scopes are forwarded to Google's authorization URL. Vico exposes the canonical `/api/auth/*` handler wholesale and has no application-level allowlist restricting those request scopes to the identity-only set. Vico's own UI currently sends no extra scopes, but direct HTTP can.
13. Better Auth's Google provider also defaults `include_granted_scopes=true`. Google documents that this enables incremental authorization and can cause newly issued access tokens to cover previously granted scopes in addition to the current request. Google recommends requesting the smallest scopes needed for the specific application task.
14. After explicit Google consent, Better Auth persists the returned provider token/scopes in the account row and provides an authenticated own-account `getAccessToken` API. Current Vico does not enable `account.encryptOAuthTokens`; Better Auth documents its default as false. This storage detail is **not** a separate finding here because no DB-only exploit or cross-user token read is proven, and baseline identity scopes mostly duplicate data Vico already retains.
15. The concrete J2 risk is therefore capability expansion: once real Google OAuth is activated, a user can use Vico's OAuth client to request Google API scopes unrelated to Vico authentication, then let Vico retain/return the resulting own-account bearer capability. That unnecessarily enlarges the authority attached to a Vico integration and the blast radius of a later Vico client/runtime/DB compromise.
16. No silent grant or victim-account takeover is proven: Google consent remains required for additional scopes, current account selection is own-user-only, and no live Google OAuth acceptance exists today. Stage 6 is paused, so this is **deferred Low/P3**, not a current finding.
17. **Correction gate:** before real Google OAuth activation, the effective Vico OAuth surface must be constrained to the provider capabilities actually required by the product. At minimum, the direct request path must not be able to expand Google scopes beyond the approved authentication set merely because Better Auth supports generic incremental authorization. Whether unused token-return endpoints are disabled/filtered and whether `includeGrantedScopes` is kept or disabled is an implementation decision for a later remediation plan, not prescribed by this audit.
18. Production Google client configuration remains **Информация не проверена** because Stage 6 has not configured/accepted it. Before activation, exact `BETTER_AUTH_URL`, Google Web OAuth client type, authorized redirect URI `https://<production-origin>/api/auth/callback/google`, client/secret placement and deployed OAuth/session/logout smoke must be checked. Absence of that future configuration is not itself a finding.
19. Google email authority nuance was reviewed: Google warns that `email_verified` on non-Gmail/non-Workspace addresses does not make Google permanently authoritative for the third-party mailbox. Vico does not use Google email to appoint Owner and disables implicit same-email linking; explicit linking additionally requires the already-authenticated local account. No separate takeover path was established.
20. No OAuth client, credential, provider call, login/callback smoke, production dispatch or setting mutation was performed. J2 was source/configuration analysis only.
21. #315 aggregate becomes **28 current findings + 4 deferred Stage-6 blockers**.
22. Next bounded slice: **J3 — Email provider boundary**.

### `GOOGLE-OAUTH-SCOPE-01` — Low/P3 — deferred Stage 6

**Root cause:** Vico exposes Better Auth's generic social OAuth request surface without an application-level Google-scope allowlist, so direct callers can add arbitrary provider scopes even though Vico's approved Google integration is authentication/linking only.

**Prepared Stage-6 impact:** after user consent, Vico can acquire, persist and expose an own-account Google bearer token with authority unrelated to Vico's product needs, increasing provider abuse/reputation surface and blast radius of a later Vico compromise.

**Boundary:** no live Google OAuth acceptance exists, Stage 6 is paused, Google consent is required, and cross-user token selection/takeover was not established. Therefore this is a deferred Low/P3 correction gate, not a current-stage finding.

## J3 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`, installed `better-auth@1.7.7`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Current product/source-of-truth is explicit: email/password sign-up/sign-in are active, but email verification, transactional email sender and password recovery remain intentionally deferred. First production release does not require verification/recovery.
4. Repository search found **no Resend, Brevo, SMTP, Nodemailer, Mailgun, Postmark, SendGrid or generic `sendEmail` integration**, no email-provider SDK dependency, no sender module, no provider API endpoint, no provider webhook/bounce receiver and no corresponding API-key/runtime env field.
5. Current `BetterAuthEnvironment` contains only Better Auth + Google OAuth values. `package.json` has no email-provider dependency and `wrangler.jsonc` has no email-provider binding/configuration.
6. Exact Vico Better Auth config uses `emailAndPassword.enabled=true`, `requireEmailVerification=false`, password length limits only; it does **not** set `emailAndPassword.sendResetPassword` and does **not** configure `emailVerification.sendVerificationEmail`.
7. Exact Better Auth `v1.7.7` source confirms `POST /request-password-reset` checks `sendResetPassword` first and returns `RESET_PASSWORD_DISABLED` before looking up the user, creating a reset verification row or calling any external sender.
8. Exact Better Auth `v1.7.7` source confirms `POST /send-verification-email` checks `emailVerification.sendVerificationEmail` first and returns `VERIFICATION_EMAIL_NOT_ENABLED`; no email is sent without the callback.
9. Current Vico sign-up does not manufacture verification flow: Better Auth computes `shouldSendVerificationEmail` from `sendOnSignUp ?? requireEmailVerification`; with current Vico `requireEmailVerification=false` and no `sendOnSignUp`, the branch is false.
10. Current Vico client/UI exposes only email sign-up, email sign-in and Google auth. There is no password-recovery/forgot-password control, verification-email action or locale route implementing reset UI.
11. Canonical wildcard `/api/auth/*` still exposes Better Auth's built-in reset/verification route family, but without sender callbacks the initiation endpoints are disabled. Random direct `/reset-password` tokens have no creation path from current Vico email flow. No active external-email trust/data-egress boundary is therefore present.
12. There is no provider credential to audit, no bounce/webhook input, no sender-authentication configuration and no provider-side retained payload in current repository/runtime. Those checks become applicable only when an email provider is actually integrated.
13. Enumeration findings from ordinary email sign-up/auth remain owned by **Block B**; J3 does not duplicate `AUTH-ENUM-01`. Provider-specific email enumeration cannot exist without a current sender/provider path.
14. Future nuance, **not a finding now**: Better Auth 1.7.7 reset-password can create a credential account when a valid reset token belongs to a user without one. If Vico later implements recovery, Google-only-account password creation must be checked against the then-approved product contract. J3 plan explicitly says absent sender/recovery is closed as not-active rather than treated as a future defect.
15. Resend/Brevo provider choice, sender-domain authentication, API-key scope, bounce/webhook verification, reset-token delivery, callback presentation and data minimization are **Информация не проверена** because no concrete provider integration exists to inspect. This is not a blocker for current Stage or Stage 6 as presently defined.
16. No email account, API key, sender domain, webhook, external provider call, package install, deployment or setting mutation was created/performed.
17. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
18. Next bounded slice: **J4 — Translation provider data egress**.

## J4 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Source-of-truth requires provider selection/data policy before raw content egress, semantic Markdown segmentation, response validation/provenance and no provider call in SSR/public request path. Current implementation matches that prepared boundary.
4. **Current normal Worker has no translation-provider egress.** `workers/app.ts` installs `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME` and reports `generationEnabled=false`, `providerWired=false`, `enqueuerWired=false`, `consumerWired=false`. `wrangler.jsonc` has no Workers AI or Queue binding.
5. Repository search outside tests found no normal-runtime construction of `CloudflareM2m100TranslationProvider`, `TranslationProviderRouter`, `UiTranslationTaskExecutor`, `ContentTopicTitleTaskExecutor` or `ContentPostBodyTaskExecutor`. Provider execution remains local/CI foundation, not active runtime.
6. Even when generation action is enabled in synthetic/local acceptance, `DefaultContentGenerationActionCapability` performs actor admission + request-budget admission + durable planning/dispatch only; it does not synchronously call a provider.
7. `TranslationProviderRouter` capability selection receives metadata only: domain/classification, source/target locale, operation/message kind and source-character count. Raw source enters only the selected adapter after admission.
8. Content execution is provider-bound: allowance persists one admitted provider identity; `translateWithProvider(providerId,...)` resolves that exact adapter and re-runs `supports(machineTranslationCapability(actualRequest))` before `adapter.translate()`. A stale/forged admission-time size cannot bypass actual-request capability checks.
9. Content data policy is fail-closed by default: `CloudflareM2m100TranslationProvider` defaults to `DENY_ALL_TRANSLATION_PROVIDER_DATA_POLICY`. The only concrete repository opt-in policy class is deliberately narrow: exact provider/model, exact canonical non-`und` locale pair, `public-forum-topic-title`, plain operation.
10. The current Cloudflare adapter additionally hard-rejects every content classification except `public-forum-topic-title`. Therefore current prepared M2M100 adapter cannot send post-body or `non-public-content` data even if generic plumbing exists.
11. UI generation does not use the content data-policy because its source is code-owned canonical English UI copy, not user/private content. UI still passes adapter capability checks and output validation.
12. Current M2M100 adapter supports only plain non-empty source, refuses same-locale/unsupported provider locale pairs, caps one source call at 2,000 characters and accepts only a nonblank translated string up to 10,000 characters. Provider locale mapping is explicit; unsupported BCP-47/script/region variants fail capability rather than broadening silently.
13. Provider request body from that adapter contains only `text`, `source_lang`, `target_lang`; no Vico user ID, session, permission, DB identifier, request IP, provider credential or forum metadata is added to translation payload.
14. **Post-body egress is semantic, not raw Markdown.** `ProtectedMarkdownTranslationDocument` parses the forum Markdown representation, emits only human-language text-node segments and protects technical fragments with opaque markers. Code/inline-code structure is not a text segment; URLs, mailto/email/path/identifier/version/CLI-like fragments are protected; attributed quote labels are excluded.
15. Before provider calls, post-body allowance/capability uses exact protected-segment counts. Execution enforces configured max segment count and max total semantic characters, requires every segment to be supported by the same admitted provider, then sends each protected semantic segment separately.
16. Returned post-body segments must have valid/coherent provider provenance. Restore requires exact segment IDs, exact protected-token sequence, bounded/nonblank/control-safe values and reparsed Markdown structural equivalence. Invalid provider output cannot become a translated current body.
17. Topic-title output requires machine provenance, plain nonblank text and nonblank attribution when supplied; current M2M100 adapter already applies its 10,000-character response bound. Publication repeats stale/current revision preflight before durable write.
18. UI publication validates provider/model/origin, max output size, forbidden markup, placeholders, controlled i18next/component tokens, protected terms and exact target plural branches before conditional current publication.
19. Machine provenance is persisted: UI rows keep provider/model/provenance metadata; content translation rows keep origin/provider/provider-model/attribution. Presentation keeps translation provenance rather than presenting provider output as an unlabelled source value.
20. No synchronous public-provider proxy was found: ordinary public reads consume stored translations/original fallback; current generation runtime is disabled; the prepared generation action only plans durable work and does not execute provider inference inline.
21. Current Cloudflare documentation rechecked 2026-11-18 confirms model `@cf/meta/m2m100-1.2b` accepts `text`, `source_lang`, `target_lang`, supports Batch and is marked **Zero data retention**. Cloudflare's Workers AI data-usage contract says standard inference Customer Content is not retained after request processing/delivery and is not used for model training, subject to documented stateful/logging/legal exceptions.
22. **Информация не проверена:** future Stage-6 exact Workers AI account/binding, selected production provider(s), any AI Gateway/logging/caching/stateful settings, provider terms at activation time, actual allowance values and live data-egress acceptance. These mutable external choices must be rechecked when Stage 6 resumes; their current absence is not a finding.
23. Missing current M2M100 post-body support is a future provider-capability gap, not a security defect: no post-body external call can currently occur. Any later provider/data-policy that enables it must preserve the J4 admission/protection/validation boundary.
24. No provider call, Queue dispatch, Workers AI binding, AI Gateway, package install, deployment, external account or setting mutation was performed by J4.
25. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
26. Next bounded slice: **J5 — Queue/provider execution lifecycle**.

## J5 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Current normal runtime still has no Cloudflare Queue producer/consumer, Workers AI binding or translation executor wiring. `wrangler.jsonc` contains only Hyperdrive bindings, and repository search found no `queues.producers`, `queues.consumers`, `Queue<...>`, `MessageBatch`, Queue `ack()`/`retry()` adapter or normal-runtime `TranslationTaskReconciler` construction. Therefore no live external Queue attack surface exists now.
4. Prepared JOB-01 ordering is correct: UI dispatcher and both content planners persist/upsert the durable task first and call `enqueuer.enqueue({ translationTaskId: task.id })` only after the database operation has returned/committed. Existing repository tests explicitly cover enqueue-failure/unknown-outcome leaving a durable `pending` row visible to a fresh DB reader; J5 inspected but did not execute those tests.
5. Queue message authority is narrow: `TranslationTaskMessage` carries only `translationTaskId`. Kind, source identity, source fingerprint, target locale, generation policy, provider identity and raw content are reloaded from durable state. `TranslationTaskExecutorDispatcher` resolves the persisted kind before a kind-specific consumer can claim.
6. Durable stable identities bind UI source fingerprint/policy/locale and content revision/source-resolution/policy metadata. A Queue message cannot choose a provider, source text, target locale or translation kind by supplying extra fields to the domain dispatcher.
7. Consumer claim is DB-atomic and lease-based. Concurrent duplicate delivery can create only one live claim; a second delivery returns `already-claimed`. Expired leases are reclaimable under a fresh claim token; stale/old claim tokens cannot publish stale/failure transitions.
8. Before provider execution, UI/content consumers revalidate current source/revision, generation policy, current generation, target-locale eligibility and existing higher-priority/current translation. Post-body also revalidates protected-content policy/fingerprint. Stale work terminalizes without provider call.
9. Publication remains claim/current-generation fenced after provider response, so a source/policy/generation change during the provider call cannot publish the old result as current. This is the same root boundary already checked in J4 and is not duplicated as a J5 finding.
10. Provider-call exactly-once is intentionally **not** claimed. A crash after external provider success but before durable publication can cause the provider call to repeat after lease expiry. This is explicitly documented and bounded rather than hidden.
11. Every real execution claim increments durable `attemptCount`; `DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS = 3`. Retryable failures release the task back to `pending` only while attempts remain. The third retryable failure becomes durable `failed / retry-exhausted`.
12. A crash during the final already-consumed attempt does not create a fourth provider attempt: expired final work is reclaimed with `attemptStarted=false` only so the executor can persist `attempt-budget-exhausted` terminal state without another provider call.
13. Post-body partial external work is also bounded by the same attempt budget plus configured `maxSegments` / `maxTotalSegmentCharacters`. A later retry may repeat already-successful earlier segments after a later segment failed; code explicitly acknowledges this. No unbounded provider loop was found.
14. Content provider allowance is occurrence-bound to `task id + generation + attempt`. One admitted provider identity is persisted before execution; duplicate delivery reuses the same admitted occurrence. Allowance lease/deferred state is DB-fenced and revalidated against current content before persistence.
15. Deferred allowance does not busy-loop provider execution: `allowanceRetryNotBefore` is durable. Reconciliation selects it only once retry time is reached. Expired allowance leases can be retried; the deterministic occurrence key provides an idempotency handle for a future external allowance implementation.
16. Reconciliation is durable and bounded: max batch 100; `FOR UPDATE SKIP LOCKED` gives concurrent reconcilers disjoint work; `reconciliationAttemptedAt` prevents immediate reselection for 60 seconds; each candidate enqueue is isolated so one failure does not abort the rest of the bounded batch.
17. Reconciliation recovers: old `pending` after enqueue failure/unknown result, retry-released `pending`, expired `processing`, expired allowance lease and allowance-deferred work whose retry time has arrived. It does not select live processing, stale, completed or failed tasks.
18. Terminal provider/output failures and retry exhaustion persist in the DB as an observable DLQ-equivalent terminal state with bounded grouped failure/allowance observability. Source-of-truth permits a DLQ **or equivalent observable terminal-failure path**; current durable failed-state implementation satisfies the domain side of that requirement.
19. Current Cloudflare Queues documentation rechecked 2026-11-18: delivery is at-least-once and duplicates are possible; Cloudflare recommends an application idempotency key for duplicate-sensitive work. Explicit per-message `ack()` / `retry()` is supported, retry delays can be applied, default delivery failure retries are three unless configured otherwise, and exhausted messages are deleted unless a DLQ is configured.
20. Current Cloudflare limits rechecked 2026-11-18: message size is 128 KB, configurable retry maximum is 100, batch size maximum is 100 and message retention is configurable up to 14 days. Vico's planned message is only one UUID-like task id and is far below the platform payload limit.
21. Current Cloudflare DLQ documentation rechecked 2026-11-18: after configured `max_retries`, a message goes to the configured DLQ; without DLQ it is deleted. Vico's durable task state means queue-message deletion does not erase task truth, but recovery still requires the Stage-6 reconciliation runner to be actually wired.
22. **Stage-6 activation gate, not a finding:** the concrete Queue consumer adapter must map Vico `delivery=ack|retry|terminal` correctly to per-message Queue acknowledgement/retry semantics, apply finite retry/backoff policy, and prove malformed/untrusted message handling cannot create a retry storm. The actual adapter does not yet exist, so its behavior is **Информация не проверена**.
23. **Stage-6 activation gate, not a finding:** real Queue producer/consumer bindings, Queue names/jurisdiction/retention, consumer `max_retries`/retry delay, optional Cloudflare DLQ, Queue permissions, actual reconciliation scheduler/trigger and deployed reconciliation acceptance are **Информация не проверена**. They must be checked when Queue integration is implemented/activated.
24. Queue/provider credential custody remains Block I/J4 boundary. Current repository has no Queue/provider credential or binding to expose. Future provider/Queue secret placement is **Информация не проверена** until Stage 6 configuration exists.
25. No distinct J5 root cause was established. The known unavoidable duplicate-provider-call crash window is finite and explicitly modeled; generic abuse/rate-limit questions remain Block K unless a provider-specific amplification path is proven.
26. No Queue send/consume, provider call, binding, DLQ, scheduler, package install, deployment or external setting mutation was performed by J5.
27. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
28. Next bounded slice: **J6 — External callback/webhook/outgoing seams**.

## J6 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Repository-wide code search по `webhook` вернул 0 совпадений. Concrete third-party webhook receiver вне Better Auth OAuth route family в current `main` не найден.
4. OAuth callback/state/redirect semantics уже принадлежат J2/Block B и в J6 не дублируются.
5. Email sender/provider integration отсутствует по J3; следовательно bounce/provider webhook, signature verification и provider callback admission сейчас неприменимы.
6. Cloudflare Queue producer/consumer adapter и live provider transport отсутствуют по J5; untrusted Queue transport input, external ack callback или provider webhook path в normal runtime не существует.
7. Server-side outbound HTTP surface проверен отдельно: code search не нашёл `await fetch(...)` в `db/` или `workers/`; в `app/` единственный такой вызов находится в client `OwnerLifecycleControl` и отправляет POST на code-built same-origin `forumOwnerDeactivationPath(...)` с `credentials:"same-origin"` и `redirect:"error"`. Это не SSRF/external integration seam.
8. `AdministrativeRouting` допускает future trusted bases/origins как foundation, но current defaults строят только relative same-origin `/:locale/admin/*` и `/:locale/super-admin/*` addresses. Production Worker не устанавливает `administrativeRoutingContext`; repository search показывает runtime reference только в declaration, а custom `createAdministrativeRouting(...)` используется вне source лишь в tests.
9. Поэтому request/user-controlled URL не может в current runtime выбрать admin/super-admin origin, backend destination или privileged external target. Concrete SSRF, open-redirect или confused-deputy chain через AdministrativeRouting не установлен.
10. Future cross-origin AdministrativeRouting producer остаётся Stage-6 design/acceptance boundary, уже отмеченной review #317. Пока producer отсутствует, превращать потенциальную неправильную будущую конфигурацию в finding/blocker оснований нет.
11. Signature/origin/nonce/replay verification для non-OAuth webhook сейчас **неприменима**, потому что concrete receiver отсутствует. При появлении provider webhook эта проверка становится обязательной на фактическом integration path.
12. No provider call, webhook registration, external request, Queue dispatch, deployment, binding or settings mutation was performed by J6.
13. #315 aggregate остаётся **28 current findings + 4 deferred Stage-6 blockers**.
14. Следующий bounded slice: **J7 — Failure/data-retention/cross-provider boundary**.

## J7 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Provider failure path is fail-closed/bounded. `TranslationExecutionFailure` exposes only a closed disposition/code set; task failure persistence stores the bounded code/disposition rather than raw provider exception, response body, source text or credentials.
4. Operational provider-call evidence is also metadata-only: task kind/generation/attempt, call/success/failure counts and duration. It deliberately does not record source text, requester capabilities or raw provider errors.
5. Current Cloudflare adapter maps known HTTP/provider failure metadata into bounded `provider-rate-limited`, `provider-temporary`, `provider-unsupported` or `provider-terminal` classifications. Provider response content becomes publishable only after structural/value validation already covered by J4.
6. Content execution does **not** weaken policy through cross-provider fallback. Allowance selects and persists one stable provider identity for the exact task generation/attempt; executor then calls `translateWithProvider(admittedProvider,...)`, which resolves only that provider and rechecks actual-request support. Failure does not select a second provider.
7. UI execution also has no failure-triggered provider cascade: generic `TranslationProviderRouter.translate()` selects the first supporting adapter once and awaits only that adapter. If it fails, execution records/retries/terminalizes that failure; it does not fall through to another adapter with a different policy.
8. Content presentation failure is original-safe: missing/invalid/unavailable translation storage returns the immutable current original with an explicit fallback reason. It does not source a translation from another provider, stale revision or unrelated locale.
9. Persistent UI rows are admitted only for exact locale/namespace/key, approved status, current source fingerprint and current generation-policy version; invalid/stale machine rows are skipped rather than trusted as a degraded fallback.
10. Stored translation provenance is bounded application metadata: machine origin plus provider/model and optional attribution. Current operational facts retain only bounded task/call metadata. No source text, provider response payload or credential is intentionally copied into those observability records.
11. OAuth token persistence itself remains the J2/Better Auth account boundary: Better Auth stores provider access/refresh/id tokens in the account record and its account-unlink path deletes the selected owned account row. Vico's current product does not expose cross-user token selection. J7 found no separate current exploit chain beyond existing deferred `GOOGLE-OAUTH-SCOPE-01`.
12. Current Better Auth documentation confirms account unlinking deletes the selected owned account and prevents unlinking the only account by default. This does not prove production Google token revocation at the provider; exact provider revocation/retention behavior at Stage-6 activation is **Информация не проверена** and must be checked then.
13. Current Cloudflare Workers AI documentation (rechecked 2026-11-18) states standard inference Customer Content is zero-data-retention after request processing/delivery and is not used for training; stateful features, AI Gateway logging/caching, application logs or other selected storage can change retention. Vico currently has no live Workers AI/AI Gateway binding, so exact Stage-6 account/logging/cache/retention settings are **Информация не проверена**, not a current finding.
14. Cross-provider provider/account failover policy does not exist in current runtime. If Stage 6 later introduces multiple providers, fallback must repeat capability/data-policy/admission for the newly selected provider rather than reuse prior-provider authority. This is an activation requirement, not a defect in the current single-provider prepared path.
15. No provider call, token revocation, account unlink, Queue dispatch, binding, deployment or external settings mutation was performed by J7.
16. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
17. Next bounded slice: **J8 — Cross-chain closeout**.

## J8 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers; Block J завершён.**
3. End-to-end Google chain reviewed as external request → Google authorization/token boundary → Better Auth callback → owned account durable state. The only J-specific defect remains deferred `GOOGLE-OAUTH-SCOPE-01 Low/P3`: direct callers can request provider scopes broader than Vico's authentication/linking product need, but real Google OAuth is not activated and additional authority still requires Google consent.
4. Known callback/session weaknesses do not create a second J root cause: callback-after-session-revocation remains `AUTH-LINK-01` and provider error projection remains `AUTH-OAUTH-01`, both owned by Block B.
5. Translation chain reviewed as durable task/admission → one selected provider → validated response/provenance → conditional durable publication → original-safe read fallback. J4/J5/J7 controls compose without a policy bypass: raw content egress follows data-policy/allowance, retries remain bounded, and provider failure does not switch to a less trusted provider.
6. Current runtime still does not activate translation provider/Queue execution: Worker uses the disabled content-generation runtime, integration state reports provider/enqueuer/consumer unwired, and current `wrangler.jsonc` has no Queue or Workers AI binding. Therefore provider/Queue external behavior remains Stage-6 acceptance, not current attack surface.
7. Repository search still finds no Vico application-side Google `scopes` allowlist under `app/auth`; this preserves the J2 correction gate rather than creating a new finding.
8. External callback/outgoing chain remains closed beyond Better Auth OAuth: no non-OAuth webhook receiver and no request-controlled server outbound HTTP/active external AdministrativeRouting producer was established in J6.
9. Cross-block dedup PASS. Generic authentication/session/account-link semantics stay Block B; production Worker/version mechanics stay H; secret/source/dependency trust stays I; generic abuse/availability belongs K; generic monitoring/incident response belongs L.
10. Current-vs-Stage-6 classification revalidated against current `PROJECT_STATE.md` / `ROADMAP.md`: Vico remains pre-release, Stage 6 external integration is paused, real Google OAuth/provider/Queue rollout is incomplete. `GOOGLE-OAUTH-SCOPE-01` therefore remains deferred Low/P3, not current.
11. Stage-6 activation gates recorded without duplicating findings: (a) close `REPO-MAIN-GATE-01` before secret-bearing external dispatch; (b) satisfy applicable G/H/I rollout gates before production Worker/DB/provider activation; (c) close `GOOGLE-OAUTH-SCOPE-01` before real Google OAuth activation; (d) at activation recheck exact Google client/redirect/secret placement, Queue ack/retry/DLQ/reconciliation mapping, provider/account data-retention/log/cache settings, provider credentials/least privilege and deployed failure paths. Items in (d) are acceptance checks, not present findings.
12. Exact future provider/account settings in mutable external consoles remain **Информация не проверена** until Stage 6 because those integrations are not active and J8 performed no external mutation/probe.
13. Final Block J: **0 current findings + 1 deferred Stage-6 blocker (`GOOGLE-OAUTH-SCOPE-01 Low/P3`)**. Overall #315 remains **28 current findings + 4 deferred Stage-6 blockers**; current severity remains 9 Moderate/P2 + 19 Low/P3, deferred remains 2 Moderate/P2 + 2 Low/P3.
14. J8 performed no OAuth login/callback, provider call, Queue dispatch, token mutation, binding, deployment or GitHub/Cloudflare/provider settings mutation.
15. Remediation remains a separate task. Next security audit area after developer continuation is **Block K — generic abuse / availability**, per the existing anti-duplication map; Block K is not started by J8.

## Цель

Проверить external provider/integration boundaries Vico Forum так, чтобы:

1. внешний provider не мог подменить application identity/authority вне утверждённого authentication contract;
2. provider callback/redirect/input не создавал open redirect, SSRF, confused-deputy или cross-account path;
3. external credentials/tokens/data не передавались provider'у шире необходимого и не возвращались в client/logs;
4. provider/Queue failure, retry и replay не приводили к duplicate protected mutation, unbounded cost или stale publication;
5. внешний API не превращался в публичный unauthenticated proxy;
6. provider-specific trust/attribution/data-handling policy применялась до data egress;
7. Stage-6 activation была fail-closed и не обходила уже проверенные auth/DB/runtime/supply-chain gates.

## Current scope

1. Google OAuth: provider-specific redirect/callback/state/token/account-link trust boundary, registration/provider admission и deployment configuration handoff.
2. Email providers только если/когда repository содержит sender/verification/recovery integration.
3. Translation providers: provider routing, capability/data-policy admission, raw content egress, response validation, provenance and failure classification.
4. Cloudflare Queues/background provider execution: producer/consumer trust, durable identity, replay/idempotency, retry/DLQ/reconciliation, cost/abuse admission.
5. Future third-party callback/webhook/outgoing seams только когда concrete current/prepared path существует.
6. Integration monitoring только для provider truthfulness/secret-safe status; общий monitoring/incident response остаётся поздним Block L.
7. Stage-6 external activation — deferred blocker только если concrete prepared path уже технически unsafe.

## Anti-duplication

1. **Block B:** internal authentication/session/account-link authorization semantics. J проверяет external provider trust/data exchange.
2. **Block C:** application permissions/Owner authorization.
3. **Block F:** attachment content/storage admission.
4. **Block G:** DB privilege/migration semantics.
5. **Block H:** Worker routing/version/preview/runtime mechanics.
6. **Block I:** secret custody, GitHub Environments, source/dependency provenance.
7. **Block K:** generic abuse/availability; J оставляет provider-specific cost/retry amplification.
8. **Block L:** monitoring/incident response, если root cause не provider integration itself.
9. One root cause → one finding ID.

## План проверки

### J1 — Current integration inventory & activation boundaries
1. Enumerate provider adapters, callbacks, external transport/bindings and deployment state.
2. Separate active runtime from local/CI foundation and paused Stage-6 activation.
3. Identify ownership boundaries with prior Blocks.
4. No finding for absent/unactivated future provider.

### J2 — Google OAuth external-provider boundary
1. Exact Better Auth Google configuration and provider callback/state/redirect contract.
2. Provider identity/email verification and explicit-linking boundary without duplicating Block B.
3. Return/callback URL validation and provider error projection.
4. Token/provider-private data custody at application boundary.
5. Stage-6 Google client/redirect configuration gates.

### J3 — Email provider boundary
1. Re-evaluate only if sender/verification/recovery implementation exists.
2. Sender authentication, verification/reset token lifecycle, enumeration and callback/link safety.
3. Provider credentials, bounce/webhook path and data minimization.
4. If absent, close as not-active without implementation work.

### J4 — Translation provider data egress
1. Provider selection/capability/data-policy before raw content egress.
2. Public/private content classification.
3. Request size/segmentation and provider-specific locale mapping.
4. Response validation/provenance/attribution.
5. No synchronous public-provider proxy.

### J5 — Queue/provider execution lifecycle
1. Durable task before enqueue and message identity.
2. Consumer stale/claim fences.
3. Provider-call crash window and replay/idempotency.
4. Retry/DLQ/reconciliation and bounded provider cost.
5. Queue/provider credentials and untrusted message fields.

### J6 — External callback/webhook/outgoing seams
1. Concrete webhook/callback receivers outside OAuth, if any.
2. Signature/origin/nonce/replay verification where applicable.
3. Outgoing administrative/external routing only if activated.
4. SSRF/open redirect/confused-deputy checks on controlled URLs.

### J7 — Failure/data-retention/cross-provider boundary
1. Provider outage/degraded/fail-closed behavior.
2. Provider response/error/log data minimization.
3. Retained external identifiers/tokens/provenance lifecycle.
4. Cross-provider fallback must not weaken data policy or identity trust.

### J8 — Cross-chain closeout
1. external request/data → provider → callback/response → durable state;
2. dedup B/I/H/K/L;
3. current-vs-Stage-6 severity validation;
4. record provider activation correction gates; remediation remains separate.

## Finding criteria

1. Concrete repository or prepared provider path.
2. External provider/input/callback/transport crosses a trust boundary incorrectly.
3. Observable impact on identity, protected mutation, private data, credential/token exposure, stale publication or provider-specific cost/abuse.
4. Root cause belongs J rather than B/H/I/K/L.
5. Current Stage affected, or concrete prepared Stage-6 path requires a deferred correction gate.

## Ограничения

1. Не создавать OAuth clients, email accounts, provider API keys, Queue bindings или webhooks.
2. Не выполнять live provider calls, login/callback smoke, Queue dispatch или production deployment без explicit owner authorization.
3. Не читать/публиковать secret values.
4. Не менять production/provider/GitHub/Cloudflare settings.
5. Не реализовывать отсутствующие future integrations во время audit.
6. Пока над #315 работает одна Мира, PR comments для внутреннего обсуждения не использовать.

## Следующий шаг

1. **Block J завершён.** После продолжения владельца перейти к следующему security block по общей карте — **Block K: generic abuse / availability** — отдельным bounded scope/file.
2. Remediation существующих findings/blockers Blocks B–J не начинать без отдельного назначения.
