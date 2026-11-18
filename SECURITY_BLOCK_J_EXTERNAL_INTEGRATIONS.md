# Block J — External integrations security audit

## Статус

1. Scope создан 2026-11-18; current J1 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Blocks A–I уже закрыты как audit blocks; их findings в J не дублируются.
3. **J1 — Current integration inventory & activation boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. Current repository имеет Google OAuth foundation и translation provider/Queue abstractions, но source-of-truth и runtime wiring подтверждают отсутствие live Google OAuth acceptance и отсутствие active translation provider/Queue execution.
5. Resend/Brevo/email-delivery integration в current `main` отсутствует; email verification/password recovery намеренно не реализованы.
6. Следующий bounded slice после продолжения владельца — **J2: Google OAuth external-provider boundary**.
7. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
8. Production/provider/Cloudflare/GitHub settings mutation, OAuth client creation, Queue/provider activation и external calls не разрешены и не выполнялись.

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

1. После продолжения владельца выполнить **J2 — Google OAuth external-provider boundary** на current main и остановиться после результата.
2. Remediation существующих findings не начинать без отдельного назначения.
